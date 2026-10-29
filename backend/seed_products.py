from decimal import Decimal
from database import SessionLocal
from models import Product, ProductVariant

MENU_CATALOG = [
    {
        "name": "Chicken Biryani",
        "category": "Biryani",
        "catalog_key": "biryani",
        "description": "Fragrant basmati rice cooked with tender spiced chicken pieces and aromatic saffron herbs.",
        "variants": [
            {"label": "Per 250g", "weight_grams": 250, "price": 130},
        ],
    },
    {
        "name": "Beef Pulao",
        "category": "Pulao",
        "catalog_key": "pulao",
        "description": "Slow-simmered beef broth infused in long-grain basmati rice with succulent beef chunks.",
        "variants": [
            {"label": "Per 250g", "weight_grams": 250, "price": 150},
        ],
    },
    {
        "name": "Sada Biryani",
        "category": "Biryani",
        "catalog_key": "biryani",
        "description": "Flavour-packed classic biryani rice without meat, steeped in traditional spices.",
        "variants": [
            {"label": "Per 250g", "weight_grams": 250, "price": 100},
        ],
    },
    {
        "name": "Sada Pulao",
        "category": "Pulao",
        "catalog_key": "pulao",
        "description": "Delicately spiced aromatic pulao rice cooked in light yakhni seasoning.",
        "variants": [
            {"label": "Per 250g", "weight_grams": 250, "price": 100},
        ],
    },
    {
        "name": "Chana Biryani",
        "category": "Biryani",
        "catalog_key": "biryani",
        "description": "Hearty spiced chickpea biryani cooked to perfection with basmati rice and herbs.",
        "variants": [
            {"label": "Per 250g", "weight_grams": 250, "price": 100},
        ],
    },
    {
        "name": "Zarda (Sweet Rice)",
        "category": "Desserts",
        "catalog_key": "zarda",
        "description": "Traditional celebratory sweet rice infused with saffron, cardamom, and crunchy nuts.",
        "variants": [
            {"label": "Regular Plate", "weight_grams": None, "price": 100},
        ],
    },
    {
        "name": "Fresh Raita",
        "category": "Extras",
        "catalog_key": "raita",
        "description": "Cooling whipped yogurt seasoned with roasted cumin and fresh mint.",
        "variants": [
            {"label": "Regular Bowl", "weight_grams": None, "price": 50},
        ],
    },
    {
        "name": "Fresh Salad",
        "category": "Extras",
        "catalog_key": "salad",
        "description": "Crisp diced cucumbers, onions, tomatoes, and lemon wedges.",
        "variants": [
            {"label": "Regular Plate", "weight_grams": None, "price": 50},
        ],
    },
    {
        "name": "Cold Drinks",
        "category": "Drinks",
        "catalog_key": "drinks",
        "description": "Chilled carbonated soft drinks available in multiple brands and sizes.",
        "variants": [
            # Pepsi
            {"label": "Pepsi 300 ml", "brand": "Pepsi", "size": "300 ml", "weight_grams": 300, "price": 90},
            {"label": "Pepsi 500 ml", "brand": "Pepsi", "size": "500 ml", "weight_grams": 500, "price": 110},
            {"label": "Pepsi 1 Litre", "brand": "Pepsi", "size": "1 Litre", "weight_grams": 1000, "price": 160},
            {"label": "Pepsi 1.5 Litre", "brand": "Pepsi", "size": "1.5 Litre", "weight_grams": 1500, "price": 180},
            {"label": "Pepsi Jumbo", "brand": "Pepsi", "size": "Jumbo", "weight_grams": None, "price": 250},
            # Coca-Cola
            {"label": "Coca-Cola 300 ml", "brand": "Coca-Cola", "size": "300 ml", "weight_grams": 300, "price": 90},
            {"label": "Coca-Cola 500 ml", "brand": "Coca-Cola", "size": "500 ml", "weight_grams": 500, "price": 110},
            {"label": "Coca-Cola 1 Litre", "brand": "Coca-Cola", "size": "1 Litre", "weight_grams": 1000, "price": 160},
            {"label": "Coca-Cola 1.5 Litre", "brand": "Coca-Cola", "size": "1.5 Litre", "weight_grams": 1500, "price": 180},
            {"label": "Coca-Cola Jumbo", "brand": "Coca-Cola", "size": "Jumbo", "weight_grams": None, "price": 250},
            # 7UP
            {"label": "7UP 300 ml", "brand": "7UP", "size": "300 ml", "weight_grams": 300, "price": 90},
            {"label": "7UP 500 ml", "brand": "7UP", "size": "500 ml", "weight_grams": 500, "price": 110},
            {"label": "7UP 1 Litre", "brand": "7UP", "size": "1 Litre", "weight_grams": 1000, "price": 160},
            {"label": "7UP 1.5 Litre", "brand": "7UP", "size": "1.5 Litre", "weight_grams": 1500, "price": 180},
            {"label": "7UP Jumbo", "brand": "7UP", "size": "Jumbo", "weight_grams": None, "price": 250},
        ],
    },
]


def seed_menu():
    db = SessionLocal()
    try:
        for item in MENU_CATALOG:
            # Check if product exists by name or by matching category / catalog_key
            product = (
                db.query(Product)
                .filter(
                    (Product.name == item["name"])
                    | ((Product.name == "Cold Drink") & (item["name"] == "Cold Drinks"))
                )
                .first()
            )

            if product is None:
                product = Product(
                    name=item["name"],
                    category=item["category"],
                    catalog_key=item["catalog_key"],
                    description=item.get("description"),
                    is_available=True,
                )
                db.add(product)
                db.flush()
            else:
                product.name = item["name"]
                product.category = item["category"]
                product.catalog_key = item["catalog_key"]
                product.description = item.get("description")
                product.is_available = True

            # Sync variants
            for v_data in item["variants"]:
                variant = (
                    db.query(ProductVariant)
                    .filter_by(
                        product_id=product.id,
                        label=v_data["label"],
                    )
                    .first()
                )

                if variant is None:
                    variant = ProductVariant(
                        product_id=product.id,
                        label=v_data["label"],
                        brand=v_data.get("brand"),
                        size=v_data.get("size"),
                        weight_grams=v_data.get("weight_grams"),
                        price=Decimal(str(v_data["price"])),
                        is_available=True,
                    )
                    db.add(variant)
                else:
                    variant.brand = v_data.get("brand")
                    variant.size = v_data.get("size")
                    variant.weight_grams = v_data.get("weight_grams")
                    variant.price = Decimal(str(v_data["price"]))
                    variant.is_available = True

        db.commit()
        print("Menu items and variants successfully seeded/updated!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding menu: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_menu()
