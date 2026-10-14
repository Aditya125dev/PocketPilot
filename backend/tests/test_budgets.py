def test_budget_crud_and_status_warnings(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Invalid budget: negative limit
    invalid_budget = {
        "category": "Food & Dining",
        "monthly_limit": -100.0,
        "month": 4,
        "year": 2026
    }
    inv_res = client.post("/api/budgets", json=invalid_budget, headers=headers)
    assert inv_res.status_code == 422

    # 2. Create budget for Entertainment ($100 limit)
    budget_payload = {
        "category": "Entertainment",
        "monthly_limit": 100.0,
        "month": 4,
        "year": 2026
    }
    res = client.post("/api/budgets", json=budget_payload, headers=headers)
    assert res.status_code == 201
    b_id = res.json()["id"]

    # 3. Add transaction of $85 in Entertainment -> should trigger warning (85% >= 80%)
    client.post(
        "/api/transactions",
        json={
            "date": "2026-04-05",
            "description": "Concert ticket",
            "merchant": "Ticketmaster",
            "category": "Entertainment",
            "amount": 85.0
        },
        headers=headers
    )

    overview_res = client.get("/api/budgets/overview?month=4&year=2026", headers=headers)
    assert overview_res.status_code == 200
    ov_data = overview_res.json()
    ent_budget = next(b for b in ov_data["budgets"] if b["category"] == "Entertainment")
    assert ent_budget["status"] == "warning"
    assert ent_budget["percentage_used"] == 85.0
    assert "Warning" in ent_budget["warning_message"]

    # 4. Add another transaction of $25 -> total $110 -> should trigger "exceeded" (>= 100%)
    client.post(
        "/api/transactions",
        json={
            "date": "2026-04-12",
            "description": "Movie night",
            "merchant": "AMC",
            "category": "Entertainment",
            "amount": 25.0
        },
        headers=headers
    )

    overview_res2 = client.get("/api/budgets/overview?month=4&year=2026", headers=headers)
    ov_data2 = overview_res2.json()
    ent_budget2 = next(b for b in ov_data2["budgets"] if b["category"] == "Entertainment")
    assert ent_budget2["status"] == "exceeded"
    assert ent_budget2["spent"] == 110.0
    assert ent_budget2["percentage_used"] == 110.0
    assert "Alert" in ent_budget2["warning_message"]

    # 5. Delete budget
    del_res = client.delete(f"/api/budgets/{b_id}", headers=headers)
    assert del_res.status_code == 204
