from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.schemas.subscription import (
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    SubscriptionIntelligenceResponse
)
from app.services.auth import get_current_user
from app.services.subscription_detector import detect_subscriptions

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("/intelligence", response_model=SubscriptionIntelligenceResponse)
def get_subscription_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run explainable subscription detection engine on the user's transactions,
    tally active recurring commitments, and return detection candidates with confidence indicators.
    """
    return detect_subscriptions(user_id=current_user.id, db=db)

@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all saved subscriptions for the user."""
    subs = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.status.asc(), Subscription.amount.desc())
        .all()
    )
    return [SubscriptionResponse.model_validate(s) for s in subs]

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or acknowledge a subscription."""
    existing = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.merchant_name.ilike(sub_in.merchant_name.strip())
        )
        .first()
    )
    if existing:
        existing.status = sub_in.status
        existing.amount = round(sub_in.amount, 2)
        existing.billing_cycle = sub_in.billing_cycle
        existing.explanation = sub_in.explanation
        if sub_in.detected_frequency_days:
            existing.detected_frequency_days = sub_in.detected_frequency_days
        db.commit()
        db.refresh(existing)
        return SubscriptionResponse.model_validate(existing)

    sub = Subscription(
        user_id=current_user.id,
        merchant_name=sub_in.merchant_name.strip(),
        category=sub_in.category.strip(),
        amount=round(sub_in.amount, 2),
        billing_cycle=sub_in.billing_cycle,
        status=sub_in.status,
        confidence_score=sub_in.confidence_score,
        explanation=sub_in.explanation,
        detected_frequency_days=sub_in.detected_frequency_days,
        last_charged_date=sub_in.last_charged_date,
        next_expected_date=sub_in.next_expected_date
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return SubscriptionResponse.model_validate(sub)

@router.put("/{sub_id}/status", response_model=SubscriptionResponse)
def update_subscription_status(
    sub_id: int,
    status_update: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update status of a subscription (active, cancelled, or under_review)."""
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if status_update.status:
        sub.status = status_update.status
    if status_update.amount:
        sub.amount = round(status_update.amount, 2)
    if status_update.billing_cycle:
        sub.billing_cycle = status_update.billing_cycle

    db.commit()
    db.refresh(sub)
    return SubscriptionResponse.model_validate(sub)

@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved subscription record."""
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    db.delete(sub)
    db.commit()
    return None
