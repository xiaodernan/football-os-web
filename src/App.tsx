import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/i18n";
import { RouterProvider, useRouter } from "@/lib/router";
import { OsProvider, useOs } from "@/store/useFootballOS";
import { AppShell } from "@/features/shell/AppShell";
import { Landing } from "@/features/landing/Landing";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { PlayerOS } from "@/features/player/PlayerOS";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { EmptyState } from "@/ui/primitives";
import { Button } from "@/components/ui/button";

function Routes() {
  const { path } = useRouter();
  const { state } = useOs();

  if (path === "/") {
    if (!state.onboarded) return <Landing />;
    return (
      <AppShell>
        <Dashboard />
      </AppShell>
    );
  }
  if (path === "/onboarding") return <Onboarding />;

  let inner: ReactNode = <NotReady />;
  if (path === "/player" || path.startsWith("/player/")) inner = <PlayerOS />;

  return <AppShell>{inner}</AppShell>;
}

function NotReady() {
  const { navigate } = useRouter();
  return (
    <div className="mx-auto max-w-md pt-10">
      <EmptyState title="This module is next in the build queue" hint="Core shell, dashboard and Player OS are live. Other modules are being wired up." />
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={() => navigate("/")}>Back to Command Center</Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RouterProvider>
          <OsProvider>
            <Routes />
            <Toaster theme="dark" position="bottom-right" />
          </OsProvider>
        </RouterProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
