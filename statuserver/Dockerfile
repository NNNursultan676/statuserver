# Multi-stage build для минимального размера образа
FROM node:20 AS frontend-builder
WORKDIR /app

# Копируем package files и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники и собираем frontend
COPY . .
RUN npm run build:client

# Финальный образ с Python
FROM python:3.11-slim
WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем собранный frontend
COPY --from=frontend-builder /app/dist/public ./dist/public

# Копируем Python backend
COPY server_py ./server_py
COPY shared ./shared

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir \
    fastapi>=0.120.2 \
    httpx>=0.28.1 \
    pydantic>=2.12.3 \
    python-multipart>=0.0.20 \
    uvicorn[standard]>=0.38.0

# Открываем порт
EXPOSE 5000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# Запускаем приложение
WORKDIR /app/server_py
CMD ["python", "main.py"]
