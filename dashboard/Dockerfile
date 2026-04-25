FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    UV_LINK_MODE="copy" \
    UV_COMPILE_BYTECODE=1

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies
COPY pyproject.toml client/pyproject.toml common/pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev --no-editable || uv sync --no-install-project --no-dev --no-editable

# Copy source code
COPY . /app

# Install application
RUN uv sync --frozen --no-dev --no-editable || uv sync --no-dev --no-editable

# Download assets (playwright browser, whisper, etc.)
RUN /app/.venv/bin/playwright install chromium || true
RUN /app/.venv/bin/python scripts/download_assets.py --assets playwright whisper silero kokoro --whisper-model base || true

EXPOSE 8001

WORKDIR /app/dashboard

ENTRYPOINT ["/app/.venv/bin/uvicorn"]
CMD ["main:app", "--host", "0.0.0.0", "--port", "8001"]
