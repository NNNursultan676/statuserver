
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY package*.json ./

RUN npm ci --omit=dev

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "dist/server/index.js"]
