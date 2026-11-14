`flower.mp4` is MDN's public CC0 example video:
https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4

It contains flowers, not a person. Tests use it for actual browser decoding, seeking,
preview, validation and the optional real MediaPipe no-person smoke check. It is
not an exercise-validation dataset. Deterministic UI tests intercept the official
SDK request and provide explicitly synthetic landmarks; production never does so.
