// The potential radar (M453): the same category axes as AttributeRadar, drawn twice — what the
// player is now, and the ceiling the career depth model says every attribute can reach. The
// career model's ceiling is the player's own potential on every attribute, so the second ring is
// the flat polygon at `potential` and the gap between the rings is the career's headroom at a
// glance: a category touching the ring is finished growing, a category far from it has room.
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Attributes } from "@/domain/types";
import { categoryAverages } from "@/domain/attributes";
import { attrCeiling } from "@/domain/playerCareer";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";

export function PotentialRadar({
  attrs,
  potential,
}: {
  attrs: Attributes;
  potential: number;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const stroke = theme === "dark" ? "#ffffff22" : "#00000018";
  const ceiling = attrCeiling(potential);
  const data = categoryAverages(attrs).map((c) => ({
    axis: t(`attr.${c.category}`),
    current: c.value,
    potential: ceiling,
  }));
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={stroke} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "currentColor", fontSize: 11 }} stroke={stroke} />
          <Radar
            name={t("career.ceilingRing")}
            dataKey="potential"
            stroke="var(--color-info)"
            fill="var(--color-info)"
            fillOpacity={0.12}
            isAnimationActive
          />
          <Radar
            name={t("career.currentRing")}
            dataKey="current"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.35}
            isAnimationActive
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
