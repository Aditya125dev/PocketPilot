import io
import pandas as pd
from datetime import datetime, date
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.schemas.csv_import import (
    CsvPreviewRow, CsvPreviewResponse, CsvImportRowError, CsvImportResponse
)

REQUIRED_COLUMNS = ["date", "description", "merchant", "category", "amount"]
OPTIONAL_COLUMNS = ["payment_method", "notes"]

def normalize_column_name(col: str) -> str:
    """Normalize headers: lowercase, stripped, replace spaces/underscores."""
    c = str(col).strip().lower()
    c = c.replace(" ", "_").replace("-", "_")
    mapping = {
        "trans_date": "date",
        "transaction_date": "date",
        "desc": "description",
        "vendor": "merchant",
        "store": "merchant",
        "payee": "merchant",
        "cost": "amount",
        "price": "amount",
        "type": "category",
        "method": "payment_method",
        "note": "notes",
        "memo": "notes"
    }
    return mapping.get(c, c)

def parse_date_safely(date_val: Any) -> Optional[date]:
    """Parse various date formats (ISO YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, etc.)"""
    if pd.isna(date_val):
        return None
    date_str = str(date_val).strip()
    # Try pandas to_datetime first
    try:
        dt = pd.to_datetime(date_str)
        return dt.date()
    except Exception:
        pass
    
    # Try manual fallbacks
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%b %d, %Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def parse_amount_safely(amount_val: Any) -> Optional[float]:
    """Parse amounts like '$12.50', ' 45.00 ', '-$10' etc."""
    if pd.isna(amount_val):
        return None
    s = str(amount_val).strip()
    # Clean currency symbols and commas
    s = s.replace("$", "").replace("€", "").replace("£", "").replace(",", "").strip()
    try:
        val = float(s)
        # Expense amounts should be strictly positive
        val = abs(val)
        if val > 0:
            return round(val, 2)
    except (ValueError, TypeError):
        return None
    return None

def preview_csv_content(content_bytes: bytes, max_preview: int = 10) -> CsvPreviewResponse:
    """Safely validate columns and generate preview rows from raw CSV bytes."""
    try:
        # Read with pandas
        df = pd.read_csv(io.BytesIO(content_bytes), encoding="utf-8-sig")
    except Exception as e:
        return CsvPreviewResponse(
            total_rows=0,
            valid_rows_count=0,
            invalid_rows_count=0,
            sample_preview=[],
            detected_columns=[],
            missing_required_columns=[],
            is_valid_file=False,
            validation_error=f"Malformed CSV: Failed to parse file content. {str(e)}"
        )

    # Normalize columns
    col_map = {orig: normalize_column_name(orig) for orig in df.columns}
    df.rename(columns=col_map, inplace=True)
    detected_cols = list(df.columns)

    missing = [req for req in REQUIRED_COLUMNS if req not in detected_cols]
    if missing:
        return CsvPreviewResponse(
            total_rows=len(df),
            valid_rows_count=0,
            invalid_rows_count=len(df),
            sample_preview=[],
            detected_columns=detected_cols,
            missing_required_columns=missing,
            is_valid_file=False,
            validation_error=f"Missing required columns: {', '.join(missing)}"
        )

    preview_rows: List[CsvPreviewRow] = []
    valid_count = 0
    invalid_count = 0

    for idx, row in df.iterrows():
        row_num = int(idx) + 1
        d_val = parse_date_safely(row.get("date"))
        amt_val = parse_amount_safely(row.get("amount"))
        desc = str(row.get("description", "")).strip() if pd.notna(row.get("description")) else ""
        merchant = str(row.get("merchant", "")).strip() if pd.notna(row.get("merchant")) else ""
        category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""
        method = str(row.get("payment_method", "Card")).strip() if pd.notna(row.get("payment_method")) else "Card"
        notes = str(row.get("notes", "")).strip() if pd.notna(row.get("notes")) else None

        errors = []
        if not d_val:
            errors.append("Invalid or unparseable date")
        if not desc:
            errors.append("Missing description")
        if not merchant:
            errors.append("Missing merchant")
        if not category:
            errors.append("Missing category")
        if amt_val is None or amt_val <= 0:
            errors.append("Invalid or non-positive amount")

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        if len(preview_rows) < max_preview:
            preview_rows.append(
                CsvPreviewRow(
                    row_number=row_num,
                    date=str(d_val) if d_val else str(row.get("date", "")),
                    description=desc or None,
                    merchant=merchant or None,
                    category=category or None,
                    amount=amt_val,
                    payment_method=method,
                    notes=notes,
                    is_valid=is_valid,
                    error_message="; ".join(errors) if errors else None
                )
            )

    return CsvPreviewResponse(
        total_rows=len(df),
        valid_rows_count=valid_count,
        invalid_rows_count=invalid_count,
        sample_preview=preview_rows,
        detected_columns=detected_cols,
        missing_required_columns=[],
        is_valid_file=True,
        validation_error=None
    )

def import_csv_transactions(
    content_bytes: bytes, 
    user_id: int, 
    db: Session
) -> CsvImportResponse:
    """
    Parse CSV, validate each row, check for duplicates against existing DB records,
    and persist valid transactions atomically.
    """
    try:
        df = pd.read_csv(io.BytesIO(content_bytes), encoding="utf-8-sig")
    except Exception as e:
        return CsvImportResponse(
            success=False,
            total_processed=0,
            imported_count=0,
            duplicate_count=0,
            failed_count=0,
            errors=[CsvImportRowError(row_number=0, reason=f"Failed to parse CSV: {str(e)}")],
            message="CSV parsing failed."
        )

    # Normalize columns
    col_map = {orig: normalize_column_name(orig) for orig in df.columns}
    df.rename(columns=col_map, inplace=True)

    missing = [req for req in REQUIRED_COLUMNS if req not in df.columns]
    if missing:
        return CsvImportResponse(
            success=False,
            total_processed=len(df),
            imported_count=0,
            duplicate_count=0,
            failed_count=len(df),
            errors=[CsvImportRowError(row_number=0, reason=f"Missing required columns: {', '.join(missing)}")],
            message=f"Missing columns: {', '.join(missing)}"
        )

    # Load existing user transactions to prevent duplicate imports
    existing_records = (
        db.query(Transaction.date, Transaction.merchant, Transaction.amount, Transaction.description)
        .filter(Transaction.user_id == user_id)
        .all()
    )
    existing_set = {
        (rec[0], str(rec[1]).strip().lower(), round(float(rec[2]), 2), str(rec[3]).strip().lower())
        for rec in existing_records
    }

    new_transactions: List[Transaction] = []
    errors: List[CsvImportRowError] = []
    duplicate_count = 0

    for idx, row in df.iterrows():
        row_num = int(idx) + 1
        d_val = parse_date_safely(row.get("date"))
        amt_val = parse_amount_safely(row.get("amount"))
        desc = str(row.get("description", "")).strip() if pd.notna(row.get("description")) else ""
        merchant = str(row.get("merchant", "")).strip() if pd.notna(row.get("merchant")) else ""
        category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""
        method = str(row.get("payment_method", "Card")).strip() if pd.notna(row.get("payment_method")) else "Card"
        notes = str(row.get("notes", "")).strip() if pd.notna(row.get("notes")) else None

        row_errs = []
        if not d_val:
            row_errs.append("Invalid date format")
        if not desc:
            row_errs.append("Missing description")
        if not merchant:
            row_errs.append("Missing merchant")
        if not category:
            row_errs.append("Missing category")
        if amt_val is None or amt_val <= 0:
            row_errs.append("Invalid or non-positive amount")

        if row_errs:
            errors.append(
                CsvImportRowError(
                    row_number=row_num,
                    reason="; ".join(row_errs),
                    raw_data={k: str(v) for k, v in row.to_dict().items() if pd.notna(v)}
                )
            )
            continue

        # Check duplicate
        signature = (d_val, merchant.lower(), round(amt_val, 2), desc.lower())
        if signature in existing_set:
            duplicate_count += 1
            continue

        existing_set.add(signature) # Prevent intra-file duplicates too
        new_transactions.append(
            Transaction(
                user_id=user_id,
                date=d_val,
                description=desc,
                merchant=merchant,
                category=category,
                amount=amt_val,
                payment_method=method,
                notes=notes
            )
        )

    # Bulk save valid transactions
    if new_transactions:
        db.add_all(new_transactions)
        db.commit()

    total_processed = len(df)
    imported_count = len(new_transactions)
    failed_count = len(errors)

    msg = f"Processed {total_processed} rows: {imported_count} imported, {duplicate_count} skipped as duplicates, {failed_count} rejected."

    return CsvImportResponse(
        success=imported_count > 0 or (duplicate_count > 0 and failed_count == 0),
        total_processed=total_processed,
        imported_count=imported_count,
        duplicate_count=duplicate_count,
        failed_count=failed_count,
        errors=errors[:50], # Return up to 50 errors for display
        message=msg
    )
