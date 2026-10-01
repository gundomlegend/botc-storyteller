import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getPlayerDestribution, RoleRegistry } from '../engine/RoleRegistry';

export default function SetupView() {
  const { initGame, startNight, roleRegistry } = useGameStore();
  const [playerCount, setPlayerCount] = useState(7);
  const [names, setNames] = useState<string[]>(() => Array(7).fill(''));
  const [assignedRoles, setAssignedRoles] = useState<string[] | null>(null);

  const dist = getPlayerDestribution(playerCount);

  const handleCountChange = (count: number) => {
    setPlayerCount(count);
    setNames((prev) => {
      if (count > prev.length) {
        return [...prev, ...Array(count - prev.length).fill('')];
      }
      return prev.slice(0, count);
    });
    setAssignedRoles(null);
  };

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const canStart = names.every((n) => n.trim());

  const handleStart = () => {
    const roleIds = RoleRegistry.getInstance().randomizeRolesWithSetup(playerCount);
    setAssignedRoles(roleIds);
    console.log('Starting game with roleIds:', roleIds);

    const players = names.map((name, i) => ({
      seat: i + 1,
      name: name.trim(),
      role: roleIds[i],
      roleName: roleRegistry.getRoleName(roleIds[i]),
    }));

    console.log('Starting game with players:', players);

    initGame(players);
    startNight();
  };

  return (
    <section className="max-w-175 mx-auto">
      <h2 className="text-3xl font-bold text-primary mb-4">遊戲設置</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-text-muted">玩家人數：</label>
        <select
          className="py-1.5 px-3 rounded-sm border border-border bg-surface-raised text-text text-sm"
          value={playerCount}
          onChange={(e) => handleCountChange(Number(e.target.value))}
        >
          {Array.from({ length: 11 }, (_, i) => i + 5).map((n) => (
            <option key={n} value={n}>
              {n} 人
            </option>
          ))}
        </select>
        {dist && (
          <span className="text-text-muted text-xs">
            鎮民 {dist.townsfolk} / 外來者 {dist.outsider} / 爪牙 {dist.minion} / 惡魔 {dist.demon}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 mb-5">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-7 text-center text-primary font-bold">{i + 1}</span>
            <input
              type="text"
              className="flex-1 py-2 px-3 rounded-sm border border-border bg-surface-raised text-text text-sm"
              placeholder={`玩家 ${i + 1} 名稱`}
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
            />
            {assignedRoles && assignedRoles[i] && (
              <span className="text-primary text-xs whitespace-nowrap">{roleRegistry.getRoleName(assignedRoles[i])}</span>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={!canStart}
        onClick={handleStart}
      >
        開始遊戲 — 隨機分配角色，進入第一夜
      </button>
    </section>
  );
}
