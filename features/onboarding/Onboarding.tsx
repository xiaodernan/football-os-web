import { useMemo, useState } from "react";
import { useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { WORLD } from "@/data/footballSeed";
import { POSITION_GROUPS } from "@/domain/attributes";
import type { Mode, PositionGroup } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Crest } from "@/ui/primitives";

const AGE_GROUPS = ["U15", "U17", "U19", "Amateur", "Semi-pro", "Pro", "Veteran"];
const GOALS = ["Improve first touch", "Get faster", "Finish better", "Play smarter (scanning/decisions)", "Hold up play", "Become a two-footed player"];

export function Onboarding() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { onboarding } = useOs();
  const [step, setStep] = useState(0);

  const [mode, setMode] = useState<Mode>("PLAYER");
  const [displayName, setName] = useState("");
  const [positionGroup, setPg] = useState<PositionGroup>("CM");
  const [ageGroup, setAge] = useState("Amateur");
  const [skill, setSkill] = useState(35);
  const [goal, setGoal] = useState(GOALS[0]);
  const [clubId, setClub] = useState<string | undefined>();
  const [playerId, setPlayer] = useState<string | undefined>();
  const [compId, setComp] = useState<string | undefined>();

  const clubPlayers = useMemo(() => WORLD.players.filter((p) => p.clubId === clubId).slice(0, 12), [clubId]);

  const finish = () => {
    onboarding({
      mode,
      displayName,
      positionGroup,
      ageGroup,
      goal,
      skill: skill / 100,
      favoriteClubId: clubId,
      favoritePlayerId: playerId,
      favoriteCompetitionId: compId,
    });
    navigate("/");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">F</span>
        <div>
          <div className="font-bold">{t("brand.name")}</div>
          <div className="text-xs text-muted-foreground">Build your Football OS</div>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {["Identity", "Profile", "World"].map((s, i) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} />
        ))}
      </div>

      {step === 0 && (
        <div className="fo-rise">
          <h1 className="text-2xl font-bold">{t("onboarding.what")}</h1>
          <div className="mt-5 grid gap-3">
            {(["FAN", "PLAYER", "MANAGER"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  mode === m ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "hover:border-primary/40",
                )}
              >
                <div className="text-sm font-semibold">{t(`onboarding.${m.toLowerCase()}`)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t(`onboarding.${m.toLowerCase()}.desc`)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fo-rise space-y-5">
          <h1 className="text-2xl font-bold">Your football profile</h1>
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" className="mt-1" />
          </div>
          <div>
            <Label>Position</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {POSITION_GROUPS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPg(p.id)}
                  className={cn("rounded-lg border px-2 py-2 text-xs transition", positionGroup === p.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}
                >
                  <div className="font-mono font-bold">{p.id}</div>
                  <div className="truncate text-[10px]">{p.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Level</Label>
              <select value={ageGroup} onChange={(e) => setAge(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm">
                {AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Label>Self-rated skill · {skill}</Label>
              <Slider value={[skill]} min={5} max={95} onValueChange={(v) => setSkill(v[0])} className="mt-4" />
            </div>
          </div>
          <div>
            <Label>Main goal</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button key={g} onClick={() => setGoal(g)} className={cn("rounded-full border px-3 py-1 text-xs", goal === g ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fo-rise space-y-5">
          <h1 className="text-2xl font-bold">Connect your football world</h1>
          <p className="text-sm text-muted-foreground">Optional — personalises your feed, dashboard and recommendations.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Favorite club</Label>
              <select value={clubId ?? ""} onChange={(e) => { setClub(e.target.value || undefined); setPlayer(undefined); }} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm">
                <option value="">—</option>
                {WORLD.clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Favorite competition</Label>
              <select value={compId ?? ""} onChange={(e) => setComp(e.target.value || undefined)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm">
                <option value="">—</option>
                {WORLD.competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {clubId && (
            <div>
              <Label>Favorite player {clubId && `· ${WORLD.clubs.find((c) => c.id === clubId)?.name}`}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {clubPlayers.map((p) => (
                  <button key={p.id} onClick={() => setPlayer(p.id)} className={cn("flex items-center gap-2 rounded-lg border px-2 py-1 text-xs", playerId === p.id ? "border-primary bg-primary/10" : "hover:border-primary/40")}>
                    <Crest colors={WORLD.clubs.find((c) => c.id === clubId)?.colors} short={p.name.split(" ").slice(-1)[0]?.[0]} size={18} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))}>
          {step === 0 ? t("cta.back") : "← Back"}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>{t("cta.continue")} →</Button>
        ) : (
          <Button onClick={finish} className="shadow-[0_0_30px_-10px] shadow-primary/70">Enter Football OS →</Button>
        )}
      </div>
    </div>
  );
}
