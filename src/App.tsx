import { lazy, Suspense } from "react";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/i18n";
import { RouterProvider, useRouter } from "@/lib/router";
import { OsProvider, useOs } from "@/store/useFootballOS";
import { AppShell } from "@/features/shell/AppShell";
import { Landing } from "@/features/landing/Landing";
import { Onboarding } from "@/features/onboarding/Onboarding";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { EmptyState } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level code splitting keeps the first paint lean; heavy, chart-backed
// features load on demand.
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })));
const PlayerOS = lazy(() => import("@/features/player/PlayerOS").then((m) => ({ default: m.PlayerOS })));
const FootballWorld = lazy(() => import("@/features/football/FootballWorld").then((m) => ({ default: m.FootballWorld })));
const AiStudio = lazy(() => import("@/features/ai/AiStudio").then((m) => ({ default: m.AiStudio })));
const SimulationLab = lazy(() => import("@/features/sim/SimulationLab").then((m) => ({ default: m.SimulationLab })));
const TacticalStudio = lazy(() => import("@/features/tactical/TacticalStudio").then((m) => ({ default: m.TacticalStudio })));
const ManagerOS = lazy(() => import("@/features/manager/ManagerOS").then((m) => ({ default: m.ManagerOS })));
const LearnHub = lazy(() => import("@/features/learn/LearnHub").then((m) => ({ default: m.LearnHub })));
const CommunityHub = lazy(() => import("@/features/community/CommunityHub").then((m) => ({ default: m.CommunityHub })));
const ScoutingPanel = lazy(() => import("@/features/scouting/ScoutingPanel").then((m) => ({ default: m.ScoutingPanel })));
const DynamicWorld = lazy(() => import("@/features/world/DynamicWorld").then((m) => ({ default: m.DynamicWorld })));
const FilmRoom = lazy(() => import("@/features/film/FilmRoom").then((m) => ({ default: m.FilmRoom })));

const FOOTBALL_PREFIXES = ["/football", "/players", "/clubs", "/competitions", "/matches", "/news", "/search"];
function isFootballRoute(path: string) {
  return FOOTBALL_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function RouteFallback() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-10 w-64 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function Routes() {
  const { path } = useRouter();
  const { state } = useOs();

  if (path === "/") {
    if (!state.onboarded) return <Landing />;
    return (
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Dashboard />
        </Suspense>
      </AppShell>
    );
  }
  if (path === "/onboarding") return <Onboarding />;

  let inner: ReactNode = <NotReady />;
  if (path === "/player" || path.startsWith("/player/")) inner = <PlayerOS />;
  else if (path === "/manager" || path.startsWith("/manager/")) inner = <ManagerOS />;
  else if (path === "/ai") inner = <AiStudio initialTab="chat" />;
  else if (path === "/knowledge") inner = <AiStudio initialTab="graph" />;
  else if (path === "/tactical-studio") inner = <TacticalStudio />;
  else if (path === "/learn") inner = <LearnHub />;
  else if (path === "/community") inner = <CommunityHub />;
  else if (path === "/scouting") inner = <ScoutingPanel />;
  else if (path === "/world") inner = <DynamicWorld />;
  else if (path === "/film") inner = <FilmRoom />;
  else if (path === "/simulation") inner = <SimulationLab />;
  else if (isFootballRoute(path)) inner = <FootballWorld />;

  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>{inner}</Suspense>
    </AppShell>
  );
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
