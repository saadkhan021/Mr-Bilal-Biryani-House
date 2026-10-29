from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    Numeric,
    Text,
    DateTime,
    JSON,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # Biryani, Pulao, Extras, Drinks, Desserts
    catalog_key = Column(String(50), nullable=True)  # biryani, pulao, zarda, drinks, raita, salad, custom
    description = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)

    variants = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.price",
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label = Column(String(50), nullable=False)
    brand = Column(String(50), nullable=True)  # e.g., Pepsi, Coca-Cola, 7UP
    size = Column(String(50), nullable=True)   # e.g., 300 ml, 500 ml, 1 Litre, 1.5 Litre, Jumbo
    weight_grams = Column(Integer, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    is_available = Column(Boolean, default=True)

    product = relationship("Product", back_populates="variants")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(64), primary_key=True, index=True)  # org-1, org-173..., or uuid
    name = Column(String(150), unique=True, nullable=False, index=True)
    contact_person = Column(String(100), nullable=True, default="")
    phone = Column(String(50), nullable=True, default="")
    email = Column(String(100), nullable=True, default="")
    address = Column(Text, nullable=True, default="")
    notes = Column(Text, nullable=True, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    transactions = relationship(
        "Transaction",
        back_populates="organization",
        foreign_keys="Transaction.organization_id",
    )
    payments = relationship(
        "Payment",
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="desc(Payment.created_at)",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(64), primary_key=True, index=True)  # txn-173... or uuid
    receipt_number = Column(String(64), unique=True, index=True, nullable=False)
    order_number = Column(Integer, nullable=True)  # Daily sequential number (1, 2, 3...)
    source = Column(String(32), nullable=False, index=True)  # counter, customized, bulk
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    discount = Column(Numeric(12, 2), nullable=False, default=0.0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0.0)
    initial_payment = Column(Numeric(12, 2), nullable=False, default=0.0)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0.0)
    outstanding = Column(Numeric(12, 2), nullable=False, default=0.0)

    organization_id = Column(
        String(64),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    organization_name = Column(String(150), nullable=True)
    customer_name = Column(String(100), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    cart_signature = Column(String(255), nullable=True, index=True)

    organization = relationship("Organization", back_populates="transactions")
    items = relationship(
        "TransactionItem",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(
        String(64),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cart_item_id = Column(String(64), nullable=True)
    name = Column(String(150), nullable=False)
    detail = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    catalog_key = Column(String(50), nullable=True)
    receipt_details = Column(JSON, nullable=True)  # [{label: "Weight", value: "250 g"}]

    transaction = relationship("Transaction", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(64), primary_key=True, index=True)  # payment-173... or uuid
    organization_id = Column(
        String(64),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(String(50), nullable=False, default="Cash")  # Cash, Bank Transfer, Other
    reference = Column(String(100), nullable=True, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    organization = relationship("Organization", back_populates="payments")