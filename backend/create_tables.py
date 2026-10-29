
from sqlalchemy import inspect, text
from database import engine
from models import Base


def init_db():
    # Create missing tables first
    Base.metadata.create_all(bind=engine)

    # Add missing columns to existing tables
    with engine.begin() as connection:
        inspector = inspect(connection)

        migrations = {
            "products": {
                "catalog_key": "VARCHAR(50)",
                "description": "VARCHAR(255)",
            },
            "product_variants": {
                "brand": "VARCHAR(50)",
                "size": "VARCHAR(50)",
            },
        }

        for table_name, columns in migrations.items():
            existing_columns = {
                column["name"]
                for column in inspector.get_columns(table_name)
            }

            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f'ALTER TABLE "{table_name}" '
                            f'ADD COLUMN "{column_name}" {column_type}'
                        )
                    )

    print("All database tables created or verified successfully!")


if __name__ == "__main__":
    init_db()
