export interface ClubFinanceReport {
  season: number;
  ticketRevenue: number;
  broadcastRevenue: number;
  commercialRevenue: number;
  transferNetIncome: number; // 转会净收（收入 - 支出）
  salaryCap: number; // 薪资帽
  totalWages: number; // 总工资支出
  wageOverspend: number; // 超支金额（为负数表示超支）
  isWageCompliant: boolean; // 是否符合薪资帽
  profitLoss: number; // 总净利润
  lastUpdated: string;
}

export interface ClubBudget {
  clubId: string;
  season: number;
  budgetedRevenue: number;
  actualRevenue: number;
  budgetedWages: number;
  actualWages: number;
  transferBudget: number;
  spentTransferBudget: number;
}

// 计算俱乐部财务报表
export function calculateClubFinance(
  clubId: string,
  season: number,
  revenues: {
    ticket: number;
    broadcast: number;
    commercial: number;
  },
  wages: number,
  transferTransactions: Array<{ fee: number; direction: "in" | "out" }>
): ClubFinanceReport {
  const transferNetIncome = transferTransactions.reduce((sum, tx) => {
    return tx.direction === "in" ? sum + tx.fee : sum - tx.fee;
  }, 0);

  // 薪资帽（基于俱乐部市场规模和收入的一定比例）
  const salaryCap = Math.round((revenues.ticket + revenues.broadcast + revenues.commercial) * 0.6);

  const totalWages = wages;
  const wageOverspend = totalWages - salaryCap;
  const isWageCompliant = wageOverspend <= 0;

  const profitLoss = (
    revenues.ticket +
    revenues.broadcast +
    revenues.commercial +
    transferNetIncome -
    totalWages
  );

  return {
    season,
    ticketRevenue: revenues.ticket,
    broadcastRevenue: revenues.broadcast,
    commercialRevenue: revenues.commercial,
    transferNetIncome,
    salaryCap,
    totalWages,
    wageOverspend: Math.max(0, wageOverspend), // 显示为正数的超支
    isWageCompliant,
    profitLoss,
    lastUpdated: new Date().toISOString()
  };
}

// 检查薪资帽合规性
export function checkWageCompliance(
  actualWages: number,
  salaryCap: number
): { compliant: boolean; overspend: number; message: string } {
  const overspend = Math.max(0, actualWages - salaryCap);
  const compliant = overspend === 0;

  let message: string;
  if (compliant) {
    message = "薪资帽合规";
  } else if (overspend < salaryCap * 0.1) {
    message = `薪资帽轻度超支 ${overspend.toLocaleString()}€（帽额的 < 10%）`;
  } else if (overspend < salaryCap * 0.3) {
    message = `薪资帽适度超支 ${overspend.toLocaleString()}€（帽额的 10-30%）`;
  } else {
    message = `薪资帽严重超支 ${overspend.toLocaleString()}€（帽额的 > 30%） - 需要立即行动`;
  }

  return { compliant, overspend, message };
}

// 初始化俱乐部预算
export function initClubBudget(clubId: string, season: number): ClubBudget {
  // 基于历史数据或默认值初始化
  return {
    clubId,
    season,
    budgetedRevenue: 0,
    actualRevenue: 0,
    budgetedWages: 0,
    actualWages: 0,
    transferBudget: 100000000, // 1亿转会预算
    spentTransferBudget: 0
  };
}