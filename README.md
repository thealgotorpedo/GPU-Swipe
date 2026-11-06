# GPU Marketplace

Express/Mongoose API (`gpu-backend`) and React/Vite client (`gpu-frontend`).

## Local setup

1. Install dependencies with `npm ci` in each directory.
2. Copy `gpu-backend/.env.example` to `gpu-backend/.env`, configure MongoDB and a strong JWT secret, then run `npm start` in `gpu-backend`.
3. Set `VITE_API_BASE_URL` in the frontend environment to the API address, or an empty string for a same-origin reverse proxy. Run `npm run dev` in `gpu-frontend`.
4. Serve `/api` through the same origin in production and configure SPA fallback for frontend routes, including `/reset-password`. The existing API binds to loopback; use the reverse proxy for access. For local development with separate origins, proxy `/api` through Vite and use an empty `VITE_API_BASE_URL`.

### Password reset email

Configure `RESEND_API_KEY`, `RESET_EMAIL_FROM` (a verified Resend sender), and `FRONTEND_URL` (the public frontend origin, HTTPS in production). No email credentials are embedded in browser code. Links expire after 30 minutes; only a SHA-256 token hash is stored. A reset consumes the token atomically and revokes existing JWT sessions. A new reset request replaces the previous link. Passwords must have at least 8 characters and at most 72 UTF-8 bytes.

The forgot-password endpoint returns the same message for known and unknown emails. Missing email configuration returns 503. Delivery failures invalidate the token and log a generic server error without exposing recipient details or tokens. Reset endpoints apply an in-process IP limit of ten attempts per 15 minutes; multi-instance deployments should also enforce shared limits at the reverse proxy. Configure Express trusted proxies for your actual proxy topology before relying on client-IP limits behind a proxy.

### Database changes

Mongoose adds optional public profile fields (`displayName`, `bio`, `contactEmail`, `contactPhone`) and password reset/session fields to users. Existing accounts require no backfill. Account email and legal names are never returned by public-profile endpoints. Public contact details are opt-in and can be cleared.

The new `ratings` collection has a **unique compound index on `listingId, reviewerId`**, created explicitly before the server accepts requests, plus a seller lookup index. Ensure the database user can create indexes. Startup fails if index creation fails. Seller averages are computed from ratings rather than cached user fields. Users can rate another seller from 1–5 once per listing; ratings are final and do not require a verified purchase. Sellers cannot rate themselves.

Listings retain `active`/`sold` status and their existing `imageUrls` field. Uploads support four JPEG/PNG/WebP files, 1 MB each. Files are stored as data URLs in MongoDB to work with the existing storage setup; external HTTPS image URLs are also accepted by the API. For larger-scale storage, move uploads to object storage. JSON request bodies are limited to 6 MB; configure your reverse proxy to allow this size too.

## API

All marketplace/profile/rating endpoints require `Authorization: Bearer <token>`; registration, login, and password recovery are public.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/listings?model=RTX&page=1` | Active marketplace listings, literal case-insensitive model substring, 24 per page |
| GET | `/api/listings?mine=true&page=1` | Current user's listings, including sold listings |
| POST | `/api/listings` | Existing create payload, optional `imageUrls` uploads |
| GET | `/api/listings/:listingId` | Specs, photos, status and public seller profile/rating |
| PATCH | `/api/listings/:listingId/status` | Owner only; `{ "status": "sold" }` or `active` |
| GET | `/api/profile` | Current public profile and seller rating |
| PATCH | `/api/profile` | Update display name, bio, public email and phone only |
| GET | `/api/listings/:listingId/rating` | Current user's submitted score or null |
| POST | `/api/listings/:listingId/rating` | `{ "score": 1..5 }`; duplicate returns 409, self-rating 403 |
| POST | `/api/password/forgot` | `{ "email": "..." }`; send recovery link |
| POST | `/api/password/reset` | `{ "token": "...", "password": "..." }`; consume link and replace password |

**Compatibility:** `GET /api/listings` now browses all active listings. Existing clients that need only their own listings must pass `mine=true`.

## Review order

The local commits separate API browse/search, public profiles, listing detail/status, ratings, password reset, then frontend navigation/search, profile, listing details/status, rating form, API photo validation, photo upload UI, and password recovery UI. Follow-up commits add regression coverage and documentation. No deployment or push is required to review them.

## Validation

- `cd gpu-backend && npm test`: HTTP regression tests using the real Express routes with stubbed database/email boundaries. Covers authentication, search escaping, profile field allowlists, owner checks, rating restrictions, upload validation and reset-token consumption/session revocation. Requires permission to bind a temporary localhost port.
- `cd gpu-frontend && npm run build`: TypeScript checks and production bundle.
- Integration checks before deployment: run against a disposable MongoDB database, verify simultaneous duplicate rating requests yield one success and one 409, check actual email delivery and expired/reset-link replay, and walk through the UI with buyer and seller accounts. The automated suite does not exercise a live MongoDB or email provider, or a browser.
