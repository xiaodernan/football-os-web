import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { footballProvider } from "@/data/footballService";
import { byOverall, sum } from "@/domain/attributes";
import { makeRng, rngInt } from "@/lib/rng";
import { useLocalStorage } from "@/lib/hooks";
import { pctLabel, pctOf, cn } from "@/lib/utils";

const POLL_ID = "player-of-season";
const STORE_KEY = "football-os.poll.v1";

interface PollOption {
  id: string;
  name: string;
  /** Deterministic sample tally, seeded off the poll id — never the clock. */
  baseVotes: number;
}

export function CommunityPoll() {
  const { t } = useI18n();
  const [votes, setVotes] = useLocalStorage<Record<string, string>>(STORE_KEY, {});
  const myVote = votes[POLL_ID] ?? null;

  // The five strongest players are the ballot; their sample tallies are seeded so every
  // reader sees the same poll, and a reload never reshuffles the standings.
  const options = useMemo<PollOption[]>(() => {
    const rng = makeRng(POLL_ID);
    return [...footballProvider.players()]
      .sort(byOverall)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, baseVotes: rngInt(rng, 8, 40) }));
  }, []);

  const tallyOf = (o: PollOption) => o.baseVotes + (myVote === o.id ? 1 : 0);
  const total = useMemo(() => sum(options, (o) => o.baseVotes) + (myVote ? 1 : 0), [options, myVote]);

  if (options.length === 0) {
    return <EmptyState title={t("community.poll.title")} hint={t("community.poll.hint")} icon="🗳️" />;
  }

  const votedName = options.find((o) => o.id === myVote)?.name;

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("community.poll.title")} />
        <p className="mt-1 text-2xl font-semibold">{t("community.poll.question")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {myVote ? t("community.poll.votedFor", { name: votedName ?? "" }) : t("community.poll.hint")}
        </p>
      </Panel>

      <Panel className="p-5">
        {myVote ? (
          <>
            <SectionTitle title={t("community.poll.resultsTitle")} />
            <p className="mt-1 text-xs text-muted-foreground">{t("community.poll.total", { n: total })}</p>
            <ul className="mt-3 space-y-3">
              {options.map((o) => {
                const tally = tallyOf(o);
                const mine = myVote === o.id;
                return (
                  <li key={o.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn("truncate", mine && "font-semibold text-primary")}>{o.name}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">
                        {pctLabel(tally / total)} · {t("community.poll.votes", { n: tally })}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full", mine ? "bg-primary" : "bg-muted-foreground/40")}
                        style={{ width: pctOf(tally, total) }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <SectionTitle title={t("community.poll.hint")} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {options.map((o) => (
                <Button key={o.id} variant="outline" onClick={() => setVotes((prev) => ({ ...prev, [POLL_ID]: o.id }))}>
                  {o.name}
                </Button>
              ))}
            </div>
          </>
        )}
      </Panel>

      <DemoBadge />
    </div>
  );
}
