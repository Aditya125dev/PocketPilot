def test_dashboard_and_anomaly_detection(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Insert historical baseline transactions for "Books & Supplies"
    # 5 transactions with typical student prices ($15 - $25)
    typical_amounts = [15.0, 20.0, 18.5, 22.0, 19.5]
    for i, amt in enumerate(typical_amounts):
        client.post(
            "/api/transactions",
            json={
                "date": f"2026-04-0{i+1}",
                "description": f"Notebook {i+1}",
                "merchant": "Campus Store",
                "category": "Books & Supplies",
                "amount": amt
            },
            headers=headers
        )

    # 2. Insert one huge anomaly: $290 textbook
    client.post(
        "/api/transactions",
        json={
            "date": "2026-04-10",
            "description": "Organic Chemistry Textbook",
            "merchant": "Campus Store",
            "category": "Books & Supplies",
            "amount": 290.0
        },
        headers=headers
    )

    # 3. Request anomaly detection endpoint
    anomaly_res = client.get("/api/analytics/anomalies", headers=headers)
    assert anomaly_res.status_code == 200
    anomalies = anomaly_res.json()
    assert len(anomalies) >= 1

    flagged = next(a for a in anomalies if a["amount"] == 290.0)
    assert flagged["category"] == "Books & Supplies"
    assert "Mean" in flagged["statistical_rule"] or "Standard Deviation" in flagged["statistical_rule"]
    assert "significantly higher" in flagged["explanation"]
    assert flagged["baseline_category_mean"] < 70.0 # Historical mean is low

    # 4. Request full dashboard summary
    dash_res = client.get("/api/analytics/dashboard?month=4&year=2026", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_expenses"] == round(sum(typical_amounts) + 290.0, 2)
    assert dash_data["transaction_count"] == 6
    assert len(dash_data["categories"]) >= 1
    assert dash_data["categories"][0]["category"] == "Books & Supplies"
    assert len(dash_data["anomalies"]) >= 1
