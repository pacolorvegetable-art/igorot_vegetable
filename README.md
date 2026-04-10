# igorot_vegetable

## Deployment

### 1. Deploy the server to Render

Create a **Web Service** from the `server` directory with:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** `server`

Set these Render environment variables:

- `PORT=10000` (Render sets this automatically, but leave it available)
- `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app`
- `SUPABASE_URL=<your-supabase-url>`
- `SUPABASE_ANON_KEY=<your-supabase-anon-key>`
- `UPSTASH_REDIS_REST_URL=<your-upstash-url>` (optional)
- `UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>` (optional)
- `SMTP_HOST=smtp.gmail.com` (if email is enabled)
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=<your-gmail-address@gmail.com>`
- `SMTP_PASS=<your-gmail-app-password>`

After deploy, copy your Render service URL, for example:
`https://igorot-vegetable-api.onrender.com`

### 2. Deploy the client to Vercel

Import the `client` directory as a Vercel project with:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Root directory:** `client`

Set Vercel environment variables:

- `VITE_SUPABASE_URL=<your-supabase-url>`
- `VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>`
- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`

Then update `client/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-render-service-url.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Replace `https://your-render-service-url.onrender.com` with your actual Render URL.

### 3. Final connection check

1. Open the Vercel site.
2. Confirm requests to `/api/*` are reaching Render.
3. Set `CLIENT_ORIGIN` in Render to the exact Vercel domain (or a comma-separated list if you use multiple domains).
