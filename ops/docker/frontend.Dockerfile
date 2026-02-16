FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BACKEND_URL=https://api.zeitgeist.host
ARG GHOST_CONTENT_API_URL=
ARG GHOST_CONTENT_API_KEY=
ARG GHOST_REVALIDATE_SECONDS=120
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV GHOST_CONTENT_API_URL=$GHOST_CONTENT_API_URL
ENV GHOST_CONTENT_API_KEY=$GHOST_CONTENT_API_KEY
ENV GHOST_REVALIDATE_SECONDS=$GHOST_REVALIDATE_SECONDS
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
