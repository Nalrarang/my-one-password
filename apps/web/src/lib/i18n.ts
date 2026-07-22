import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = "ko" | "en";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const LOCALE_KEY = "my1p_locale";

export const useI18nStore = create<I18nState>((set) => ({
  locale: (localStorage.getItem(LOCALE_KEY) as Locale) || "ko",
  setLocale(locale) {
    localStorage.setItem(LOCALE_KEY, locale);
    set({ locale });
  },
}));

// ---------------------------------------------------------------------------
// Translation dictionary
// ---------------------------------------------------------------------------

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // App
    "app.title": "my-one-password",

    // Auth - Login
    "auth.signIn": "로그인",
    "auth.signUp": "회원가입",
    "auth.email": "이메일",
    "auth.masterPassword": "마스터 비밀번호",
    "auth.confirmPassword": "비밀번호 확인",
    "auth.signInDescription": "금고에 접근하려면 로그인하세요",
    "auth.signUpDescription": "계정을 만들어 금고를 보호하세요",
    "auth.signingIn": "로그인 중...",
    "auth.creatingAccount": "계정 생성 중...",
    "auth.derivingKeys": "키 생성 중...",
    "auth.passwordMismatch": "비밀번호가 일치하지 않습니다",
    "auth.passwordTooShort": "마스터 비밀번호는 8자 이상이어야 합니다",
    "auth.inviteCode": "초대 코드",
    "auth.inviteCodePlaceholder": "초대 코드를 입력하세요",
    "auth.unexpectedError": "예기치 않은 오류가 발생했습니다",

    // Secret Key
    "secretKey.title": "시크릿 키가 생성되었습니다",
    "secretKey.description":
      "이 시크릿 키는 새 기기에서 로그인할 때 필요합니다. 안전한 곳에 저장해주세요.",
    "secretKey.warning":
      "이 키는 다시 표시되지 않습니다. 분실 시 금고에 접근할 수 없습니다.",
    "secretKey.copy": "복사",
    "secretKey.downloadKit": "Emergency Kit 다운로드",
    "secretKey.saved": "저장했습니다",
    "secretKey.label": "시크릿 키",
    "secretKey.hint": "회원가입 시 발급된 시크릿 키를 입력하세요",
    "secretKey.required":
      "이 기기에서 처음 로그인합니다. 시크릿 키를 입력해주세요.",

    // Auth - Unlock
    "auth.vaultLocked": "금고 잠김",
    "auth.unlockDescription": "마스터 비밀번호를 입력하여 잠금 해제하세요",
    "auth.unlock": "잠금 해제",
    "auth.unlocking": "잠금 해제 중...",
    "auth.signOut": "로그아웃",
    "auth.failedUnlock": "잠금 해제 실패",

    // Vault
    "vault.title": "내 금고",
    "vault.import": "가져오기",
    "vault.lock": "잠금",
    "vault.signOut": "로그아웃",
    "vault.search": "금고 검색...",
    "vault.all": "전체",
    "vault.add": "추가",
    "vault.itemCount": "{n}개 항목",
    "vault.favorites": "즐겨찾기",
    "shell.vault": "보관함",
    "nav.vault": "금고",
    "nav.search": "검색",
    "shell.tools": "도구",
    "shell.light": "라이트",
    "shell.dark": "다크",
    "shell.checker": "검사기",
    "shell.generator": "생성기",
    "shell.theme": "테마",
    "detail.selectPrompt": "항목을 선택하세요",
    "view.card": "카드형",
    "view.compact": "컴팩트",
    "view.group": "그룹형",
    "strength.weak": "약함",
    "strength.medium": "보통",
    "strength.strong": "강함",
    "field.website": "웹사이트",
    "field.username": "사용자 이름",
    "field.password": "비밀번호",
    "field.otp": "일회용 비밀번호 (OTP)",
    "field.cardNumber": "카드 번호",
    "field.cvv": "CVV",
    "field.expiry": "만료",
    "field.cardholder": "카드 소유자",
    "field.name": "이름",
    "field.email": "이메일",
    "field.phone": "전화번호",
    "field.notes": "메모",
    "detail.selectHint": "왼쪽 목록에서 항목을 선택하면 상세 정보가 표시됩니다",
    "vault.logins": "로그인",
    "vault.cards": "카드",
    "vault.notes": "메모",
    "vault.identities": "신원",
    "vault.noItems": "아직 항목이 없습니다. 첫 번째 항목을 추가하세요.",
    "vault.noResults": "검색 결과가 없습니다.",
    "vault.addItem": "항목 추가",
    "vault.addToFavorites": "즐겨찾기에 추가",
    "vault.removeFromFavorites": "즐겨찾기에서 제거",
    "vault.loading": "금고 항목 로딩 중...",

    // Item types
    "itemType.login": "로그인",
    "itemType.card": "카드",
    "itemType.note": "메모",
    "itemType.identity": "신원",

    // Item form
    "form.newItem": "새 항목",
    "form.editItem": "항목 편집",
    "form.itemType": "항목 유형",
    "form.title": "제목",
    "form.url": "URL",
    "form.username": "사용자 이름",
    "form.password": "비밀번호",
    "form.notes": "메모",
    "form.create": "만들기",
    "form.save": "변경사항 저장",
    "form.cancel": "취소",
    "form.goBack": "뒤로 가기",

    // Login fields
    "login.generatePassword": "비밀번호 생성",
    "login.hideGenerator": "생성기 닫기",
    "login.totp": "2단계 인증 (TOTP)",
    "login.totpSecret": "TOTP 시크릿 (Base32)",
    "login.totpAlgorithm": "알고리즘",
    "login.totpDigits": "자릿수",
    "login.totpPeriod": "주기 (초)",
    "login.totpConfigured": "TOTP가 설정되었습니다. 코드는 상세 페이지에 표시됩니다.",

    // Card fields
    "card.cardholderName": "카드 소유자 이름",
    "card.cardNumber": "카드 번호",
    "card.expiryMonth": "월",
    "card.expiryYear": "년",
    "card.cvv": "CVV",
    "card.pin": "PIN",

    // Identity fields
    "identity.firstName": "이름",
    "identity.lastName": "성",
    "identity.email": "이메일",
    "identity.phone": "전화번호",
    "identity.address": "주소",
    "identity.street": "도로명 주소",
    "identity.city": "시/군/구",
    "identity.state": "도/광역시",
    "identity.postalCode": "우편번호",
    "identity.country": "국가",

    // Note fields
    "note.content": "내용",

    // Item detail
    "detail.edit": "편집",
    "detail.delete": "삭제",
    "detail.confirmDelete": "정말 삭제하시겠습니까?",
    "detail.deleteWarning": "이 작업은 되돌릴 수 없습니다.",
    "detail.cancel": "취소",
    "detail.otp": "일회용 비밀번호",
    "detail.reveal": "표시",
    "detail.hide": "숨기기",
    "detail.copy": "복사",
    "detail.copied": "복사됨",
    "detail.expires": "만료",

    // Password generator
    "generator.title": "비밀번호 생성기",
    "generator.subtitle": "강력하고 안전한 비밀번호를 즉시 만들어보세요",
    "generator.password": "비밀번호",
    "generator.passphrase": "패스프레이즈",
    "generator.length": "길이",
    "generator.words": "단어 수",
    "generator.separator": "구분자",
    "generator.uppercase": "대문자 (A-Z)",
    "generator.lowercase": "소문자 (a-z)",
    "generator.numbers": "숫자 (0-9)",
    "generator.symbols": "특수문자 (!@#$...)",
    "generator.capitalize": "단어 첫 글자 대문자",
    "generator.includeNumber": "숫자 포함",
    "generator.useThis": "이 비밀번호 사용",
    "generator.regenerate": "재생성",
    "generator.copy": "복사",
    "generator.crackTime": "해독 시간:",

    // Password strength
    "strength.0": "매우 약함",
    "strength.1": "약함",
    "strength.2": "보통",
    "strength.3": "강함",
    "strength.4": "매우 강함",

    // Import
    "import.title": "1Password에서 가져오기",
    "import.howTo": "1Password에서 내보내는 방법",
    "import.step1": "1. 1Password 데스크톱 앱 실행",
    "import.step2": "2. 파일 → 내보내기 → 금고 선택",
    "import.step3": "3. .1pux 형식 선택",
    "import.step4": "4. 아래에서 내보낸 파일 업로드",
    "import.privacy": "데이터는 브라우저에서만 처리됩니다. .1pux 파일은 서버로 전송되지 않습니다.",
    "import.selectFile": ".1pux 파일 선택",
    "import.parsing": "분석 중...",
    "import.found": "개 항목 발견",
    "import.importButton": "개 항목 가져오기",
    "import.importing": "가져오는 중",
    "import.success": "개 항목을 가져왔습니다!",
    "import.backToVault": "금고로 돌아가기",
    "import.errors": "오류",
    "import.warnings": "경고",

    // Backup
    "backup.title": "백업 및 복구",
    "backup.export": "내보내기",
    "backup.exportDescription": "금고의 모든 항목을 암호화된 백업 파일로 내보냅니다.",
    "backup.exporting": "내보내는 중...",
    "backup.exportSuccess": "백업 파일이 다운로드되었습니다!",
    "backup.import": "복구하기",
    "backup.importDescription": "이전에 내보낸 암호화된 백업 파일에서 복구합니다.",
    "backup.selectFile": ".my1p 백업 파일 선택",
    "backup.importing": "복구 중...",
    "backup.importSuccess": "개 항목을 복구했습니다!",
    "backup.invalidFile": "올바른 백업 파일이 아닙니다.",
    "backup.itemCount": "개 항목",
    "backup.exportedAt": "내보낸 날짜:",
    "backup.confirmImport": "복구 시작",

    // Password Health
    "health.title": "비밀번호 건강 리포트",
    "health.analyzing": "비밀번호 분석 중...",
    "health.overallScore": "전체 점수",
    "health.poor": "위험",
    "health.fair": "보통",
    "health.good": "양호",
    "health.excellent": "우수",
    "health.weakPasswords": "약한 비밀번호",
    "health.reusedPasswords": "중복 비밀번호",
    "health.strongPasswords": "강한 비밀번호",
    "health.noIssues": "모든 비밀번호가 안전합니다!",
    "health.itemsSharing": "개 항목이 같은 비밀번호 사용",
    "health.crackTime": "해독 시간:",

    // PWA
    "pwa.offlineReady": "오프라인에서 사용할 준비가 되었습니다",
    "pwa.newVersion": "새 버전이 있습니다",
    "pwa.update": "지금 업데이트",
    "pwa.later": "나중에",

    // Common
    "common.close": "닫기",
    "common.confirm": "확인",
    "common.language": "언어",
    "common.korean": "한국어",
    "common.english": "English",
  },

  en: {
    // App
    "app.title": "my-one-password",

    // Auth - Login
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.email": "Email",
    "auth.masterPassword": "Master Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.signInDescription": "Enter your credentials to unlock your vault",
    "auth.signUpDescription": "Create an account to secure your vault",
    "auth.signingIn": "Signing in...",
    "auth.creatingAccount": "Creating account...",
    "auth.derivingKeys": "Deriving keys...",
    "auth.passwordMismatch": "Passwords do not match",
    "auth.passwordTooShort": "Master password must be at least 8 characters",
    "auth.inviteCode": "Invite Code",
    "auth.inviteCodePlaceholder": "Enter your invite code",
    "auth.unexpectedError": "An unexpected error occurred",

    // Secret Key
    "secretKey.title": "Your Secret Key",
    "secretKey.description":
      "You'll need this secret key to sign in on new devices. Save it somewhere safe.",
    "secretKey.warning":
      "This key won't be shown again. If you lose it, you won't be able to access your vault.",
    "secretKey.copy": "Copy",
    "secretKey.downloadKit": "Download Emergency Kit",
    "secretKey.saved": "I've Saved It",
    "secretKey.label": "Secret Key",
    "secretKey.hint": "Enter the secret key from when you signed up",
    "secretKey.required":
      "First time on this device. Please enter your secret key.",

    // Auth - Unlock
    "auth.vaultLocked": "Vault Locked",
    "auth.unlockDescription": "Enter your master password to unlock",
    "auth.unlock": "Unlock",
    "auth.unlocking": "Unlocking...",
    "auth.signOut": "Sign Out",
    "auth.failedUnlock": "Failed to unlock vault",

    // Vault
    "vault.title": "My Vault",
    "vault.import": "Import",
    "vault.lock": "Lock",
    "vault.signOut": "Sign Out",
    "vault.search": "Search vault...",
    "vault.all": "All",
    "vault.add": "Add",
    "vault.itemCount": "{n} items",
    "vault.favorites": "Favorites",
    "shell.vault": "Vault",
    "nav.vault": "Vault",
    "nav.search": "Search",
    "shell.tools": "Tools",
    "shell.light": "Light",
    "shell.dark": "Dark",
    "shell.checker": "Checker",
    "shell.generator": "Generator",
    "shell.theme": "Theme",
    "detail.selectPrompt": "Select an item",
    "view.card": "Cards",
    "view.compact": "Compact",
    "view.group": "Grouped",
    "strength.weak": "Weak",
    "strength.medium": "Fair",
    "strength.strong": "Strong",
    "field.website": "Website",
    "field.username": "Username",
    "field.password": "Password",
    "field.otp": "One-Time Password (OTP)",
    "field.cardNumber": "Card Number",
    "field.cvv": "CVV",
    "field.expiry": "Expiry",
    "field.cardholder": "Cardholder",
    "field.name": "Name",
    "field.email": "Email",
    "field.phone": "Phone",
    "field.notes": "Notes",
    "detail.selectHint": "Select an item from the list to see its details",
    "vault.logins": "Logins",
    "vault.cards": "Cards",
    "vault.notes": "Notes",
    "vault.identities": "Identities",
    "vault.noItems": "No items yet. Add your first item.",
    "vault.noResults": "No items match your search.",
    "vault.addItem": "Add item",
    "vault.addToFavorites": "Add to favorites",
    "vault.removeFromFavorites": "Remove from favorites",
    "vault.loading": "Loading vault items...",

    // Item types
    "itemType.login": "Login",
    "itemType.card": "Card",
    "itemType.note": "Note",
    "itemType.identity": "Identity",

    // Item form
    "form.newItem": "New Item",
    "form.editItem": "Edit Item",
    "form.itemType": "Item Type",
    "form.title": "Title",
    "form.url": "URL",
    "form.username": "Username",
    "form.password": "Password",
    "form.notes": "Notes",
    "form.create": "Create",
    "form.save": "Save Changes",
    "form.cancel": "Cancel",
    "form.goBack": "Go back",

    // Login fields
    "login.generatePassword": "Generate Password",
    "login.hideGenerator": "Hide Generator",
    "login.totp": "Two-Factor Authentication (TOTP)",
    "login.totpSecret": "TOTP Secret (Base32)",
    "login.totpAlgorithm": "Algorithm",
    "login.totpDigits": "Digits",
    "login.totpPeriod": "Period (sec)",
    "login.totpConfigured": "TOTP configured. The code will appear on the detail page.",

    // Card fields
    "card.cardholderName": "Cardholder Name",
    "card.cardNumber": "Card Number",
    "card.expiryMonth": "Month",
    "card.expiryYear": "Year",
    "card.cvv": "CVV",
    "card.pin": "PIN",

    // Identity fields
    "identity.firstName": "First Name",
    "identity.lastName": "Last Name",
    "identity.email": "Email",
    "identity.phone": "Phone",
    "identity.address": "Address",
    "identity.street": "Street",
    "identity.city": "City",
    "identity.state": "State / Province",
    "identity.postalCode": "Postal Code",
    "identity.country": "Country",

    // Note fields
    "note.content": "Content",

    // Item detail
    "detail.edit": "Edit",
    "detail.delete": "Delete",
    "detail.confirmDelete": "Are you sure you want to delete this item?",
    "detail.deleteWarning": "This action cannot be undone.",
    "detail.cancel": "Cancel",
    "detail.otp": "One-Time Password",
    "detail.reveal": "Reveal",
    "detail.hide": "Hide",
    "detail.copy": "Copy",
    "detail.copied": "Copied",
    "detail.expires": "Expires",

    // Password generator
    "generator.title": "Password Generator",
    "generator.subtitle": "Create a strong, secure password instantly",
    "generator.password": "Password",
    "generator.passphrase": "Passphrase",
    "generator.length": "Length",
    "generator.words": "Words",
    "generator.separator": "Separator",
    "generator.uppercase": "Uppercase (A-Z)",
    "generator.lowercase": "Lowercase (a-z)",
    "generator.numbers": "Numbers (0-9)",
    "generator.symbols": "Symbols (!@#$...)",
    "generator.capitalize": "Capitalize words",
    "generator.includeNumber": "Include number",
    "generator.useThis": "Use This Password",
    "generator.regenerate": "Regenerate",
    "generator.copy": "Copy",
    "generator.crackTime": "Crack time:",

    // Password strength
    "strength.0": "Very Weak",
    "strength.1": "Weak",
    "strength.2": "Fair",
    "strength.3": "Strong",
    "strength.4": "Very Strong",

    // Import
    "import.title": "Import from 1Password",
    "import.howTo": "How to export from 1Password",
    "import.step1": "1. Open 1Password desktop app",
    "import.step2": "2. File → Export → select vault",
    "import.step3": "3. Choose .1pux format",
    "import.step4": "4. Upload the exported file below",
    "import.privacy": "Your data is processed entirely in the browser. The .1pux file is never sent to a server.",
    "import.selectFile": "Select .1pux file",
    "import.parsing": "Parsing...",
    "import.found": "items found",
    "import.importButton": "items to import",
    "import.importing": "Importing",
    "import.success": "items imported successfully!",
    "import.backToVault": "Back to Vault",
    "import.errors": "Errors",
    "import.warnings": "Warnings",

    // Backup
    "backup.title": "Backup & Restore",
    "backup.export": "Export",
    "backup.exportDescription": "Export all vault items as an encrypted backup file.",
    "backup.exporting": "Exporting...",
    "backup.exportSuccess": "Backup file downloaded!",
    "backup.import": "Restore",
    "backup.importDescription": "Restore from a previously exported encrypted backup file.",
    "backup.selectFile": "Select .my1p backup file",
    "backup.importing": "Restoring...",
    "backup.importSuccess": "items restored successfully!",
    "backup.invalidFile": "Invalid backup file.",
    "backup.itemCount": "items",
    "backup.exportedAt": "Exported at:",
    "backup.confirmImport": "Start Restore",

    // Password Health
    "health.title": "Password Health Report",
    "health.analyzing": "Analyzing passwords...",
    "health.overallScore": "Overall Score",
    "health.poor": "Poor",
    "health.fair": "Fair",
    "health.good": "Good",
    "health.excellent": "Excellent",
    "health.weakPasswords": "Weak Passwords",
    "health.reusedPasswords": "Reused Passwords",
    "health.strongPasswords": "Strong Passwords",
    "health.noIssues": "All passwords are secure!",
    "health.itemsSharing": "items sharing the same password",
    "health.crackTime": "Crack time:",

    // PWA
    "pwa.offlineReady": "App ready to work offline",
    "pwa.newVersion": "A new version is available",
    "pwa.update": "Update now",
    "pwa.later": "Later",

    // Common
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.language": "Language",
    "common.korean": "한국어",
    "common.english": "English",
  },
};

// ---------------------------------------------------------------------------
// Translation hook
// ---------------------------------------------------------------------------

export function useTranslation() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  function t(key: string, params?: Record<string, string | number>): string {
    let text = translations[locale][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return { t, locale, setLocale };
}
