#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🚀 Запуск Status Server в режиме разработки..."
echo ""

# Устанавливаем переменные окружения по умолчанию
export NODE_ENV=development
export PORT=5000
export METRICS_API_URL=${METRICS_API_URL:-http://localhost:8000}

echo "📦 Переменные окружения:"
echo "  NODE_ENV=$NODE_ENV"
echo "  PORT=$PORT"
echo "  METRICS_API_URL=$METRICS_API_URL"
echo ""

# Запускаем Vite dev server на порту 5173
echo "🎨 Запуск Vite dev server на порту 5173..."
npx vite &
VITE_PID=$!

# Ждем запуска Vite
sleep 3

# Запускаем FastAPI сервер на порту 5000
echo "⚡ Запуск Python FastAPI server на порту 5000..."
cd server_py
python main.py &
FASTAPI_PID=$!

echo ""
echo "✅ Серверы запущены!"
echo "   Frontend (Vite): http://localhost:5173"
echo "   Backend (FastAPI): http://localhost:5000"
echo "   Main App: http://localhost:5000"
echo ""
echo "Нажмите Ctrl+C для остановки серверов"

# Обработка Ctrl+C
trap "kill $VITE_PID $FASTAPI_PID 2>/dev/null; echo ''; echo '🛑 Серверы остановлены'; exit 0" INT TERM

wait $VITE_PID $FASTAPI_PID
