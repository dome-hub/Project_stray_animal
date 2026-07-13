---
title: Stray Animal AI
emoji: 🐾
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# Stray Animal Analyzer API

FastAPI service that classifies stray animal breeds from an uploaded image using `final_model.keras`.

- `GET /` — status + model info
- `GET /health` — health check
- `POST /analyze` — upload an image (`file`), returns predicted breed + top-3 confidence
