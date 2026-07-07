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
| External URL | `http://111.228.9.40:58900/` |
| Admin URL | `http://111.228.9.40:58900/admin/` |
| External port | `58900` |
| Internal app port | `7860` |

The server maps external port `58900` to internal port `7860`, so the application container should listen on `7860`.

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

## Future Deployment Checklist

1. Build frontend and backend artifacts.
2. Build Docker image listening on internal port `7860`.
3. Tag the image with the release tag.
4. Save package under `/mnt/data/cloud_flying/package/auto_sales_agent/<tag>/`.
5. Include `DEPLOYMENT.md` with exact `docker compose` or `docker run` commands.
6. Upload or build on `pnxc@111.228.9.40 -p 27788`.
7. Deploy under `/mnt/data/cloud_flying`.
8. Run Django migrations and collect static assets if using Django.
9. Verify `http://111.228.9.40:58900/`.
10. Verify admin access at `http://111.228.9.40:58900/admin/`.

## Django Deployment Notes

For the Django backend, the production container should:

- Serve API and admin on port `7860`.
- Use PostgreSQL for persistent data.
- Use Redis for Celery and cache.
- Run `python manage.py migrate` before switching traffic.
- Run `python manage.py collectstatic --noinput` if static files are served by the app container or Nginx.
- Keep admin credentials in environment variables or a secure secret store, not in git.

