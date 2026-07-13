# my-one-password

A personal, end-to-end encrypted password manager. Runs on Cloudflare's free tier.

## Features

- Logins, cards, secure notes, identities
- Password generator + strength meter
- TOTP / 2FA codes
- 1Password-style Secret Key (2SKD)
- Multi-device sync
- 1Password (`.1pux`) import
- Web (PWA) + native apps for macOS, Windows, Android (desktop auto-update)

## Stack

React + Vite (PWA) · Cloudflare Workers + Hono + D1 · Web Crypto + libsodium (Argon2id) · Tauri 2

## Structure

```
packages/crypto   key derivation + encryption
packages/shared   types + constants
apps/web          React PWA
apps/api          Cloudflare Workers API
apps/desktop      Tauri (desktop + Android)
```

## Develop

```bash
npm install
npm run dev        # turbo: all workspaces
npm run typecheck
npm run test
```

## Security

Zero-knowledge. The server only ever stores ciphertext and an auth-key hash —
the master password and Secret Key never leave the device. Keys: Argon2id →
HKDF → AES-256-GCM.

## License

MIT
