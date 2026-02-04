#syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Dependencies stage
FROM base AS dependencies
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl libc6-compat

# Copy demo app (context is lightning-node/)
COPY examples/mdk-nextjs-demo/ .

# Install all dependencies from npm (including @moneydevkit packages for their dependency tree)
# Also install the correct versions of api-contract and lightning-js needed by local packages
RUN npm install && npm install @moneydevkit/api-contract@^0.1.19 @moneydevkit/lightning-js@^0.1.65 --save

# Overwrite @moneydevkit packages with local pre-built versions
# This must happen AFTER npm install since npm install can overwrite node_modules
# Copy core package
COPY mdk-checkout/packages/core/dist ./node_modules/@moneydevkit/core/dist
COPY mdk-checkout/packages/core/package.json ./node_modules/@moneydevkit/core/package.json

# Copy nextjs package
COPY mdk-checkout/packages/nextjs/dist ./node_modules/@moneydevkit/nextjs/dist
COPY mdk-checkout/packages/nextjs/package.json ./node_modules/@moneydevkit/nextjs/package.json

# Remove nested api-contract in core so it uses the top-level (correct) version
RUN rm -rf ./node_modules/@moneydevkit/core/node_modules/@moneydevkit/api-contract

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
