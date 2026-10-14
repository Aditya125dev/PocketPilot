def test_register_and_login_flow(client):
    # 1. Register new user
    reg_payload = {
        "email": "freshman@college.edu",
        "password": "SecretStudent99!",
        "full_name": "Freshman Jane"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "freshman@college.edu"
    assert reg_data["user"]["full_name"] == "Freshman Jane"

    # 2. Duplicate registration rejected
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Login with correct credentials
    login_payload = {
        "email": "freshman@college.edu",
        "password": "SecretStudent99!"
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 4. Access protected profile
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "freshman@college.edu"

    # 5. Login with invalid password rejected
    bad_login = {
        "email": "freshman@college.edu",
        "password": "WrongPassword!"
    }
    bad_res = client.post("/api/auth/login", json=bad_login)
    assert bad_res.status_code == 401
