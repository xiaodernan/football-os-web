export interface TransferOffer {
  fromClub: string;
  toClub: string;
  playerId: string;
  fee: number; // 转会费
  wage: number; // 年薪
  contractYears: number; // 合同剩余年数
}

export interface TransferResult {
  success: boolean;
  message: string;
  playerMoved: boolean;
}

// 计算球员转会费基础值
export function calculateTransferFee(playerOverall: number, playerAge: number, contractYearsRemaining: number): number {
  // 基础费用随整体评分指数增长
  const baseFee = Math.pow(playerOverall, 2.2) * 1000;
  
  // 年龄因子：年轻球员更贵，老将降值
  const ageFactor = playerAge <= 20 ? 1.5 : playerAge >= 30 ? 0.7 : 1.0;
  
  // 合同年限因子：剩余合同越短，价格越低
  const contractFactor = contractYearsRemaining <= 1 ? 0.5 : contractYearsRemaining <= 2 ? 0.8 : 1.0;
  
  return Math.round(baseFee * ageFactor * contractFactor);
}

// 执行转会交易
export function executeTransfer(
  fromClub: string,
  toClub: string,
  playerId: string,
  offeredFee: number
): TransferResult {
  // 验证转会费是否满足最低要求
  const minFee = 500000; // 50万最低转会费
  
  if (offeredFee < minFee) {
    return {
      success: false,
      message: `转会费低于最低要求（${minFee}€）`,
      playerMoved: false
    };
  }
  
  // 模拟转会成功（确定性基于费用是否足够）
  const success = offeredFee >= calculateTransferFee(85, 25, 3); // 示例参数
  
  return {
    success,
    message: success ? '转会成功！' : '转会失败，球队拒绝报价',
    playerMoved: success
  };
}

// 赛季结束后的自由转会名单
export function getFreeAgents(competitions: string[]): Array<{ playerId: string; name: string; overall: number }> {
  // 从所有竞赛中收集合同即将到期的球员
  const agents: Array<{ playerId: string; name: string; overall: number }> = [];
  
  for (const comp of competitions) {
    const standings = [];
    // 收集该竞赛的球员数据
    const players = []; // 此处从 footballProvider 获取
    
    // 筛选合同年限 ≤ 1 的球员
    // players.filter(p => p.contractYearsRemaining <= 1).forEach(p => agents.push({...}));
  }
  
  return agents;
}