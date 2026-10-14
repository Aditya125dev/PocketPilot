from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.schemas.insight import (
    DashboardSummary, CategorySpend, MonthlyTrend, AnomalyItem
)
from app.schemas.transaction import TransactionResponse
from app.schemas.subscription import SubscriptionResponse
from app.services.auth import get_current_user
from app.services.budget_service import calculate_budget_statuses
from app.services.anomaly_detector import detect_anomalies

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])

@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Produce comprehensive dashboard metrics directly from persistent database records.
    Derives expenses, budget statuses, trends, category distributions, recent activity,
    and statistical alerts.
    """
    today = date.today()
    sel_month = month or today.month
    sel_year = year or today.year

    # 1. Total expenses for selected month
    expenses_query = (
        db.query(
            func.coalesce(func.sum(Transaction.amount), 0.0).label("total"),
            func.count(Transaction.id).label("count")
        )
        .filter(
            Transaction.user_id == current_user.id,
            extract("month", Transaction.date) == sel_month,
            extract("year", Transaction.date) == sel_year
        )
        .first()
    )
    total_expenses = float(expenses_query[0]) if expenses_query else 0.0
    tx_count = int(expenses_query[1]) if expenses_query else 0

    # 2. Budgets & warnings
    budget_overview = calculate_budget_statuses(
        user_id=current_user.id,
        month=sel_month,
        year=sel_year,
        db=db
    )
    total_budget = budget_overview.total_budget
    remaining_budget = max(total_budget - total_expenses, 0.0)

    # 3. Savings Rate:
    # If total budget is defined, savings rate = max(0, (total_budget - total_expenses) / total_budget * 100)
    # Default to 0.0 if total budget is 0
    savings_rate = 0.0
    if total_budget > 0:
        savings_rate = max(0.0, round(((total_budget - total_expenses) / total_budget) * 100.0, 1))

    # 4. Spending Category Breakdown
    cat_query = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("cat_total"),
            func.count(Transaction.id).label("cat_count")
        )
        .filter(
            Transaction.user_id == current_user.id,
            extract("month", Transaction.date) == sel_month,
            extract("year", Transaction.date) == sel_year
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    categories: List[CategorySpend] = []
    for row in cat_query:
        amt = float(row[1])
        pct = round((amt / total_expenses * 100.0), 1) if total_expenses > 0 else 0.0
        categories.append(
            CategorySpend(
                category=row[0],
                amount=round(amt, 2),
                percentage=pct,
                transaction_count=int(row[2])
            )
        )

    # 5. Monthly Expense Trends (Last 6 distinct months)
    # Group by year and month
    trend_query = (
        db.query(
            extract("year", Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
            func.sum(Transaction.amount).label("mo_total"),
            func.count(Transaction.id).label("mo_count")
        )
        .filter(Transaction.user_id == current_user.id)
        .group_by(extract("year", Transaction.date), extract("month", Transaction.date))
        .order_by(extract("year", Transaction.date).desc(), extract("month", Transaction.date).desc())
        .limit(6)
        .all()
    )
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trends: List[MonthlyTrend] = []
    for row in reversed(trend_query):
        y = int(row[0])
        m = int(row[1])
        m_label = f"{month_names[m - 1]} {y}"
        monthly_trends.append(
            MonthlyTrend(
                month_name=m_label,
                month=m,
                year=y,
                total_amount=round(float(row[2]), 2),
                transaction_count=int(row[3])
            )
        )

    # 6. Recent Transactions
    recent_txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(6)
        .all()
    )

    # 7. Budget Warnings (exceeded or > 80%)
    warnings = [b for b in budget_overview.budgets if b.status in ("warning", "exceeded")]

    # 8. Active Subscriptions
    active_subs = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id, Subscription.status == "active")
        .all()
    )

    # 9. Statistical Anomalies
    anomalies = detect_anomalies(user_id=current_user.id, db=db, limit=5)

    # 10. Qualitative Insights
    insights: List[str] = []
    if total_budget > 0 and total_expenses > total_budget:
        insights.append(f"Spending exceeds total monthly budget by ${(total_expenses - total_budget):.2f}.")
    elif total_budget > 0:
        insights.append(f"You have ${(total_budget - total_expenses):.2f} remaining within your allocated budget.")
    
    if categories:
        top_cat = categories[0]
        insights.append(f"Top expenditure category is '{top_cat.category}' representing {top_cat.percentage}% of your monthly expenses.")
    
    if len(warnings) > 0:
        insights.append(f"{len(warnings)} category budget(s) require attention.")

    return DashboardSummary(
        selected_month=sel_month,
        selected_year=sel_year,
        total_expenses=round(total_expenses, 2),
        total_budget=round(total_budget, 2),
        remaining_budget=round(remaining_budget, 2),
        savings_rate=savings_rate,
        transaction_count=tx_count,
        categories=categories,
        monthly_trends=monthly_trends,
        recent_transactions=[TransactionResponse.model_validate(t) for t in recent_txs],
        budget_warnings=warnings,
        active_subscriptions=[SubscriptionResponse.model_validate(s) for s in active_subs],
        anomalies=anomalies,
        insights=insights
    )

@router.get("/anomalies", response_model=List[AnomalyItem])
def get_anomalies(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve explainable statistical anomalies for user transactions."""
    return detect_anomalies(user_id=current_user.id, db=db, limit=limit)
