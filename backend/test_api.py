import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:8000"


def request(method: str, path: str, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if data else {}
    req_body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            return status_code, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed


def run_tests():
    print("--- 1. Testing Root and Health Endpoints ---")
    status, res = request("GET", "/")
    assert status == 200, f"Expected 200, got {status}"
    print("Root response:", res)

    status, res = request("GET", "/api/health")
    assert status == 200
    assert res["database"] == "connected"
    print("Health response:", res)

    print("\n--- 2. Testing Config Endpoint ---")
    status, cfg = request("GET", "/api/config")
    assert status == 200
    brand_name = cfg.get("brandName") or cfg.get("brand_name")
    receipt_prefix = cfg.get("receiptPrefix") or cfg.get("receipt_prefix")
    assert brand_name == "Mr Bilal Biryani House"
    assert receipt_prefix == "MBBH"
    print("Brand config:", brand_name, "| Prefix:", receipt_prefix)

    print("\n--- 3. Testing Menu & Pricing Endpoints ---")
    status, menu = request("GET", "/api/menu")
    assert status == 200
    print(f"Loaded {len(menu)} products from menu.")
    assert len(menu) >= 8

    # Find Chicken Biryani
    chicken_biryani = next((p for p in menu if "Chicken" in p["name"]), None)
    assert chicken_biryani is not None
    print("Found product:", chicken_biryani["name"], "with ID", chicken_biryani["id"])

    # Test Price calculation for 500g
    status, price_data = request("GET", f"/api/price?product_id={chicken_biryani['id']}&weight_grams=500")
    assert status == 200
    assert price_data["price"] == 260.0  # 130 * 2 = 260
    print(f"Calculated 500g price for {chicken_biryani['name']}: Rs. {price_data['price']}")

    print("\n--- 4. Testing Order Number Sequence ---")
    status, order_num_data = request("GET", "/api/orders/next-number")
    assert status == 200
    next_order_num = order_num_data["next_order_number"]
    print("Next daily order number:", next_order_num)

    print("\n--- 5. Testing Organizations CRUD ---")
    test_org_name = f"Al-Noor Banquet {int(time.time())}"
    org_payload = {
        "name": test_org_name,
        "contact_person": "Haji Tariq",
        "phone": "0300-1234567",
        "email": "tariq@alnoor.pk",
        "address": "Gulshan-e-Iqbal, Karachi",
        "notes": "Premium wedding banquet client",
    }
    status, org = request("POST", "/api/organizations", org_payload)
    assert status == 201, f"Expected 201, got {status}: {org}"
    print("Created organization:", org["name"], "ID:", org["id"])

    print("\n--- 6. Testing Counter Sale Transaction ---")
    counter_txn_payload = {
        "source": "counter",
        "items": [
            {
                "id": "item-1",
                "name": "Chicken Biryani",
                "detail": "Weight 500 g · Qty 2",
                "quantity": 2,
                "unitPrice": 260.0,
                "catalogKey": "biryani",
                "receiptDetails": [{"label": "Weight", "value": "500 g"}],
            },
            {
                "id": "item-2",
                "name": "Pepsi",
                "detail": "1.5 Litre · Qty 1",
                "quantity": 1,
                "unitPrice": 180.0,
                "catalogKey": "drinks",
            },
        ],
        "discount": 0.0,
    }
    status, counter_txn = request("POST", "/api/transactions", counter_txn_payload)
    assert status == 201, f"Error creating counter transaction: {counter_txn}"
    assert counter_txn["subtotal"] == 700.0  # 260*2 + 180 = 700
    assert counter_txn["grand_total"] == 700.0
    assert counter_txn["amount_paid"] == 700.0
    assert counter_txn["outstanding"] == 0.0
    print("Counter sale created:", counter_txn["receipt_number"], "| Grand Total: Rs.", counter_txn["grand_total"])

    print("\n--- 7. Testing Bulk Order with Advance Payment ---")
    bulk_txn_payload = {
        "source": "bulk",
        "organizationId": org["id"],
        "organizationName": org["name"],
        "customerName": "Haji Tariq",
        "customerPhone": "0300-1234567",
        "notes": "Valima Function 25 Degs",
        "items": [
            {
                "id": "bulk-1",
                "name": "Beef Pulao (Bulk Deg)",
                "detail": "10 kg per deg · Qty 2",
                "quantity": 2,
                "unitPrice": 6000.0,
                "catalogKey": "pulao",
            },
            {
                "id": "bulk-2",
                "name": "Zarda (Sweet Rice)",
                "detail": "Large banquet tray · Qty 2",
                "quantity": 2,
                "unitPrice": 1500.0,
                "catalogKey": "zarda",
            },
        ],
        "discount": 500.0,
        "initialPayment": 5000.0,  # Total: 12000 + 3000 - 500 = 14500. Paid: 5000. Due: 9500
    }
    status, bulk_txn = request("POST", "/api/transactions", bulk_txn_payload)
    assert status == 201, f"Error creating bulk transaction: {bulk_txn}"
    assert bulk_txn["subtotal"] == 15000.0
    assert bulk_txn["discount"] == 500.0
    assert bulk_txn["grand_total"] == 14500.0
    assert bulk_txn["initial_payment"] == 5000.0
    assert bulk_txn["outstanding"] == 9500.0
    print("Bulk order created:", bulk_txn["receipt_number"], "| Total: Rs.", bulk_txn["grand_total"], "| Due: Rs.", bulk_txn["outstanding"])

    print("\n--- 8. Testing Organization Balance Inspection ---")
    status, org_updated = request("GET", f"/api/organizations/{org['id']}")
    assert status == 200
    assert org_updated["outstanding"] >= 9500.0
    print(f"Organization '{org['name']}' - Total Billed: Rs. {org_updated['total_billed']}, Outstanding: Rs. {org_updated['outstanding']}")

    print("\n--- 9. Testing Incoming Payment & Automatic Reconciliation ---")
    payment_payload = {
        "organizationId": org["id"],
        "amount": 4000.0,
        "method": "Bank Transfer",
        "reference": "TXN-MEEZAN-9921",
    }
    status, payment = request("POST", "/api/payments", payment_payload)
    assert status == 201, f"Error recording payment: {payment}"
    print("Recorded payment of Rs.", payment["amount"], "Ref:", payment["reference"])

    # Check updated bulk transaction remaining balance
    status, reconciled_txn = request("GET", f"/api/transactions/{bulk_txn['id']}")
    assert status == 200
    assert reconciled_txn["amount_paid"] == 9000.0  # 5000 initial + 4000
    assert reconciled_txn["outstanding"] == 5500.0  # 9500 - 4000 = 5500
    print(f"Reconciled transaction {reconciled_txn['receipt_number']}: Paid Rs. {reconciled_txn['amount_paid']}, Remaining Due Rs. {reconciled_txn['outstanding']}")

    print("\n--- 10. Testing Financial Ledger Analytics ---")
    status, ledger = request("GET", "/api/ledger/overview")
    assert status == 200
    print("Ledger overview:")
    print("  Total Revenue: Rs.", ledger["total_revenue"])
    print("  Total Collected: Rs.", ledger["total_collected"])
    print("  Total Outstanding: Rs.", ledger["total_outstanding"])
    print("  Today Revenue: Rs.", ledger["today_revenue"])
    print("  Month Revenue: Rs.", ledger["month_revenue"])
    print("  Revenue by Source:", ledger["revenue_by_source"])
    print("  Collected by Source:", ledger["collected_by_source"])

    print("\n>>> ALL 10 BACKEND API TESTS PASSED SUCCESSFULLY ON POSTGRESQL! <<<")


if __name__ == "__main__":
    run_tests()
