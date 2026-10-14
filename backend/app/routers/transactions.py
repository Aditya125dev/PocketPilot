import math
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionResponse, TransactionListResponse
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search merchant, description, or notes"),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List transactions for the authenticated user with search, filtering, and pagination."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Transaction.merchant.ilike(search_pattern),
                Transaction.description.ilike(search_pattern),
                Transaction.notes.ilike(search_pattern)
            )
        )

    if category and category != "All":
        query = query.filter(Transaction.category == category)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1

    items = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return TransactionListResponse(
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        items=[TransactionResponse.model_validate(t) for t in items]
    )

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction for the authenticated user."""
    tx = Transaction(
        user_id=current_user.id,
        date=tx_in.date,
        description=tx_in.description.strip(),
        merchant=tx_in.merchant.strip(),
        category=tx_in.category.strip(),
        amount=round(tx_in.amount, 2),
        payment_method=tx_in.payment_method.strip(),
        notes=tx_in.notes.strip() if tx_in.notes else None
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)

@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single transaction (enforcing user isolation)."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    return TransactionResponse.model_validate(tx)

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    tx_in: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing transaction."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    update_data = tx_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if field == "amount":
                setattr(tx, field, round(val, 2))
            elif isinstance(val, str):
                setattr(tx, field, val.strip())
            else:
                setattr(tx, field, val)

    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)

@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    db.delete(tx)
    db.commit()
    return None
