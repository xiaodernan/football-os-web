export interface League {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  teams: string[]; // 队列ID列表
  pointsSystem: "standard" | "custom";
  pointsConfig: {
    win: number;
    draw: number;
    loss: number;
    goalsPer: number; // 每进球积分
    cleanSheet: number; // 失零积分
  };
  seasonStart: string;
  seasonEnd: string | null;
  isActive: boolean;
}

export interface LeagueCreationForm {
  leagueName: string;
  preferredPointsSystem: "standard" | "custom";
  customWin: number;
  customDraw: number;
  customLoss: number;
  customGoal: number;
  customCleanSheet: number;
  numTeams: number;
  memberInvites: string[]; // 邀请的成员ID列表
}

// 联赛统计接口
export interface LeagueStandings {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: "W" | "D" | "L" | ""; // 最近3场结果
}