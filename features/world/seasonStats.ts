import { WORLD_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { footballProvider } from "@/data/footballService";

const STORE_KEY = WORLD_KEY;

// 加载赛季统计 (localStorage 持久化)
function loadSeasonStats(): SeasonStats | null {
  const { value, present } = readJson<SeasonStats | null>(browserStore(), STORE_KEY, null);
  if (!present || !value) return null;
  return value;
}

// 保存赛季统计
function saveSeasonStats(stats: SeasonStats): void {
  writeJson(browserStore(), STORE_KEY, stats);
}

// 重置赛季统计
function resetSeasonStats(): void {
  saveSeasonStats({ goals: 0, assists: 0, appearances: 0, yellowCards: 0, redCards: 0, topScorer: null, bestXI: [] });
}

// 获取当前赛季统计 (或重新计算)
export function getSeasonStats(): SeasonStats {
  const cached = loadSeasonStats();
  if (cached) return cached;
  
  // 从本赛季的所有比赛中重新计算
  const result = calculateSeasonStats();
  saveSeasonStats(result);
  return result;
}

// 计算赛季统计 (用于首次加载或重置)
function calculateSeasonStats(): SeasonStats {
  const competitions = footballProvider.competitions();
  let totalGoals = 0;
  let totalAssists = 0;
  let totalAppearances = 0;
  let totalYellowCards = 0;
  let totalRedCards = 0;
  let topScorer: { name: string; goals: number } | null = null;
  const playerGoalMap = new Map<string, number>();
  
  // 遍历所有竞赛的比赛
  for (const comp of competitions) {
    const standings = footballProvider.standings(comp.id);
    // 这里应该遍历比赛数据，但演示用简化版
  }
  
  // 演示用：返回基础统计
  return {
    goals: totalGoals,
    assists: totalAssists,
    appearances: totalAppearances,
    yellowCards: totalYellowCards,
    redCards: totalRedCards,
    topScorer: topScorer,
    bestXI: []
  };
}

// 赛季统计类型定义
export interface SeasonStats {
  goals: number;
  assists: number;
  appearances: number;
  yellowCards: number;
  redCards: number;
  topScorer: { name: string; goals: number } | null;
  bestXI: string[]; // 最佳阵容成员ID列表
}