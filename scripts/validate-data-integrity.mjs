// Data Integrity Validation Script
// 数据完整性验证脚本
// 验证数据一致性，检测并修复错误数据

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const SEASON_DATA_FILE = path.join(DATA_DIR, 'season-data.json');
const PLAYERS_DATA_FILE = path.join(DATA_DIR, 'players.json');

// 验证赛季数据完整性
function validateSeasonData() {
  const issues = [];
  
  try {
    if (!fs.existsSync(SEASON_DATA_FILE)) {
      issues.push('Season data file not found');
      return issues;
    }
    
    const data = JSON.parse(fs.readFileSync(SEASON_DATA_FILE, 'utf8'));
    
    // 检查必要字段
    const requiredFields = ['season', 'players', 'teams'];
    for (const field of requiredFields) {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    }
    
    // 验证玩家数据结构
    if (data.players && Array.isArray(data.players)) {
      data.players.forEach((player, index) => {
        const playerRequired = ['id', 'name', 'overall', 'potential'];
        for (const field of playerRequired) {
          if (!player[field]) {
            issues.push(`Player ${index}: Missing field ${field}`);
          }
        }
        // 验证数值范围
        if (player.overall !== undefined && (player.overall < 1 || player.overall > 100)) {
          issues.push(`Player ${index}: Invalid overall rating ${player.overall}`);
        }
        if (player.potential !== undefined && (player.potential < 1 || player.potential > 100)) {
          issues.push(`Player ${index}: Invalid potential rating ${player.potential}`);
        }
      });
    }
    
    // 验证球队数据结构
    if (data.teams && Array.isArray(data.teams)) {
      data.teams.forEach((team, index) => {
        if (!team.name) {
          issues.push(`Team ${index}: Missing name`);
        }
      });
    }
    
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }
  
  return issues;
}

// 验证球员数据完整性
function validatePlayerData() {
  const issues = [];
  
  try {
    if (!fs.existsSync(PLAYERS_DATA_FILE)) {
      issues.push('Players data file not found');
      return issues;
    }
    
    const data = JSON.parse(fs.readFileSync(PLAYERS_DATA_FILE, 'utf8'));
    
    if (data.players && Array.isArray(data.players)) {
      data.players.forEach((player, index) => {
        // 检查关键字段
        const required = ['name', 'overall', 'potential', 'age', 'position'];
        for (const field of required) {
          if (!player[field]) {
            issues.push(`Player ${index}: Missing ${field}`);
          }
        }
        
        // 验证年龄范围
        if (player.age !== undefined && (player.age < 16 || player.age > 45)) {
          issues.push(`Player ${index}: Invalid age ${player.age}`);
        }
        
        // 验证薪资结构
        if (player.contract && player.contract.weeklyWage !== undefined) {
          if (typeof player.contract.weeklyWage !== 'number' || player.contract.weeklyWage < 0) {
            issues.push(`Player ${index}: Invalid weekly wage`);
          }
        }
      });
    }
    
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }
  
  return issues;
}

// 生成完整性报告
function generateIntegrityReport() {
  const seasonIssues = validateSeasonData();
  const playerIssues = validatePlayerData();
  
  return {
    seasonDataIssues: seasonIssues,
    playerDataIssues: playerIssues,
    totalIssues: seasonIssues.length + playerIssues.length,
    isValid: (seasonIssues.length + playerIssues.length) === 0
  };
}

// 修复常见错误
function fixCommonErrors() {
  const fixes = [];
  
  // 尝试修复赛季数据缺失字段
  try {
    if (fs.existsSync(SEASON_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(SEASON_DATA_FILE, 'utf8'));
      
      // 添加缺失的必需字段
      if (!data.season) data.season = new Date().getFullYear();
      if (!data.players) data.players = [];
      if (!data.teams) data.teams = [];
      
      fs.writeFileSync(SEASON_DATA_FILE, JSON.stringify(data, null, 2));
      fixes.push('Fixed season data missing fields');
    }
  } catch (error) {
    fixes.push(`Failed to fix season data: ${error.message}`);
  }
  
  return fixes;
}

// 导出功能
module.exports = {
  validateSeasonData,
  validatePlayerData,
  generateIntegrityReport,
  fixCommonErrors
};

// 如果直接运行此脚本，则生成报告
if (require.main === module) {
  const report = generateIntegrityReport();
  console.log('=== Data Integrity Report ===');
  console.log(`Total Issues: ${report.totalIssues}`);
  console.log(`Is Valid: ${report.isValid}`);
  
  if (report.seasonDataIssues.length > 0) {
    console.log('\nSeason Data Issues:');
    report.seasonDataIssues.forEach(issue => console.log(`- ${issue}`));
  }
  
  if (report.playerDataIssues.length > 0) {
    console.log('\nPlayer Data Issues:');
    report.playerDataIssues.forEach(issue => console.log(`- ${issue}`));
  }
  
  if (report.isValid) {
    console.log('\nAll data is valid!');
  }
  
  // 尝试修复常见错误
  const fixes = fixCommonErrors();
  console.log('\nFixes applied:');
  fixes.forEach(fix => console.log(`- ${fix}`));
}