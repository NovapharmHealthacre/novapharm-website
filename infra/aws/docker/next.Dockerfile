# Build any of the five isolated Next.js applications for a future ECS task.
# docker build -f infra/aws/docker/next.Dockerfile --build-arg APP=corporate .
# No image is published or deployed by this Dockerfile alone.
FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY . .
RUN npm ci --ignore-scripts
ARG APP
RUN case "$APP" in corporate|technology|founder|status|portal) ;; *) echo "Unsupported Next app" >&2; exit 1;; esac \
 && npm run build --workspace="@novapharm/$APP"

FROM node:24-bookworm-slim AS runtime
ARG APP
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 APP_NAME=${APP}
WORKDIR /srv
COPY --from=build /workspace/apps/${APP}/.next/standalone/ ./
USER node
EXPOSE 3000
CMD ["/bin/sh", "-c", "exec node apps/${APP_NAME}/server.js"]
