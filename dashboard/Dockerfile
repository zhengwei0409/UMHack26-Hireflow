# Dockerfile for deploying dashboard on cloud (Render, etc.)
# Does NOT spawn Docker containers - connects to external joinly API

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy dashboard files
COPY dashboard/ /app/dashboard/
COPY client/ /app/client/
COPY joinly/ /app/joinly/
COPY common/ /app/common/
COPY pyproject.toml /app/
COPY uv.lock /app/

# Install uv
RUN pip install uv

# Install dependencies
RUN uv sync --frozen --no-dev

# Expose port
EXPOSE 10000

# Run dashboard
CMD ["uvicorn", "dashboard.main:app", "--host", "0.0.0.0", "--port", "10000"]
