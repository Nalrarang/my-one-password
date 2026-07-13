# my-one-password

개인용 종단간(E2E) 암호화 패스워드 매니저. Cloudflare 무료 티어에서 동작.

> English below · [English](#english)

## 기능

- 로그인 · 카드 · 보안 메모 · 신원 정보
- 비밀번호 생성기 + 강도 측정
- TOTP / 2FA 코드
- 1Password 방식 Secret Key (2SKD)
- 멀티 디바이스 동기화
- 1Password (`.1pux`) 가져오기
- 웹(PWA) + 네이티브 앱(macOS · Windows · Android, 데스크톱 자동 업데이트)

## 스택

React + Vite (PWA) · Cloudflare Workers + Hono + D1 · Web Crypto + libsodium (Argon2id) · Tauri 2

## 구조

```
packages/crypto   키 파생 + 암호화
packages/shared   타입 + 상수
apps/web          React PWA
apps/api          Cloudflare Workers API
apps/desktop      Tauri (데스크톱 + Android)
```

## 개발

```bash
npm install
npm run dev        # turbo: 전 워크스페이스
npm run typecheck
npm run test
```

## 보안

Zero-knowledge. 서버는 암호문과 인증키 해시만 저장하며, 마스터 비밀번호와
Secret Key는 기기를 떠나지 않는다. 키 체인: Argon2id → HKDF → AES-256-GCM.

## 라이선스

MIT

---

<a name="english"></a>

# my-one-password (English)

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
