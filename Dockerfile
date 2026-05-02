# Stage 1 — build everything
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Produces /app/dist (frontend bundle) and /app/dist-server/server.js (bundled server)
RUN npm run build

# Stage 2 — runtime image (compiled artifacts only, no source)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/LICENSE.md ./LICENSE.md

LABEL org.opencontainers.image.title="Treasury OS" \
      org.opencontainers.image.description="Personal financial roadmap and liquidity-forecasting engine." \
      org.opencontainers.image.vendor="Don Gabriel Deoferio Ablay" \
      org.opencontainers.image.source="https://github.com/dgda/fiscal-navigator" \
      org.opencontainers.image.url="https://hub.docker.com/r/dgabrielablay/fiscal-navigator" \
      org.opencontainers.image.licenses="LicenseRef-Treasury-OS-Proprietary"

EXPOSE 3001
CMD ["node", "dist-server/server.js"]
