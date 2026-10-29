from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Product & Variant Schemas
# ==========================================

class VariantBase(BaseModel):
    label: str
    brand: Optional[str] = None
    size: Optional[str] = None
    weight_grams: Optional[int] = None
    price: float
    is_available: bool = True


class VariantOut(VariantBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str
    category: str
    catalog_key: Optional[str] = None
    description: Optional[str] = None
    is_available: bool = True


class ProductOut(ProductBase):
    id: int
    variants: List[VariantOut] = []
    model_config = ConfigDict(from_attributes=True)


class PriceCalculationResponse(BaseModel):
    product_id: int
    product_name: str
    weight_grams: int
    price: float


# ==========================================
# Organization Schemas
# ==========================================

class OrganizationBase(BaseModel):
    name: str
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""


class OrganizationCreate(OrganizationBase):
    id: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class OrganizationOut(OrganizationBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_billed: float = 0.0
    total_paid: float = 0.0
    outstanding: float = 0.0
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Transaction & Cart Item Schemas
# ==========================================

class ReceiptDetail(BaseModel):
    label: Optional[str] = None
    value: str


class CartItemPayload(BaseModel):
    id: Optional[str] = None
    name: str
    detail: Optional[str] = ""
    quantity: int = 1
    unit_price: float = Field(..., alias="unitPrice")
    catalog_key: Optional[str] = Field(None, alias="catalogKey")
    receipt_details: Optional[List[ReceiptDetail]] = Field(None, alias="receiptDetails")

    model_config = ConfigDict(populate_by_name=True)


class TransactionItemOut(BaseModel):
    id: int
    cart_item_id: Optional[str] = None
    name: str
    detail: Optional[str] = None
    quantity: int
    unit_price: float
    catalog_key: Optional[str] = None
    receipt_details: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionCreate(BaseModel):
    id: Optional[str] = None
    receipt_number: Optional[str] = Field(None, alias="receiptNumber")
    order_number: Optional[int] = Field(None, alias="orderNumber")
    source: str  # counter, customized, bulk
    created_at: Optional[str] = Field(None, alias="createdAt")
    items: List[CartItemPayload]
    subtotal: Optional[float] = None
    discount: Optional[float] = 0.0
    grand_total: Optional[float] = Field(None, alias="grandTotal")
    initial_payment: Optional[float] = Field(0.0, alias="initialPayment")
    amount_paid: Optional[float] = Field(None, alias="amountPaid")
    outstanding: Optional[float] = None
    organization_id: Optional[str] = Field(None, alias="organizationId")
    organization_name: Optional[str] = Field(None, alias="organizationName")
    customer_name: Optional[str] = Field(None, alias="customerName")
    customer_phone: Optional[str] = Field(None, alias="customerPhone")
    notes: Optional[str] = None
    cart_signature: Optional[str] = Field(None, alias="cartSignature")

    model_config = ConfigDict(populate_by_name=True)


class TransactionOut(BaseModel):
    id: str
    receipt_number: str
    order_number: Optional[int] = None
    source: str
    created_at: datetime
    subtotal: float
    discount: float
    grand_total: float
    initial_payment: float
    amount_paid: float
    outstanding: float
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    cart_signature: Optional[str] = None
    items: List[TransactionItemOut] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Payment Schemas
# ==========================================

class PaymentCreate(BaseModel):
    id: Optional[str] = None
    organization_id: str = Field(..., alias="organizationId")
    amount: float
    method: str = "Cash"
    reference: Optional[str] = ""
    created_at: Optional[str] = Field(None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class PaymentOut(BaseModel):
    id: str
    organization_id: str
    organization_name: Optional[str] = None
    amount: float
    method: str
    reference: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Ledger & Analytics Schemas
# ==========================================

class LedgerOverviewOut(BaseModel):
    total_revenue: float
    total_collected: float
    total_outstanding: float
    today_revenue: float
    today_collected: float
    today_orders_count: int
    month_revenue: float
    month_collected: float
    month_orders_count: int
    revenue_by_source: Dict[str, float]
    collected_by_source: Dict[str, float]


class NextOrderNumberResponse(BaseModel):
    date: str
    next_order_number: int


class ConfigResponse(BaseModel):
    rice_prices: Dict[str, float] = Field(..., alias="ricePrices")
    zarda_price: float = Field(..., alias="zardaPrice")
    salad_price: float = Field(..., alias="saladPrice")
    raita_price: float = Field(..., alias="raitaPrice")
    drinks: Dict[str, Dict[str, float]]
    weights: List[int]
    quantities: List[int]
    brand_name: str = Field(..., alias="brandName")
    receipt_prefix: str = Field(..., alias="receiptPrefix")

    model_config = ConfigDict(populate_by_name=True)


class PricesUpdate(BaseModel):
    rice_prices: Optional[Dict[str, float]] = Field(None, alias="ricePrices")
    zarda_price: Optional[float] = Field(None, alias="zardaPrice")
    salad_price: Optional[float] = Field(None, alias="saladPrice")
    raita_price: Optional[float] = Field(None, alias="raitaPrice")
    drinks: Optional[Dict[str, Dict[str, float]]] = None

    model_config = ConfigDict(populate_by_name=True)
