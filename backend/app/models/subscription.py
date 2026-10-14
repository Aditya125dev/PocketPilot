from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    merchant_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, default="Subscriptions")
    amount = Column(Float, nullable=False)
    billing_cycle = Column(String(50), nullable=False, default="monthly") # monthly, weekly, yearly, irregular
    detected_frequency_days = Column(Integer, nullable=True) # e.g. 30
    status = Column(String(50), nullable=False, default="active") # active, cancelled, under_review
    confidence_score = Column(Float, nullable=False, default=0.8) # 0.0 - 1.0
    explanation = Column(String(500), nullable=False)
    last_charged_date = Column(Date, nullable=True)
    next_expected_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="subscriptions")

    __table_args__ = (
        Index("ix_user_subscription_status", "user_id", "status"),
    )
