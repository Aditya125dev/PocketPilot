import re
from datetime import date, timedelta
from typing import List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.schemas.subscription import (
    DetectedSubscriptionCandidate, SubscriptionIntelligenceResponse, SubscriptionResponse
)

def normalize_merchant(name: str) -> str:
    """Normalize merchant names by removing common suffixes, payment processor tags, and punctuation."""
    name = name.strip().lower()
    # Remove common patterns like "inc", "llc", "corp", "payment", "bill", etc.
    name = re.sub(r'[\*\#\d]+', '', name) # remove card masks or IDs like *1234
    name = re.sub(r'\b(inc|llc|corp|co|ltd|payment|bill|autopay|sub|recurring)\b', '', name)
    name = re.sub(r'[^\w\s]', '', name)
    return " ".join(name.split())

def detect_subscriptions(user_id: int, db: Session) -> SubscriptionIntelligenceResponse:
    """
    Explainable Subscription Detection Algorithm:
    1. Group all user transactions by normalized merchant name.
    2. Sort transactions per group chronologically.
    3. Filter groups with >= 2 transactions.
    4. Calculate intervals between consecutive payments (in days).
    5. Evaluate interval regularities:
       - Monthly: mean interval 25 - 35 days (std_dev < 5 days)
       - Weekly: mean interval 6 - 8 days (std_dev < 2 days)
       - Bi-weekly: mean interval 13 - 16 days (std_dev < 3 days)
       - Annual: mean interval 350 - 375 days
    6. Evaluate amount variance:
       - Exact or very close amounts (coef_var < 0.05): High confidence
       - Slight variance (coef_var < 0.15, e.g. tax or exchange rate fluctuations): Medium confidence
       - Large variance (coef_var >= 0.20): Low/Irregular -> likely variable shopping/groceries, NOT a subscription
    7. Generate transparent human-readable explanations.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.asc())
        .all()
    )

    saved_subs = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id)
        .all()
    )
    saved_subs_by_merchant = {
        normalize_merchant(sub.merchant_name): sub for sub in saved_subs
    }

    # Group by normalized merchant
    groups: Dict[str, List[Transaction]] = defaultdict(list)
    for tx in transactions:
        norm = normalize_merchant(tx.merchant) or normalize_merchant(tx.description)
        if norm:
            groups[norm].append(tx)

    candidates: List[DetectedSubscriptionCandidate] = []

    for norm_merchant, tx_list in groups.items():
        if len(tx_list) < 2:
            continue

        # Sort dates
        tx_list = sorted(tx_list, key=lambda x: x.date)
        dates = [tx.date for tx in tx_list]
        amounts = [tx.amount for tx in tx_list]
        category = tx_list[-1].category
        original_merchant = tx_list[-1].merchant

        # Calculate consecutive intervals
        intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
        if not intervals:
            continue

        avg_interval = sum(intervals) / len(intervals)
        avg_amount = sum(amounts) / len(amounts)

        # Calculate amount variance (standard deviation / mean)
        amount_std = (sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)) ** 0.5
        amount_cov = amount_std / avg_amount if avg_amount > 0 else 1.0

        # Interval standard deviation
        interval_std = (sum((inv - avg_interval) ** 2 for inv in intervals) / len(intervals)) ** 0.5

        # Classify cycle and confidence
        cycle = "irregular"
        is_candidate = False
        confidence = 0.5
        explanation = ""

        if 25 <= avg_interval <= 35 and interval_std <= 6:
            cycle = "monthly"
            is_candidate = True
        elif 6 <= avg_interval <= 8 and interval_std <= 2:
            cycle = "weekly"
            is_candidate = True
        elif 13 <= avg_interval <= 16 and interval_std <= 3:
            cycle = "bi-weekly"
            is_candidate = True
        elif 340 <= avg_interval <= 380 and interval_std <= 10:
            cycle = "yearly"
            is_candidate = True

        if is_candidate:
            # Score based on amount stability and repetition count
            if amount_cov < 0.05:
                # Nearly identical charges
                if len(tx_list) >= 3:
                    confidence = 0.95
                    confidence_label = "High"
                else:
                    confidence = 0.80
                    confidence_label = "Medium"
                explanation = (
                    f"Detected {len(tx_list)} regular payments averaging ${avg_amount:.2f} spaced "
                    f"~{avg_interval:.0f} days apart with consistent amounts."
                )
            elif amount_cov < 0.15:
                confidence = 0.70
                confidence_label = "Medium"
                explanation = (
                    f"Detected {len(tx_list)} payments averaging ${avg_amount:.2f} spaced ~{avg_interval:.0f} "
                    f"days apart ({cycle}), with slight amount variations (±${amount_std:.2f})."
                )
            else:
                # Large amount variation: could be regular dining/groceries rather than subscription
                confidence = 0.40
                confidence_label = "Potential"
                explanation = (
                    f"Spaced ~{avg_interval:.0f} days apart, but amounts vary significantly (${min(amounts):.2f} - ${max(amounts):.2f}). "
                    f"May be regular lifestyle spending rather than a fixed subscription."
                )

            saved_sub = saved_subs_by_merchant.get(norm_merchant)
            candidate = DetectedSubscriptionCandidate(
                merchant_name=original_merchant,
                category=category,
                estimated_amount=round(avg_amount, 2),
                billing_cycle=cycle,
                frequency_days=int(round(avg_interval)),
                occurrences_count=len(tx_list),
                confidence_score=round(confidence, 2),
                confidence_label=confidence_label,
                explanation=explanation,
                dates=dates,
                amounts=[round(a, 2) for a in amounts],
                is_saved=saved_sub is not None,
                saved_id=saved_sub.id if saved_sub else None,
                saved_status=saved_sub.status if saved_sub else None
            )
            candidates.append(candidate)

    # Sort candidates by confidence desc
    candidates.sort(key=lambda c: (c.confidence_score, c.occurrences_count), reverse=True)

    # Calculate monthly recurring spend from active saved subs OR detected high-confidence candidates
    active_monthly_total = 0.0
    active_count = 0
    
    # First tally explicitly saved active subscriptions
    counted_merchants = set()
    for s in saved_subs:
        if s.status == "active":
            active_count += 1
            counted_merchants.add(normalize_merchant(s.merchant_name))
            if s.billing_cycle == "monthly":
                active_monthly_total += s.amount
            elif s.billing_cycle == "weekly":
                active_monthly_total += s.amount * 4.33
            elif s.billing_cycle == "yearly":
                active_monthly_total += s.amount / 12.0
            else:
                active_monthly_total += s.amount

    # Also include detected high-confidence candidates not yet explicitly added/cancelled
    for c in candidates:
        norm_c = normalize_merchant(c.merchant_name)
        if norm_c not in counted_merchants and c.confidence_score >= 0.75:
            counted_merchants.add(norm_c)
            active_count += 1
            if c.billing_cycle == "monthly":
                active_monthly_total += c.estimated_amount
            elif c.billing_cycle == "weekly":
                active_monthly_total += c.estimated_amount * 4.33
            elif c.billing_cycle == "yearly":
                active_monthly_total += c.estimated_amount / 12.0
            else:
                active_monthly_total += c.estimated_amount

    unreviewed = len([c for c in candidates if not c.is_saved])

    return SubscriptionIntelligenceResponse(
        estimated_monthly_recurring_spend=round(active_monthly_total, 2),
        active_subscriptions_count=active_count,
        saved_subscriptions=[SubscriptionResponse.model_validate(s) for s in saved_subs],
        detected_candidates=candidates,
        unreviewed_alerts_count=unreviewed
    )
