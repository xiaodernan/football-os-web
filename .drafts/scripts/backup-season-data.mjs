// Season Data Backup Script
// 赛季数据备份脚本
// 自动备份当前赛季数据，支持手动恢复
//
// M535: this tool was quarantined with the lane's batch because it did not parse — a CommonJS
// `require` in a `.mjs`, and a `map` whose arrow body was never closed. It is ESM by extension,
// so it is written as ESM: the two imports, the export list and the "run me directly" test.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const SEASON_DATA_FILE = path.join(process.cwd(), 'season-data.json');

// 确保备份目录存在
// M535: this ran at import time, so merely importing the module wrote a `backups/` directory into
// whoever's working directory. The directory is made when a backup is taken instead.
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// 生成备份文件名
function generateBackupName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `season-backup-${year}-${month}-${day}-${hour}-${minute}.json`;
}

// 自动备份赛季数据
function autoBackup() {
  try {
    ensureBackupDir();
    // 读取当前赛季数据
    let data = null;
    if (fs.existsSync(SEASON_DATA_FILE)) {
      const rawData = fs.readFileSync(SEASON_DATA_FILE, 'utf8');
      data = JSON.parse(rawData);
    }
    
    // 如果没有数据，创建空数据结构
    if (!data) {
      data = {
        season: new Date().getFullYear(),
        players: [],
        teams: [],
        matches: [],
        statistics: {}
      };
    }
    
    // 生成备份名称并保存
    const backupName = generateBackupName();
    const backupPath = path.join(BACKUP_DIR, backupName);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    
    console.log(`Backup created: ${backupName}`);
    return backupName;
  } catch (error) {
    console.error('Backup failed:', error);
    return null;
  }
}

// 列出现有备份
function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => ({
      name: f,
      date: f.replace(/season-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json/, '$1-$2-$3 $4:$5'),
      size: fs.statSync(path.join(BACKUP_DIR, f)).size
    })).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('List backups failed:', error);
    return [];
  }
}

// 恢复备份
function restoreBackup(backupName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);
    if (!fs.existsSync(backupPath)) {
      console.error('Backup file not found:', backupName);
      return false;
    }
    
    const data = fs.readFileSync(backupPath, 'utf8');
    const dataContent = JSON.parse(data);
    
    // 写入当前赛季数据文件
    const seasonDataPath = SEASON_DATA_FILE;
    // 备份原有数据
    if (fs.existsSync(SEASON_DATA_FILE)) {
      const existingData = fs.readFileSync(SEASON_DATA_FILE, 'utf8');
      // 这里可以添加合逻辑来合并数据
    }
    
    fs.writeFileSync(seasonDataPath, JSON.stringify(data, null, 2));
    console.log(`Restored backup: ${backupName}`);
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
}

// 导出功能
export {
  autoBackup,
  listBackups,
  restoreBackup,
  generateBackupName
};

// 如果直接运行此脚本，则执行自动备份
const invokedDirectly = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const backupName = autoBackup();
  if (backupName) {
    console.log(`Season data backed up successfully: ${backupName}`);
    // 列出最近的备份
    const backups = listBackups();
    console.log(`Total backups: ${backups.length}`);
  }
}