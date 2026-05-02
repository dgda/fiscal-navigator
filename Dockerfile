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

EXPOSE 3001
CMD ["node", "dist-server/server.js"]
