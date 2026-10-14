from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class CsvPreviewRow(BaseModel):
    row_number: int
    date: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = "Card"
    notes: Optional[str] = None
    is_valid: bool
    error_message: Optional[str] = None

class CsvPreviewResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    sample_preview: List[CsvPreviewRow]
    detected_columns: List[str]
    missing_required_columns: List[str]
    is_valid_file: bool
    validation_error: Optional[str] = None

class CsvImportRowError(BaseModel):
    row_number: int
    reason: str
    raw_data: Optional[Dict[str, Any]] = None

class CsvImportResponse(BaseModel):
    success: bool
    total_processed: int
    imported_count: int
    duplicate_count: int
    failed_count: int
    errors: List[CsvImportRowError]
    message: str
