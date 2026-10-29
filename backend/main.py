from typing import Optional, List
from datetime import date

from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, test_connection
import crud
from schemas import (
    ProductOut,
    PriceCalculationResponse,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationOut,
    TransactionCreate,
    TransactionOut,
    PaymentCreate,
    PaymentOut,
    LedgerOverviewOut,
    NextOrderNumberResponse,
    ConfigResponse,
    PricesUpdate,
)

app = FastAPI(
    title="Mr Bilal Biryani House POS API",
    version="1.0.0",
    description="Full-featured Point of Sale & Ledger backend for Mr Bilal Biryani House.",
)

# Enable CORS for frontend applications
import os

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# System & Health
# ==========================================

@app.get("/")
def home():
    return {
        "app": "Mr Bilal Biryani House POS Backend",
        "status": "online",
        "docs_url": "/docs",
    }


@app.get("/api/health")
def health():
    db_ok = False
    try:
        db_ok = test_connection()
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


@app.get("/api/config", response_model=ConfigResponse, response_model_by_alias=True)
def get_app_config(db: Session = Depends(get_db)):
    """Returns application configuration and menu prices loaded directly from Supabase."""
    return crud.get_dynamic_config(db)


@app.put("/api/config/prices", response_model=ConfigResponse, response_model_by_alias=True)
@app.post("/api/config/prices", response_model=ConfigResponse, response_model_by_alias=True)
def update_app_prices(
    payload: PricesUpdate,
    db: Session = Depends(get_db),
):
    """Securely update menu, extras, and beverage prices directly in Supabase PostgreSQL."""
    return crud.update_menu_prices(db, payload)


# ==========================================
# Menu & Pricing Endpoints
# ==========================================

@app.get("/api/menu", response_model=List[ProductOut])
def get_menu(db: Session = Depends(get_db)):
    """Fetch complete menu with products, categories, and pricing variants."""
    return crud.get_menu_catalog(db)


@app.get("/api/price", response_model=PriceCalculationResponse)
def calculate_price(
    product_id: int = Query(..., description="Product ID (Biryani or Pulao)"),
    weight_grams: int = Query(..., description="Weight in grams"),
    db: Session = Depends(get_db),
):
    """Calculate dynamic price for rice dishes based on grams."""
    return crud.calculate_weight_price(db, product_id, weight_grams)


@app.get("/api/orders/next-number", response_model=NextOrderNumberResponse)
def get_next_order_number(
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    db: Session = Depends(get_db),
):
    """Get the next daily sequential order number."""
    t_date = date.today()
    if target_date:
        try:
            t_date = date.fromisoformat(target_date)
        except ValueError:
            pass
    next_num = crud.get_next_daily_order_number(db, t_date)
    return {"date": t_date.isoformat(), "next_order_number": next_num}


# ==========================================
# Organizations Endpoints
# ==========================================

@app.get("/api/organizations", response_model=List[OrganizationOut])
def list_organizations(
    search: Optional[str] = Query(None, description="Search by organization name"),
    db: Session = Depends(get_db),
):
    """List all client organizations along with calculated financial balances."""
    return crud.list_organizations(db, search)


@app.post("/api/organizations", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
):
    """Create a new corporate client organization."""
    return crud.create_organization(db, payload)


@app.get("/api/organizations/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
):
    """Get organization by ID."""
    return crud.get_organization(db, org_id)


@app.put("/api/organizations/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
):
    """Update organization details."""
    return crud.update_organization(db, org_id, payload)


@app.delete("/api/organizations/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
):
    """Delete organization."""
    return crud.delete_organization(db, org_id)


# ==========================================
# Transactions (Orders / Receipts) Endpoints
# ==========================================

@app.get("/api/transactions", response_model=List[TransactionOut])
def list_transactions(
    source: Optional[str] = Query(None, description="Filter by source: counter, customized, bulk"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    range_filter: Optional[str] = Query(None, alias="range", description="Date range: today, month, all, custom"),
    start_date: Optional[str] = Query(None, description="Start date ISO string"),
    end_date: Optional[str] = Query(None, description="End date ISO string"),
    db: Session = Depends(get_db),
):
    """List transactions with optional source, date range, or organization filters."""
    return crud.list_transactions(
        db,
        source=source,
        organization_id=organization_id,
        range_filter=range_filter,
        start_date=start_date,
        end_date=end_date,
    )


@app.post("/api/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
):
    """Create or update a transaction (Counter sale, Event order, or Bulk order)."""
    return crud.create_or_update_transaction(db, payload)


@app.get("/api/transactions/{txn_id}", response_model=TransactionOut)
def get_transaction(
    txn_id: str,
    db: Session = Depends(get_db),
):
    """Get single transaction with line items."""
    return crud.get_transaction(db, txn_id)


@app.delete("/api/transactions/{txn_id}")
def delete_transaction(
    txn_id: str,
    db: Session = Depends(get_db),
):
    """Delete a transaction from Supabase database."""
    return crud.delete_transaction(db, txn_id)


# ==========================================
# Payments Endpoints
# ==========================================

@app.get("/api/payments", response_model=List[PaymentOut])
def list_payments(
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    db: Session = Depends(get_db),
):
    """List incoming payment records."""
    return crud.list_payments(db, organization_id)


@app.post("/api/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
):
    """Record payment for an organization and auto-reconcile against outstanding orders."""
    return crud.record_payment(db, payload)


# ==========================================
# Financial Ledger & Analytics Endpoints
# ==========================================

@app.get("/api/ledger/overview", response_model=LedgerOverviewOut)
def get_ledger_overview(db: Session = Depends(get_db)):
    """Fetch high-level financial summary, collection status, and breakdown by source."""
    return crud.get_ledger_analytics(db)
