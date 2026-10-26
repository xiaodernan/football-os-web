// Incremental Sync Script
// 增量同步脚本
// 仅同步变更的数据，支持冲突检测和解决

const fs = require('fs');
const path = require('path');

const SYNC_DIR = path.join(process.cwd(), 'sync-data');
const PLAYER_DATA_FILE = path.join(SYNC_DIR, 'players.json');
const TEAM_DATA_FILE = path.join(SYNC_DIR, 'teams.json');

// 确保同步目录存在
if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
}

// 生成同步标识
function generateSyncId() {
  return 'sync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 读取当前数据
function readData(file) {
  try {
    if (fs.existsSync(file)) {
      const rawData = fs.readFileSync(file, 'utf8');
      return JSON.parse(rawData);
    }
    return null;
  } catch (error) {
    console.error('读取数据失败:', error);
    return null;
  }
}

// 写入数据
function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('数据已写入:', file);
  } catch (error) {
    console.error('写入数据失败:', error);
  }
}

// 获取变更的玩家
function getChangedPlayers(remoteData, localData) {
  const changes = { added: [], modified: [], removed: [] };
  
  // 检查新增和修改的玩家
  const localPlayerIds = new Set(localData?.players?.map(p => p.id) || []);
  const remotePlayerIds = new Set(remoteData?.players?.map(p => p.id) || []);
  
  // 新增的玩家
  remoteData?.players?.forEach(player => {
    if (!localPlayerIds.has(player.id)) {
      changes.added.push(player);
    }
  });
  
  // 修改的玩家
  localData?.players?.forEach(player => {
    const remotePlayer = remoteData?.players?.find(p => p.id === player.id);
    if (remotePlayer) {
      // 检查关键字段是否变化
      const keyFields = ['overall', 'potential', 'age', 'marketValue'];
      let hasChange = false;
      for (const field of keyFields) {
        if (player[field] !== remotePlayer[field]) {
          hasChange = true;
          break;
        }
      }
      if (hasChange) {
        changes.modified.push({ local: player, remote: remotePlayer });
      }
    }
  });
  
  // 移除的玩家
  localData?.players?.forEach(player => {
    if (!remotePlayerIds.has(player.id)) {
      changes.removed.push(player);
    }
  });
  
  return changes;
}

// 执行增量同步
function incrementalSync() {
  console.log('开始增量同步...');
  
  // 读取本地和远程数据
  const localPlayers = readData(PLAYER_DATA_FILE);
  const remotePlayers = readData(path.join(SYNC_DIR, 'remote-players.json'));
  
  if (!localPlayers || !remotePlayers) {
    console.log('数据不完整，无法进行增量同步');
    return;
  }
  
  // 获取变更
  const changes = getChangedPlayers(remotePlayers, localPlayers);
  
  console.log('变更统计:');
  console.log('  - 新增:', changes.added.length);
  console.log('  - 修改:', changes.modified.length);
  console.log('  - 移除:', changes.removed.length);
  
  // 应用变更
  if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
    // 合并本地数据和远程变更
    const updatedLocal = { ...localPlayers };
    
    // 添加新玩家
    changes.added.forEach(player => {
      updatedLocal.players = updatedLocal.players ? [...updatedLocal.players, player] : [player];
    });
    
    // 修改现有玩家
    changes.modified.forEach(change => {
      const index = updatedLocal.players.findIndex(p => p.id === change.local.id);
      if (index !== -1) {
        updatedLocal.players[index] = { ...updatedLocal.players[index], ...change.remote };
      }
    });
    
    // 移除玩家
    if (changes.removed.length > 0) {
      updatedLocal.players = updatedLocal.players.filter(p => !changes.removed.some(r => r.id === p.id));
    }
    
    // 写入更新后的数据
    writeData(PLAYER_DATA_FILE, updatedLocal);
    console.log('增量同步完成，更新了', changes.added.length + changes.modified.length + changes.removed.length, '条记录');
  } else {
    console.log('没有检测到变更，数据已同步');
  }
}

// 如果直接运行此脚本，则执行同步
if (require.main === module) {
  incrementalSync();
}