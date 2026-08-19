"""GraphSentinel ML — Constants and configuration."""

from pathlib import Path

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "ml_artifacts"
MODEL_PATH = ARTIFACT_DIR / "graphsentinel_model.keras"
META_PATH = ARTIFACT_DIR / "graphsentinel_meta.json"

SEQ_LEN = 24
GRAPH_STEPS = 10
SEQ_FEATURES = 11
GRAPH_FEATURES = 8

CLASS_NAMES = [
    "normal",
    "multi_hop_layering",
    "circular_round_trip",
    "structuring",
    "dormant_reactivation",
    "kyc_mismatch",
    "fan_out_fan_in",
    "velocity_spike",
    "cross_border_layering",
]
CLASS_TO_INDEX = {name: index for index, name in enumerate(CLASS_NAMES)}

SEQ_FEATURE_NAMES = [
    "Transaction log-amount",
    "Transaction raw amount",
    "Send/receive direction",
    "Inter-transaction time gap",
    "Channel: NEFT",
    "Channel: RTGS",
    "Channel: UPI",
    "Channel: CORE",
    "Channel: OTHER",
    "Account risk score",
    "Account age (years)",
]

GRAPH_FEATURE_NAMES = [
    "Total flow volume",
    "Transaction count",
    "Unique senders",
    "Unique receivers",
    "High-risk account ratio",
    "Sub-threshold ratio",
    "Dormant account ratio",
    "Network density",
]

REPORTING_THRESHOLD = 1_000_000

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
