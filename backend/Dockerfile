# Backend image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN apt-get update && apt-get install -y build-essential \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean

# Copy the rest of the backend code
COPY . .

# Expose port
EXPOSE 8000

# Use environment variables from .env
ENV PYTHONUNBUFFERED=1

# Run Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
