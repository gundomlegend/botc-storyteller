import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult, Player } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import PlayerSelector from '../PlayerSelector';
import AbilityHeader from '../shared/AbilityHeader';
import AbilityStatusIndicator from '../shared/AbilityStatusIndicator';
import { usePlayerRealTimeStatus } from '../../hooks/usePlayerRealTimeStatus';

// Trouble Brewing 所有爪牙角色
const ALL_MINION_ROLES = [
  { id: 'poisoner', name_cn: '投毒者' },
  { id: 'spy', name_cn: '間諜' },
  { id: 'baron', name_cn: '男爵' },
  { id: 'scarlet_woman', name_cn: '猩紅女郎' },
] as const;

export default function InvestigatorProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedMinionRole, setSelectedMinionRole] = useState<string>('');
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  const roleData = stateManager.getRoleData(item.role);

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
      setSelectedPlayers([]);
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
        setSelectedPlayers([firstMinion.seat, recluseSeat]);
      } else {
        // 無陌客：預選爪牙玩家 + 外來者/善良玩家
        const decoyPlayer = allPlayers.find(
          p => p.seat !== firstMinion.seat &&
               p.seat !== item.seat &&
               (p.team === 'outsider' || p.team === 'townsfolk')
        );
        if (decoyPlayer) {
          setSelectedPlayers([firstMinion.seat, decoyPlayer.seat]);
        }
      }
    }
  }, [result, isReliable, stateManager, item.seat]);

  const handleConfirm = () => {
    // 記錄說書人選擇
    stateManager.logEvent({
      type: 'ability_use',
      description: `調查員資訊：展示${ALL_MINION_ROLES.find(r => r.id === selectedMinionRole)?.name_cn}，指向${selectedPlayers[0]}號和${selectedPlayers[1]}號`,
      details: {
        minionRole: selectedMinionRole,
        player1: selectedPlayers[0],
        player2: selectedPlayers[1],
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

  const isSelectionComplete = selectedMinionRole !== '' && selectedPlayers.length === 2;

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

      {/* 酒鬼角色標記 */}
      {isDrunkRole && roleData && (
        <div className="drunk-indicator" style={{
          background: '#3a1a1a',
          border: '2px solid #e01111',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <strong style={{ color: '#e01111' }}>🍺 酒鬼角色</strong>
          <p style={{ marginTop: '0.5rem', color: '#ffffff' }}>
            此玩家實際上是酒鬼，以為自己是 <strong>{roleData.name_cn}</strong>。
            他們會執行假角色的行為，但能力不會生效。說書人可給予任意假資訊。
          </p>
        </div>
      )}

      {/* 狀態警告 */}
      {!isReliable && (
        <div className="result-warning" style={{ marginBottom: '1rem' }}>
          ⚠️ 調查員
          {isPoisoned && '中毒'}
          {isDrunk && '醉酒'}
          {isDrunkRole && '是酒鬼'}
          ，說書人可給予任意資訊
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
          {ALL_MINION_ROLES.map(role => (
            <option key={role.id} value={role.id}>
              {role.name_cn}
            </option>
          ))}
        </select>
      </div>

      {/* 選擇兩位玩家 */}
      <div className="ability-target" style={{ marginTop: '1rem' }}>
        {selectedPlayers.length === 0 ? (
          <>
            <p>選擇兩位玩家（其中一位是該爪牙）：</p>
            <PlayerSelector
              mode="double"
              showRoles={true}
              onlyAlive={true}
              currentPlayerSeat={item.seat}
              excludePlayers={[item.seat]}
              onSelect={(players: Player[]) => setSelectedPlayers(players.map(p => p.seat))}
            />
          </>
        ) : (
          <>
            <p>已選擇：{selectedPlayers[0]}號 和 {selectedPlayers[1]}號</p>
            <button
              className="btn-secondary"
              onClick={() => setSelectedPlayers([])}
              style={{ marginTop: '0.5rem' }}
            >
              重新選擇
            </button>
          </>
        )}
        {isReliable && (info.hasRecluse as boolean) && selectedPlayers.length === 2 && (
          <div className="result-hint" style={{ marginTop: '0.5rem' }}>
            💡 場上有陌客，建議選擇爪牙玩家和陌客玩家
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
        <button className="btn-secondary" onClick={onDone}>
          跳過
        </button>
      </div>
    </div>
  );
}
