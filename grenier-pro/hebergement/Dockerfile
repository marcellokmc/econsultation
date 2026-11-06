# Grenier Pro — version hébergée (abonnements + registre Grenier Trace).
# Construire depuis le dossier grenier-pro :  docker build -f hebergement/Dockerfile -t grenier-pro .
FROM node:22.23.3-bookworm-slim
ENV NODE_ENV=production GRENIER_MODE=saas GRENIER_DATA=/data PORT=3000 HOST=0.0.0.0 TRUST_PROXY=1
WORKDIR /app
COPY app/package.json ./
COPY app/server ./server
COPY app/public ./public
COPY app/vendor ./vendor
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/public/info').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--no-warnings", "server/index.js"]
