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
    <section className="setup-view">
      <h2>遊戲設置</h2>

      <div className="setup-count">
        <label>玩家人數：</label>
        <select
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
          <span className="setup-dist">
            鎮民 {dist.townsfolk} / 外來者 {dist.outsider} / 爪牙 {dist.minion} / 惡魔 {dist.demon}
          </span>
        )}
      </div>

      <div className="setup-players">
        {names.map((name, i) => (
          <div key={i} className="setup-player-row">
            <span className="seat-number">{i + 1}</span>
            <input
              type="text"
              placeholder={`玩家 ${i + 1} 名稱`}
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
            />
            {assignedRoles && assignedRoles[i] && (
              <span className="assigned-role">{roleRegistry.getRoleName(assignedRoles[i])}</span>
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
