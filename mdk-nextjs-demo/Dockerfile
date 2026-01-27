#syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Dependencies stage
FROM base AS dependencies
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl libc6-compat

# Copy demo app (context is moneydevkit/)
COPY lightning-node/examples/mdk-nextjs-demo/ .

# Install all dependencies from npm (including @moneydevkit packages for their dependency tree)
RUN npm install

# Overwrite @moneydevkit packages with local pre-built versions
# Copy core package
COPY lightning-node/mdk-checkout/packages/core/dist ./node_modules/@moneydevkit/core/dist
COPY lightning-node/mdk-checkout/packages/core/package.json ./node_modules/@moneydevkit/core/package.json

# Copy nextjs package
COPY lightning-node/mdk-checkout/packages/nextjs/dist ./node_modules/@moneydevkit/nextjs/dist
COPY lightning-node/mdk-checkout/packages/nextjs/package.json ./node_modules/@moneydevkit/nextjs/package.json

# Builder stage - creates production build
FROM dependencies AS builder
WORKDIR /app

# Accept build argument for Next.js build-time env vars
ARG NEXT_PUBLIC_MDK_PREVIEW
ENV NEXT_PUBLIC_MDK_PREVIEW=${NEXT_PUBLIC_MDK_PREVIEW}

# Build the Next.js app with all env vars available
RUN npm run build

# Production image - run Next.js in production mode
FROM base AS production
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl libc6-compat

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Start Next.js in production mode
CMD ["npm", "start"]
