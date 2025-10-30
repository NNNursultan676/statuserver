#!/bin/bash

cd "$(dirname "$0")"

echo "Starting Vite dev server on port 5173..."
npx vite &
VITE_PID=$!

sleep 3

echo "Starting Python FastAPI server on port 5000..."
cd server_py
python main.py &
FASTAPI_PID=$!

wait $VITE_PID $FASTAPI_PID
