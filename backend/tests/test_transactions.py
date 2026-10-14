from datetime import date

def test_transaction_crud_and_validation(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Invalid transaction: negative amount
    invalid_tx = {
        "date": "2026-04-10",
        "description": "Late night pizza",
        "merchant": "Domino's",
        "category": "Food & Dining",
        "amount": -15.50
    }
    inv_res = client.post("/api/transactions", json=invalid_tx, headers=headers)
    assert inv_res.status_code == 422 # Pydantic validation error

    # 2. Valid transaction creation
    valid_tx = {
        "date": "2026-04-10",
        "description": "Biology Lab manual",
        "merchant": "Campus Bookstore",
        "category": "Books & Supplies",
        "amount": 42.50,
        "payment_method": "Card",
        "notes": "Course requirement"
    }
    create_res = client.post("/api/transactions", json=valid_tx, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    tx_id = created_data["id"]
    assert created_data["amount"] == 42.50
    assert created_data["merchant"] == "Campus Bookstore"

    # 3. Retrieve single transaction
    get_res = client.get(f"/api/transactions/{tx_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["description"] == "Biology Lab manual"

    # 4. Update transaction
    update_res = client.put(
        f"/api/transactions/{tx_id}",
        json={"amount": 45.00, "notes": "Updated price with lab goggles"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["amount"] == 45.00
    assert "lab goggles" in update_res.json()["notes"]

    # 5. List and search transactions
    list_res = client.get("/api/transactions?search=Bookstore", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == tx_id

    # 6. Delete transaction
    del_res = client.delete(f"/api/transactions/{tx_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Verify deletion
    verify_res = client.get(f"/api/transactions/{tx_id}", headers=headers)
    assert verify_res.status_code == 404
