# Mr Bilal Biryani House - Backend API & Database

Production-grade FastAPI + PostgreSQL backend designed specifically for the **Mr Bilal Biryani House** Restaurant POS, Counter Sales, Event Orders, Bulk Corporate Orders, and Financial Ledger.

---

## 1. Architecture Overview

Everything resides in the `backend/` folder:

```
backend/
├── .env                  # Environment variables (DATABASE_URL)
├── database.py           # SQLAlchemy engine, session factory, get_db dependency
├── models.py             # Database schema (Products, Variants, Organizations, Transactions, Payments)
├── schemas.py            # Pydantic v2 schemas for request validation & serialization
├── crud.py               # Domain services, FIFO reconciliation, and financial analytics
├── main.py               # FastAPI application with CORS and complete REST endpoints
├── create_tables.py      # Database table initialization & safe column migrations
├── seed_products.py      # Seed script for the full frontend restaurant menu catalog
├── test_db.py            # Direct database connectivity verification
├── test_api.py           # End-to-end integration test suite for all 10 feature areas
└── venv/                 # Python virtual environment
```

---

## 2. Database Schema (PostgreSQL)

Configured via `DATABASE_URL` in `backend/.env`:

1. **`products`**:
   - `id` (Integer, Primary Key)
   - `name` (String: "Chicken Biryani", "Beef Pulao", "Zarda", etc.)
   - `category` (String: "Biryani", "Pulao", "Desserts", "Extras", "Drinks")
   - `catalog_key` (String: "biryani", "pulao", "zarda", "drinks", "raita", "salad", "custom")
   - `description` (String)
   - `is_available` (Boolean)

2. **`product_variants`**:
   - `id` (Integer, Primary Key)
   - `product_id` (ForeignKey to `products.id`)
   - `label` (String: "Per 250g", "Regular Plate", "1.5 Litre", etc.)
   - `brand` (String: "Pepsi", "Coca-Cola", "7UP" for drinks)
   - `size` (String: "300 ml", "500 ml", "1 Litre", "1.5 Litre", "Jumbo")
   - `weight_grams` (Integer: 250, 500, etc.)
   - `price` (Numeric: Unit price in PKR)
   - `is_available` (Boolean)

3. **`organizations`**:
   - `id` (String: "org-...", Primary Key)
   - `name` (String, Unique)
   - `contact_person`, `phone`, `email`, `address`, `notes`
   - `created_at`, `updated_at` (DateTime with timezone)

4. **`transactions`** (Orders & Bills):
   - `id` (String: "txn-...", Primary Key)
   - `receipt_number` (String, Unique: e.g. `MBBH-261023-...`, `CUS-...`, `BLK-...`)
   - `order_number` (Integer: Daily sequence number, e.g. #1, #2, #3...)
   - `source` (String: "counter", "customized", "bulk")
   - `subtotal`, `discount`, `grand_total`, `initial_payment`, `amount_paid`, `outstanding` (Numeric)
   - `organization_id` (ForeignKey to `organizations.id`)
   - `organization_name`, `customer_name`, `customer_phone`, `notes`, `cart_signature`
   - `created_at` (DateTime with timezone)

5. **`transaction_items`**:
   - `id` (Integer, Primary Key)
   - `transaction_id` (ForeignKey to `transactions.id`)
   - `cart_item_id` (String)
   - `name`, `detail`, `quantity`, `unit_price`, `catalog_key`
   - `receipt_details` (JSON: breakdown of weight, portions, labels)

6. **`payments`**:
   - `id` (String: "payment-...", Primary Key)
   - `organization_id` (ForeignKey to `organizations.id`)
   - `amount` (Numeric)
   - `method` (String: "Cash", "Bank Transfer", "Other")
   - `reference` (String: check/transaction reference)
   - `created_at` (DateTime with timezone)

---

## 3. Key Business Logic

- **Weight-Based Dynamic Pricing**: Scaled from base 250g prices for Biryani and Pulao.
- **Daily Sequential Order Numbers**: Auto-calculates daily resets starting from 1 each day.
- **Counter Quick Bill Settlement**: Counter sales are automatically fully settled at point of sale.
- **FIFO Payment Reconciliation**: When an organization makes an incoming payment, it automatically reconciles against their oldest unpaid transactions first.
- **Financial Ledger & Analytics**: Computes real-time sales, collected cash, outstanding credit receivables, and revenue breakdown by Counter, Event, and Corporate Bulk orders.

---

## 4. REST API Endpoints

### System & Catalog
- `GET /` - Root status
- `GET /api/health` - Health check & PostgreSQL connection status
- `GET /api/config` - Application pricing defaults, weight options, and brand info
- `GET /api/menu` - Full menu with categories and pricing variants
- `GET /api/price?product_id={id}&weight_grams={weight}` - Calculate price for weight
- `GET /api/orders/next-number?date={YYYY-MM-DD}` - Next order sequence number

### Organizations (B2B Clients)
- `GET /api/organizations` - List all organizations with balances (total billed, total paid, due)
- `POST /api/organizations` - Create new client organization
- `GET /api/organizations/{id}` - Organization details
- `PUT /api/organizations/{id}` - Update organization
- `DELETE /api/organizations/{id}` - Remove organization

### Transactions (POS & Orders)
- `GET /api/transactions` - List transactions (filters: `source`, `organization_id`, `range=today|month|custom`)
- `POST /api/transactions` - Save / Checkout order receipt (counter, event, or bulk)
- `GET /api/transactions/{id}` - Transaction details with line items

### Payments
- `GET /api/payments` - List incoming ledger payments
- `POST /api/payments` - Record payment and auto-reconcile outstanding debt

### Financial Ledger
- `GET /api/ledger/overview` - Real-time financial dashboard metrics

---

## 5. Running & Testing

1. **Activate Virtual Environment & Run Dev Server**:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload
   ```
2. **Access Swagger Interactive API Docs**:
   - Open: `http://127.0.0.1:8000/docs`
3. **Execute Comprehensive Test Suite**:
   ```powershell
   .\venv\Scripts\python.exe test_api.py
   ```
