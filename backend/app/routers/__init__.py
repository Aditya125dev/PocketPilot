from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.transactions import router as transactions_router
from app.routers.budgets import router as budgets_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.analytics import router as analytics_router
from app.routers.csv_import import router as csv_router

__all__ = [
    "health_router",
    "auth_router",
    "transactions_router",
    "budgets_router",
    "subscriptions_router",
    "analytics_router",
    "csv_router"
]
