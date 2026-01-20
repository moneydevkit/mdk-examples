#syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Dependencies stage
FROM base AS dependencies
WORKDIR /app

# Install curl and jq for healthchecks and JSON manipulation
RUN apk add --no-cache curl libc6-compat jq

# Copy package files and local packages
COPY package.json package-lock.json* ./
COPY local-packages ./local-packages

# Copy local tarball dependencies (created by CI when testing PRs from mdk-checkout)
# These files are always created by the e2e-reusable workflow before building this image.
# The workflow renames the packed tarballs to these exact names (lines 67-68 in e2e-reusable.yml)
COPY moneydevkit-core-local.tgz ./
COPY moneydevkit-nextjs-local.tgz ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

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
