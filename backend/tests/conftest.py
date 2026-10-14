import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # Ensure all models are imported and registered
from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.services.auth import hash_password, create_access_token

# Use StaticPool so in-memory SQLite persists across multiple connections in tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(db_session):
    user = User(
        email="student1@university.edu",
        hashed_password=hash_password("Password123!"),
        full_name="Student One"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}", "user_id": user.id}

@pytest.fixture
def auth_headers_user2(db_session):
    user2 = User(
        email="student2@university.edu",
        hashed_password=hash_password("Password456!"),
        full_name="Student Two"
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    return {"Authorization": f"Bearer {token}", "user_id": user2.id}
