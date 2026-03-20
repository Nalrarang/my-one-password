import { LoginPage } from "./pages/LoginPage";
import { UnlockPage } from "./pages/UnlockPage";
import { VaultPage } from "./pages/VaultPage";
import { useAuthStore } from "./stores/auth-store";
import { useAutoLock } from "./hooks/useAutoLock";

export function App() {
  const status = useAuthStore((s) => s.status);
  useAutoLock();

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
    </div>
  );
}
