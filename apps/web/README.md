# Auto Sales Agent Web

React + Vite sales workbench for the automotive sales agent.

## Local Development

```bash
npm install
npm run dev
```

The app expects the Django API at `http://localhost:7860` by default. Override it with:

```bash
VITE_API_BASE_URL=http://localhost:7860 npm run dev
```

## Build

```bash
npm run build
```

## Main Flow

- Enter a customer demand in the AI command bar.
- Fetch vehicle recommendations from `/api/ai/recommendations/vehicles/`.
- Select a vehicle to draft a quote.
- Generate follow-up script and quote suggestions.

When the API is unavailable, the UI falls back to local demo data so the screen remains usable.
