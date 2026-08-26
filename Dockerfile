FROM oven/bun:1.4-alpine

WORKDIR /app

# Зависимости отдельным слоем — пересобираются только при изменении лок-файла
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src
COPY tsconfig.json ./

# Каталог для подписчиков и резервных копий заявок; монтируется как постоянный диск
ENV DATA_DIR=/data
VOLUME /data

CMD ["bun", "src/index.ts"]
