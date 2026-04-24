# Dockerfile for Render cloud deployment
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

# Copy all source
COPY . /app

# Build without dev deps, no lock (fails on missing packages)
RUN pip install uv && uv sync --frozen --no-dev --no-install-project

# Expose port
EXPOSE 10000

# Run dashboard (uses PORT env var set by Render)
CMD ["uvicorn", "dashboard.main:app", "--host", "0.0.0.0", "--port", "${PORT:-10000}"]
