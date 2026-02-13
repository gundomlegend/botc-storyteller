import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import AbilityHeader from '../shared/AbilityHeader';
import AbilityStatusIndicator from '../shared/AbilityStatusIndicator';
import DrunkRoleIndicator from '../shared/DrunkRoleIndicator';
import { usePlayerRealTimeStatus } from '../../hooks/usePlayerRealTimeStatus';
import rolesData from '../../data/roles/trouble-brewing.json';

export default function InvestigatorProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedMinionRole, setSelectedMinionRole] = useState<string>('');
  const [selectedPlayer1, setSelectedPlayer1] = useState<number | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<number | null>(null);

  const roleData = stateManager.getRoleData(item.role);

  // 從角色數據中過濾出 Trouble Brewing 爪牙角色
  const minionRoles = useMemo(() => {
    return rolesData.filter(role => role.team === 'minion');
  }, []);

  // 檢查是否為酒鬼角色
  const player = stateManager.getPlayer(item.seat);
  const isDrunkRole = player?.role === 'drunk' && player?.believesRole != null;

  // 讀取玩家即時狀態
  const { isPoisoned, isDrunk, isProtected, isDead } = usePlayerRealTimeStatus(item);
  const isReliable = !isPoisoned && !isDrunk && !isDrunkRole;

  // 執行能力獲取 Handler 結果
  useEffect(() => {
    const r = processAbility(item.seat, null);
    setResult(r);
  }, [processAbility, item.seat]);

  // 預選邏輯
  useEffect(() => {
    if (!result?.info || typeof result.info !== 'object') return;
    const info = result.info as Record<string, unknown>;

    // 只有間諜的特殊情況：不顯示選擇介面
    if (info.onlySpyInGame) return;

    // 無爪牙情況：不預選
    if (info.noMinionInGame) return;

    const minions = (info.minions as Array<{ seat: number; role: string; name: string }>) || [];
    const hasRecluse = info.hasRecluse as boolean;
    const recluseSeat = info.recluseSeat as number | null;

    // 不可靠時不預選
    if (!isReliable) {
      setSelectedMinionRole('');
      setSelectedPlayer1(null);
      setSelectedPlayer2(null);
      return;
    }

    // 可靠時預選
    if (minions.length > 0) {
      // 預選第一個在場爪牙角色
      const firstMinion = minions[0];
      setSelectedMinionRole(firstMinion.role);

      // 選擇兩位玩家
      const allPlayers = stateManager.getAlivePlayers();

      if (hasRecluse && recluseSeat !== null) {
        // 有陌客：預選爪牙玩家 + 陌客玩家
        setSelectedPlayer1(firstMinion.seat);
        setSelectedPlayer2(recluseSeat);
      } else {
        // 無陌客：預選爪牙玩家 + 外來者/善良玩家
        const decoyPlayer = allPlayers.find(
          p => p.seat !== firstMinion.seat &&
               p.seat !== item.seat &&
               (p.team === 'outsider' || p.team === 'townsfolk')
        );
        if (decoyPlayer) {
          setSelectedPlayer1(firstMinion.seat);
          setSelectedPlayer2(decoyPlayer.seat);
        }
      }
    }
  }, [result, isReliable, stateManager, item.seat]);

  const handleConfirm = () => {
    // 記錄說書人選擇
    const selectedRoleData = stateManager.getRoleData(selectedMinionRole);
    const roleName = selectedRoleData?.name_cn || selectedMinionRole;

    stateManager.logEvent({
      type: 'ability_use',
      description: `調查員資訊：展示${roleName}，指向${selectedPlayer1}號和${selectedPlayer2}號`,
      details: {
        minionRole: selectedMinionRole,
        player1: selectedPlayer1,
        player2: selectedPlayer2,
      },
    });
    onDone();
  };

  if (!result) {
    return (
      <div className="ability-processor">
        <AbilityHeader
          seat={item.seat}
          roleName={item.roleName}
          roleData={roleData}
          reminder={item.reminder}
        />
        <p>載入中...</p>
      </div>
    );
  }

  const info = result.info as Record<string, unknown>;

  // 只有間諜的特殊情況
  if (info.onlySpyInGame) {
    return (
      <div className="ability-processor">
        <AbilityHeader
          seat={item.seat}
          roleName={item.roleName}
          roleData={roleData}
          reminder={item.reminder}
        />
        <AbilityStatusIndicator
          isDead={isDead}
          isPoisoned={isPoisoned}
          isDrunk={isDrunk}
          isProtected={isProtected}
        />
        <div className="ability-result">
          <div className="result-display" style={{ fontSize: '1.1rem', color: '#ffd700' }}>
            場上只有間諜，告知調查員：<strong>場上無任何爪牙角色</strong>
          </div>
          <div className="ability-actions">
            <button className="btn-primary" onClick={onDone}>
              確認
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 無爪牙情況
  if (info.noMinionInGame) {
    return (
      <div className="ability-processor">
        <AbilityHeader
          seat={item.seat}
          roleName={item.roleName}
          roleData={roleData}
          reminder={item.reminder}
        />
        <AbilityStatusIndicator
          isDead={isDead}
          isPoisoned={isPoisoned}
          isDrunk={isDrunk}
          isProtected={isProtected}
        />
        <div className="ability-result">
          <div className="result-display">
            場上無爪牙角色，調查員無法獲得資訊
          </div>
          <div className="ability-actions">
            <button className="btn-primary" onClick={onDone}>
              確認
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSelectionComplete = selectedMinionRole !== '' && selectedPlayer1 !== null && selectedPlayer2 !== null;

  return (
    <div className="ability-processor">
      <AbilityHeader
        seat={item.seat}
        roleName={item.roleName}
        roleData={roleData}
        reminder={item.reminder}
      />

      <AbilityStatusIndicator
        isDead={isDead}
        isPoisoned={isPoisoned}
        isDrunk={isDrunk}
        isProtected={isProtected}
      />

      <DrunkRoleIndicator isDrunkRole={isDrunkRole} roleData={roleData} />

      {/* 狀態警告 */}
      {!isReliable && (
        <div className="result-warning" style={{ marginBottom: '1rem' }}>
          ℹ️ 調查員中毒/醉酒或是酒鬼，說書人可給予任意資訊
        </div>
      )}

      {/* 選擇爪牙角色 */}
      <div className="ability-target">
        <label htmlFor="minion-role-select">選擇展示的爪牙角色：</label>
        <select
          id="minion-role-select"
          value={selectedMinionRole}
          onChange={(e) => setSelectedMinionRole(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {minionRoles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name_cn}
            </option>
          ))}
        </select>
      </div>

      {/* 選擇兩位玩家 */}
      <div className="ability-target" style={{ marginTop: '1rem' }}>
        <label htmlFor="player1-select">選擇第一位玩家：</label>
        <select
          id="player1-select"
          value={selectedPlayer1 ?? ''}
          onChange={(e) => setSelectedPlayer1(e.target.value ? Number(e.target.value) : null)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat)
            .map(p => {
              const rd = stateManager.getRoleData(p.role);
              return (
                <option key={p.seat} value={p.seat}>
                  {p.seat}號 {p.name} ({rd?.name_cn || p.role})
                </option>
              );
            })}
        </select>
      </div>

      <div className="ability-target" style={{ marginTop: '1rem' }}>
        <label htmlFor="player2-select">選擇第二位玩家：</label>
        <select
          id="player2-select"
          value={selectedPlayer2 ?? ''}
          onChange={(e) => setSelectedPlayer2(e.target.value ? Number(e.target.value) : null)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat && p.seat !== selectedPlayer1)
            .map(p => {
              const rd = stateManager.getRoleData(p.role);
              return (
                <option key={p.seat} value={p.seat}>
                  {p.seat}號 {p.name} ({rd?.name_cn || p.role})
                </option>
              );
            })}
        </select>
        {isReliable && (info.hasRecluse as boolean) && (
          <div className="result-hint" style={{ marginTop: '0.5rem' }}>
            ℹ️ 場上有陌客，建議選擇爪牙玩家和陌客玩家
          </div>
        )}
      </div>

      {/* 確認按鈕 */}
      <div className="ability-actions" style={{ marginTop: '1rem' }}>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={!isSelectionComplete}
        >
          確認
        </button>
      </div>
    </div>
  );
}
