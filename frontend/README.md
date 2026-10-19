# ACC College Frontend

Single Vite + React frontend combining the public college website and the authenticated ACC portal.

## URL structure

- `/` — public college website
- `/about`, `/organization`, `/academic/*`, `/news`, `/programs`, `/contact` — public pages
- `/acc/auth` — authentication portal entry
- `/acc/auth/login` — login
- `/acc/auth/register` — registration
- `/acc/auth/verify-otp` — registration OTP
- `/acc/auth/verify-2fa` — 2FA
- `/acc/auth/forgot-password` — password recovery
- `/acc/auth/dashboard` — protected dashboard
- `/acc/auth/sessions` — protected session management

Legacy auth URLs redirect to the `/acc/auth/*` namespace.

## Development

```bash
npm install
npm run dev
```

Set `.env` from `.env.example` before starting.

## Production build

```bash
npm run build
npm run preview
```

The frontend uses one BrowserRouter, one ClerkProvider, and one authenticated Axios client.
