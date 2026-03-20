import { LoginPage } from "./pages/LoginPage";
import { UnlockPage } from "./pages/UnlockPage";
import { VaultPage } from "./pages/VaultPage";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { useAuthStore } from "./stores/auth-store";
import { useAutoLock } from "./hooks/useAutoLock";
import { usePWA } from "./hooks/usePWA";

export function App() {
  const status = useAuthStore((s) => s.status);
  useAutoLock();
  const { needRefresh, offlineReady, updateServiceWorker, close } = usePWA();

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {content}
      <PWAUpdatePrompt
        needRefresh={needRefresh}
        offlineReady={offlineReady}
        onUpdate={updateServiceWorker}
        onClose={close}
      />
    </div>
  );
}
