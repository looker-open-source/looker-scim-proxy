# --- Stage 1: Build ---
FROM node:22-slim AS build

WORKDIR /app
RUN chown node:node /app

# Switch to unprivileged user for build
USER node

# Copy package files
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and compile
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
RUN yarn run gcp-build


# --- Stage 2: Production ---
FROM node:22-slim

# Install dumb-init for proper process signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

# Create app directory and set permissions BEFORE switching users
RUN mkdir -p /home/node/app \
  && chown -R node:node /home/node/app

# Drop privileges
USER node
WORKDIR /home/node/app

# Install production dependencies only
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy compiled code from the build stage
COPY --from=build --chown=node:node /app/build ./build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Use dumb-init as the entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "build/index.js"]
