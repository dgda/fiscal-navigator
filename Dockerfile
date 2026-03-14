# Stage 1: Build Frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
# Copy built assets and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
# Copy db.json (LowDB)
COPY db.json ./ 

EXPOSE 3001
# Using tsx to run the server.ts directly or compile to JS first
CMD ["npx", "tsx", "server.ts"]