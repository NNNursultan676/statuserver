# ---------- Stage 1: Build ----------
FROM node:20 AS builder
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем весь проект
COPY . .

# Собираем TypeScript / Vite / whatever
RUN npm run build

# ---------- Stage 2: Run ----------
FROM node:20
WORKDIR /app

# Копируем только нужное из builder
COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm ci --omit=dev

EXPOSE 5000
CMD ["node", "dist/index.js"]
