---
name: oidc-browser-verification
description: 'Verify protected Angular UI flows using the local server and the box.moe OIDC login. Supports human-assisted login and disposable local test accounts. Use for authentication, routing, protected pages, and authenticated browser interaction.'
---

# OIDC Browser Verification

## Classify The Provider

Before handling credentials, inspect the development OIDC configuration and verify
the hostname through the current machine's OS resolver. On Linux, use
`getent hosts box.moe`.

Classify the provider as local-only only when all of these are true:

- The issuer is `http://box.moe:4444` and the login UI uses
  `http://box.moe:3000`.
- Every resolved `box.moe` address used by the flow is a loopback address.
- The user confirms that the account is disposable and exists only in the local
  development provider.

If any condition is false or cannot be verified, classify the provider as real and
treat its credentials as sensitive. A hostname match by itself is insufficient.

## Run The Flow

1. Reuse a healthy development server on port 4200. Otherwise start `npm start`
   as a persistent task and wait for its ready message.
2. Open exactly `http://localhost:4200`; do not substitute `127.0.0.1` because it
   does not match the registered callback URI.
3. Wait for initial user-state loading, then select the `Login` button by
   accessible role and name.
4. Permit redirects only among these origins:
   - `http://localhost:4200`
   - `http://box.moe:4444`
   - `http://box.moe:3000`
5. Choose an authentication mode:
   - **Human-assisted (default):** Pause automation on the provider page. Ask the
     user to enter credentials, complete any MFA, and approve consent directly in
     the opened browser. Ask only for confirmation that the callback completed;
     never ask the user to send credential values through chat.
   - **Automated local-only:** Use this only when the user explicitly requests it
     and the provider passed every local-only check above. The agent may enter a
     disposable local test credential supplied for this purpose, but must not
     commit it or reproduce it in output or artifacts.
   - **Automated real-provider:** Use only an existing repository setup that
     injects credentials without exposing them to Copilot. If none exists, use
     human-assisted login instead.
6. If automation is entering local credentials, submit the login form using
   accessible selectors. Accept consent only if the consent page appears.
7. Wait until the browser returns to a URL whose origin is exactly
   `http://localhost:4200`.
8. Confirm authentication using a stable application-visible signal, such as an
   authenticated user menu. Never validate authentication by reading tokens,
   cookies, or browser storage.
9. Perform the requested browser interactions and assertions.
10. Report the pages and behavior verified without credentials, tokens, cookies,
    or saved authentication state.

If the user cannot interact with the opened browser, the provider is unavailable,
or the callback does not complete, report the browser verification as blocked. Do
not bypass OIDC or inject tokens.