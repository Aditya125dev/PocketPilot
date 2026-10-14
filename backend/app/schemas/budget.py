from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class BudgetBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    monthly_limit: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2050)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = Field(default=None, gt=0)

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BudgetStatusResponse(BaseModel):
    id: int
    category: str
    monthly_limit: float
    month: int
    year: int
    spent: float
    remaining: float
    percentage_used: float
    status: str # "normal" (<80%), "warning" (80-99%), "exceeded" (>=100%)
    warning_message: Optional[str] = None

class BudgetOverview(BaseModel):
    total_budget: float
    total_spent: float
    remaining: float
    overall_percentage: float
    budgets: List[BudgetStatusResponse]
