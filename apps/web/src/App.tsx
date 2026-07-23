import { LoginPage } from "./pages/LoginPage";
import { UnlockPage } from "./pages/UnlockPage";
import { VaultPage } from "./pages/VaultPage";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { NativeUpdatePrompt } from "./components/NativeUpdatePrompt";
import { useAuthStore } from "./stores/auth-store";
import { useAutoLock } from "./hooks/useAutoLock";
import { usePWA } from "./hooks/usePWA";
import { useNativeUpdater } from "./hooks/useNativeUpdater";

/** True only inside the Tauri native shell (window.isTauri is injected there). */
function isTauri(): boolean {
  return typeof window !== "undefined" && "isTauri" in window && Boolean((window as { isTauri?: boolean }).isTauri);
}

export function App() {
  const status = useAuthStore((s) => s.status);
  useAutoLock();
  const { needRefresh, offlineReady, updateServiceWorker, close } = usePWA();
  const nativeUpdate = useNativeUpdater();

  let content: React.ReactNode;

  switch (status) {
    case "unauthenticated":
      content = <LoginPage />;
      break;
    case "locked":
      content = <UnlockPage />;
      break;
    case "unlocked":
      content = <VaultPage />;
      break;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Transparent top strip so the frameless native window is draggable on every screen
          (login/unlock lack the vault shell's own drag bar). Tauri desktop only. */}
      {isTauri() && <div data-tauri-drag-region className="fixed inset-x-0 top-0 z-40 h-[30px]" />}
      {content}
      <PWAUpdatePrompt
        needRefresh={needRefresh}
        offlineReady={offlineReady}
        onUpdate={updateServiceWorker}
        onClose={close}
      />
      <NativeUpdatePrompt
        updateAvailable={nativeUpdate.updateAvailable}
        version={nativeUpdate.version}
        installing={nativeUpdate.installing}
        onInstall={nativeUpdate.install}
        onDismiss={nativeUpdate.dismiss}
      />
    </div>
  );
}
