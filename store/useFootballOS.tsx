import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
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
import { coachProvider, type PlanInput } from "@/data/ai";

const STORAGE_KEY = "football-os.state.v2";

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
  | { type: "SCHEDULE"; session: TrainingSession }
  | { type: "COMPLETE"; sessionId: string; selfRating: number; notes?: string }
  | { type: "FAVORITE"; key: "club" | "player" | "competition"; id: string | null }
  | { type: "WATCH"; playerId: string }
  | { type: "GOAL_ADD"; goal: Goal }
  | { type: "GOAL_TOGGLE"; id: string }
  | { type: "RESET" };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
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
            id: `mem-${Date.now()}`,
            kind: "profile",
            text: `Created ${action.mode.toLowerCase()} profile · ${action.profile.position} · goal: ${action.profile.goal}`,
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
            id: `mem-${Date.now()}`,
            kind: "coach" as const,
            text: `Coach focused on ${action.plan.focus.join(", ")} (${action.plan.session.targetMinutes}′)`,
            at: new Date().toISOString(),
          },
          ...state.memory,
        ].slice(0, 60),
      };
    case "SCHEDULE":
      return { ...state, sessions: [action.session, ...state.sessions] };
    case "COMPLETE": {
      if (!state.profile) return state;
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session || session.status === "completed") return state;
      const rating = action.selfRating;
      const intensity = clamp(Math.round(session.exercises.reduce((s, e) => s + e.intensity * e.minutes, 0) / (session.exercises.reduce((s, e) => s + e.minutes, 0) || 1)), 1, 5);

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const continues = state.streak.lastCompletedDate === today ? state.streak.current : state.streak.lastCompletedDate === yesterday ? state.streak.current + 1 : 1;
      const baseXp = xpForSession({ minutes: session.targetMinutes, intensity, selfRating: rating, focusCount: session.focusAttributes.length });
      const awarded = baseXp + streakBonus(continues) * 5;

      // Attribute growth: only trained focus rises, scaled by quality; capped &
      // diminishing so gamification never fakes unrealistic jumps.
      const attrs = { ...state.profile.attributes };
      for (const focus of session.focusAttributes) {
        const cur = attrs[focus] ?? 50;
        const room = (95 - cur) / 45; // diminishing returns near the top
        const gain = clamp(rating * 0.5 * Math.max(0.15, room), 0, 2);
        attrs[focus] = clamp(Math.round((cur + gain) * 10) / 10, 1, 99);
      }
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
      };
      return {
        ...state,
        profile: updatedProfile,
        sessions: state.sessions.map((s) => (s.id === session.id ? completed : s)),
        streak: { current: continues, lastCompletedDate: today },
        progress: [...state.progress, { date: new Date().toISOString(), overall, xp: newXp }].slice(-120),
        goals: state.goals.map((g) =>
          g.metric === "xp" ? { ...g, current: g.current + awarded } : g.metric === "sessions" ? { ...g, current: g.current + 1 } : g.metric === "level" ? { ...g, current: newLevel } : g,
        ).map((g) => ({ ...g, done: g.done || g.current >= g.target })),
        memory: [
          {
            id: `mem-${Date.now()}`,
            kind: "training" as const,
            text: `Completed ${session.title} · +${awarded} XP · rated ${rating}/5 · level ${newLevel}`,
            at: new Date().toISOString(),
          },
          ...state.memory,
        ].slice(0, 60),
      };
    }
    case "FAVORITE": {
      if (!state.profile) return state;
      const patch: Partial<UserProfile> =
        action.key === "club"
          ? { favoriteClubId: action.id }
          : action.key === "player"
            ? { favoritePlayerId: action.id }
            : { favoriteCompetitionId: action.id };
      return { ...state, profile: { ...state.profile, ...patch } };
    }
    case "WATCH": {
      const has = state.watchlist.includes(action.playerId);
      return { ...state, watchlist: has ? state.watchlist.filter((i) => i !== action.playerId) : [action.playerId, ...state.watchlist].slice(0, 40) };
    }
    case "GOAL_ADD":
      return { ...state, goals: [action.goal, ...state.goals] };
    case "GOAL_TOGGLE":
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, done: !g.done } : g)) };
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
  requestPlan: (prompt: string, availableMinutes: number) => Promise<CoachPlan>;
  completeSession: (sessionId: string, selfRating: number, notes?: string) => void;
  setFavorite: (key: "club" | "player" | "competition", id: string | null) => void;
  toggleWatch: (playerId: string) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt" | "done">) => void;
  toggleGoal: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<OsContext | null>(null);

export function OsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: { ...initialState, ...JSON.parse(raw) } });
    } catch {
      /* fall back to fresh state */
    }
  }, []);

  const persist = useCallback((s: OsState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* quota or unavailable: in-memory still works for the session */
    }
  }, []);

  // Persist after hydration completes to avoid clobbering stored data.
  const ready = true;
  useEffect(() => {
    if (state.onboarded || state.sessions.length || state.progress.length) persist(state);
  }, [state, persist]);

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
        const goals: Goal[] = [
          { id: `g-${Date.now()}`, title: "Earn 500 XP", metric: "xp", target: 500, current: 0, unit: "XP", createdAt: new Date().toISOString(), done: false },
          { id: `g-${Date.now() + 1}`, title: "Complete 5 training sessions", metric: "sessions", target: 5, current: 0, unit: "sessions", createdAt: new Date().toISOString(), done: false },
        ];
        dispatch({ type: "ONBOARD", mode: input.mode, profile, goals });
      },
      setMode: (m) => dispatch({ type: "SET_MODE", mode: m }),
      requestPlan: async (prompt, availableMinutes) => {
        if (!state.profile) throw new Error("no profile");
        const history = aggregateFocus(state.sessions);
        const planInput: PlanInput = { prompt, profile: state.profile, history, availableMinutes };
        const plan = await coachProvider.generatePlan(planInput);
        dispatch({ type: "PLAN", plan });
        return plan;
      },
      completeSession: (id, rating, notes) => dispatch({ type: "COMPLETE", sessionId: id, selfRating: rating, notes }),
      setFavorite: (key, id) => dispatch({ type: "FAVORITE", key, id }),
      toggleWatch: (playerId) => dispatch({ type: "WATCH", playerId }),
      addGoal: (g) => dispatch({ type: "GOAL_ADD", goal: { ...g, id: `g-${Date.now()}`, createdAt: new Date().toISOString(), done: false } }),
      toggleGoal: (id) => dispatch({ type: "GOAL_TOGGLE", id }),
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
