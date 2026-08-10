# Garuda StudyHub API — production image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci 
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=builder /app/dist ./dist
# Persist database + uploads (mount a volume in compose)
RUN mkdir -p data uploads
EXPOSE 5000
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.js"]
