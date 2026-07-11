FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4173 \
    DATABASE_PATH=/var/lib/novapharm/novapharm.sqlite \
    SECURE_CONTENT_ROOT=/var/lib/novapharm/secure-content \
    DOCUMENT_STORAGE_ROOT=/var/lib/novapharm/documents

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
RUN mkdir -p /var/lib/novapharm/secure-content && chown -R node:node /app /var/lib/novapharm

USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "run", "start:production"]
