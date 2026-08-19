"""GraphSentinel ML — TensorFlow model architecture."""

from __future__ import annotations

import tensorflow as tf

from .constants import GRAPH_FEATURES, GRAPH_STEPS, CLASS_NAMES, SEQ_FEATURES, SEQ_LEN


class EvolveGCNBlock(tf.keras.layers.Layer):
    def __init__(self, units: int, steps: int, **kwargs):
        super().__init__(**kwargs)
        self.units = units
        self.steps = steps
        self.step_projection = tf.keras.layers.Dense(units, activation="relu")
        self.evolver = tf.keras.layers.GRUCell(units)

    def call(self, inputs: tf.Tensor) -> tf.Tensor:
        batch_size = tf.shape(inputs)[0]
        state = tf.zeros((batch_size, self.units), dtype=inputs.dtype)
        states: list[tf.Tensor] = []

        for step in range(self.steps):
            x = inputs[:, step, :]
            x = self.step_projection(x)
            output, [state] = self.evolver(x, [state])
            states.append(output)

        stacked = tf.stack(states, axis=1)
        pooled = tf.concat([stacked[:, -1, :], tf.reduce_mean(stacked, axis=1)], axis=-1)
        return pooled


def build_model() -> tf.keras.Model:
    graph_input = tf.keras.Input(shape=(GRAPH_STEPS, GRAPH_FEATURES), name="graph_input")
    seq_input = tf.keras.Input(shape=(SEQ_LEN, SEQ_FEATURES), name="seq_input")

    graph_embed = EvolveGCNBlock(32, GRAPH_STEPS, name="evolve_gcn")(graph_input)
    seq_encoded = tf.keras.layers.LSTM(64, return_sequences=True, name="seq_encoder_1")(seq_input)
    seq_encoded = tf.keras.layers.LSTM(32, name="seq_encoder_2")(seq_encoded)

    combined = tf.keras.layers.Concatenate(name="fusion")([graph_embed, seq_encoded])
    combined = tf.keras.layers.Dense(64, activation="relu", name="fusion_dense_1")(combined)
    combined = tf.keras.layers.Dropout(0.15, name="fusion_dropout")(combined)

    class_output = tf.keras.layers.Dense(len(CLASS_NAMES), activation="softmax", name="class_output")(combined)

    reconstruction = tf.keras.layers.RepeatVector(SEQ_LEN, name="repeat_latent")(seq_encoded)
    reconstruction = tf.keras.layers.LSTM(32, return_sequences=True, name="recon_lstm")(reconstruction)
    reconstruction = tf.keras.layers.TimeDistributed(tf.keras.layers.Dense(SEQ_FEATURES), name="recon_output")(reconstruction)

    model = tf.keras.Model(
        inputs=[graph_input, seq_input],
        outputs=[class_output, reconstruction],
        name="graphsentinel_model",
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss={"class_output": "sparse_categorical_crossentropy", "recon_output": "mse"},
        loss_weights={"class_output": 1.0, "recon_output": 0.35},
        metrics={"class_output": ["accuracy"]},
    )
    return model


def load_model_if_available():
    from .constants import MODEL_PATH
    if not MODEL_PATH.exists():
        return None
    return tf.keras.models.load_model(MODEL_PATH, custom_objects={"EvolveGCNBlock": EvolveGCNBlock})
