import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Attributes } from "@/domain/types";
import { CATEGORY_ORDER, attributesByCategory } from "@/domain/attributes";
import { useTheme } from "@/lib/theme";

const CAT_LABEL: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  mental: "Mental",
};

function catAvg(attrs: Attributes, cat: (typeof CATEGORY_ORDER)[number]): number {
  const defs = attributesByCategory(cat);
  return Math.round(defs.reduce((s, d) => s + (attrs[d.key] ?? 0), 0) / defs.length);
}

export function AttributeRadar({ attrs, height = 260 }: { attrs: Attributes; height?: number }) {
  const { theme } = useTheme();
  const data = CATEGORY_ORDER.map((c) => ({ axis: CAT_LABEL[c], value: catAvg(attrs, c) }));
  const stroke = theme === "dark" ? "#ffffff22" : "#00000018";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={stroke} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "currentColor", fontSize: 11 }} stroke={stroke} />
          <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.35} isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProgressLine({ points, height = 180 }: { points: { label: string; value: number }[]; height?: number }) {
  const { theme } = useTheme();
  const stroke = theme === "dark" ? "#ffffff18" : "#00000012";
  const color = "var(--color-info)";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={stroke} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "currentColor", fontSize: 10 }} stroke={stroke} minTickGap={20} />
          <YAxis tick={{ fill: "currentColor", fontSize: 10 }} stroke={stroke} domain={["dataMin - 2", "dataMax + 2"]} width={34} />
          <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
