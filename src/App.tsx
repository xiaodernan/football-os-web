import { lazy, Suspense } from "react";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/i18n";
import { RouterProvider, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
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
const DataRoom = lazy(() => import("@/features/analytics/DataRoom").then((m) => ({ default: m.DataRoom })));
const TransferCentre = lazy(() => import("@/features/transfers/TransferCentre").then((m) => ({ default: m.TransferCentre })));
const ComparePage = lazy(() => import("@/features/compare/ComparePage").then((m) => ({ default: m.ComparePage })));
const WatchlistBoard = lazy(() => import("@/features/watchlist/WatchlistBoard").then((m) => ({ default: m.WatchlistBoard })));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AchievementsPage = lazy(() => import("@/features/achievements/AchievementsPage").then((m) => ({ default: m.AchievementsPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const HistoryPage = lazy(() => import("@/features/history/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const ReviewPage = lazy(() => import("@/features/review/ReviewPage").then((m) => ({ default: m.ReviewPage })));
const LoadPage = lazy(() => import("@/features/load/LoadPage").then((m) => ({ default: m.LoadPage })));
const DevelopmentPage = lazy(() => import("@/features/development/DevelopmentPage").then((m) => ({ default: m.DevelopmentPage })));
const CoachProfile = lazy(() => import("@/features/coach/CoachProfile").then((m) => ({ default: m.CoachProfile })));
const SquadPlanning = lazy(() => import("@/features/manager/SquadPlanning").then((m) => ({ default: m.SquadPlanning })));
const TacticalNotebook = lazy(() => import("@/features/tactical/TacticalNotebook").then((m) => ({ default: m.TacticalNotebook })));
const PlayerValueRanking = lazy(() => import("@/features/player/PlayerValueRanking").then((m) => ({ default: m.PlayerValueRanking })));
const CommunityPoll = lazy(() => import("@/features/community/CommunityPoll").then((m) => ({ default: m.CommunityPoll })));
const InjuryReport = lazy(() => import("@/features/injury/InjuryReport").then((m) => ({ default: m.InjuryReport })));
const ClubCompare = lazy(() => import("@/features/compare/ClubCompare").then((m) => ({ default: m.ClubCompare })));

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

function BootFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <RouteFallback />
    </div>
  );
}

function Routes() {
  const { path } = useRouter();
  const { state, ready } = useOs();

  // Hold rendering until the stored state has been read back. Without this gate a
  // returning user briefly sees the logged-out Landing / "set up your profile"
  // empty state (initialState) before the hydration effect flips them into the
  // shell — a visible flash on every load.
  if (!ready) return <BootFallback />;

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
  else if (path === "/data") inner = <DataRoom />;
  else if (path === "/transfers") inner = <TransferCentre />;
  else if (path === "/compare") inner = <ComparePage />;
  else if (path === "/watchlist") inner = <WatchlistBoard />;
  else if (path === "/profile") inner = <ProfilePage />;
  else if (path === "/achievements") inner = <AchievementsPage />;
  else if (path === "/settings") inner = <SettingsPage />;
  else if (path === "/history") inner = <HistoryPage />;
  else if (path === "/review") inner = <ReviewPage />;
  else if (path === "/load") inner = <LoadPage />;
  else if (path === "/development") inner = <DevelopmentPage />;
  else if (path === "/coach") inner = <CoachProfile />;
  else if (path === "/squad") inner = <SquadPlanning />;
  else if (path === "/notebook") inner = <TacticalNotebook />;
  else if (path === "/value") inner = <PlayerValueRanking />;
  else if (path === "/poll") inner = <CommunityPoll />;
  else if (path === "/injuries") inner = <InjuryReport />;
  else if (path === "/club-compare") inner = <ClubCompare />;
  else if (path === "/simulation") inner = <SimulationLab />;
  else if (isFootballRoute(path)) inner = <FootballWorld />;

  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>{inner}</Suspense>
    </AppShell>
  );
}

function NotReady() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  return (
    <div className="mx-auto max-w-md pt-10">
      <EmptyState title={t("app.notReady")} hint={t("app.notReadyHint")} />
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={() => navigate("/")}>{t("app.backHome")}</Button>
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
