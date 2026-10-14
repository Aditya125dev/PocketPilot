from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, BudgetResponse, BudgetOverview
)
from app.services.auth import get_current_user
from app.services.budget_service import calculate_budget_statuses

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.get("", response_model=List[BudgetResponse])
def list_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List budgets for the authenticated user."""
    query = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month is not None:
        query = query.filter(Budget.month == month)
    if year is not None:
        query = query.filter(Budget.year == year)

    budgets = query.order_by(Budget.year.desc(), Budget.month.desc(), Budget.category.asc()).all()
    return [BudgetResponse.model_validate(b) for b in budgets]

@router.get("/overview", response_model=BudgetOverview)
def get_budget_overview(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calculated budget statuses (spent vs limit, utilization %, warnings) for a month."""
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    return calculate_budget_statuses(
        user_id=current_user.id,
        month=target_month,
        year=target_year,
        db=db
    )

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    b_in: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a monthly category budget."""
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category.ilike(b_in.category.strip()),
            Budget.month == b_in.month,
            Budget.year == b_in.year
        )
        .first()
    )
    if existing:
        # Update existing budget limit
        existing.monthly_limit = round(b_in.monthly_limit, 2)
        db.commit()
        db.refresh(existing)
        return BudgetResponse.model_validate(existing)

    budget = Budget(
        user_id=current_user.id,
        category=b_in.category.strip(),
        monthly_limit=round(b_in.monthly_limit, 2),
        month=b_in.month,
        year=b_in.year
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return BudgetResponse.model_validate(budget)

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    b_in: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a budget monthly limit."""
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")

    if b_in.monthly_limit is not None:
        budget.monthly_limit = round(b_in.monthly_limit, 2)
    db.commit()
    db.refresh(budget)
    return BudgetResponse.model_validate(budget)

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a budget entry."""
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")

    db.delete(budget)
    db.commit()
    return None
