import io

def test_csv_preview_and_import(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Test preview with valid CSV content
    valid_csv = """date,merchant,category,amount,description
2026-04-01,Starbucks,Food & Dining,5.75,Morning latte
2026-04-02,Target,Personal Care,14.20,Shampoo and soap
2026-04-03,Campus Bookstore,Books & Supplies,28.00,Lab notebook
"""
    files = {"file": ("test_expenses.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    preview_res = client.post("/api/csv/preview", files=files, headers=headers)
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["is_valid_file"] is True
    assert pdata["total_rows"] == 3
    assert pdata["valid_rows_count"] == 3

    # 2. Test actual import
    files = {"file": ("test_expenses.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    import_res = client.post("/api/csv/upload", files=files, headers=headers)
    assert import_res.status_code == 200
    idata = import_res.json()
    assert idata["success"] is True
    assert idata["imported_count"] == 3
    assert idata["duplicate_count"] == 0

    # 3. Prevent duplicate imports (importing same file again should skip existing rows)
    files_again = {"file": ("test_expenses.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    import_res2 = client.post("/api/csv/upload", files=files_again, headers=headers)
    assert import_res2.status_code == 200
    idata2 = import_res2.json()
    assert idata2["imported_count"] == 0
    assert idata2["duplicate_count"] == 3 # All 3 recognized as duplicates

    # 4. Reject malformed CSV missing required column
    bad_csv = """date,category,amount
2026-04-01,Food & Dining,10.00
"""
    files_bad = {"file": ("bad.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    bad_preview = client.post("/api/csv/preview", files=files_bad, headers=headers)
    assert bad_preview.status_code == 200
    assert bad_preview.json()["is_valid_file"] is False
    assert "Missing required columns" in bad_preview.json()["validation_error"]
