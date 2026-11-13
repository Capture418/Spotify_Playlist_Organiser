# D064 pilot: validated production entry, runtime settings supplied at deployment.
# D032: reviewed linux/amd64 layers and database-free Node22 build/runtime checks pass.
FROM node:22.23.5-bookworm-slim@sha256:47725aca53d3295ec2d3be8f62726599b3033cc262edc2c7e429909b3ac599fc AS dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY scripts ./scripts
COPY tests/fixtures ./tests/fixtures
RUN npm run build

FROM node:22.23.5-bookworm-slim@sha256:47725aca53d3295ec2d3be8f62726599b3033cc262edc2c7e429909b3ac599fc AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts && rm -rf .work

FROM node:22.23.5-bookworm-slim@sha256:47725aca53d3295ec2d3be8f62726599b3033cc262edc2c7e429909b3ac599fc AS runtime
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package.json ./package.json
COPY --from=build /app/.work/runtime ./runtime
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(3000)}).then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "runtime/server/production.js"]
