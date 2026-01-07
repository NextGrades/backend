# ---------- build ----------
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---------- production ----------
FROM node:20-slim

# install dumb-init only (no upgrade)
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nestjs

# create logs directory and set ownership BEFORE copying files
RUN mkdir -p dist/logs && chown -R nestjs:nodejs /app

# install only production deps with ownership
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# copy build output with ownership
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist

USER nestjs

EXPOSE 7500
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD node -e "require('http').get('http://localhost:7500/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]