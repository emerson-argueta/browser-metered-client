# browser-metered-client

Minimal JavaScript client library for [browser-metered-proxy](https://github.com/emerson-argueta/browser-metered-proxy). Handles the three things every browser app needs when talking to the proxy: attaching identity, signing submissions, and dispatching capabilities.

- **JWT auth** — store the token after login/register, attach it automatically to every request
- **Ed25519 signing** — generate and store a keypair via the Web Crypto API, sign submission payloads for tamper-proof storage
- **Capability dispatch** — send requests in the correct envelope shape, return structured results

No runtime dependencies. No bundler required. Ships as an ES module.

## Requirements

- Chrome 113+, Firefox 129+, or Safari 17+ (Ed25519 via Web Crypto API)

## Installation

```bash
npm install browser-metered-client
```

## Usage

### Initialize

```javascript
import { createClient } from 'browser-metered-client'

const client = createClient({
  baseUrl: 'https://your-proxy.fly.dev', // required
  storage: localStorage,                  // optional, default: localStorage
})
```

### Auth

```javascript
// Register — stores JWT automatically
await client.auth.register('user@example.com', 'password', 'password')

// Login — stores JWT automatically
await client.auth.login('user@example.com', 'password')

// Set token manually (e.g. from local SQLite in a WASM app)
client.auth.setToken(jwt)

// Get current token
client.auth.getToken()

// Clear token (logout)
client.auth.clearToken()
```

### Invoke a capability

```javascript
// Basic capability — JWT attached automatically
const result = await client.invoke('verify_income', {
  external_id: 'item_abc123'
})
// { status, raw_cost_cents, markup_cents, total_charged_cents, ... }

// Signed submission — payload signed with stored Ed25519 keypair
const result = await client.invoke('submit_form', {
  data: { name: 'Jane Doe', income: 75000 },
  idempotency_key: 'application_abc123'
}, { sign: true })
// { submission_id, status, raw_cost_cents, markup_cents, total_charged_cents }
```

### Key management

```javascript
// Generate a new Ed25519 keypair and store it
await client.keys.generate()

// Check if a keypair exists
client.keys.exists()

// Get the public key as base64 (safe to send to the server)
await client.keys.publicKey()

// Clear the stored keypair
client.keys.clear()
```

### Usage & billing

```javascript
// Paginated capability log
const log = await client.usage.log({
  capability: 'verify_income', // optional
  provider: 'plaid',           // optional
  status: 'success',           // optional
  start_date: '2026-01-01',    // optional
  page: 1                      // optional
})
// { records, total, page, pages }

// Monthly summary
const summary = await client.usage.summary()
// { this_month_total_cents, this_month_raw_cost_cents, this_month_markup_cents,
//   all_time_total_cents, call_count_this_month, breakdown_by_capability,
//   breakdown_by_provider, last_12_months }
```

### Error handling

Non-2xx responses reject with a `ProxyError`:

```javascript
try {
  await client.invoke('verify_income', { external_id: 'item_abc' })
} catch (err) {
  err.status  // HTTP status code
  err.message // error message from proxy
}
```

## Custom storage

Pass any object with `getItem(key)` and `setItem(key, value)` to use a storage backend other than `localStorage` — useful for WASM apps with SQLite-backed storage:

```javascript
const client = createClient({
  baseUrl: 'https://your-proxy.fly.dev',
  storage: {
    getItem: (key) => db.query('SELECT value FROM kv WHERE key = ?', [key]),
    setItem: (key, value) => db.exec('INSERT OR REPLACE INTO kv VALUES (?, ?)', [key, value])
  }
})
```

## Development

```bash
npm test        # run tests once
npm run test:watch  # watch mode
```

## License

MIT
