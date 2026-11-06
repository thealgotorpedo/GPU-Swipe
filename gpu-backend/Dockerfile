# Install the API dependencies in the Node image.
FROM node:24-bookworm-slim AS api_dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Combine MongoDB, Node, and the API.
FROM mongo:8.0

COPY --from=api_dependencies /usr/local/bin/node /usr/local/bin/node

WORKDIR /app

COPY --from=api_dependencies /app/node_modules ./node_modules
COPY Server.js ./
COPY models ./models
COPY start.sh /usr/local/bin/start-mern.sh

RUN chmod +x /usr/local/bin/start-mern.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/start-mern.sh"]
