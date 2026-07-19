# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE 3001
CMD ["node", "--import", "tsx", "server/index.ts"]
