def test_multi_user_data_isolation(client, auth_headers, auth_headers_user2):
    headers_u1 = {"Authorization": auth_headers["Authorization"]}
    headers_u2 = {"Authorization": auth_headers_user2["Authorization"]}

    # 1. User 1 creates a transaction
    tx1_res = client.post(
        "/api/transactions",
        json={
            "date": "2026-04-10",
            "description": "User 1 Private Medical Expense",
            "merchant": "Health Center",
            "category": "Personal Care",
            "amount": 75.00
        },
        headers=headers_u1
    )
    assert tx1_res.status_code == 201
    tx1_id = tx1_res.json()["id"]

    # 2. User 2 lists transactions -> MUST NOT see User 1's transaction
    u2_list = client.get("/api/transactions", headers=headers_u2)
    assert u2_list.status_code == 200
    assert u2_list.json()["total"] == 0
    assert len(u2_list.json()["items"]) == 0

    # 3. User 2 attempts to directly read User 1's transaction by ID -> MUST receive 404
    u2_get = client.get(f"/api/transactions/{tx1_id}", headers=headers_u2)
    assert u2_get.status_code == 404

    # 4. User 2 attempts to edit User 1's transaction -> MUST receive 404
    u2_put = client.put(
        f"/api/transactions/{tx1_id}",
        json={"amount": 1.00},
        headers=headers_u2
    )
    assert u2_put.status_code == 404

    # 5. User 2 attempts to delete User 1's transaction -> MUST receive 404
    u2_del = client.delete(f"/api/transactions/{tx1_id}", headers=headers_u2)
    assert u2_del.status_code == 404

    # 6. Verify User 1's transaction is still intact and unmodified
    u1_get = client.get(f"/api/transactions/{tx1_id}", headers=headers_u1)
    assert u1_get.status_code == 200
    assert u1_get.json()["amount"] == 75.00

    # 7. User 1 creates a budget
    b1_res = client.post(
        "/api/budgets",
        json={
            "category": "Housing & Utilities",
            "monthly_limit": 800.0,
            "month": 4,
            "year": 2026
        },
        headers=headers_u1
    )
    assert b1_res.status_code == 201
    b1_id = b1_res.json()["id"]

    # 8. User 2 lists budgets -> MUST NOT see User 1's budget
    u2_budgets = client.get("/api/budgets", headers=headers_u2)
    assert u2_budgets.status_code == 200
    assert len(u2_budgets.json()) == 0

    # 9. User 2 cannot delete User 1's budget
    u2_bdel = client.delete(f"/api/budgets/{b1_id}", headers=headers_u2)
    assert u2_bdel.status_code == 404
