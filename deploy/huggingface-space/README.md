---
title: HireLabs Model Server
emoji: 🧭
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# HireLabs model server

The HireLabs website's model API: `/match` (hirelabs-llm, built from scratch), `/parse`,
`/embed` and `/extract-pdf`. Every route except `/health` needs
`Authorization: Bearer <MODEL_API_TOKEN>`, set as a Space secret.

Keep this Space **private**: the models were trained on the team's resume data.
