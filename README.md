# Quiet English

A five-page English-learning website with a Node.js / Express chat API and a streaming AI tutor.

## Stack

- Static frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Hosting: Render
- AI: Cloudflare Workers AI (OpenAI-compatible Chat Completions API)
- Default model: `@cf/google/gemma-4-26b-a4b-it`

## Configure the AI service

Create the Cloudflare account and Workers AI API token with the adult account owner. Keep the API token private.

In the Cloudflare dashboard:
1. Open **Workers AI**.
2. Select **Use REST API**.
3. Create a **Workers AI API Token** using the dashboard's suggested permissions.
4. Copy the **Account ID**.

In Render → **Environment**, set:

- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare Account ID
- `CLOUDFLARE_API_TOKEN` — secret Workers AI API token
- `CLOUDFLARE_MODEL` — optional; defaults to `@cf/google/gemma-4-26b-a4b-it`

Save and deploy. Never commit a real API token to GitHub or put it in frontend JavaScript.

Workers AI Free includes a daily 10,000 Neuron allocation. When it is exhausted, requests fail until the quota resets; this project does not automatically upgrade to a paid plan.

## Local development

1. Copy `.env.example` to `.env`.
2. Fill the Cloudflare variables.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/tutor.html`.

## API

- `GET /api/health` — reports whether the required environment variables are present (never returns secrets).
- `POST /api/chat` — validates message history, adds tutor instructions server-side, and streams OpenAI-compatible SSE chunks to the browser.

The chat route has an IP-based rate limit and bounded message length / history. For a public deployment, add stronger abuse protection and a privacy notice appropriate to your audience.

## Pages

- `public/index.html` — landing page
- `public/method.html` — how it works
- `public/tutor.html` — chat
- `public/topics.html` — lesson topics
- `public/progress.html` — illustrative metrics and CTA

Metrics on the progress page are illustrative placeholders, not verified product statistics.
