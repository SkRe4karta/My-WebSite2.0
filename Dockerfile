# ============================================
# Multi-stage Dockerfile for Next.js + Prisma
# Optimized for production with minimal image size
# ============================================

# Base stage with system dependencies
FROM node:20-slim AS base
WORKDIR /app

# Install only essential system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with optimizations
RUN npm ci --legacy-peer-deps --ignore-scripts --prefer-offline --no-audit && \
    npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma ./prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=1

# Generate Prisma Client with retry mechanism
RUN for i in 1 2 3 4; do \
    npx prisma@6.19.0 generate --schema=./prisma/schema.prisma && break || \
    (echo "Prisma generate attempt $i failed, retrying..." && sleep $((i * 5))); \
    done

# ============================================
# Builder stage
# ============================================
FROM base AS builder

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Fix permissions for node_modules binaries (critical fix)
RUN chmod -R +x node_modules/.bin 2>/dev/null || true

# Copy application source code
COPY . .

# Build environment variables
ENV DATABASE_URL="file:./database/db.sqlite"
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# ============================================
# Production runner stage
# ============================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
