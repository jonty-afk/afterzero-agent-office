# Agent Office (demo)

A local-only animated dashboard for exploring how multiple agents can pass work through content, job-search, and lead-research workflows. It includes a replay view, guided task view, timeline controls, and a vertical Reel Mode page.

This repository is a **sanitized demo**. `public/data.json` contains synthetic records and the covers under `public/thumbs/` are generated SVG placeholders. No real account logs, job applications, lead details, social links, credentials, source videos, or private captures are included. The original local extraction pipeline is intentionally not part of this repository because it reads personal and account-specific files.

## Run locally

Requirements: Python 3.9 or later. The interface has no package install step or external runtime dependencies.

```sh
./serve.sh
```

Open the printed address (by default `http://127.0.0.1:8848/`). Reel Mode is at `/reel.html`. The server binds to loopback only and serves this folder's `public/` directory. To use another port, run `PORT=8899 ./serve.sh`.

## Project layout

- `public/index.html`, `app.js`, `app.css`: main interactive dashboard
- `public/office.js`, `office.css`: isometric office and animated agent scenes
- `public/reel.html`, `reel.js`, `reel.css`: vertical replay mode
- `public/data.json`: synthetic fixture consumed by both views
- `public/thumbs/`: generic SVG demo covers
- `serve.sh`: loopback-only local server

## Data and privacy

The dashboard reads the local `public/data.json` fixture. It does not connect to Instagram, YouTube, TikTok, email, job boards, or any agent service. Keep private integrations and real records outside the repository. If you adapt the fixture, remove identifying information before sharing it.

## Version

Demo release: `v1.0.0`.
