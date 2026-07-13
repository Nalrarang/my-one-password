import { LoginPage } from "./pages/LoginPage";
import { UnlockPage } from "./pages/UnlockPage";
import { VaultPage } from "./pages/VaultPage";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { NativeUpdatePrompt } from "./components/NativeUpdatePrompt";
import { useAuthStore } from "./stores/auth-store";
import { useAutoLock } from "./hooks/useAutoLock";
import { usePWA } from "./hooks/usePWA";
import { useNativeUpdater } from "./hooks/useNativeUpdater";

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
