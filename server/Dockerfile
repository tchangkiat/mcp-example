FROM node:24-alpine3.21
RUN npm install -g typescript
RUN addgroup -S group && adduser -S user -G group
WORKDIR /app
COPY . .
RUN npm install && npm run build

USER user
ENTRYPOINT ["node", "/app/build/index.js"]