# Signed Routing Client Integration Guide

> Protocol: `redirect` routing API v1
>
> Audience: Browser, mobile, desktop, command-line, and third-party clients
>
> Last updated: 2026-08-07

## 1. Purpose

The routing API lets a client ask `redirect` to choose a proxy/cache backend
before loading an image or video. The response contains a signed playback URL.
Using that URL keeps requests for the resource pinned to the selected backend
while it remains available.

Routing is optional. A correct client always keeps the canonical resource URL
and uses it when route resolution is unsupported or unavailable.

The token controls routing only. It does not authorize access to a resource.

## 2. Endpoint Discovery

Start with an absolute canonical resource URL received from the content API:

```text
https://media.example.com/video/example/file.mp4?quality=source
```

The routing API is on the same origin as that resource:

```text
https://media.example.com/_mira/routing/v1/backends
https://media.example.com/_mira/routing/v1/routes
```

Do not resolve the routing API against the website URL and do not hard-code the
content API origin. The absolute media URL is authoritative: its origin may be a
separate configurable redirect ingress.

For example, an application loaded from `https://mira.example.com` can receive a
media URL on `https://media.example.com`. In that case, routing requests go to
`https://media.example.com`, and that redirect deployment must allow
`https://mira.example.com` through CORS.

For a managed deployment, keep these values aligned:

- the content backend's configured video/media domain;
- redirect's `Routing.PublicOrigin`; and
- the actual public origin that forwards the media and routing API paths.

The website origin is a different value and belongs in redirect's
`Routing.AllowedOrigins` when it differs from the media origin.

Reject relative canonical URLs unless a legacy integration explicitly defines
how to resolve them. Do not hard-code `/video/` or another resource prefix:
S3-backed media may use bucket paths such as `/public-video/`. Submit the
canonical path and let `redirect` validate its configured
`AllowedResourcePrefixes`. Briefly suppress an origin that does not expose API
v1, but retry after a short period so temporary proxy configuration or outages
can recover.

## 3. List Backends

```http
GET /_mira/routing/v1/backends
```

Successful response: HTTP `200`

```json
{
  "version": 1,
  "backends": [
    {
      "id": "jp-example",
      "label": "Japan Example",
      "region": "JP",
      "availability": "healthy",
      "selectable": true
    }
  ]
}
```

Fields:

| Field | Client use |
| --- | --- |
| `id` | Stable value sent as `backendId`. Do not display it as the primary name. |
| `label` | User-facing node name. |
| `region` | Optional grouping/location code. |
| `availability` | Currently `healthy` or `offline`; clients must tolerate future values. |
| `selectable` | Whether the node may be manually selected. Listed entries are normally selectable. |

Backend URLs are intentionally not exposed.

## 4. Create A Route

```http
POST /_mira/routing/v1/routes
Content-Type: application/json
```

The `resource` value must be the path and query only. Do not send its scheme or
host.

### 4.1 Automatic selection

```json
{
  "resource": "/video/example/file.mp4?quality=source",
  "preference": {
    "mode": "auto"
  },
  "excludeBackendIds": []
}
```

### 4.2 Prefer one node

```json
{
  "resource": "/video/example/file.mp4?quality=source",
  "preference": {
    "mode": "backend",
    "backendId": "jp-example"
  },
  "excludeBackendIds": []
}
```

The node is a preference, not a guarantee. If it is offline or excluded, the
server may return another healthy backend.

### 4.3 Exclude failed nodes

On a playback retry, submit IDs that failed during the current session:

```json
{
  "resource": "/video/example/file.mp4?quality=source",
  "preference": {
    "mode": "auto"
  },
  "excludeBackendIds": [
    "jp-example"
  ]
}
```

At most 16 IDs are accepted. Do not store exclusions permanently.

### 4.4 Location preference

The currently deployed API does not yet accept a location/region mode. Clients
may group the backend list by `region` for display, but must not claim that a
region preference is supported until the server accepts this request shape:

```json
{
  "resource": "/video/example/file.mp4",
  "preference": {
    "mode": "region",
    "region": "JP"
  },
  "excludeBackendIds": []
}
```

Do not randomly select a node within a region in the client. Server-side
selection owns health, weights, exclusions, and future quality scoring.
The server deployment should map each public region code to an explicit
weighted group; clients only submit the region code advertised by the backend
catalog.

## 5. Route Response

Successful response: HTTP `201`

```json
{
  "routeToken": "payload.signature",
  "playbackUrl": "https://media.example.com/video/example/file.mp4?quality=source&__mira_route=payload.signature",
  "selectedBackend": {
    "id": "jp-example",
    "label": "Japan Example",
    "region": "JP",
    "availability": "healthy",
    "selectable": true
  },
  "selection": {
    "mode": "auto",
    "reason": "main-group"
  },
  "issuedAt": "2026-08-07T12:00:00Z",
  "freshUntil": "2026-08-08T12:00:00Z",
  "expiresAt": "2026-08-14T12:00:00Z"
}
```

Use `playbackUrl` as returned. Do not:

- decode the token;
- modify its claims;
- build a backend URL yourself;
- append a second routing parameter; or
- send the token to another resource.

The token is bound to the exact normalized resource path and non-routing query.
Before loading it, parse the returned URL and verify all of the following:

- its origin equals the canonical origin;
- its escaped path equals the canonical path; and
- its raw query equals the canonical raw query followed by exactly one
  `__mira_route` value equal to `routeToken`.

This guide assumes the default route query name `__mira_route`. A deployment
that changes the server setting must publish that name to its clients. Treat a
malformed or unexpected URL as a routing failure and use the canonical URL.

`freshUntil` is informational in routing API v1. `expiresAt` is the hard token
expiry. A client should normally request a new route when starting a new
playback session rather than persist an old playback URL.

## 6. Playback Request

Load the returned URL normally:

```http
GET /video/example/file.mp4?quality=source&__mira_route=TOKEN
Range: bytes=0-
```

`redirect` verifies the token, removes the routing parameter, and returns a
redirect. Typical diagnostic headers are:

```http
HTTP/1.1 307 Temporary Redirect
Location: https://selected-cache.example/video/example/file.mp4?quality=source
Cache-Control: private, no-store
X-Mira-Backend: jp-example
X-Mira-Route: pinned
```

`X-Mira-Route` can be:

| Value | Meaning |
| --- | --- |
| `pinned` | The signed backend was used. |
| `fallback` | A token was present but normal fallback selection was needed. |
| `legacy` | No routing token was used. |

Browser media elements do not necessarily expose redirect response headers to
JavaScript. Use `selectedBackend` from the route response for UI state.

## 7. Error Handling

Routing API errors use this body when available:

```json
{
  "error": "message"
}
```

| Status | Meaning | Recommended behavior |
| --- | --- | --- |
| `200` with another schema | Routing may be disabled and the legacy POST catch-all answered | Use canonical URL. Detect support by valid `201` response, not by `404`. |
| `400` | Invalid resource or request body | Fix the client request; use canonical URL now. |
| `403` | Browser origin is not allowed | Use canonical URL and report deployment configuration. |
| `404` | An outer proxy/application may not forward the routing API | Use canonical URL. Current `redirect` may return a different response when routing is disabled. |
| `405` | Wrong method or public proxy sent the request elsewhere | Ensure route creation uses POST and the proxy forwards the API path; use canonical URL now. |
| `422` | Invalid preference or unknown/unselectable node | Reset to automatic, refresh backend list, and retry at most once. |
| `429` | Rate limit exceeded | Honor `Retry-After` for API retries; use canonical URL immediately. |
| `503` | No healthy backend | Use canonical URL; do not loop route requests. |
| Other `5xx` | Temporary server failure | Use canonical URL. |

Network, timeout, CORS, malformed JSON, unexpected response, and every non-`201`
status have the same fallback: use the canonical URL.

Do not make route resolution a prerequisite for showing or playing media.

## 8. Reference Algorithm

```text
function resolveForPlayback(canonicalUrl, preference, failedBackendIds):
  absolute = parse canonicalUrl and require an absolute HTTP(S) URL
    routingOrigin = absolute.origin
    resource = absolute.pathname + absolute.search

    request = {
        resource,
        preference,
        excludeBackendIds: failedBackendIds.takeFirst(16)
    }

    try with a short timeout:
        response = POST routingOrigin + "/_mira/routing/v1/routes"
          if response status is 201 and body has a valid playbackUrl whose
            origin, path, and non-routing query match the canonical resource:
            return {
                canonicalUrl: absolute URL,
                playbackUrl: body.playbackUrl,
                backend: body.selectedBackend,
                routed: true
            }
    catch or on any other status:
        continue

    return {
        canonicalUrl: absolute URL,
        playbackUrl: absolute URL,
        backend: none,
        routed: false
    }
```

Use a two-to-three-second timeout for interactive playback. Cancel or ignore a
route response if the user selects another resource before it completes.

## 9. Browser JavaScript Example

```js
async function resolvePlaybackUrl(canonicalUrl, preference = {mode: 'auto'}, excludeBackendIds = []) {
  let canonical;
  try {
    canonical = new URL(canonicalUrl);
  } catch {
    return {playbackUrl: canonicalUrl, routed: false};
  }
  if (canonical.protocol !== 'http:' && canonical.protocol !== 'https:') {
    return {playbackUrl: canonicalUrl, routed: false};
  }
  const endpoint = new URL('/_mira/routing/v1/routes', canonical.origin);
  const resource = canonical.pathname + canonical.search;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        resource,
        preference,
        excludeBackendIds: excludeBackendIds.slice(0, 16)
      }),
      signal: controller.signal,
      credentials: 'omit'
    });

    if (response.status !== 201) {
      return {playbackUrl: canonical.href, routed: false};
    }

    const route = await response.json();
    if (typeof route.playbackUrl !== 'string'
      || typeof route.routeToken !== 'string'
      || !route.selectedBackend) {
      return {playbackUrl: canonical.href, routed: false};
    }

    const playback = new URL(route.playbackUrl);
    const separator = canonical.search ? '&' : '?';
    const expectedSearch = canonical.search
      + separator
      + '__mira_route='
      + encodeURIComponent(route.routeToken);
    if (playback.origin !== canonical.origin
      || playback.pathname !== canonical.pathname
      || playback.search !== expectedSearch) {
      return {playbackUrl: canonical.href, routed: false};
    }

    return {
      playbackUrl: playback.href,
      backend: route.selectedBackend,
      selection: route.selection,
      routed: true
    };
  } catch {
    return {playbackUrl: canonical.href, routed: false};
  } finally {
    window.clearTimeout(timeout);
  }
}
```

This example deliberately uses `credentials: 'omit'`, so it does not send the
legacy `group` cookie. That makes the explicit request preference the only
manual routing state. A same-origin legacy client that intentionally wants the
cookie to influence automatic selection may use `credentials: 'same-origin'`.
Cross-origin cookie use is not supported by routing API v1. Never include an
account bearer token. Browser access requires the client origin to be allowed by
the redirect deployment's CORS configuration.

## 10. Retry And Failover

When a selected route produces a fatal media error or a sustained stall:

1. Remember the current playback position and play/pause state.
2. Add `selectedBackend.id` to a session-local exclusion set.
3. Request another route for the canonical URL.
4. Load the new `playbackUrl`.
5. Seek to the saved position after metadata loads.
6. Start playback according to the client's normal source-loading behavior.

Recommended limits:

- no more than two automatic failovers per resource;
- at least 30 seconds between attempts;
- no more than 16 exclusion IDs;
- after exhaustion, try the canonical URL once and stop automatic retries.

## 11. Persistence Rules

Safe to persist:

- automatic/manual mode;
- preferred backend ID;
- preferred region after server support exists.

Do not persist:

- route token;
- signed playback URL;
- active selected backend as if it were a preference;
- failed backend exclusions;
- raw network address;
- automatic network measurements as account-wide settings.

Request a new route for a new playback session.

## 12. Security And Privacy

- Treat all API data as untrusted input.
- Never log complete tokens or signed playback URLs.
- Never send the signed URL as analytics metadata.
- Do not use routing tokens as authentication.
- Do not query or display hidden backend URLs.
- Do not trust client-side region selection for authorization.
- Keep route exclusions and playback failures session-local.

## 13. Client Conformance Checklist

- [ ] API origin is derived from the canonical resource origin.
- [ ] Canonical media URLs are required to be absolute HTTP(S) URLs.
- [ ] A redirect origin different from the website origin works through CORS.
- [ ] Unsupported origins are suppressed briefly, then retried.
- [ ] Legacy and S3-backed paths are sent without client-side prefix filtering.
- [ ] Route creation uses HTTP POST and JSON.
- [ ] `resource` contains path and query only.
- [ ] Canonical URL is retained for fallback.
- [ ] `playbackUrl` is used without modifying the token.
- [ ] Returned playback origin, path, and non-routing query match the canonical resource.
- [ ] API/network failures fall back to canonical playback.
- [ ] Tokens and playback URLs are not persisted or logged.
- [ ] Backend IDs, not labels, are submitted as preferences.
- [ ] Actual selected backend is read from the route response.
- [ ] Offline manual choices are treated as preferences with fallback.
- [ ] Stale asynchronous responses cannot replace a newer media selection.
- [ ] Automatic failover is bounded and preserves playback position.
- [ ] Location mode is hidden until the server supports `mode: region`.
