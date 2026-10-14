from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.csv_import import CsvPreviewResponse, CsvImportResponse
from app.services.auth import get_current_user
from app.services.csv_service import preview_csv_content, import_csv_transactions

router = APIRouter(prefix="/csv", tags=["CSV Import"])

@router.post("/preview", response_model=CsvPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Preview uploaded CSV file without modifying database.
    Validates required columns, checks file size, and previews parsed records.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a .csv file."
        )

    content = await file.read()
    if len(content) > settings.MAX_CSV_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_CSV_FILE_SIZE_BYTES / (1024 * 1024):.1f} MB."
        )

    if len(content.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty."
        )

    preview_result = preview_csv_content(content_bytes=content, max_preview=10)
    return preview_result

@router.post("/upload", response_model=CsvImportResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process and import transactions from CSV file.
    Validates columns, skips duplicate transactions, and imports valid records.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a .csv file."
        )

    content = await file.read()
    if len(content) > settings.MAX_CSV_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_CSV_FILE_SIZE_BYTES / (1024 * 1024):.1f} MB."
        )

    if len(content.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty."
        )

    import_result = import_csv_transactions(
        content_bytes=content,
        user_id=current_user.id,
        db=db
    )
    return import_result
