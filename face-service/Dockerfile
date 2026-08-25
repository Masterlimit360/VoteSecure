FROM python:3.10

# Install system dependencies required by OpenCV and DeepFace
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create the temp directory needed by the app
RUN mkdir -p temp

# Expose the port (Render provides this via the PORT environment variable, defaults to 8000)
ENV PORT=8000
EXPOSE 8000

# Start the application using shell interpolation for PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
