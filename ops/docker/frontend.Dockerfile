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
ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_REF=unknown
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV GHOST_CONTENT_API_URL=$GHOST_CONTENT_API_URL
ENV GHOST_CONTENT_API_KEY=$GHOST_CONTENT_API_KEY
ENV GHOST_REVALIDATE_SECONDS=$GHOST_REVALIDATE_SECONDS
ENV BUILD_COMMIT=$BUILD_COMMIT
ENV BUILD_TIME=$BUILD_TIME
ENV BUILD_REF=$BUILD_REF
RUN printf "commit=%s\nbuild_time=%s\nref=%s\n" "$BUILD_COMMIT" "$BUILD_TIME" "$BUILD_REF" > public/version.txt
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown
ARG BUILD_REF=unknown
ENV BUILD_COMMIT=$BUILD_COMMIT
ENV BUILD_TIME=$BUILD_TIME
ENV BUILD_REF=$BUILD_REF
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nextjs /app
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
