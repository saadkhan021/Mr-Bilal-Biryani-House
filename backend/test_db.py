from database import test_connection

if test_connection():
    print("PostgreSQL connected successfully!")