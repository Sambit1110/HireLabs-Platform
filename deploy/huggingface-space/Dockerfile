# HireLabs model server on a Hugging Face Docker Space (CPU basic: 2 vCPU, 16 GB RAM; needs PRO).
# Build context is the folder made by scripts/build_hf_space.sh, not the repo root.
FROM python:3.11-slim

RUN useradd -m -u 1000 user
WORKDIR /app

COPY --chown=user services/model-server/requirements.txt /app/requirements.txt
# CPU-only PyTorch first (much smaller than the default CUDA build), then the server packages.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r /app/requirements.txt

# Optional: the hirelabs-parser spaCy wheel, if build_hf_space.sh was given one.
COPY --chown=user wheels/ /app/wheels/
RUN if ls /app/wheels/*.whl >/dev/null 2>&1; then pip install --no-cache-dir /app/wheels/*.whl; fi

COPY --chown=user scripts/python /app/scripts/python
COPY --chown=user services/model-server /app/services/model-server
COPY --chown=user models /app/models

USER user
ENV HIRELABS_LLM_DIR=/app/models/hirelabs-llm \
    MATCHER_MODEL=/app/models/hirelabs-matcher \
    PYTHONUNBUFFERED=1

EXPOSE 7860
CMD ["uvicorn", "--app-dir", "services/model-server", "main:app", "--host", "0.0.0.0", "--port", "7860"]
