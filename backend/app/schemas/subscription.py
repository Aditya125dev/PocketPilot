from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class SubscriptionBase(BaseModel):
    merchant_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Subscriptions", max_length=100)
    amount: float = Field(..., gt=0)
    billing_cycle: str = Field(default="monthly", max_length=50) # monthly, weekly, yearly, irregular
    status: str = Field(default="active", pattern="^(active|cancelled|under_review)$")
    confidence_score: float = Field(default=0.7, ge=0.0, le=1.0)
    explanation: str = Field(..., max_length=500)
    detected_frequency_days: Optional[int] = None
    last_charged_date: Optional[date] = None
    next_expected_date: Optional[date] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(active|cancelled|under_review)$")
    amount: Optional[float] = Field(default=None, gt=0)
    billing_cycle: Optional[str] = Field(default=None, max_length=50)

class SubscriptionResponse(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DetectedSubscriptionCandidate(BaseModel):
    merchant_name: str
    category: str
    estimated_amount: float
    billing_cycle: str
    frequency_days: int
    occurrences_count: int
    confidence_score: float # 0.0 - 1.0
    confidence_label: str # "High", "Medium", "Potential"
    explanation: str
    dates: List[date]
    amounts: List[float]
    is_saved: bool = False
    saved_id: Optional[int] = None
    saved_status: Optional[str] = None

class SubscriptionIntelligenceResponse(BaseModel):
    estimated_monthly_recurring_spend: float
    active_subscriptions_count: int
    saved_subscriptions: List[SubscriptionResponse]
    detected_candidates: List[DetectedSubscriptionCandidate]
    unreviewed_alerts_count: int
