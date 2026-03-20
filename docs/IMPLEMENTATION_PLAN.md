# my-one-password 구현 계획서

## 프로젝트 개요

1Password 대체용 개인 패스워드 매니저 앱. 개인 사용 목적으로 필요한 핵심 기능만 구현.

## 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| **Frontend** | React + TypeScript (Vite) | 15년 경력 활용, PWA 지원 |
| **상태관리** | Zustand | 단일 유저 앱에 적합, 경량 |
| **스타일링** | Tailwind CSS | 빠른 UI 개발 |
| **Backend/API** | Cloudflare Workers + Hono | TS 기반, 무료 티어, 서버 관리 불필요 |
| **Database** | Cloudflare D1 (SQLite) | 무료, 개인 사용 충분 |
| **파일 저장** | Cloudflare R2 | 암호화된 백업/첨부파일 |
| **암호화** | Web Crypto API + libsodium (Argon2id) | 네이티브 하드웨어 가속, 제로 의존성 |
| **모바일** | PWA (Progressive Web App) | 코드베이스 하나로 모든 기기 |
| **호스팅** | Cloudflare Pages + Workers | 월 $0 (무료 티어) |

## 핵심 보안 아키텍처 (Zero-Knowledge)

```
마스터 비밀번호 (사용자만 알고 있음, 저장 안됨)
      │
      ▼
  [Argon2id KDF] + salt
      │
      ▼
  Master Key (256-bit)
      │
      ├── [HKDF "auth"] → Auth Key (서버 인증용, 암호화 불가)
      │
      └── [HKDF "enc"]  → Encryption Key
                              │
                              ▼
                         Vault Key (랜덤 생성, EK로 암호화 저장)
                              │
                              ▼
                         각 아이템별 AES-256-GCM 암호화
```

서버는 암호화된 데이터만 저장. 서버가 해킹당해도 데이터 복호화 불가능.

### 키 파생 체인

1. **마스터 비밀번호** → Argon2id (64MiB 메모리, 3 iterations, parallelism 4) → **Master Key**
2. Master Key → HKDF-SHA256 (info="auth") → **Auth Key** (서버 인증용)
3. Master Key → HKDF-SHA256 (info="enc") → **Encryption Key** (Vault Key 암호화용)
4. **Vault Key**: 랜덤 생성된 256-bit 키, Encryption Key로 암호화되어 서버에 저장
5. 각 아이템은 Vault Key로 AES-256-GCM 암호화

### 암호화 사양

- 알고리즘: AES-256-GCM (AEAD)
- 키 크기: 256 bits
- Nonce/IV: 96 bits (12 bytes), 매 암호화마다 랜덤 생성
- Tag 길이: 128 bits (16 bytes)
- 저장 포맷: `[version: 1byte][nonce: 12bytes][ciphertext][GCM tag: 16bytes]`

## 프로젝트 구조

```
my-one-password/
  packages/
    crypto/              ← 암호화 모듈 (Web Crypto + Argon2id)
      src/
        pbkdf2.ts
        argon2.ts
        hkdf.ts
        aes-gcm.ts
        vault-key.ts
        index.ts
      __tests__/
    shared/              ← 타입, 스키마, 상수
      src/
        types/
          vault-item.ts
          login.ts
          card.ts
          note.ts
          identity.ts
        schemas/
        constants.ts
        index.ts
  apps/
    web/                 ← React + Vite PWA
      src/
        components/
        pages/
        hooks/
        services/
          api.ts
          sync.ts
          local-db.ts
        crypto/
        App.tsx
        main.tsx
      public/
        manifest.json
        sw.js
    api/                 ← Cloudflare Workers + Hono
      src/
        routes/
          auth.ts
          vault.ts
          sync.ts
          import.ts
        middleware/
          auth-guard.ts
          rate-limit.ts
        db/
          schema.sql
          migrations/
        index.ts
      wrangler.toml
  turbo.json
  package.json
```

## 데이터 모델

### DB 스키마 (D1 / SQLite)

```sql
-- 사용자
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  salt          BLOB NOT NULL,
  verifier      BLOB NOT NULL,
  enc_vault_key BLOB NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- 세션
CREATE TABLE sessions (
  user_id    TEXT NOT NULL REFERENCES users(id),
  token      TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 볼트 아이템
CREATE TABLE vault_items (
  id             TEXT PRIMARY KEY,       -- UUID
  user_id        TEXT NOT NULL REFERENCES users(id),
  item_type      TEXT NOT NULL,          -- 'login' | 'card' | 'note' | 'identity' | 'totp'
  encrypted_data BLOB NOT NULL,          -- AES-256-GCM 암호화된 JSON
  iv             BLOB NOT NULL,          -- 12-byte initialization vector
  version        INTEGER NOT NULL DEFAULT 1,  -- 동기화용 단조 증가
  favorite       INTEGER NOT NULL DEFAULT 0,
  deleted        INTEGER NOT NULL DEFAULT 0,  -- soft delete
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- 태그
CREATE TABLE vault_item_tags (
  item_id TEXT NOT NULL REFERENCES vault_items(id),
  tag     TEXT NOT NULL
);

-- 동기화 상태
CREATE TABLE sync_state (
  user_id      TEXT NOT NULL REFERENCES users(id),
  device_id    TEXT NOT NULL,
  last_sync_at TEXT NOT NULL,
  sync_token   TEXT NOT NULL,
  PRIMARY KEY (user_id, device_id)
);
```

### 암호화된 아이템 페이로드 (복호화 후 JSON 구조)

**Login 아이템:**
```json
{
  "title": "GitHub",
  "url": "https://github.com/login",
  "username": "user@example.com",
  "password": "actual-password",
  "totp_secret": "JBSWY3DPEHPK3PXP",
  "totp_algorithm": "SHA1",
  "totp_digits": 6,
  "totp_period": 30,
  "notes": "",
  "custom_fields": []
}
```

**Credit Card 아이템:**
```json
{
  "title": "Card Name",
  "cardholder_name": "Name",
  "card_number": "4111111111111111",
  "expiry_month": "09",
  "expiry_year": "2028",
  "cvv": "123",
  "pin": "1234",
  "notes": ""
}
```

**Secure Note 아이템:**
```json
{
  "title": "Note Title",
  "content": "Secret content here",
  "notes": ""
}
```

## 동기화 프로토콜

### Push/Pull 방식 + Last-Write-Wins

각 아이템은 `version` (단조 증가 정수)과 `updated_at` (타임스탬프)을 가짐.

1. 클라이언트 Pull: `GET /sync?since=<last_sync_timestamp>` → 변경된 아이템 반환
2. 클라이언트 Push: `PUT /sync` → 수정된 아이템 전송 (expected version 포함)
3. 서버: optimistic concurrency → 버전 일치 시 수용, 불일치 시 conflict 반환
4. Conflict: 클라이언트에서 두 버전 복호화 후 last-modified-wins 또는 사용자 선택

### 삭제 처리

- Soft delete (deleted 플래그) → 30일 후 tombstone 제거
- Full vault re-sync: 복구 메커니즘으로 제공

## 구현 로드맵

### Phase 1: Core MVP

| 마일스톤 | 내용 | 상세 |
|----------|------|------|
| **1.1** | 프로젝트 기반 | 모노레포 세팅 (Turborepo), Cloudflare 계정/D1/R2 설정, CI/CD |
| **1.2** | 암호화 레이어 | Argon2id, HKDF, AES-256-GCM 구현, 크로스브라우저 테스트 |
| **1.3** | 인증 시스템 | 회원가입, 로그인, 세션(JWT), auto-lock (15분) |
| **1.4** | Vault CRUD | 아이템 등록/조회/수정/삭제, 검색, 클립보드 복사(30초 자동삭제) |
| **1.5** | 비밀번호 생성기 | 설정 가능 (길이, 문자종류), 패스프레이즈 모드, 강도표시 (zxcvbn) |
| **1.6** | PWA + 배포 | Service Worker, 오프라인 지원, Cloudflare Pages 배포 |

**Phase 1 완료 기준**: 계정 생성, 로그인 저장/조회, 비밀번호 생성, 폰/데스크톱에서 접근 가능. E2E 암호화 동작.

### Phase 2: 확장 기능

| 마일스톤 | 내용 | 상세 |
|----------|------|------|
| **2.1** | TOTP/2FA | RFC 6238 구현, QR 스캔 (getUserMedia), 카운트다운, 원탭 복사 |
| **2.2** | 신용카드/신분증 | 카드 정보 CRUD, 마스킹 표시 (마지막 4자리), 카테고리 필터 |
| **2.3** | 1Password 임포트 | .1pux 파일 파싱 (ZIP→JSON), 필드 매핑, 클라이언트 사이드 암호화 |
| **2.4** | 멀티디바이스 동기화 | Push/Pull 프로토콜, 버전 벡터, 충돌 해결 |

**Phase 2 완료 기준**: 1Password 데이터 임포트 완료, TOTP 정상 동작, 신용카드 저장, 디바이스 간 동기화.

### Phase 3: 완성도

| 마일스톤 | 내용 | 상세 |
|----------|------|------|
| **3.1** | 보안 강화 | WebAuthn 생체인증, 메모리 보호, Rate limiting |
| **3.2** | UX 개선 | 다크모드, 키보드 단축키 (Cmd+K 검색), 비밀번호 건강 리포트 |
| **3.3** | 백업/복구 | 암호화된 Export/Import, Recovery Kit PDF 생성 |
| **3.4** | 브라우저 확장 | (선택) Chrome/Firefox autofill 지원 |

**Phase 3 완료 기준**: 생체인증, 백업/복구, 일상 사용에 충분한 완성도.

## 주요 라이브러리

| 용도 | 라이브러리 | 비고 |
|------|-----------|------|
| 암호화 (AES, HKDF) | Web Crypto API (내장) | 네이티브, 하드웨어 가속 |
| Argon2id KDF | `libsodium-wrappers-sumo` | WASM 빌드, 감사된 libsodium |
| TOTP 생성 | `otpauth` | RFC 6238, ~5KB |
| 비밀번호 강도 | `@zxcvbn-ts/core` | 패턴 매칭 기반 강도 측정 |
| 1PUX 파싱 | `jszip` | ZIP 아카이브 클라이언트 파싱 |
| 보안 랜덤 | Web Crypto API (내장) | `crypto.getRandomValues()` |

## 1Password 임포트 (.1pux)

### 파일 구조

`.1pux`는 ZIP 아카이브:
```
export.1pux
  ├── export.attributes    (메타데이터 JSON)
  ├── export.data          (전체 아이템 JSON)
  └── files/               (첨부파일)
```

### 카테고리 매핑

| 1Password categoryUuid | 타입 | my-one-password 매핑 |
|------------------------|------|---------------------|
| `001` | Login | `login` |
| `002` | Credit Card | `card` |
| `003` | Secure Note | `note` |
| `004` | Identity | `identity` |
| `005` | Password | `login` |
| 기타 | 그 외 | `note` (범용 저장) |

### 임포트 플로우

1. 사용자가 1Password에서 .1pux 내보내기
2. 웹 UI에서 .1pux 파일 업로드
3. **클라이언트 사이드**: ZIP 해제 → JSON 파싱 → 필드 매핑 → 각 아이템 암호화
4. 암호화된 아이템을 서버로 배치 전송
5. .1pux 파일은 서버에 전송되지 않음 (평문 보호)

## 인프라 비용

| 서비스 | 무료 티어 한도 | 예상 사용량 |
|--------|--------------|------------|
| Workers | 100K req/day | 개인 사용: ~100 req/day |
| D1 | 5GB, 5M reads/day | 볼트 데이터: ~수 MB |
| R2 | 10GB | 백업: ~수 MB |
| Pages | 무제한 | 정적 프론트엔드 |
| **월 합계** | | **$0** |
