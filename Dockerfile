# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package.json client/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY client/ .

# Build the frontend
RUN npm run build

# Stage 2: Runtime with Python backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostgreSQL and spatial operations
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    build-essential \
    libgeos-dev \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend from builder stage into static directory (for Flask to serve)
COPY --from=frontend-builder /app/client/dist ./static

# Create a script to run both populate_db and the server
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Wait for database to be ready using Python\n\
echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."\n\
python -c "\n\
import socket, time, os\n\
db_host = os.getenv(\"DB_HOST\", \"db\")\n\
db_port = int(os.getenv(\"DB_PORT\", \"5432\"))\n\
for i in range(30):\n\
    try:\n\
        s = socket.create_connection((db_host, db_port), timeout=2)\n\
        s.close()\n\
        print(\"PostgreSQL is ready!\")\n\
        break\n\
    except:\n\
        print(f\"Attempt {i+1}/30...\")\n\
        time.sleep(1)\n\
        if i == 29:\n\
            exit(1)\n\
"\n\
\n\
echo "Populating database..."\n\
python populate_db.py\n\
\n\
echo "Starting Flask server..."\n\
python app.py\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/api/health')" || exit 1

# Run entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
