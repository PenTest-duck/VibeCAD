FROM python:3.13-alpine

# Prevent Python from writing .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies including OpenSCAD and tools to install uv
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        openscad \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Ensure uv is on PATH
ENV PATH="/root/.local/bin:${PATH}"

# Copy dependency files first for better layer caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies according to the lockfile
RUN uv sync --frozen

# Copy the rest of the backend source code
COPY . .

# Expose the default port (Render will set PORT env var)
EXPOSE 8000

# Run the application with uv
CMD ["uv", "run", "main.py"]


