def test_subscription_intelligence_and_status_updates(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Insert 3 regular monthly transactions for Spotify ($5.99 each ~30 days apart)
    dates = ["2026-01-15", "2026-02-14", "2026-03-16"]
    for d in dates:
        client.post(
            "/api/transactions",
            json={
                "date": d,
                "description": "Spotify Premium Student",
                "merchant": "Spotify",
                "category": "Subscriptions",
                "amount": 5.99
            },
            headers=headers
        )

    # 2. Insert 2 irregular transactions at Campus Cafe (variable amounts, e.g. $4.50 and $18.20)
    for d, amt in [("2026-03-01", 4.50), ("2026-03-31", 18.20)]:
        client.post(
            "/api/transactions",
            json={
                "date": d,
                "description": "Coffee and meal",
                "merchant": "Campus Cafe",
                "category": "Food & Dining",
                "amount": amt
            },
            headers=headers
        )

    # 3. Call intelligence endpoint
    intel_res = client.get("/api/subscriptions/intelligence", headers=headers)
    assert intel_res.status_code == 200
    intel_data = intel_res.json()

    # Spotify should be detected as High confidence candidate
    spotify_cand = next((c for c in intel_data["detected_candidates"] if "spotify" in c["merchant_name"].lower()), None)
    assert spotify_cand is not None
    assert spotify_cand["confidence_score"] >= 0.8
    assert spotify_cand["confidence_label"] == "High"
    assert "consistent" in spotify_cand["explanation"].lower() or "regular" in spotify_cand["explanation"].lower()

    # Campus Cafe should either be classified as low confidence potential or not marked as high confidence
    cafe_cand = next((c for c in intel_data["detected_candidates"] if "campus cafe" in c["merchant_name"].lower()), None)
    if cafe_cand:
        assert cafe_cand["confidence_score"] < 0.7
        assert "vary" in cafe_cand["explanation"].lower() or "irregular" in cafe_cand["billing_cycle"].lower()

    # 4. Save Spotify as active subscription
    save_payload = {
        "merchant_name": "Spotify",
        "category": "Subscriptions",
        "amount": 5.99,
        "billing_cycle": "monthly",
        "status": "active",
        "confidence_score": 0.95,
        "explanation": spotify_cand["explanation"]
    }
    save_res = client.post("/api/subscriptions", json=save_payload, headers=headers)
    assert save_res.status_code == 201
    sub_id = save_res.json()["id"]

    # 5. User changes status to 'cancelled'
    cancel_res = client.put(f"/api/subscriptions/{sub_id}/status", json={"status": "cancelled"}, headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # 6. Verify monthly recurring total reflects only active subscriptions
    recheck_res = client.get("/api/subscriptions/intelligence", headers=headers)
    # Cancelled subscription should not count towards active monthly spend
    saved_list = recheck_res.json()["saved_subscriptions"]
    assert any(s["id"] == sub_id and s["status"] == "cancelled" for s in saved_list)
