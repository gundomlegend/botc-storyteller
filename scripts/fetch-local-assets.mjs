// 從 townsquare 下載角色圖示與魔典介面素材到 assets-local/（已列入 .gitignore，不會推上公開倉庫）。
// 只抓 src/data/roles/*.json 裡出現的角色；新增劇本後重跑即可。
// 用法：npm run assets:fetch
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SOURCE = 'https://github.com/limpy01/townsquare';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const rolesDir = path.join(root, 'src', 'data', 'roles');
const outDir = path.join(root, 'assets-local');

const UI_FILES = [
  'token.png', 'reminder.png', 'life.png', 'death.png', 'shroud.png', 'vote.png',
  'clock-big.png', 'clock-small.png', 'background.jpg',
  'leaf-left.png', 'leaf-right.png', 'leaf-orange.png',
  'leaf-top1.png', 'leaf-top2.png', 'leaf-top3.png', 'leaf-top4.png', 'leaf-top5.png',
];

const roleIds = new Set();
for (const file of fs.readdirSync(rolesDir).filter((f) => f.endsWith('.json'))) {
  for (const role of JSON.parse(fs.readFileSync(path.join(rolesDir, file), 'utf8'))) roleIds.add(role.id);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'townsquare-'));
console.log(`下載 ${SOURCE} ...`);
const clone = spawnSync('git', ['clone', '--depth', '1', SOURCE, tmp], { stdio: 'inherit' });
if (clone.status !== 0) {
  console.error('git clone 失敗，請確認已安裝 git 且可連上 GitHub。');
  process.exit(1);
}

const assets = path.join(tmp, 'src', 'assets');
const copy = (from, to) => {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
};

const missing = [];
for (const id of roleIds) {
  if (!copy(path.join(assets, 'icons', `${id}.png`), path.join(outDir, 'icons', `${id}.png`))) missing.push(id);
}
for (const name of UI_FILES) copy(path.join(assets, name), path.join(outDir, 'ui', name));
for (const name of fs.readdirSync(path.join(assets, 'editions'))) {
  copy(path.join(assets, 'editions', name), path.join(outDir, 'editions', name));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`完成：${roleIds.size - missing.length}/${roleIds.size} 個角色圖示，介面素材在 assets-local/ui/。`);
if (missing.length) console.warn(`找不到圖示：${missing.join(', ')}`);
