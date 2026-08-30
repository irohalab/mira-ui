# Development Workflow

## Completion Contract

- After changing source code, run the narrowest relevant executable check.
- Run focused validation immediately after the first substantive edit and again
  after the final change when subsequent edits could affect the result.
- Do not claim that validation passed unless the command completed successfully.
- Do not modify unrelated code to repair pre-existing failures.
- Documentation-only changes do not require an application build.
- Styling changes and small layout changes do not require a test.

## Canonical Commands

- Application and Angular template validation: `npm run check`
- One-shot browser tests: `npm run test:once`
- Focused browser test:
  `npm run test:once -- --include="src/app/path/example.spec.ts"`
- Development server: `npm start`
- Do not use raw `npm test` for agent verification because it starts watch mode.

## Project Sources of Truth

- Use [package.json](../package.json) and [angular.json](../angular.json) for the
  current Angular version and commands; the root README is stale CLI scaffold
  text.
- Local API targets and path ownership are defined in
  [proxy.conf.json](../proxy.conf.json). Keep browser calls same-origin unless a
  task explicitly changes that architecture.
- `npm run build` generates ignored deployment files through
  [scripts/process-environment.js](../scripts/process-environment.js). Use
  `npm run check` for ordinary source validation.
- For playback or signed-routing changes, read the
  [UI integration guide](../docs/mira-ui-routing-integration.md),
  [proxy/cache design](../docs/proxy-cache-routing-design.md), and
  [signed-routing client guide](../docs/signed-routing-client-guide.md) instead
  of restating those contracts here.
- Authentication startup, refresh, and logout behavior is coordinated in
  `src/app/user-service/user.service.ts`; preserve its single-flight and
  cross-tab refresh behavior when changing the OIDC flow.

## Browser Test Environment

- Browser tests require Chrome and may fail before executing any specs when run
  inside a restricted process sandbox.
- A Chrome launch or sandbox error is an environment failure, not a test failure.
- When sandbox-related Chrome startup fails, retry once through the repository's
  host-side VS Code test task or approved unsandboxed execution, when available.
- Do not add `--no-sandbox`, weaken the shared Karma configuration, or change
  application code merely to accommodate the agent environment.
- If host-side execution is unavailable, run `npm run check` as the fallback.
  Report the browser test command and startup error, and explicitly state that
  browser tests were not executed. A successful build does not count as passing
  tests.
- When tests execute and a Jasmine assertion fails, treat it as a real test
  failure and investigate it normally.

## Development Server

- Start the development server only when requested or when browser verification
  is necessary.
- Reuse an existing healthy server on port 4200 rather than starting another.
- Start servers as persistent background tasks and wait for the ready message.
- Report the URL, normally `http://localhost:4200/`.
- Stop only servers started during the current task unless asked to leave them
  running.

## Reporting

At completion, report:

- Files changed
- Validation commands that passed
- Commands that failed and whether the cause was code or environment
- Checks that could not be run
- Development server URL when one was started

## Live Browser Verification

- Automated tests and live browser verification are separate checks.
- Do not start a development server or browser after every source change.
- Use live browser verification when:
    - the user explicitly requests it;
    - a change affects routing, OIDC authentication, protected pages, browser APIs,
      or multi-step user interaction that unit tests cannot adequately verify;
    - a significant responsive or visual change must be checked in a rendered page.
- Styling changes and small layout changes do not require automated tests.
  Perform a live visual check only when requested or when static inspection cannot
  establish that the layout works.
- Logic-only changes should normally use the focused unit test and `npm run check`.
- Reuse a healthy server on port 4200. Otherwise start `npm start`, wait for it
  to be ready, and use exactly `http://localhost:4200`.
- Do not substitute `127.0.0.1`; it does not match the registered OIDC redirect URI.

## Authenticated Browser Verification

- Use the `oidc-browser-verification` skill for protected-page verification.
- Prefer human-assisted login unless the user explicitly requests automated login
  with a confirmed disposable local account. No credential setup is required for
  human-assisted login: open the browser, trigger the OIDC redirect, ask the user
  to complete login and consent directly in that browser, and resume after the
  callback returns to `http://localhost:4200`.
- Do not infer that an account is local from the `box.moe` hostname alone. Treat
  credentials as disposable local test data only when the configured development
  endpoints use the expected custom ports, `box.moe` resolves to a loopback
  address on the current machine, and the user confirms the account is local-only.
- For a confirmed local-only provider, the agent may use disposable development
  credentials supplied for that purpose. Do not commit them or include them in
  screenshots, traces, command output, or completion reports.
- For every provider that is not confirmed local-only, treat credentials as
  sensitive. Never request them in chat or read, print, or store them in source
  files or command arguments. Use human-assisted login, or an existing automated
  setup that injects credentials without exposing them to Copilot.
- Never inspect or report access tokens, refresh tokens, ID tokens, cookies, or
  saved browser authentication state.
- Treat identity-provider unavailability, rejected redirects, CAPTCHA, MFA, or
  an incomplete human handoff as environment blockers. Do not bypass OIDC or
  inject tokens.