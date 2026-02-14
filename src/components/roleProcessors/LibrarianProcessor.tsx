import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult, Player } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import AbilityHeader from '../shared/AbilityHeader';
import AbilityStatusIndicator from '../shared/AbilityStatusIndicator';
import DrunkRoleIndicator from '../shared/DrunkRoleIndicator';
import { usePlayerRealTimeStatus } from '../../hooks/usePlayerRealTimeStatus';
import rolesData from '../../data/roles/trouble-brewing.json';
import { RoleRegistry } from '../../engine/RoleRegistry';

/**
 * 格式化玩家選項文字（包含座號、名稱、角色、狀態圖示）
 */
function formatPlayerOption(player: Player, roleRegistry: RoleRegistry): string {
  const statusIcons = [];
  if (player.isPoisoned) statusIcons.push('🧪');
  if (player.isDrunk) statusIcons.push('🍺');
  if (player.isProtected) statusIcons.push('🛡️');
  const statusStr = statusIcons.length > 0 ? ` ${statusIcons.join('')}` : '';
  return `${player.seat}號 - ${player.name} - ${roleRegistry.getPlayerRoleName(player)}${statusStr}`;
}

export default function LibrarianProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager, roleRegistry } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedOutsiderRole, setSelectedOutsiderRole] = useState<string>('');
  const [selectedPlayer1, setSelectedPlayer1] = useState<number | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<number | null>(null);

  const roleData = roleRegistry.getRoleData(item.role);

  // 從角色數據中過濾出 Trouble Brewing 外來者角色
  const outsiderRoles = useMemo(() => {
    return rolesData.filter(role => role.team === 'outsider');
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

    // 無外來者情況：不預選
    if (info.noOutsiderInGame) return;

    // 只有間諜的特殊情況：不預選（與調查員不同，這裡給說書人完全自由）
    if (info.onlySpyInGame) return;

    const outsiders = (info.outsiders as Array<{ seat: number; role: string; name: string }>) || [];
    const recluses = (info.recluses as Array<{ seat: number; role: string; name: string }>) || [];

    // 不可靠時不預選（但不清空用戶選擇）
    if (!isReliable) return;

    // 可靠時預選邏輯：優先預選真實外來者 > 間諜 > 陌客
    if (outsiders.length > 0) {
      // 找第一個非間諜的外來者
      const firstOutsider = outsiders.find(o => o.role !== 'spy') || outsiders[0];
      setSelectedOutsiderRole(firstOutsider.role);

      // 選擇兩位玩家：第一位是該外來者，第二位是其他玩家
      const allPlayers = stateManager.getAlivePlayers();

      // 第二位玩家：從非外來者中隨機選擇（可包含陌客）
      const nonOutsiderPlayers = allPlayers.filter(p =>
        p.seat !== firstOutsider.seat &&
        p.seat !== item.seat &&
        !outsiders.some(o => o.seat === p.seat)
      );

      // 陌客可以作為第二位玩家的候選
      const decoyPlayer = nonOutsiderPlayers[0] || recluses[0] && stateManager.getPlayer(recluses[0].seat);

      if (decoyPlayer) {
        setSelectedPlayer1(firstOutsider.seat);
        setSelectedPlayer2(decoyPlayer.seat);
      }
    } else if (recluses.length > 0) {
      // 只有陌客的情況：預選陌客
      const firstRecluse = recluses[0];
      setSelectedOutsiderRole('recluse');

      const allPlayers = stateManager.getAlivePlayers();
      const decoyPlayer = allPlayers.find(
        p => p.seat !== firstRecluse.seat && p.seat !== item.seat
      );

      if (decoyPlayer) {
        setSelectedPlayer1(firstRecluse.seat);
        setSelectedPlayer2(decoyPlayer.seat);
      }
    }
  }, [result, isReliable, stateManager, item.seat]);

  const handleConfirm = () => {
    // 記錄說書人選擇
    const selectedRoleData = roleRegistry.getRoleData(selectedOutsiderRole);
    const roleName = selectedRoleData?.name_cn || selectedOutsiderRole;

    stateManager.logEvent({
      type: 'ability_use',
      description: `圖書管理員資訊：展示${roleName}，指向${selectedPlayer1}號和${selectedPlayer2}號`,
      details: {
        outsiderRole: selectedOutsiderRole,
        player1: selectedPlayer1,
        player2: selectedPlayer2,
      },
    });
    onDone();
  };

  const handleNoOutsider = () => {
    // 給予「無外來者」資訊
    stateManager.logEvent({
      type: 'ability_use',
      description: '圖書管理員資訊：告知場上沒有外來者',
      details: {
        noOutsider: true,
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

  // 無外來者情況
  if (info.noOutsiderInGame) {
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
            場上沒有任何外來者角色
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

  const outsiders = (info.outsiders as Array<{ seat: number; role: string; name: string; roleName: string }>) || [];
  const recluses = (info.recluses as Array<{ seat: number; role: string; name: string }>) || [];
  const hasSpy = info.hasSpy as boolean;
  const hasRecluse = info.hasRecluse as boolean;
  const onlySpyInGame = info.onlySpyInGame as boolean;

  const isSelectionComplete = selectedOutsiderRole !== '' && selectedPlayer1 !== null && selectedPlayer2 !== null;

  // 判斷是否可以顯示「給予無外來者資訊」按鈕
  // 條件：只有間諜、只有陌客、或能力不可靠（中毒/醉酒/酒鬼）
  const canGiveNoOutsiderInfo = onlySpyInGame || (outsiders.length === 0 && recluses.length > 0) || !isReliable;

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
          {isDrunkRole ? (
            <>
              ℹ️ 圖書管理員實際上是酒鬼（無能力），說書人可給予任意資訊
              <br />
              <small>推薦：給予假外來者角色，挑選兩個反差大的玩家</small>
            </>
          ) : (
            <>
              ℹ️ 圖書管理員中毒/醉酒（能力不可靠），說書人可給予任意資訊
              <br />
              <small>推薦：給予正確資訊，避免暴露投毒者</small>
            </>
          )}
        </div>
      )}

      {/* 顯示場上外來者列表 */}
      {outsiders.length > 0 && (
        <div className="result-info" style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <strong style={{ color: '#ff6b6b' }}>場上外來者：</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            {outsiders.map(o => (
              <li style={{ color: '#ff6b6b' }} key={o.seat}>
                {o.seat}號 {o.name}（{o.roleName}）
                {o.role === 'spy' && <span style={{ color: '#ff6b6b' }}> [可視為外來者]</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 顯示陌客獨立列表 */}
      {recluses.length > 0 && (
        <div className="result-info" style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fff3cd', borderRadius: '4px' }}>
          <strong style={{ color: '#ff6b6b' }}>陌客（可選擇不視為外來者）：</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            {recluses.map(r => (
              <li style={{ color: '#ff6b6b' }} key={r.seat}>
                {r.seat}號 {r.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 提示訊息 */}
      {onlySpyInGame && (
        <div className="result-hint" style={{ marginBottom: '1rem', padding: '0.5rem', background: '#e3f2fd', borderRadius: '4px' }}>
          ℹ️ <strong>只有間諜在場</strong>，可給予假外來者資訊或告知「無外來者」
        </div>
      )}

      {hasSpy && !onlySpyInGame && (
        <div className="result-hint" style={{ marginBottom: '0.5rem' }}>
          ℹ️ 間諜在場，可選擇間諜作為外來者
        </div>
      )}

      {hasRecluse && (
        <div className="result-hint" style={{ marginBottom: '1rem' }}>
          ℹ️ 陌客能力正常，可選擇不視為外來者
        </div>
      )}

      {/* 選擇外來者角色 */}
      <div className="ability-target">
        <label htmlFor="outsider-role-select">選擇展示的外來者角色：</label>
        <select
          id="outsider-role-select"
          value={selectedOutsiderRole}
          onChange={(e) => setSelectedOutsiderRole(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {outsiderRoles.map(role => (
            <option key={role.id} value={role.id}>
              {roleRegistry.getRoleName(role.id)}
              {!outsiders.some(o => o.role === role.id) && !recluses.some(r => r.role === role.id) && ' (不在場)'}
            </option>
          ))}
        </select>
      </div>

      {/* 選擇兩位玩家 */}
      <div className="ability-target" style={{ marginTop: '1rem' }}>
        <label htmlFor="player1-select">選擇第一位玩家（該外來者）：</label>
        <select
          id="player1-select"
          value={selectedPlayer1 ?? ''}
          onChange={(e) => setSelectedPlayer1(e.target.value ? Number(e.target.value) : null)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat)
            .map(p => (
              <option key={p.seat} value={p.seat}>
                {formatPlayerOption(p, roleRegistry)}
              </option>
            ))}
        </select>
      </div>

      <div className="ability-target" style={{ marginTop: '1rem' }}>
        <label htmlFor="player2-select">選擇第二位玩家（非該外來者）：</label>
        <select
          id="player2-select"
          value={selectedPlayer2 ?? ''}
          onChange={(e) => setSelectedPlayer2(e.target.value ? Number(e.target.value) : null)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat && p.seat !== selectedPlayer1)
            .map(p => (
              <option key={p.seat} value={p.seat}>
                {formatPlayerOption(p, roleRegistry)}
              </option>
            ))}
        </select>
      </div>

      {/* 確認按鈕 */}
      <div className="ability-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={!isSelectionComplete}
        >
          確認
        </button>

        {/* 給予「無外來者」資訊按鈕（只有間諜或只有陌客時顯示） */}
        {canGiveNoOutsiderInfo && (
          <button
            className="btn-secondary"
            onClick={handleNoOutsider}
          >
            給予「無外來者」資訊
          </button>
        )}
      </div>
    </div>
  );
}
