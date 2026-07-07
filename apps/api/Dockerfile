FROM node:24-alpine AS web-build

WORKDIR /web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST_DIR=/app/frontend_dist

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY apps/api/ /app/
COPY --from=web-build /web/dist /app/frontend_dist

EXPOSE 7860

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:7860", "--workers", "3"]
