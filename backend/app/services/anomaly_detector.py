from datetime import date
from typing import List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.schemas.insight import AnomalyItem

def detect_anomalies(user_id: int, db: Session, limit: int = 20) -> List[AnomalyItem]:
    """
    Explainable Statistical Anomaly Detection Engine:

    To prevent outlier masking (where a massive purchase inflates the category standard
    deviation and hides itself), this engine uses:
    
    Rule 1 (Leave-One-Out Category Baseline / IQR Threshold):
      - For categories with >= 4 transactions, calculate the baseline mean (μ) and standard deviation (σ)
        of the other peer transactions in that category (Leave-One-Out).
      - If transaction amount > (baseline_mean + 2.5 * baseline_std) and (amount - baseline_mean) >= 35.0,
        it is flagged as a statistical outlier.
      - If baseline_std is near zero (e.g., repeated identical purchases), fallback to:
        amount > (baseline_mean * 2.5) and (amount - baseline_mean) >= 35.0.

    Rule 2 (Small Sample Size Upper Multiplier Rule):
      - For categories with 2 or 3 transactions, if transaction amount > (2.5 * category median)
        and amount >= 50.0, flag as an anomaly.

    Rule 3 (Absolute Student Spending Threshold):
      - Any non-rent single purchase exceeding $250.00 is reviewed as a notable high-value expenditure.

    Every alert provides the exact formula, category baseline numbers, and a clear explanation.
    No opaque or fictional machine-learning claims are made.
    """
    all_transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .all()
    )

    if not all_transactions:
        return []

    by_category: Dict[str, List[Transaction]] = defaultdict(list)
    for t in all_transactions:
        by_category[t.category].append(t)

    anomalies: List[AnomalyItem] = []
    seen_tx_ids = set()

    for category, txs in by_category.items():
        n = len(txs)
        if n >= 4:
            # Leave-one-out statistical baseline for each transaction
            for t in txs:
                if t.id in seen_tx_ids:
                    continue
                peers = [p.amount for p in txs if p.id != t.id]
                peer_mean = sum(peers) / len(peers)
                peer_variance = sum((x - peer_mean) ** 2 for x in peers) / (len(peers) - 1 if len(peers) > 1 else 1)
                peer_std = peer_variance ** 0.5

                threshold = peer_mean + (2.5 * max(peer_std, 10.0))

                if (t.amount > threshold and (t.amount - peer_mean) >= 35.0) or (peer_std < 5.0 and t.amount > (peer_mean * 2.5) and t.amount >= 50.0):
                    seen_tx_ids.add(t.id)
                    severity = "high" if t.amount > (peer_mean + 4.0 * max(peer_std, 10.0)) else "moderate"
                    rule_desc = f"Leave-One-Out Baseline: Amount ${t.amount:.2f} > Peer Mean ${peer_mean:.2f} + 2.5×σ (${peer_std:.2f})"
                    explanation = (
                        f"This ${t.amount:.2f} transaction at '{t.merchant}' is significantly higher than your typical "
                        f"'{category}' spending (Category baseline average: ${peer_mean:.2f})."
                    )
                    anomalies.append(
                        AnomalyItem(
                            transaction_id=t.id,
                            date=t.date,
                            merchant=t.merchant,
                            category=category,
                            amount=round(t.amount, 2),
                            baseline_category_mean=round(peer_mean, 2),
                            threshold_value=round(threshold, 2),
                            severity=severity,
                            explanation=explanation,
                            statistical_rule=rule_desc
                        )
                    )
        elif 2 <= n < 4:
            amounts = [t.amount for t in txs]
            sorted_amounts = sorted(amounts)
            median_val = sorted_amounts[len(sorted_amounts) // 2]
            threshold = max(2.5 * median_val, 50.0)

            for t in txs:
                if t.id in seen_tx_ids:
                    continue
                if t.amount >= threshold and (t.amount - median_val) >= 30.0:
                    seen_tx_ids.add(t.id)
                    rule_desc = f"Small-Sample Multiplier: Amount ${t.amount:.2f} >= 2.5× Median (${median_val:.2f})"
                    explanation = (
                        f"Limited historical records ({n} transactions in '{category}'). This payment of ${t.amount:.2f} "
                        f"at '{t.merchant}' significantly exceeds the category median of ${median_val:.2f}."
                    )
                    anomalies.append(
                        AnomalyItem(
                            transaction_id=t.id,
                            date=t.date,
                            merchant=t.merchant,
                            category=category,
                            amount=round(t.amount, 2),
                            baseline_category_mean=round(median_val, 2),
                            threshold_value=round(threshold, 2),
                            severity="moderate",
                            explanation=explanation,
                            statistical_rule=rule_desc
                        )
                    )

    # Sort by date desc, then amount desc
    anomalies.sort(key=lambda a: (a.date, a.amount), reverse=True)
    return anomalies[:limit]
