"""GraphSentinel ML — Feature engineering and data preparation."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import numpy as np

from .constants import (
    CLASS_NAMES,
    CLASS_TO_INDEX,
    GRAPH_FEATURES,
    GRAPH_STEPS,
    REPORTING_THRESHOLD,
    SEQ_FEATURES,
    SEQ_LEN,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def round_score(value: float) -> float:
    return round(clamp(value, 0.0, 0.99), 2)


def days_between(start: str, end: str | None = None) -> float:
    end_value = parse_iso(end) if end else datetime.now(timezone.utc)
    return abs((end_value - parse_iso(start)).total_seconds()) / 86_400.0


def hours_between(start: str, end: str) -> float:
    return abs((parse_iso(end) - parse_iso(start)).total_seconds()) / 3_600.0


def transaction_channel_index(channel: str) -> int:
    value = (channel or "").upper()
    return {"NEFT": 0, "RTGS": 1, "UPI": 2, "CORE": 3}.get(value, 4)


def one_hot(index: int, size: int) -> list[float]:
    vector = [0.0] * size
    if 0 <= index < size:
        vector[index] = 1.0
    return vector


def load_meta() -> dict[str, Any]:
    from .constants import META_PATH
    if META_PATH.exists():
        import json
        return json.loads(META_PATH.read_text())
    return {
        "seq_mean": [0.0] * SEQ_FEATURES,
        "seq_std": [1.0] * SEQ_FEATURES,
        "graph_mean": [0.0] * GRAPH_FEATURES,
        "graph_std": [1.0] * GRAPH_FEATURES,
        "version": "untrained",
    }


def save_meta(meta: dict[str, Any]) -> None:
    import json
    from .constants import META_PATH
    META_PATH.write_text(json.dumps(meta, indent=2))


def normalize_matrix(matrix: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return (matrix - mean) / np.where(std == 0, 1.0, std)


def severity_from_score(confidence: float, total_amount: float) -> str:
    if confidence >= 0.9 or total_amount >= 50_000_000:
        return "critical"
    if confidence >= 0.78 or total_amount >= 10_000_000:
        return "high"
    if confidence >= 0.62 or total_amount >= 1_000_000:
        return "medium"
    return "low"


def build_account_sequences(accounts: list[dict], transactions: list[dict]) -> dict[str, list[dict]]:
    by_account: dict[str, list[dict]] = defaultdict(list)
    for transaction in transactions:
        by_account[transaction["sender_account_id"]].append({**transaction, "direction": 1.0})
        by_account[transaction["receiver_account_id"]].append({**transaction, "direction": -1.0})

    for account_id in by_account:
        by_account[account_id].sort(key=lambda item: item["timestamp"])

    for account in accounts:
        by_account.setdefault(account["id"], [])

    return by_account


def build_graph_snapshots(accounts: list[dict], transactions: list[dict], steps: int = GRAPH_STEPS) -> np.ndarray:
    if not transactions:
        return np.zeros((steps, GRAPH_FEATURES), dtype=np.float32)

    latest = max(parse_iso(transaction["timestamp"]) for transaction in transactions)
    earliest = min(parse_iso(transaction["timestamp"]) for transaction in transactions)
    total_seconds = max((latest - earliest).total_seconds(), 1.0)
    bucket_seconds = total_seconds / steps

    account_map = {account["id"]: account for account in accounts}
    snapshots: list[list[float]] = []

    for step in range(steps):
        start = earliest.timestamp() + bucket_seconds * step
        end = earliest.timestamp() + bucket_seconds * (step + 1)
        bucket = [t for t in transactions if start <= parse_iso(t["timestamp"]).timestamp() < end]

        total_amount = sum(safe_float(t["amount"]) for t in bucket)
        txn_count = len(bucket)
        unique_senders = len({t["sender_account_id"] for t in bucket})
        unique_receivers = len({t["receiver_account_id"] for t in bucket})

        high_risk_ratio = 0.0
        if bucket:
            risky_accounts = {
                t["sender_account_id"]
                for t in bucket
                if account_map.get(t["sender_account_id"], {}).get("risk_level") in {"high", "critical"}
            }
            high_risk_ratio = len(risky_accounts) / max(unique_senders, 1)

        sub_threshold_ratio = 0.0
        if bucket:
            sub_threshold_ratio = sum(
                1 for t in bucket
                if REPORTING_THRESHOLD * 0.88 <= safe_float(t["amount"]) < REPORTING_THRESHOLD
            ) / len(bucket)

        dormant_ratio = 0.0
        if bucket:
            dormant_ratio = sum(
                1 for t in bucket
                if account_map.get(t["sender_account_id"], {}).get("is_dormant")
            ) / len(bucket)

        network_density = txn_count / max(unique_senders * unique_receivers, 1)
        snapshots.append([
            total_amount / 1_000_000.0,
            txn_count / 10.0,
            unique_senders / 10.0,
            unique_receivers / 10.0,
            high_risk_ratio,
            sub_threshold_ratio,
            dormant_ratio,
            network_density,
        ])

    return np.asarray(snapshots, dtype=np.float32)


def build_sequence_features(account: dict, transactions: list[dict], seq_len: int = SEQ_LEN) -> tuple[np.ndarray, list[str]]:
    relevant = [
        t for t in transactions
        if t["sender_account_id"] == account["id"] or t["receiver_account_id"] == account["id"]
    ]
    relevant.sort(key=lambda item: item["timestamp"])

    if not relevant:
        return np.zeros((seq_len, SEQ_FEATURES), dtype=np.float32), []

    account_created = account.get("created_at") or relevant[0]["timestamp"]
    rows: list[list[float]] = []
    transaction_ids: list[str] = []
    previous_timestamp = parse_iso(relevant[0]["timestamp"])

    for transaction in relevant[-seq_len:]:
        current_timestamp = parse_iso(transaction["timestamp"])
        hours_gap = (current_timestamp - previous_timestamp).total_seconds() / 3600.0
        if hours_gap < 0:
            hours_gap = 0.0
        direction = 1.0 if transaction["sender_account_id"] == account["id"] else -1.0
        amount = safe_float(transaction["amount"])
        age_days = days_between(account_created, transaction["timestamp"]) / 365.0

        rows.append([
            math.log1p(amount) / 16.0,
            amount / 10_000_000.0,
            direction,
            hours_gap / 24.0,
            *one_hot(transaction_channel_index(transaction.get("channel", "")), 5),
            safe_float(account.get("risk_score"), 0.0) / 100.0,
            age_days,
        ])
        transaction_ids.append(transaction["id"])
        previous_timestamp = current_timestamp

    if len(rows) < seq_len:
        pad = [[0.0] * SEQ_FEATURES for _ in range(seq_len - len(rows))]
        rows = pad + rows

    return np.asarray(rows[-seq_len:], dtype=np.float32), transaction_ids[-seq_len:]


def build_labels(accounts: list[dict], alerts: list[dict], feedback: list[dict],
                 transactions: list[dict] | None = None) -> dict[str, int]:
    from .heuristics import detect_fan_out_fan_in, detect_velocity_spike, detect_cross_border

    account_labels = {account["id"]: CLASS_TO_INDEX["normal"] for account in accounts}
    feedback_by_alert = {item.get("alert_id"): item for item in feedback if item.get("alert_id")}
    account_map = {a["id"]: a for a in accounts}
    txns = transactions or []

    priority = {name: index for index, name in enumerate(CLASS_NAMES)}
    for alert in alerts:
        label_name = alert.get("pattern_type", "normal")
        if label_name not in CLASS_TO_INDEX:
            label_name = "normal"

        fb = feedback_by_alert.get(alert["id"])
        if fb and fb.get("investigator_action") == "dismissed":
            label_name = "normal"

        candidate = CLASS_TO_INDEX[label_name]
        for account_id in alert.get("involved_accounts", []):
            existing = account_labels.get(account_id, 0)
            if candidate >= existing and priority[CLASS_NAMES[candidate]] >= priority[CLASS_NAMES[existing]]:
                account_labels[account_id] = candidate

    if txns:
        for account in accounts:
            aid = account["id"]
            if account_labels[aid] != CLASS_TO_INDEX["normal"]:
                continue
            if detect_fan_out_fan_in(aid, txns):
                account_labels[aid] = CLASS_TO_INDEX["fan_out_fan_in"]
            elif detect_velocity_spike(aid, txns):
                account_labels[aid] = CLASS_TO_INDEX["velocity_spike"]
            elif detect_cross_border(aid, txns, account_map):
                account_labels[aid] = CLASS_TO_INDEX["cross_border_layering"]

    return account_labels


def build_training_dataset(payload: dict[str, Any]) -> dict[str, Any]:
    accounts = payload.get("accounts", []) or []
    transactions = payload.get("transactions", []) or []
    alerts = payload.get("alerts", []) or []
    feedback = payload.get("feedback", []) or []

    graph_context = build_graph_snapshots(accounts, transactions)
    labels = build_labels(accounts, alerts, feedback, transactions)

    seq_vectors: list[np.ndarray] = []
    graph_vectors: list[np.ndarray] = []
    y: list[int] = []
    sequence_meta: list[dict[str, Any]] = []

    for account in accounts:
        seq_matrix, txn_ids = build_sequence_features(account, transactions)
        seq_vectors.append(seq_matrix)
        graph_vectors.append(graph_context)
        y.append(labels.get(account["id"], 0))
        sequence_meta.append({
            "account_id": account["id"],
            "holder_name": account.get("holder_name", account["id"]),
            "transaction_ids": txn_ids,
            "risk_score": safe_float(account.get("risk_score")),
            "risk_level": account.get("risk_level", "low"),
            "declared_income": safe_float(account.get("declared_annual_income")),
            "is_dormant": bool(account.get("is_dormant", False)),
            "bank_branch": account.get("bank_branch", "Unknown"),
        })

    seq_array = np.stack(seq_vectors, axis=0).astype(np.float32)
    graph_array = np.stack(graph_vectors, axis=0).astype(np.float32)
    y_array = np.asarray(y, dtype=np.int32)

    seq_mean = seq_array.reshape(-1, SEQ_FEATURES).mean(axis=0)
    seq_std = seq_array.reshape(-1, SEQ_FEATURES).std(axis=0)
    graph_mean = graph_array.reshape(-1, GRAPH_FEATURES).mean(axis=0)
    graph_std = graph_array.reshape(-1, GRAPH_FEATURES).std(axis=0)

    seq_array = normalize_matrix(seq_array, seq_mean, seq_std)
    graph_array = normalize_matrix(graph_array, graph_mean, graph_std)

    return {
        "accounts": accounts,
        "transactions": transactions,
        "alerts": alerts,
        "feedback": feedback,
        "sequence_meta": sequence_meta,
        "seq_array": seq_array,
        "graph_array": graph_array,
        "y_array": y_array,
        "seq_mean": seq_mean.astype(np.float32),
        "seq_std": seq_std.astype(np.float32),
        "graph_mean": graph_mean.astype(np.float32),
        "graph_std": graph_std.astype(np.float32),
    }
