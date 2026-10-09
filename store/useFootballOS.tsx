import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type {
  AiMemoryEntry,
  CoachPlan,
  Goal,
  Mode,
  PositionGroup,
  TrainingSession,
  UserProfile,
} from "@/domain/types";
import {
  baselineAttributes,
  overallRating,
  POSITION_BY_GROUP,
} from "@/domain/attributes";
import { levelFromXp, levelInfo, xpForSession, streakBonus } from "@/domain/xp";
import { applyFocusGrowth, repairSessionTitles, sessionIntensity, sweepOverdueSessions, type GrowthDelta } from "@/domain/training";
import { countGoalTitle, repairGoalTitles } from "@/domain/goals";
import { coachMemory, profileMemory, repairMemoryTexts, trainingMemory } from "@/domain/memory";
import { normalizeGoalChoice } from "@/domain/onboarding";
import type { RowText } from "@/domain/rowText";
import { FAVORITES, type FavoriteKind } from "@/domain/types";
import { buildLoad } from "@/domain/load";
import { dayKey } from "@/domain/history";
import { coachProvider, repairPlanPrompts, type PlanInput } from "@/data/ai";
import { OS_STATE_KEY } from "@/domain/localData";
import { newId } from "@/lib/ids";

export const STORAGE_KEY = OS_STATE_KEY;

export interface OsState {
  onboarded: boolean;
  mode: Mode | null;
  profile: UserProfile | null;
  sessions: TrainingSession[];
  plans: CoachPlan[];
  goals: Goal[];
  memory: AiMemoryEntry[];
  watchlist: string[];
  streak: { current: number; lastCompletedDate: string | null };
  progress: { date: string; overall: number; xp: number }[];
}

const initialState: OsState = {
  onboarded: false,
  mode: null,
  profile: null,
  sessions: [],
  plans: [],
  goals: [],
  memory: [],
  watchlist: [],
  streak: { current: 0, lastCompletedDate: null },
  progress: [],
};

type Action =
  | { type: "HYDRATE"; state: OsState }
  | { type: "ONBOARD"; mode: Mode; profile: UserProfile; goals: Goal[] }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "PLAN"; plan: CoachPlan }
  | { type: "COMPLETE"; sessionId: string; selfRating: number; notes?: string }
  | { type: "FAVORITE"; key: FavoriteKind; id: string | null }
  | { type: "WATCH"; playerId: string }
  | { type: "GOAL_ADD"; goal: Goal }
  | { type: "GOAL_TOGGLE"; id: string }
  | { type: "GOAL_REMOVE"; id: string }
  | { type: "RESET" };

// Records persisted by earlier builds can omit array fields that consumers
// iterate (a session without `exercises` blanked the whole Dashboard). Repair
// them once at the storage boundary instead of guarding every read site.
function normalizeHydrated(s: OsState): OsState {
  const repaired = (s.sessions ?? []).map((x) => ({
    ...x,
    exercises: x.exercises ?? [],
    focusAttributes: x.focusAttributes ?? [],
  }));
  return {
    ...s,
    // A profile stored before onboarding kept its goal as a code carries the English
    // sentence itself; the same text is on screen in every locale afterwards, so it is
    // mapped here rather than at each of the three places that print it.
    profile: s.profile ? { ...s.profile, goal: normalizeGoalChoice(s.profile.goal) } : s.profile,
    // Planned sessions whose scheduled day has passed are genuinely missed —
    // flip them here so the review's missed count and slipped-session insight
    // reflect reality instead of staying permanently at zero.
    sessions: sweepOverdueSessions(repairSessionTitles(repaired)),
    // Rows written before a plan's prompt was a row hold a plain string: the words the
    // caller composed at the time. Kept verbatim as a value, never re-read as a key.
    plans: repairPlanPrompts(s.plans ?? []),
    // Rows written before a goal title was a keyed row hold a plain string; that
    // string is the visitor's own words, so it is kept verbatim as a value.
    goals: repairGoalTitles(s.goals ?? []),
    // Same repair for the coach's remembered rows: an entry written while these were
    // English sentences keeps those words, now honestly stored as a value.
    memory: repairMemoryTexts(s.memory ?? []),
    watchlist: s.watchlist ?? [],
    progress: s.progress ?? [],
  };
}

function reducer(state: OsState, action: Action): OsState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ONBOARD": {
      const overall = overallRating(action.profile.attributes);
      return {
        ...state,
        onboarded: true,
        mode: action.mode,
        profile: action.profile,
        goals: action.goals,
        progress: [{ date: new Date().toISOString(), overall, xp: action.profile.xp }],
        memory: [
          {
            id: newId("mem-"),
            kind: "profile",
            text: profileMemory(action.mode, action.profile.positionGroup, action.profile.goal),
            at: new Date().toISOString(),
          },
        ],
      };
    }
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "PLAN":
      return {
        ...state,
        plans: [action.plan, ...state.plans].slice(0, 40),
        sessions: [action.plan.session, ...state.sessions.filter((s) => s.id !== action.plan.session.id)],
        memory: [
          {
            id: newId("mem-"),
            kind: "coach" as const,
            text: coachMemory(action.plan.focus, action.plan.session.targetMinutes),
            at: new Date().toISOString(),
          },
          ...state.memory,
        ].slice(0, 60),
      };
    case "COMPLETE": {
      if (!state.profile) return state;
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session || session.status === "completed") return state;
      const rating = action.selfRating;
      // The XP the completion pays and every other reader of the session must agree on
      // this intensity, so it comes from the shared function rather than a second copy
      // of the formula here (a hand-rolled mean drifted from sessionIntensity silently).
      const intensity = sessionIntensity(session);

      // The streak counts the days the reader's wall calendar shows (M303), not elapsed
      // 24-hour blocks on the UTC clock - under which the boundary sat 8 hours into a
      // UTC+8 reader's morning and two completions before noon could grow it twice in
      // one local day. The keys come from the shared local-calendar builder; a key is
      // compared, never shown.
      const today = dayKey(new Date().toISOString());
      const yesterdayCal = new Date();
      yesterdayCal.setDate(yesterdayCal.getDate() - 1);
      const yesterday = dayKey(yesterdayCal.toISOString());
      const continues = state.streak.lastCompletedDate === today ? state.streak.current : state.streak.lastCompletedDate === yesterday ? state.streak.current + 1 : 1;
      const baseXp = xpForSession({ minutes: session.targetMinutes, intensity, selfRating: rating, focusCount: session.focusAttributes.length });
      const awarded = baseXp + streakBonus(continues) * 5;

      // Attribute growth: only trained focus rises, scaled by quality; capped &
      // diminishing so gamification never fakes unrealistic jumps. Same math the
      // completion UI and projection reuse, so shown == persisted.
      const { attributes: attrs, deltas } = applyFocusGrowth(state.profile.attributes, session.focusAttributes, rating);
      const newXp = state.profile.xp + awarded;
      const newLevel = levelFromXp(newXp);
      const overall = overallRating(attrs);
      const updatedProfile: UserProfile = {
        ...state.profile,
        attributes: attrs,
        xp: newXp,
        level: newLevel,
      };
      const completed: TrainingSession = {
        ...session,
        status: "completed",
        completedAt: new Date().toISOString(),
        selfRating: rating,
        xpAwarded: awarded,
        notes: action.notes,
        growth: deltas,
      };
      return {
        ...state,
        profile: updatedProfile,
        sessions: state.sessions.map((s) => (s.id === session.id ? completed : s)),
        streak: { current: continues, lastCompletedDate: today },
        progress: [...state.progress, { date: new Date().toISOString(), overall, xp: newXp }].slice(-120),
        goals: state.goals.map((g) =>
          g.metric === "xp" ? { ...g, current: g.current + awarded } : g.metric === "sessions" ? { ...g, current: g.current + 1 } : g.metric === "level" ? { ...g, current: newLevel } : g.metric === "attribute" && g.key ? { ...g, current: attrs[g.key] ?? g.current } : g,
        ).map((g) => ({ ...g, done: g.done || g.current >= g.target })),
        memory: [
          {
            id: newId("mem-"),
            kind: "training" as const,
            text: trainingMemory(session.title, awarded, rating, newLevel),
            at: new Date().toISOString(),
          },
          ...state.memory,
        ].slice(0, 60),
      };
    }
    case "FAVORITE": {
      if (!state.profile) return state;
      return { ...state, profile: FAVORITES[action.key].write(state.profile, action.id) };
    }
    case "WATCH": {
      const has = state.watchlist.includes(action.playerId);
      return { ...state, watchlist: has ? state.watchlist.filter((i) => i !== action.playerId) : [action.playerId, ...state.watchlist].slice(0, 40) };
    }
    case "GOAL_ADD":
      return { ...state, goals: [action.goal, ...state.goals] };
    case "GOAL_TOGGLE":
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, done: !g.done } : g)) };
    case "GOAL_REMOVE":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

interface OsContext {
  state: OsState;
  ready: boolean;
  onboarding: (input: { mode: Mode; displayName: string; positionGroup: PositionGroup; ageGroup: string; goal: string; skill: number; favoriteClubId?: string; favoritePlayerId?: string; favoriteCompetitionId?: string }) => void;
  setMode: (m: Mode) => void;
  // The prompt is the row the reader will see on the activity timeline; the provider derives
  // its own English reading from the same row, so a caller never composes a sentence by hand.
  requestPlan: (prompt: RowText, availableMinutes: number, focusKeys?: string[]) => Promise<CoachPlan>;
  completeSession: (sessionId: string, selfRating: number, notes?: string) => GrowthDelta[];
  setFavorite: (key: FavoriteKind, id: string | null) => void;
  toggleWatch: (playerId: string) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt" | "done">) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<OsContext | null>(null);

export function OsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: normalizeHydrated({ ...initialState, ...(JSON.parse(raw) as Partial<OsState>) }) });
    } catch {
      /* fall back to fresh state */
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((s: OsState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* quota or unavailable: in-memory still works for the session */
    }
  }, []);

  // Don't expose `ready` (and don't persist) until the stored state has been read
  // back, otherwise the first paint briefly renders the logged-out Landing / empty
  // shell before hydration flips it, flashing every returning user. `hydrated` is
  // only ever set in the effect above, so this is SSR-safe (server stays false).
  const ready = hydrated;
  useEffect(() => {
    if (!hydrated) return;
    if (state.onboarded || state.sessions.length || state.progress.length || state.watchlist.length || state.plans.length) persist(state);
  }, [state, persist, hydrated]);

  const value = useMemo<OsContext>(
    () => ({
      state,
      ready,
      onboarding: (input) => {
        const attrs = baselineAttributes(input.positionGroup, input.skill);
        const profile: UserProfile = {
          displayName: input.displayName || "You",
          mode: input.mode,
          positionGroup: input.positionGroup,
          position: POSITION_BY_GROUP[input.positionGroup],
          ageGroup: input.ageGroup,
          goal: input.goal,
          favoriteClubId: input.favoriteClubId ?? null,
          favoritePlayerId: input.favoritePlayerId ?? null,
          favoriteCompetitionId: input.favoriteCompetitionId ?? null,
          attributes: attrs,
          xp: 0,
          level: 1,
          createdAt: new Date().toISOString(),
        };
        // Both starter goals are minted the same tick, which is exactly the case the
        // clock could not tell apart: the second id used to be `Date.now() + 1` to keep
        // the pair distinct. The sequence in @/lib/ids does that now.
        const goals: Goal[] = [
          { id: newId("g-"), title: countGoalTitle("xp", 500), metric: "xp", target: 500, current: 0, createdAt: new Date().toISOString(), done: false },
          { id: newId("g-"), title: countGoalTitle("sessions", 5), metric: "sessions", target: 5, current: 0, createdAt: new Date().toISOString(), done: false },
        ];
        dispatch({ type: "ONBOARD", mode: input.mode, profile, goals });
      },
      setMode: (m) => dispatch({ type: "SET_MODE", mode: m }),
      requestPlan: async (promptRow, availableMinutes, focusKeys) => {
        if (!state.profile) throw new Error("Complete onboarding before asking the coach.");
        if (!coachProvider.available) throw new Error("The coach provider is unavailable right now — try again shortly.");
        const history = aggregateFocus(state.sessions);
        const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
        // Spelled out rather than spread: `prompt` is a row now, and the shorthand `{ prompt }`
        // reads to proof-i18n's row contract exactly like a JSX hole holding a row object.
        const planInput: PlanInput = {
          prompt: promptRow,
          profile: state.profile,
          history,
          availableMinutes,
          load: load.hasData ? { zone: load.zone, acwr: load.acwr, weekLoad: load.weekLoad } : undefined,
          focusKeys,
          lastFocus: state.plans[0]?.focus,
        };
        const plan = await coachProvider.generatePlan(planInput);
        dispatch({ type: "PLAN", plan });
        return plan;
      },
      completeSession: (id, rating, notes) => {
        const session = state.sessions.find((s) => s.id === id);
        const deltas = state.profile && session && session.status !== "completed"
          ? applyFocusGrowth(state.profile.attributes, session.focusAttributes, rating).deltas
          : [];
        dispatch({ type: "COMPLETE", sessionId: id, selfRating: rating, notes });
        return deltas;
      },
      setFavorite: (key, id) => dispatch({ type: "FAVORITE", key, id }),
      toggleWatch: (playerId) => dispatch({ type: "WATCH", playerId }),
      addGoal: (g) => dispatch({ type: "GOAL_ADD", goal: { ...g, id: newId("g-"), createdAt: new Date().toISOString(), done: false } }),
      toggleGoal: (id) => dispatch({ type: "GOAL_TOGGLE", id }),
      removeGoal: (id) => dispatch({ type: "GOAL_REMOVE", id }),
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        dispatch({ type: "RESET" });
      },
    }),
    [state, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function aggregateFocus(sessions: TrainingSession[]): { focus: string; completed: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    for (const f of s.focusAttributes) map.set(f, (map.get(f) ?? 0) + 1);
  }
  return [...map.entries()].map(([focus, completed]) => ({ focus, completed }));
}

export function useOs(): OsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOs must be used within OsProvider");
  return ctx;
}

export { levelInfo };
