from datetime import date
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetStatusResponse, BudgetOverview

def calculate_budget_statuses(
    user_id: int, 
    month: int, 
    year: int, 
    db: Session
) -> BudgetOverview:
    """
    Calculate spent vs allocated limits for all user budgets in the given month and year.
    Generates status warnings:
    - 'normal': spending < 80% of limit
    - 'warning': spending >= 80% and < 100% of limit (approaching budget cap)
    - 'exceeded': spending >= 100% of limit (over budget)
    """
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.month == month, Budget.year == year)
        .all()
    )

    # If no budgets exist for exact month/year, check if the user has any default budgets created in previous months
    # to maintain continuity for students
    if not budgets:
        # Fetch distinct category budgets from the latest available month
        latest_budget = (
            db.query(Budget)
            .filter(Budget.user_id == user_id)
            .order_by(Budget.year.desc(), Budget.month.desc())
            .first()
        )
        if latest_budget:
            budgets = (
                db.query(Budget)
                .filter(
                    Budget.user_id == user_id, 
                    Budget.month == latest_budget.month, 
                    Budget.year == latest_budget.year
                )
                .all()
            )

    # Get actual spending per category in this month/year
    spending_query = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0.0).label("total_spent")
        )
        .filter(
            Transaction.user_id == user_id,
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year
        )
        .group_by(Transaction.category)
        .all()
    )
    spent_by_category = {row[0].strip().lower(): float(row[1]) for row in spending_query}

    total_budget = sum(b.monthly_limit for b in budgets)
    total_spent = 0.0

    statuses: List[BudgetStatusResponse] = []

    for b in budgets:
        spent = spent_by_category.get(b.category.strip().lower(), 0.0)
        total_spent += spent
        remaining = max(b.monthly_limit - spent, 0.0)
        percentage = round((spent / b.monthly_limit) * 100.0, 1) if b.monthly_limit > 0 else 0.0

        if percentage >= 100.0:
            status = "exceeded"
            warning_msg = f"Alert: You have exceeded your {b.category} budget by ${(spent - b.monthly_limit):.2f} ({percentage}% used)."
        elif percentage >= 80.0:
            status = "warning"
            warning_msg = f"Warning: You have used {percentage}% of your {b.category} budget (${remaining:.2f} remaining)."
        else:
            status = "normal"
            warning_msg = None

        statuses.append(
            BudgetStatusResponse(
                id=b.id,
                category=b.category,
                monthly_limit=round(b.monthly_limit, 2),
                month=month,
                year=year,
                spent=round(spent, 2),
                remaining=round(remaining, 2),
                percentage_used=percentage,
                status=status,
                warning_message=warning_msg
            )
        )

    # Sort so exceeded and warning budgets appear first
    order_map = {"exceeded": 0, "warning": 1, "normal": 2}
    statuses.sort(key=lambda x: (order_map.get(x.status, 2), -x.percentage_used))

    overall_pct = round((total_spent / total_budget) * 100.0, 1) if total_budget > 0 else 0.0
    remaining_overall = max(total_budget - total_spent, 0.0)

    return BudgetOverview(
        total_budget=round(total_budget, 2),
        total_spent=round(total_spent, 2),
        remaining=round(remaining_overall, 2),
        overall_percentage=overall_pct,
        budgets=statuses
    )
