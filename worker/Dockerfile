FROM nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04

WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive

ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \ 
 && chmod a+rx /usr/local/bin/yt-dlp

RUN ln -sf /usr/bin/python3 /usr/bin/python \
 && ln -sf /usr/bin/pip3 /usr/bin/pip

RUN pip install --upgrade pip

RUN pip install torch==2.2.2+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

COPY worker/requirements.worker.txt .
RUN pip install --no-cache-dir -r requirements.worker.txt

COPY worker/ ./worker
COPY shared/ /app/shared

ENV PYTHONPATH=/app:/app/worker

# CMD ["prefect", "worker", "start", "--pool", "yt-rag-pool"]
CMD ["python", "-m", "worker.tasks"]

