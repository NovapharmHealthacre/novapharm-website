# API-only container candidate for future, isolated AWS ECS staging.
# Runtime requires encrypted RDS SQL, deliberately disabled document storage
# until S3 scan acceptance, verified origins, and Secrets Manager task injection.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts \
 && npm run build --workspace=@novapharm/api \
 && npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production NOVAPHARM_CLOUD_PLATFORM=aws AWS_REGION=eu-north-1 \
    DATABASE_PROVIDER=aws-rds-sql DOCUMENT_STORAGE_PROVIDER=disabled \
    HOST=0.0.0.0 PORT=4173 NOVAPHARM_SERVER_MODE=api-only
WORKDIR /app
COPY --from=build /app ./
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
 CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
