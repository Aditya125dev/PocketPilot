from datetime import date
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.transaction import TransactionResponse
from app.schemas.budget import BudgetStatusResponse
from app.schemas.subscription import SubscriptionResponse

class CategorySpend(BaseModel):
    category: str
    amount: float
    percentage: float
    transaction_count: int

class MonthlyTrend(BaseModel):
    month_name: str # e.g. "2026-03" or "Mar 2026"
    month: int
    year: int
    total_amount: float
    transaction_count: int

class AnomalyItem(BaseModel):
    transaction_id: int
    date: date
    merchant: str
    category: str
    amount: float
    baseline_category_mean: float
    threshold_value: float
    severity: str # "high", "moderate"
    explanation: str
    statistical_rule: str

class DashboardSummary(BaseModel):
    selected_month: int
    selected_year: int
    total_expenses: float
    total_budget: float
    remaining_budget: float
    savings_rate: float # Based on estimated student monthly allowance / budget
    transaction_count: int
    categories: List[CategorySpend]
    monthly_trends: List[MonthlyTrend]
    recent_transactions: List[TransactionResponse]
    budget_warnings: List[BudgetStatusResponse]
    active_subscriptions: List[SubscriptionResponse]
    anomalies: List[AnomalyItem]
    insights: List[str]
