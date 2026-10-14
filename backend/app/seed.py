"""
PocketPilot — Synthetic Demo Data Seeder
Generates realistic, completely synthetic student financial transaction history
and category budgets for testing and evaluation.

DISCLAIMER: All names, transactions, merchants, and amounts are entirely synthetic
and simulated for demonstration of student financial analysis algorithms.
"""

from datetime import date, timedelta
from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.subscription import Subscription
from app.services.auth import hash_password

def seed_demo_data(email: str = "demo@student.edu", password: str = "PocketPilot2026!"):
    init_db()
    db = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=hash_password(password),
                full_name="Alex Chen (Student Demo)"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[Seed] Created demo user: {email}")
        else:
            print(f"[Seed] Found existing demo user: {email}")

        # Clear previous transactions, budgets, subscriptions for this user
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        db.query(Budget).filter(Budget.user_id == user.id).delete()
        db.query(Subscription).filter(Subscription.user_id == user.id).delete()
        db.commit()

        today = date.today()
        current_month = today.month
        current_year = today.year

        # 1. Create realistic category budgets for student
        budgets_data = [
            ("Food & Dining", 350.0),
            ("Housing & Utilities", 850.0),
            ("Books & Supplies", 120.0),
            ("Entertainment", 100.0),
            ("Subscriptions", 45.0),
            ("Transportation", 75.0),
            ("Personal Care", 60.0),
        ]
        for cat, limit in budgets_data:
            b = Budget(
                user_id=user.id,
                category=cat,
                monthly_limit=limit,
                month=current_month,
                year=current_year
            )
            db.add(b)

        # 2. Generate multi-month synthetic transactions (last 90 days)
        # Includes clear recurring subscription patterns, everyday student spending, and 2 distinct anomalies
        txs = []

        # Recurring Subscriptions:
        # Spotify Student: $5.99 exactly every ~30 days
        for offset_days in (75, 45, 15):
            tx_date = today - timedelta(days=offset_days)
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=tx_date,
                    merchant="Spotify",
                    description="Spotify Student Premium monthly subscription",
                    category="Subscriptions",
                    amount=5.99,
                    payment_method="Card",
                    notes="Synthetic recurring subscription entry"
                )
            )

        # Netflix Standard: $15.49 every ~30 days
        for offset_days in (70, 40, 10):
            tx_date = today - timedelta(days=offset_days)
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=tx_date,
                    merchant="Netflix",
                    description="Netflix Streaming Plan",
                    category="Subscriptions",
                    amount=15.49,
                    payment_method="Card",
                    notes="Synthetic recurring subscription entry"
                )
            )

        # Planet Fitness Gym: $24.99 every ~30 days
        for offset_days in (62, 32, 2):
            tx_date = today - timedelta(days=offset_days)
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=tx_date,
                    merchant="Planet Fitness",
                    description="Monthly gym membership dues",
                    category="Subscriptions",
                    amount=24.99,
                    payment_method="Card",
                    notes="Synthetic recurring gym dues"
                )
            )

        # iCloud Storage: $2.99 every ~30 days
        for offset_days in (80, 50, 20):
            tx_date = today - timedelta(days=offset_days)
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=tx_date,
                    merchant="Apple",
                    description="Apple iCloud+ 200GB storage",
                    category="Subscriptions",
                    amount=2.99,
                    payment_method="Apple Pay",
                    notes="Synthetic cloud storage"
                )
            )

        # Everyday Food & Dining (variable amounts, not subscriptions!)
        food_merchants = [
            ("Trader Joe's", 42.50, "Groceries for the week"),
            ("Campus Cafe", 6.25, "Iced latte and croissant"),
            ("Chipotle", 12.80, "Chicken burrito bowl"),
            ("Trader Joe's", 38.10, "Weekly student groceries"),
            ("Starbucks", 5.95, "Coffee before morning lecture"),
            ("Campus Dining Hall", 11.50, "Lunch buffet with study group"),
            ("Domino's Pizza", 18.40, "Late night study pizza"),
            ("Subway", 8.90, "Quick sandwich between classes"),
            ("Trader Joe's", 47.30, "Produce and dorm snacks"),
            ("Campus Cafe", 4.75, "Cold brew coffee"),
            ("Panda Express", 10.25, "Orange chicken plate"),
            ("Trader Joe's", 35.80, "Mid-week dorm groceries"),
            ("Starbucks", 6.40, "Caramel macchiato"),
            ("Campus Dining Hall", 11.50, "Evening meal"),
        ]
        for i, (m, amt, desc) in enumerate(food_merchants):
            day_offset = (i * 5 + 3) % 85
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=today - timedelta(days=day_offset),
                    merchant=m,
                    description=desc,
                    category="Food & Dining",
                    amount=amt,
                    payment_method="Card"
                )
            )

        # Transportation
        trans_records = [
            ("Metro Transit", 2.50, "Subway fare to campus"),
            ("Metro Transit", 2.50, "Subway fare return"),
            ("Uber", 16.80, "Ride back in rain storm"),
            ("Metro Transit", 2.50, "Campus transit"),
            ("Lyft", 14.20, "Shared ride from airport terminal"),
            ("Metro Transit", 2.50, "Transit to library"),
        ]
        for i, (m, amt, desc) in enumerate(trans_records):
            day_offset = (i * 12 + 4) % 80
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=today - timedelta(days=day_offset),
                    merchant=m,
                    description=desc,
                    category="Transportation",
                    amount=amt,
                    payment_method="Card"
                )
            )

        # Housing & Utilities (Monthly Rent)
        for offset in (65, 35, 5):
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=today - timedelta(days=offset),
                    merchant="University Commons",
                    description="Student apartment monthly rent share",
                    category="Housing & Utilities",
                    amount=750.00,
                    payment_method="Bank Transfer",
                    notes="Synthetic student rent share"
                )
            )

        # Books & Supplies (Regular items + ONE high-value anomaly)
        supplies = [
            ("Campus Bookstore", 24.50, "Lab notebook and highlighters"),
            ("Amazon", 18.99, "Scientific calculator batteries & pens"),
            ("University Print Shop", 8.40, "Poster printing for symposium"),
        ]
        for i, (m, amt, desc) in enumerate(supplies):
            day_offset = (i * 20 + 8) % 75
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=today - timedelta(days=day_offset),
                    merchant=m,
                    description=desc,
                    category="Books & Supplies",
                    amount=amt,
                    payment_method="Card"
                )
            )

        # Anomaly 1: Unusually large $285 textbook purchase in Books & Supplies
        txs.append(
            Transaction(
                user_id=user.id,
                date=today - timedelta(days=12),
                merchant="Campus Bookstore",
                description="Organic Chemistry Textbook + Online Access Code",
                category="Books & Supplies",
                amount=285.00,
                payment_method="Card",
                notes="Large semester textbook purchase flagged by statistical outlier rule"
            )
        )

        # Entertainment
        entertainment_items = [
            ("AMC Theatres", 14.50, "Weekend student movie ticket"),
            ("Steam Games", 19.99, "Indie game discount"),
            ("Campus Bowl", 12.00, "Bowling night with dorm mates"),
        ]
        for i, (m, amt, desc) in enumerate(entertainment_items):
            day_offset = (i * 18 + 7) % 70
            txs.append(
                Transaction(
                    user_id=user.id,
                    date=today - timedelta(days=day_offset),
                    merchant=m,
                    description=desc,
                    category="Entertainment",
                    amount=amt,
                    payment_method="Card"
                )
            )

        # Anomaly 2: $165 Music Festival ticket in Entertainment
        txs.append(
            Transaction(
                user_id=user.id,
                date=today - timedelta(days=8),
                merchant="Ticketmaster",
                description="Spring Weekend Music Festival Pass",
                category="Entertainment",
                amount=165.00,
                payment_method="Card",
                notes="Unusual entertainment expenditure far exceeding typical $15 ticket average"
            )
        )

        db.add_all(txs)
        db.commit()

        # 3. Seed saved subscriptions so user sees active subscriptions right away
        saved_subscriptions = [
            Subscription(
                user_id=user.id,
                merchant_name="Spotify",
                category="Subscriptions",
                amount=5.99,
                billing_cycle="monthly",
                detected_frequency_days=30,
                status="active",
                confidence_score=0.95,
                explanation="Detected 3 regular payments averaging $5.99 spaced ~30 days apart with exact amount consistency.",
                last_charged_date=today - timedelta(days=15),
                next_expected_date=today + timedelta(days=15)
            ),
            Subscription(
                user_id=user.id,
                merchant_name="Netflix",
                category="Subscriptions",
                amount=15.49,
                billing_cycle="monthly",
                detected_frequency_days=30,
                status="active",
                confidence_score=0.95,
                explanation="Detected 3 regular payments averaging $15.49 spaced ~30 days apart with exact amount consistency.",
                last_charged_date=today - timedelta(days=10),
                next_expected_date=today + timedelta(days=20)
            ),
            Subscription(
                user_id=user.id,
                merchant_name="Planet Fitness",
                category="Subscriptions",
                amount=24.99,
                billing_cycle="monthly",
                detected_frequency_days=30,
                status="under_review",
                confidence_score=0.90,
                explanation="Detected 3 recurring payments of $24.99 spaced ~30 days apart.",
                last_charged_date=today - timedelta(days=2),
                next_expected_date=today + timedelta(days=28)
            )
        ]
        db.add_all(saved_subscriptions)
        db.commit()

        print(f"[Seed] Successfully populated database with {len(txs)} synthetic transactions, {len(budgets_data)} budgets, and {len(saved_subscriptions)} subscriptions.")
        return True
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
