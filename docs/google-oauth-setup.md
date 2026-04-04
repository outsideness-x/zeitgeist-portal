# Google OAuth Setup

## Required env vars

Set these values in your deployment environment (do not commit real secrets):

```bash
AUTH_APP_BASE_URL=https://<frontend-domain>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://<backend-domain>/api/auth/google/callback
GOOGLE_OAUTH_SCOPES=openid email profile
```

For local development:

```bash
AUTH_APP_BASE_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

Also keep CORS aligned with your frontend:

```bash
BACKEND_CORS_ORIGIN=http://localhost:3000
BACKEND_CORS_ORIGINS=https://<frontend-domain>
NEXT_PUBLIC_BACKEND_URL=https://<backend-domain>
```

## Google Cloud Console

1. Open `Google Cloud Console` -> `APIs & Services` -> `Credentials`.
2. Configure `OAuth consent screen` (external/internal as needed), add support email and required app details.
3. Create `OAuth client ID` with type `Web application`.
4. Add authorized JavaScript origins:
- `http://localhost:3000` (dev)
- `https://<frontend-domain>` (prod)
5. Add authorized redirect URIs:
- `http://localhost:4000/api/auth/google/callback` (dev)
- `https://<backend-domain>/api/auth/google/callback` (prod)
6. Copy `Client ID` and `Client Secret` into env.

## Security notes

- Keep `GOOGLE_CLIENT_SECRET` only on backend.
- Do not expose provider tokens to client code.
- Keep `AUTH_APP_BASE_URL` on your trusted frontend domain only.
- Redirects are path-normalized server-side to prevent open redirect.
- Account linking for existing email/password users requires secure 2FA challenge flow.
