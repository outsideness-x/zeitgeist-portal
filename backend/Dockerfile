FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npx tsc -p tsconfig.build.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_REF=unknown
ENV BUILD_COMMIT=$BUILD_COMMIT
ENV BUILD_TIME=$BUILD_TIME
ENV BUILD_REF=$BUILD_REF
RUN apk add --no-cache openssl
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
