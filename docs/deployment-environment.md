# Deployment Environment

This document records the target deployment environment for the automotive sales agent. Keep passwords and private tokens out of this file.

## Target Server

| Item | Value |
| --- | --- |
| Public host | `111.228.9.40` |
| SSH | `pnxc@111.228.9.40 -p 27788` |
| SSH auth | Passwordless login is already configured |
| Deploy root | `/mnt/data/cloud_flying` |
| Docker package root | `/mnt/data/cloud_flying/package/auto_sales_agent` |
| External URL | `http://111.228.9.40:58900/car` |
| Admin URL | `http://111.228.9.40:58900/admin/` |
| External port | `58900` |

The frontend is intentionally exposed only under `/car`. The bare root URL `http://111.228.9.40:58900/` should return 404 and must not redirect to the application entry.
| Gateway listen port | `7860` |
| App host port on this server | `7861` |
| Container app port | `7860` |

The server maps external port `58900` to a gateway listening on `127.0.0.1:7860`. That gateway forwards the Django application to `127.0.0.1:7861`, and the product frontend is served from `/car`, so this deployment should publish the Django container as `127.0.0.1:7861 -> 7860`.

## Sensitive Access Notes

Sensitive credentials are recorded in local-only file:

```text
.codex/deployment-secrets.local.md
```

That file is intentionally ignored by git. Do not copy credentials into normal documentation, commits, images, or deployment logs.

## Docker Package Convention

Store each deployable package by tag:

```text
/mnt/data/cloud_flying/package/auto_sales_agent/
  <tag>/
    image.tar
    docker-compose.yml
    DEPLOYMENT.md
    .env.example
```

Recommended tag examples:

```text
v0.1.0
v0.1.0-20260707
git-<short-sha>
```

Each tag directory should include:

- Docker image archive or image reference.
- Docker deployment instructions.
- Required environment variable examples.
- Database migration instructions.
- Rollback notes.

The current deployable shape is a single Django container:

- Docker build compiles `apps/web` with Vite.
- The built frontend is copied into `/app/frontend_dist`.
- Django serves the SPA at `/`.
- Django serves API routes under `/api/`.
- Django admin remains under `/admin/`.
- Static assets are served through WhiteNoise under `/static/`.
- The container listens on internal port `7860`.

## Future Deployment Checklist

1. Build frontend and backend artifacts.
2. Build Docker image listening on internal port `7860`.
3. Tag the image with the release tag.
4. Save package under `/mnt/data/cloud_flying/package/auto_sales_agent/<tag>/`.
5. Include `DEPLOYMENT.md` with exact `docker compose` or `docker run` commands.
6. Upload or build on `pnxc@111.228.9.40 -p 27788`.
7. Deploy under `/mnt/data/cloud_flying`.
8. Run Django migrations and collect static assets if using Django.
9. Verify `http://111.228.9.40:58900/car`.
10. Verify admin access at `http://111.228.9.40:58900/admin/`.
11. Verify health check at `http://111.228.9.40:58900/api/health/`.

## Django Deployment Notes

For the Django backend, the production container should:

- Serve API and admin on container port `7860`.
- Publish to host `127.0.0.1:7861` on the target server using `APP_HOST_BIND=127.0.0.1` and `APP_HOST_PORT=7861`.
- Serve the React workbench at `/`.
- Use PostgreSQL for persistent data.
- Use Redis for Celery and cache.
- Run `python manage.py migrate` before switching traffic.
- Run `python manage.py ensure_admin` with credentials from environment variables.
- Run `python manage.py seed_demo` for the first demo deployment.
- Run `python manage.py collectstatic --noinput` if static files are served by the app container or Nginx.
- Keep admin credentials in environment variables or a secure secret store, not in git.
