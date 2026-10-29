import uuid
from datetime import datetime, date, time
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_

from models import Product, ProductVariant, Organization, Transaction, TransactionItem, Payment
from schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    TransactionCreate,
    PaymentCreate,
    PricesUpdate,
)


# ==========================================
# Helpers & Utilities
# ==========================================

def make_id(prefix: str) -> str:
    """Generate human-readable unique IDs similar to frontend makeId."""
    now_ts = int(datetime.utcnow().timestamp() * 1000)
    rand_suffix = uuid.uuid4().hex[:6]
    return f"{prefix}-{now_ts}-{rand_suffix}"


def generate_receipt_number(prefix: str = "MBBH") -> str:
    """Format: {prefix}-YYMMDD-{time_suffix}{2-digit-random}."""
    now = datetime.now()
    date_part = now.strftime("%y%m%d")
    time_suffix = str(int(now.timestamp() * 1000))[-5:]
    rand_two = str(uuid.uuid4().int % 90 + 10)
    return f"{prefix}-{date_part}-{time_suffix}{rand_two}"


def get_next_daily_order_number(db: Session, target_date: Optional[date] = None) -> int:
    """Calculate the next sequential order number for a given calendar day."""
    if target_date is None:
        target_date = date.today()

    highest = (
        db.query(func.max(Transaction.order_number))
        .filter(func.date(Transaction.created_at) == target_date)
        .scalar()
    )

    count_today = (
        db.query(func.count(Transaction.id))
        .filter(func.date(Transaction.created_at) == target_date)
        .scalar()
        or 0
    )

    highest_num = highest or 0
    return max(count_today, highest_num) + 1


# ==========================================
# Menu & Pricing
# ==========================================

def get_menu_catalog(db: Session):
    products = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.is_available.is_(True))
        .order_by(Product.id)
        .all()
    )
    return products


def calculate_weight_price(db: Session, product_id: int, weight_grams: int) -> Dict[str, Any]:
    if weight_grams <= 0:
        raise HTTPException(status_code=400, detail="Weight must be greater than zero.")

    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.is_available.is_(True))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if product.category not in ["Biryani", "Pulao"]:
        raise HTTPException(
            status_code=400,
            detail="Custom weight calculation is only supported for Biryani and Pulao.",
        )

    base_variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product.id,
            ProductVariant.weight_grams == 250,
            ProductVariant.is_available.is_(True),
        )
        .first()
    )

    if not base_variant:
        raise HTTPException(status_code=404, detail="Base 250g price variant not found.")

    price = (
        Decimal(str(base_variant.price)) * Decimal(weight_grams) / Decimal(250)
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "product_id": product.id,
        "product_name": product.name,
        "weight_grams": weight_grams,
        "price": float(price),
    }


def get_dynamic_config(db: Session) -> Dict[str, Any]:
    """Retrieve dynamic menu prices and app configuration directly from Supabase PostgreSQL."""
    rice_prices = {"chicken": 130.0, "beef": 150.0, "sada": 100.0, "chana": 100.0}
    zarda_price = 100.0
    salad_price = 50.0
    raita_price = 50.0
    drinks = {
        "Pepsi": {"300 ml": 90.0, "500 ml": 110.0, "1 Litre": 160.0, "1.5 Litre": 180.0, "Jumbo": 250.0},
        "Coca-Cola": {"300 ml": 90.0, "500 ml": 110.0, "1 Litre": 160.0, "1.5 Litre": 180.0, "Jumbo": 250.0},
        "7UP": {"300 ml": 90.0, "500 ml": 110.0, "1 Litre": 160.0, "1.5 Litre": 180.0, "Jumbo": 250.0},
    }

    try:
        products = db.query(Product).options(joinedload(Product.variants)).all()
        for p in products:
            p_name_lower = p.name.lower()
            for v in p.variants:
                if "chicken" in p_name_lower and (v.weight_grams == 250 or "250g" in v.label.lower()):
                    rice_prices["chicken"] = float(v.price)
                elif "beef" in p_name_lower and (v.weight_grams == 250 or "250g" in v.label.lower()):
                    rice_prices["beef"] = float(v.price)
                elif "chana" in p_name_lower and (v.weight_grams == 250 or "250g" in v.label.lower()):
                    rice_prices["chana"] = float(v.price)
                elif "sada" in p_name_lower and (v.weight_grams == 250 or "250g" in v.label.lower()):
                    rice_prices["sada"] = float(v.price)
                elif "zarda" in p_name_lower or p.catalog_key == "zarda":
                    zarda_price = float(v.price)
                elif "salad" in p_name_lower or p.catalog_key == "salad":
                    salad_price = float(v.price)
                elif "raita" in p_name_lower or p.catalog_key == "raita":
                    raita_price = float(v.price)
                elif p.category == "Drinks" or p.catalog_key == "drinks":
                    if v.brand and v.size:
                        if v.brand not in drinks:
                            drinks[v.brand] = {}
                        drinks[v.brand][v.size] = float(v.price)
    except Exception as e:
        print(f"Error querying dynamic config from database: {e}")

    return {
        "rice_prices": rice_prices,
        "zarda_price": zarda_price,
        "salad_price": salad_price,
        "raita_price": raita_price,
        "drinks": drinks,
        "weights": [250, 375, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000],
        "quantities": [1, 2, 3, 4, 5],
        "brand_name": "Mr Bilal Biryani House",
        "receipt_prefix": "MBBH",
    }


def update_menu_prices(db: Session, payload: PricesUpdate) -> Dict[str, Any]:
    """Persist updated prices securely into Supabase PostgreSQL product_variants table."""
    try:
        products = db.query(Product).options(joinedload(Product.variants)).all()
        prod_map = {p.name.lower(): p for p in products}

        # 1. Update Rice Base Prices (per 250g)
        if payload.rice_prices:
            for key, val in payload.rice_prices.items():
                if val <= 0:
                    raise HTTPException(status_code=400, detail=f"Price for {key} must be greater than 0.")
                dec_val = Decimal(str(val))
                if key == "chicken":
                    for name, p in prod_map.items():
                        if "chicken" in name:
                            for v in p.variants:
                                if v.weight_grams == 250 or "250g" in v.label.lower():
                                    v.price = dec_val
                elif key == "beef":
                    for name, p in prod_map.items():
                        if "beef" in name:
                            for v in p.variants:
                                if v.weight_grams == 250 or "250g" in v.label.lower():
                                    v.price = dec_val
                elif key == "sada":
                    for name, p in prod_map.items():
                        if "sada" in name:
                            for v in p.variants:
                                if v.weight_grams == 250 or "250g" in v.label.lower():
                                    v.price = dec_val
                elif key == "chana":
                    for name, p in prod_map.items():
                        if "chana" in name:
                            for v in p.variants:
                                if v.weight_grams == 250 or "250g" in v.label.lower():
                                    v.price = dec_val

        # 2. Update Zarda Price
        if payload.zarda_price is not None:
            if payload.zarda_price <= 0:
                raise HTTPException(status_code=400, detail="Zarda price must be greater than 0.")
            dec_z = Decimal(str(payload.zarda_price))
            for name, p in prod_map.items():
                if "zarda" in name or p.catalog_key == "zarda":
                    for v in p.variants:
                        v.price = dec_z

        # 3. Update Fresh Salad Price
        if payload.salad_price is not None:
            if payload.salad_price <= 0:
                raise HTTPException(status_code=400, detail="Salad price must be greater than 0.")
            dec_s = Decimal(str(payload.salad_price))
            for name, p in prod_map.items():
                if "salad" in name or p.catalog_key == "salad":
                    for v in p.variants:
                        v.price = dec_s

        # 4. Update Fresh Raita Price
        if payload.raita_price is not None:
            if payload.raita_price <= 0:
                raise HTTPException(status_code=400, detail="Raita price must be greater than 0.")
            dec_r = Decimal(str(payload.raita_price))
            for name, p in prod_map.items():
                if "raita" in name or p.catalog_key == "raita":
                    for v in p.variants:
                        v.price = dec_r

        # 5. Update Soft Drinks Brand & Sizes
        if payload.drinks:
            for p in products:
                if p.category == "Drinks" or p.catalog_key == "drinks":
                    for v in p.variants:
                        if v.brand and v.size and v.brand in payload.drinks:
                            brand_sizes = payload.drinks[v.brand]
                            if v.size in brand_sizes:
                                drink_pr = brand_sizes[v.size]
                                if drink_pr <= 0:
                                    raise HTTPException(status_code=400, detail=f"Price for {v.brand} {v.size} must be greater than 0.")
                                v.price = Decimal(str(drink_pr))

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update prices in Supabase: {str(e)}")

    return get_dynamic_config(db)


# ==========================================
# Organizations CRUD
# ==========================================

def compute_org_financials(db: Session, org_id: str):
    txns = db.query(Transaction).filter(Transaction.organization_id == org_id).all()
    payments = db.query(Payment).filter(Payment.organization_id == org_id).all()

    total_billed = sum(float(t.grand_total) for t in txns)
    initial_paid = sum(float(t.initial_payment) for t in txns)
    extra_payments = sum(float(p.amount) for p in payments)
    total_paid = initial_paid + extra_payments
    outstanding = sum(float(t.outstanding) for t in txns)

    return {
        "total_billed": total_billed,
        "total_paid": total_paid,
        "outstanding": outstanding,
    }


def list_organizations(db: Session, search: Optional[str] = None):
    query = db.query(Organization).order_by(Organization.name)
    if search:
        query = query.filter(Organization.name.ilike(f"%{search.strip()}%"))
    orgs = query.all()

    result = []
    for org in orgs:
        fin = compute_org_financials(db, org.id)
        result.append({
            "id": org.id,
            "name": org.name,
            "contact_person": org.contact_person,
            "phone": org.phone,
            "email": org.email,
            "address": org.address,
            "notes": org.notes,
            "created_at": org.created_at,
            "updated_at": org.updated_at,
            "total_billed": fin["total_billed"],
            "total_paid": fin["total_paid"],
            "outstanding": fin["outstanding"],
        })
    return result


def get_organization(db: Session, org_id: str):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    fin = compute_org_financials(db, org.id)
    return {
        "id": org.id,
        "name": org.name,
        "contact_person": org.contact_person,
        "phone": org.phone,
        "email": org.email,
        "address": org.address,
        "notes": org.notes,
        "created_at": org.created_at,
        "updated_at": org.updated_at,
        "total_billed": fin["total_billed"],
        "total_paid": fin["total_paid"],
        "outstanding": fin["outstanding"],
    }


def create_organization(db: Session, payload: OrganizationCreate):
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Organization name is required.")

    existing = db.query(Organization).filter(func.lower(Organization.name) == name_clean.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An organization with this name already exists.")

    org_id = payload.id or make_id("org")
    org = Organization(
        id=org_id,
        name=name_clean,
        contact_person=payload.contact_person or "",
        phone=payload.phone or "",
        email=payload.email or "",
        address=payload.address or "",
        notes=payload.notes or "",
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return get_organization(db, org.id)


def update_organization(db: Session, org_id: str, payload: OrganizationUpdate):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Organization name cannot be empty.")
        dup = db.query(Organization).filter(
            func.lower(Organization.name) == name_clean.lower(),
            Organization.id != org_id,
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="An organization with this name already exists.")
        org.name = name_clean

    if payload.contact_person is not None:
        org.contact_person = payload.contact_person
    if payload.phone is not None:
        org.phone = payload.phone
    if payload.email is not None:
        org.email = payload.email
    if payload.address is not None:
        org.address = payload.address
    if payload.notes is not None:
        org.notes = payload.notes

    db.commit()
    db.refresh(org)
    return get_organization(db, org.id)


def delete_organization(db: Session, org_id: str):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    db.delete(org)
    db.commit()
    return {"message": f"Organization '{org.name}' deleted successfully."}


# ==========================================
# Transactions (Orders / Receipts) CRUD
# ==========================================

def create_or_update_transaction(db: Session, payload: TransactionCreate):
    now = datetime.now()
    if not payload.items:
        raise HTTPException(status_code=400, detail="Transaction must contain at least one item.")

    # Calculate subtotal
    subtotal = sum(Decimal(str(item.unit_price)) * Decimal(item.quantity) for item in payload.items)
    discount = Decimal(str(payload.discount or 0.0))
    grand_total = max(Decimal("0.00"), subtotal - discount)

    # Initial payment and outstanding
    initial_payment = min(grand_total, Decimal(str(payload.initial_payment or 0.0)))
    if payload.source == "counter":
        # Counter sales are fully settled at point of sale
        initial_payment = grand_total
        amount_paid = grand_total
        outstanding = Decimal("0.00")
    else:
        amount_paid = initial_payment
        outstanding = max(Decimal("0.00"), grand_total - initial_payment)

    # Daily sequential order number
    order_num = payload.order_number or get_next_daily_order_number(db, now.date())

    # Receipt number
    default_prefix = "BLK" if payload.source == "bulk" else ("CUS" if payload.source == "customized" else "MBBH")
    receipt_no = payload.receipt_number or generate_receipt_number(default_prefix)

    # Check for existing counter sale to prevent duplicate counter bills
    existing_txn = None
    if payload.id:
        existing_txn = db.query(Transaction).filter(Transaction.id == payload.id).first()
    elif payload.source == "counter" and payload.cart_signature:
        existing_txn = db.query(Transaction).filter(
            Transaction.source == "counter",
            Transaction.cart_signature == payload.cart_signature,
        ).first()

    # Normalize organization_id safely to avoid foreign key errors in PostgreSQL
    org_id = payload.organization_id.strip() if (payload.organization_id and payload.organization_id.strip()) else None
    if org_id:
        existing_org = db.query(Organization).filter(Organization.id == org_id).first()
        if not existing_org:
            if payload.organization_name and payload.organization_name.strip():
                new_org = Organization(
                    id=org_id,
                    name=payload.organization_name.strip(),
                    contact_person=payload.customer_name or "",
                    phone=payload.customer_phone or "",
                )
                db.add(new_org)
                db.flush()
            else:
                org_id = None

    if existing_txn:
        # Update existing
        existing_txn.receipt_number = receipt_no
        existing_txn.order_number = order_num
        existing_txn.organization_id = org_id
        existing_txn.organization_name = payload.organization_name
        existing_txn.customer_name = payload.customer_name
        existing_txn.customer_phone = payload.customer_phone
        existing_txn.subtotal = subtotal
        existing_txn.discount = discount
        existing_txn.grand_total = grand_total
        existing_txn.initial_payment = initial_payment
        existing_txn.amount_paid = amount_paid
        existing_txn.outstanding = outstanding
        existing_txn.cart_signature = payload.cart_signature
        existing_txn.notes = payload.notes

        # Replace items
        db.query(TransactionItem).filter(TransactionItem.transaction_id == existing_txn.id).delete()
        for it in payload.items:
            db_item = TransactionItem(
                transaction_id=existing_txn.id,
                cart_item_id=it.id,
                name=it.name,
                detail=it.detail,
                quantity=it.quantity,
                unit_price=Decimal(str(it.unit_price)),
                catalog_key=it.catalog_key,
                receipt_details=[d.model_dump() for d in it.receipt_details] if it.receipt_details else None,
            )
            db.add(db_item)
        db.commit()
        db.refresh(existing_txn)
        return existing_txn

    # Create new
    txn_id = payload.id or make_id("txn")
    created_at = now
    if payload.created_at:
        try:
            created_at = datetime.fromisoformat(payload.created_at.replace("Z", "+00:00"))
        except Exception:
            created_at = now

    new_txn = Transaction(
        id=txn_id,
        receipt_number=receipt_no,
        order_number=order_num,
        source=payload.source,
        created_at=created_at,
        subtotal=subtotal,
        discount=discount,
        grand_total=grand_total,
        initial_payment=initial_payment,
        amount_paid=amount_paid,
        outstanding=outstanding,
        organization_id=org_id,
        organization_name=payload.organization_name,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        notes=payload.notes,
        cart_signature=payload.cart_signature,
    )
    db.add(new_txn)
    db.flush()

    for it in payload.items:
        db_item = TransactionItem(
            transaction_id=new_txn.id,
            cart_item_id=it.id,
            name=it.name,
            detail=it.detail,
            quantity=it.quantity,
            unit_price=Decimal(str(it.unit_price)),
            catalog_key=it.catalog_key,
            receipt_details=[d.model_dump() for d in it.receipt_details] if it.receipt_details else None,
        )
        db.add(db_item)

    db.commit()
    db.refresh(new_txn)
    return new_txn


def get_transaction(db: Session, txn_id: str):
    txn = (
        db.query(Transaction)
        .options(joinedload(Transaction.items))
        .filter(Transaction.id == txn_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return txn


def delete_transaction(db: Session, txn_id: str):
    """Delete a transaction and cascaded items from Supabase database."""
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    receipt = txn.receipt_number
    db.delete(txn)
    db.commit()
    return {"message": f"Transaction '{receipt}' deleted successfully.", "id": txn_id}


def list_transactions(
    db: Session,
    source: Optional[str] = None,
    organization_id: Optional[str] = None,
    range_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.items))
        .order_by(desc(Transaction.created_at))
    )

    if source:
        query = query.filter(Transaction.source == source)
    if organization_id:
        query = query.filter(Transaction.organization_id == organization_id)

    today = date.today()
    if range_filter == "today":
        all_res = query.all()
        return [t for t in all_res if t.created_at and t.created_at.date() == today]
    elif range_filter == "month":
        all_res = query.all()
        return [
            t for t in all_res
            if t.created_at and t.created_at.year == today.year and t.created_at.month == today.month
        ]
    elif range_filter == "custom" and start_date and end_date:
        all_res = query.all()
        try:
            s_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            e_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            return [
                t for t in all_res
                if t.created_at and (t.created_at.date() >= s_dt.date() and t.created_at.date() <= e_dt.date())
            ]
        except Exception:
            return all_res

    return query.all()


# ==========================================
# Payments & Reconciliation CRUD
# ==========================================

def record_payment(db: Session, payload: PaymentCreate):
    amount = Decimal(str(payload.amount))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    org = db.query(Organization).filter(Organization.id == payload.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # Calculate total outstanding balance
    unpaid_txns = (
        db.query(Transaction)
        .filter(
            Transaction.organization_id == org.id,
            Transaction.outstanding > 0,
        )
        .order_by(Transaction.created_at.asc())
        .all()
    )

    total_outstanding = sum(t.outstanding for t in unpaid_txns)
    if amount > total_outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Payment (Rs. {amount}) cannot exceed total outstanding balance (Rs. {total_outstanding}).",
        )

    # Reconcile payment against oldest transactions first (FIFO)
    remaining_payment = amount
    for txn in unpaid_txns:
        if remaining_payment <= Decimal("0.00"):
            break
        applied = min(txn.outstanding, remaining_payment)
        txn.amount_paid += applied
        txn.outstanding -= applied
        remaining_payment -= applied

    created_at = datetime.now()
    if payload.created_at:
        try:
            created_at = datetime.fromisoformat(payload.created_at.replace("Z", "+00:00"))
        except Exception:
            created_at = datetime.now()

    payment_id = payload.id or make_id("payment")
    new_payment = Payment(
        id=payment_id,
        organization_id=org.id,
        amount=amount,
        method=payload.method,
        reference=payload.reference or "",
        created_at=created_at,
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return {
        "id": new_payment.id,
        "organization_id": new_payment.organization_id,
        "organization_name": org.name,
        "amount": float(new_payment.amount),
        "method": new_payment.method,
        "reference": new_payment.reference,
        "created_at": new_payment.created_at,
    }


def list_payments(db: Session, organization_id: Optional[str] = None):
    query = (
        db.query(Payment)
        .join(Organization, Payment.organization_id == Organization.id)
        .order_by(desc(Payment.created_at))
    )
    if organization_id:
        query = query.filter(Payment.organization_id == organization_id)
    payments = query.all()

    return [
        {
            "id": p.id,
            "organization_id": p.organization_id,
            "organization_name": p.organization.name if p.organization else "",
            "amount": float(p.amount),
            "method": p.method,
            "reference": p.reference,
            "created_at": p.created_at,
        }
        for p in payments
    ]


# ==========================================
# Financial Ledger & Analytics Overview
# ==========================================

def get_ledger_analytics(db: Session):
    today = date.today()
    this_year = today.year
    this_month = today.month

    # All-time
    all_txns = db.query(Transaction).all()
    all_payments = db.query(Payment).all()

    total_revenue = sum(float(t.grand_total) for t in all_txns)
    total_initial_collected = sum(float(t.initial_payment) for t in all_txns)
    total_payments_collected = sum(float(p.amount) for p in all_payments)
    total_collected = total_initial_collected + total_payments_collected
    total_outstanding = sum(float(t.outstanding) for t in all_txns)

    # Today
    today_txns = [t for t in all_txns if t.created_at and t.created_at.date() == today]
    today_payments = [p for p in all_payments if p.created_at and p.created_at.date() == today]
    today_revenue = sum(float(t.grand_total) for t in today_txns)
    today_collected = sum(float(t.initial_payment) for t in today_txns) + sum(float(p.amount) for p in today_payments)
    today_orders_count = len(today_txns)

    # Current month
    month_txns = [
        t for t in all_txns
        if t.created_at and t.created_at.year == this_year and t.created_at.month == this_month
    ]
    month_payments = [
        p for p in all_payments
        if p.created_at and p.created_at.year == this_year and p.created_at.month == this_month
    ]
    month_revenue = sum(float(t.grand_total) for t in month_txns)
    month_collected = sum(float(t.initial_payment) for t in month_txns) + sum(float(p.amount) for p in month_payments)
    month_orders_count = len(month_txns)

    # Revenue by source
    revenue_by_source = {
        "counter": sum(float(t.grand_total) for t in month_txns if t.source == "counter"),
        "customized": sum(float(t.grand_total) for t in month_txns if t.source == "customized"),
        "bulk": sum(float(t.grand_total) for t in month_txns if t.source == "bulk"),
    }
    collected_by_source = {
        "counter": sum(float(t.amount_paid) for t in month_txns if t.source == "counter"),
        "customized": sum(float(t.amount_paid) for t in month_txns if t.source == "customized"),
        "bulk": sum(float(t.initial_payment) for t in month_txns if t.source == "bulk") + sum(float(p.amount) for p in month_payments),
    }

    return {
        "total_revenue": total_revenue,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "today_revenue": today_revenue,
        "today_collected": today_collected,
        "today_orders_count": today_orders_count,
        "month_revenue": month_revenue,
        "month_collected": month_collected,
        "month_orders_count": month_orders_count,
        "revenue_by_source": revenue_by_source,
        "collected_by_source": collected_by_source,
    }
