# Contributing

## Setup

```bash
git clone git@github.com:emerson-argueta/browser-metered-client.git
cd browser-metered-client
npm install
```

No build step required — the library is plain ES modules.

## Running tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

All tests must pass before submitting a PR.

## Project structure

```
src/
  client.js   # createClient entry point
  auth.js     # register, login, token management
  invoke.js   # capability dispatch and envelope building
  keys.js     # Ed25519 keypair generation, storage, signing
  usage.js    # log, summary
  errors.js   # ProxyError class
index.js      # re-exports createClient
test/         # one test file per source module
```

## Guidelines

**Keep it minimal.** This library does exactly three things: JWT auth, Ed25519 signing, and capability dispatch. Changes that expand scope beyond that (workflow orchestration, UI, application state) won't be accepted.

**No dependencies.** The library has no runtime dependencies and should stay that way. The Web Crypto API covers all cryptographic needs.

**JavaScript with JSDoc, not TypeScript.** Types are expressed via JSDoc so consumers get editor hints without a build step.

**Write tests.** Every public behavior should have a corresponding test. The test suite runs in Node's native ESM environment — no special setup needed beyond `npm install`.

**Match the proxy's canonical message format.** The signing format (`"${capability}:${JSON.stringify(payload)}"`) must stay in sync with [`SignatureVerifier.canonical_message`](https://github.com/emerson-argueta/browser-metered-proxy/blob/main/app/services/signature_verifier.rb) on the proxy side. If you change it here, it must be changed there too.

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `npm test` and confirm everything passes
4. Open a pull request with a clear description of what changed and why
