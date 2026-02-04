# Build stage (Node 22.17.1 for Vite 7)
FROM node:22.17.1-alpine AS build
WORKDIR /app

# Build argument for API URL
ARG VITE_API_URL=http://localhost:9000/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage - serve static files (nginx/reverse proxy handled separately)
FROM node:22.17.1-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 9001
CMD ["npx", "serve", "-s", "dist", "-l", "9001"]
