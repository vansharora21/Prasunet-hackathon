"""GraphSentinel ML — Heuristic detectors for new pattern types."""

from __future__ import annotations

from datetime import datetime, timezone


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def detect_fan_out_fan_in(account_id: str, transactions: list[dict]) -> bool:
    """One source → many destinations (fan-out) or many sources → one (fan-in)."""
    recent = sorted(
        [t for t in transactions
         if t["sender_account_id"] == account_id or t["receiver_account_id"] == account_id],
        key=lambda t: t["timestamp"],
    )[-40:]
    if len(recent) < 6:
        return False
    senders = {t["sender_account_id"] for t in recent if t["receiver_account_id"] == account_id}
    receivers = {t["receiver_account_id"] for t in recent if t["sender_account_id"] == account_id}
    return (len(senders) <= 2 and len(receivers) >= 5) or (len(senders) >= 5 and len(receivers) <= 2)


def detect_velocity_spike(account_id: str, transactions: list[dict]) -> bool:
    """Recent send-frequency >3× the rolling baseline."""
    sent = sorted(
        [t for t in transactions if t["sender_account_id"] == account_id],
        key=lambda t: t["timestamp"],
    )
    if len(sent) < 12:
        return False
    latest = parse_iso(sent[-1]["timestamp"])
    earliest = parse_iso(sent[0]["timestamp"])
    total_days = max((latest - earliest).total_seconds() / 86_400.0, 14.0)
    avg_per_7 = len(sent) * 7.0 / total_days
    last_7 = sum(
        1 for t in sent
        if (latest - parse_iso(t["timestamp"])).total_seconds() / 86_400.0 <= 7
    )
    return last_7 >= 8 and last_7 > 3.0 * avg_per_7


def detect_cross_border(account_id: str, transactions: list[dict], account_map: dict) -> bool:
    """Transactions span ≥4 distinct city-prefixes across involved accounts."""
    involved = {t["sender_account_id"] for t in transactions if t["receiver_account_id"] == account_id}
    involved |= {t["receiver_account_id"] for t in transactions if t["sender_account_id"] == account_id}
    involved.add(account_id)
    cities: set[str] = set()
    for aid in involved:
        branch = account_map.get(aid, {}).get("bank_branch", "")
        city = (branch or "").split()[0]
        if city:
            cities.add(city)
    return len(cities) >= 4
