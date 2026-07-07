# auto-sales-agent
AI agent product for automotive sales teams, helping sales consultants analyze leads, recommend vehicles, generate follow-up scripts, and improve customer conversion.

## Product planning

- [Automotive sales agent product plan](docs/automotive-sales-agent-product-plan.md)
- [Automotive sales agent technical solution](docs/automotive-sales-agent-technical-solution.md)
- [Deployment environment](docs/deployment-environment.md)

## Development

Backend API lives in `apps/api` and uses Django + Django REST Framework.

```powershell
cd apps/api
python manage.py migrate
python manage.py runserver 0.0.0.0:7860
```

Docker entrypoint listens on internal port `7860`, matching the target deployment mapping.

For Docker deployments, `APP_HOST_PORT` controls the host port and defaults to `7860`. On the target cloud server, set `APP_HOST_BIND=127.0.0.1` and `APP_HOST_PORT=7861` so the existing `58900 -> 7860` gateway can proxy to the app.
