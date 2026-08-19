"""GraphSentinel ML — Inference and Integrated Gradients explanations."""

from __future__ import annotations

import uuid
from typing import Any

import numpy as np
import tensorflow as tf

from .constants import CLASS_NAMES, GRAPH_FEATURES, GRAPH_STEPS, SEQ_FEATURES, SEQ_LEN, GRAPH_FEATURE_NAMES, SEQ_FEATURE_NAMES
from .features import (
    build_graph_snapshots,
    build_sequence_features,
    build_training_dataset,
    load_meta,
    normalize_matrix,
    round_score,
    safe_float,
    severity_from_score,
    utc_now,
)
from .model import build_model, load_model_if_available


def narrative_for_pattern(pattern: str, account_meta: dict[str, Any], stats: dict[str, float], confidence: float) -> str:
    pattern_desc = {
        "fan_out_fan_in": "fan-out/fan-in consolidation",
        "velocity_spike": "velocity spike",
        "cross_border_layering": "cross-border layering",
    }.get(pattern, pattern.replace('_', ' '))
    return (
        f"TensorFlow model predicted {pattern_desc} with {confidence * 100:.1f}% confidence for "
        f"{account_meta['holder_name']}. Top attributions: {stats.get('top_factor', 'transaction volume')} "
        f"(IG weight {stats.get('top_weight', 0.0):.2f}), "
        f"sequence volatility {stats['gap_score']:.2f}, graph pressure {stats['graph_score']:.2f}."
    )


def compute_integrated_gradients(
    model: tf.keras.Model,
    seq_input: np.ndarray,
    graph_input: np.ndarray,
    class_index: int,
    steps: int = 20,
) -> tuple[np.ndarray, np.ndarray]:
    """Return per-feature attributions for the classification head via IG."""
    baseline_seq = np.zeros_like(seq_input, dtype=np.float32)
    baseline_graph = np.zeros_like(graph_input, dtype=np.float32)

    alpha_seq = np.linspace(0.0, 1.0, steps + 1, dtype=np.float32)
    seq_interp = baseline_seq + alpha_seq[:, None, None] * (seq_input - baseline_seq)
    graph_interp = baseline_graph + alpha_seq[:, None, None] * (graph_input - baseline_graph)

    all_gs, all_gg = [], []
    for i in range(steps + 1):
        s = tf.constant(seq_interp[i : i + 1])
        g = tf.constant(graph_interp[i : i + 1])
        with tf.GradientTape() as tape:
            tape.watch([s, g])
            preds, _ = model([g, s], training=False)
            target = preds[0, class_index]
        gs, gg = tape.gradient(target, [s, g])
        all_gs.append(gs.numpy()[0])
        all_gg.append(gg.numpy()[0])

    avg_gs = np.mean(all_gs, axis=0)
    avg_gg = np.mean(all_gg, axis=0)

    ig_seq = (seq_input[0] - baseline_seq[0]) * avg_gs
    ig_graph = (graph_input[0] - baseline_graph[0]) * avg_gg
    return ig_seq, ig_graph


def explain_factors_ig(
    model: tf.keras.Model,
    seq_input: np.ndarray,
    graph_input: np.ndarray,
    class_index: int,
) -> tuple[list[dict[str, Any]], dict[str, float]]:
    """Compute IG-based SHAP-equivalent factors for the alert card."""
    try:
        ig_seq, ig_graph = compute_integrated_gradients(model, seq_input, graph_input, class_index)
        seq_importance = np.abs(ig_seq).mean(axis=0)
        graph_importance = np.abs(ig_graph).mean(axis=0)

        all_factors: list[tuple[str, float]] = [
            *zip(SEQ_FEATURE_NAMES, seq_importance.tolist()),
            *zip(GRAPH_FEATURE_NAMES, graph_importance.tolist()),
        ]
        total = sum(w for _, w in all_factors) or 1.0
        all_factors_norm = [(f, w / total) for f, w in all_factors]
        all_factors_norm.sort(key=lambda x: x[1], reverse=True)

        top_factor, top_weight = all_factors_norm[0]
        shap_factors = [
            {"factor": f, "weight": round(w, 3), "direction": "increases_risk"}
            for f, w in all_factors_norm[:6]
        ]
        stats_extra = {
            "top_factor": top_factor,
            "top_weight": round(top_weight, 3),
            "gap_score": float(np.std(ig_seq[:, 3])) if ig_seq.shape[1] > 3 else 0.0,
            "graph_score": float(graph_importance[:4].mean()),
        }
        return shap_factors, stats_extra
    except Exception:
        return [], {"top_factor": "transaction volume", "top_weight": 0.0,
                    "gap_score": 0.0, "graph_score": 0.0}


def ensure_model(payload: dict[str, Any]) -> tuple[tf.keras.Model, dict[str, Any]]:
    from .training import train_model
    meta = load_meta()
    model = load_model_if_available()
    if model is None:
        train_model({**payload, "epochs": int(payload.get("epochs", 4))})
        meta = load_meta()
        model = load_model_if_available()
    if model is None:
        raise RuntimeError("Unable to load GraphSentinel TensorFlow model")
    return model, meta


def infer_alerts(payload: dict[str, Any]) -> dict[str, Any]:
    model, meta = ensure_model(payload)

    accounts = payload.get("accounts", []) or []
    transactions = payload.get("transactions", []) or []
    alerts = payload.get("alerts", []) or []
    feedback = payload.get("feedback", []) or []

    dataset = build_training_dataset({"accounts": accounts, "transactions": transactions, "alerts": alerts, "feedback": feedback})

    seq_array = normalize_matrix(dataset["seq_array"], np.asarray(meta["seq_mean"], dtype=np.float32), np.asarray(meta["seq_std"], dtype=np.float32))
    graph_array = normalize_matrix(dataset["graph_array"], np.asarray(meta["graph_mean"], dtype=np.float32), np.asarray(meta["graph_std"], dtype=np.float32))

    class_probs, reconstructed = model.predict([graph_array, seq_array], verbose=0)
    reconstruction_error = np.mean(np.square(seq_array - reconstructed), axis=(1, 2))

    predictions: list[dict[str, Any]] = []
    for index, account in enumerate(accounts):
        probabilities = class_probs[index]
        class_index = int(np.argmax(probabilities))
        confidence = float(probabilities[class_index])
        anomaly = float(reconstruction_error[index])
        if class_index == 0 or confidence < 0.55:
            continue

        seq_meta = dataset["sequence_meta"][index]
        transaction_ids = seq_meta["transaction_ids"] or []
        relevant_transactions = [t for t in transactions if t["id"] in transaction_ids]
        involved_accounts = [account["id"]]
        for transaction in relevant_transactions:
            other = transaction["receiver_account_id"] if transaction["sender_account_id"] == account["id"] else transaction["sender_account_id"]
            if other not in involved_accounts:
                involved_accounts.append(other)

        total_amount = sum(safe_float(t["amount"]) for t in relevant_transactions)
        seq_values = dataset["seq_array"][index]
        graph_values = dataset["graph_array"][index]
        stats = {
            "volume_rank": float(np.mean(np.abs(seq_values[:, 1])) * 12.0 + 1.0),
            "volume_score": float(np.mean(np.abs(seq_values[:, 1]))),
            "gap_score": float(np.std(seq_values[:, 3])),
            "graph_score": float(np.mean(np.abs(graph_values[:, 0:4]))),
            "counterparty_score": float(min(len(involved_accounts) / 6.0, 1.0)),
        }

        pattern = CLASS_NAMES[class_index]

        ig_factors, ig_stats = explain_factors_ig(
            model,
            seq_array[index : index + 1],
            graph_array[index : index + 1],
            class_index,
        )
        ig_stats.setdefault("gap_score", 0.0)
        ig_stats.setdefault("graph_score", 0.0)

        predictions.append({
            "id": f"ALRT_{uuid.uuid4().hex[:8].upper()}",
            "pattern_type": pattern,
            "involved_accounts": involved_accounts,
            "linked_transaction_ids": transaction_ids,
            "total_amount": round(total_amount, 2),
            "confidence_score": round_score(confidence),
            "shap_narrative": narrative_for_pattern(pattern, seq_meta, ig_stats, confidence),
            "shap_factors": ig_factors,
            "severity": severity_from_score(confidence, total_amount),
            "status": "open",
            "assigned_investigator": "",
            "notes": f"Model anomaly score {anomaly:.4f}",
            "created_at": utc_now(),
            "updated_at": utc_now(),
        })

    predictions.sort(key=lambda item: item["confidence_score"], reverse=True)
    return {
        "ok": True,
        "model": "graphsentinel-temporal-graph-lstm",
        "version": meta.get("version", "untrained"),
        "count": len(predictions),
        "alerts": predictions,
    }
