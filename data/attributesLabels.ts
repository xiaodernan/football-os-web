// English labels for attributes, position groups, and categories.
// Moved out of domain/attributes.ts to clear its prose debt (M238).
// These are used by the prose layer (coach answers, scout headlines, review reasons)
// via attributeLabel() and POSITION_GROUPS. UIs read attr.name.* / group.* from the
// dictionary instead.

import type { PositionCode, PositionGroup } from "../domain/types";

export const ATTRIBUTE_LABELS: Record<string, string> = {
  ball_control: "Ball Control",
  first_touch: "First Touch",
  passing: "Passing",
  long_passing: "Long Passing",
  shooting: "Shooting",
  finishing: "Finishing",
  crossing: "Crossing",
  dribbling: "Dribbling",
  weak_foot: "Weak Foot",
  set_pieces: "Set Pieces",
  acceleration: "Acceleration",
  sprint: "Sprint",
  agility: "Agility",
  balance: "Balance",
  strength: "Strength",
  stamina: "Stamina",
  explosiveness: "Explosiveness",
  mobility: "Mobility",
  scanning: "Scanning",
  positioning: "Positioning",
  decision_making: "Decision Making",
  space_awareness: "Space Awareness",
  press_resistance: "Press Resistance",
  off_ball_movement: "Off-ball Movement",
  defensive_awareness: "Defensive Awareness",
  transition_awareness: "Transition Awareness",
  composure: "Composure",
  concentration: "Concentration",
  discipline: "Discipline",
  confidence: "Confidence",
  game_intelligence: "Game Intelligence",
  consistency: "Consistency",
};

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  GK: "Goalkeeper",
  CB: "Centre Back",
  FB: "Full Back / Wing Back",
  DM: "Defensive Mid",
  CM: "Central Mid",
  AM: "Attacking Mid",
  W: "Winger",
  ST: "Striker",
};

export const POSITION_BY_GROUP_LABELS: Record<PositionGroup, PositionCode> = {
  GK: "GK",
  CB: "CB",
  FB: "LB / RB",
  DM: "DM",
  CM: "CM",
  AM: "AMC",
  W: "LW / RW",
  ST: "ST",
};