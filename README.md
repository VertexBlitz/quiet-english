# Quiet English

A five-page Scandinavian-minimalist English learning website with a Node.js chat API.

## Deploy on Render

The source bundle is stored in `quiet-english-render-ready.zip`. Render can extract and install it with:

```sh
unzip -o quiet-english-render-ready.zip
cd english-tutor-site
npm install
```

Start command:

```sh
cd english-tutor-site && npm start
```

The website works in demo mode without credentials. To enable live GPT replies, add `OPENAI_API_KEY` as a secret environment variable in Render. Never commit an API key.

## Pages

- `public/index.html` — landing page
- `public/method.html` — how it works
- `public/tutor.html` — chat
- `public/topics.html` — lesson topics
- `public/progress.html` — illustrative metrics and CTA

Metrics are illustrative placeholders, not verified product statistics.
