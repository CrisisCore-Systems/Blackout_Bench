FROM mcr.microsoft.com/playwright:v1.55.1-jammy

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY apps/runner apps/runner
COPY packages/shared packages/shared

RUN npm --workspace apps/runner run build

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

CMD ["npm", "--workspace", "apps/runner", "run", "start"]