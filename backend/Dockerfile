# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Stage 2: Final Runtime ---
FROM node:18-alpine
WORKDIR /app
# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
