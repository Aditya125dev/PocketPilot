from datetime import date as Date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class TransactionBase(BaseModel):
    date: Date
    description: str = Field(..., min_length=1, max_length=255)
    merchant: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, description="Amount in currency units, must be strictly positive")
    payment_method: str = Field(default="Card", max_length=50)
    notes: Optional[str] = Field(default=None, max_length=500)

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    date: Optional[Date] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    merchant: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    amount: Optional[float] = Field(default=None, gt=0)
    payment_method: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=500)

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TransactionListResponse(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    items: List[TransactionResponse]
