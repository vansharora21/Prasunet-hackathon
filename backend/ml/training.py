"""GraphSentinel ML — Training loop."""

from __future__ import annotations

from typing import Any

import numpy as np

from .constants import CLASS_NAMES
from .features import build_training_dataset, utc_now
from .model import build_model
from .constants import MODEL_PATH


def train_model(payload: dict[str, Any]) -> dict[str, Any]:
    dataset = build_training_dataset(payload)
    seq_array = dataset["seq_array"]
    graph_array = dataset["graph_array"]
    y_array = dataset["y_array"]

    if len(y_array) == 0:
        return {"ok": True, "model": "graphsentinel-temporal-graph-lstm", "trained_samples": 0, "epochs": 0, "version": "no-data"}

    model = build_model()
    sample_weights = np.ones(len(y_array), dtype=np.float32)
    feedback = dataset.get("feedback", []) or []
    feedback_by_alert = {item.get("alert_id"): item for item in feedback if item.get("alert_id")}

    for index, meta in enumerate(dataset["sequence_meta"]):
        for alert in dataset["alerts"]:
            if meta["account_id"] in alert.get("involved_accounts", []):
                fb = feedback_by_alert.get(alert["id"])
                if fb:
                    if fb.get("investigator_action") == "confirmed":
                        sample_weights[index] = 1.5
                    elif fb.get("investigator_action") == "dismissed":
                        sample_weights[index] = 0.7

    epochs = int(payload.get("epochs", 5))
    history = model.fit(
        [graph_array, seq_array],
        [y_array, seq_array],
        epochs=epochs,
        batch_size=min(16, len(y_array)),
        verbose=0,
        sample_weight=[sample_weights, None],
        validation_split=0.15 if len(y_array) > 8 else 0.0,
    )

    version = utc_now()
    model.save(MODEL_PATH)

    from .features import save_meta
    save_meta({
        "seq_mean": dataset["seq_mean"].tolist(),
        "seq_std": dataset["seq_std"].tolist(),
        "graph_mean": dataset["graph_mean"].tolist(),
        "graph_std": dataset["graph_std"].tolist(),
        "version": version,
    })

    return {
        "ok": True,
        "model": "graphsentinel-temporal-graph-lstm",
        "trained_samples": int(len(y_array)),
        "epochs": epochs,
        "version": version,
        "history": {key: [float(v) for v in values] for key, values in history.history.items()},
    }


def retrain(payload: dict[str, Any]) -> dict[str, Any]:
    result = train_model(payload)
    return {"ok": True, **result}
