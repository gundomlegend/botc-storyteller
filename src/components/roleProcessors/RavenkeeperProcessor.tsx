/**
 * 守鴉人 Processor
 *
 * 兩步驟互動：
 * 1. 檢查觸發條件（今晚死亡）→ 若未觸發則跳過
 * 2. 選擇目標玩家 → 顯示角色資訊（含特殊情況角色選擇）
 *
 * See: docs/specs/Ravenkeeper.spec.md
 */

import { useState, useEffect } from 'react';
import type { NightResult, Player } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import type { RavenkeeperHandlerInfo } from './shared/types';
import { useGameStore } from '../../store/gameStore';
import PlayerSelector from '../PlayerSelector';

export default function RavenkeeperProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager, roleRegistry } = useGameStore();
  const [triggerResult, setTriggerResult] = useState<NightResult | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Step 1: 檢查觸發條件
  useEffect(() => {
    if (!triggerResult) {
      const r = processAbility(item.seat, null);
      setTriggerResult(r);
    }
  }, [triggerResult, processAbility, item.seat]);

  // Step 2: 選擇目標後，取得角色資訊
  useEffect(() => {
    if (selectedTarget != null && !result) {
      const r = processAbility(item.seat, selectedTarget);
      setResult(r);
    }
  }, [selectedTarget, result, processAbility, item.seat]);

  // 當 result 取得後，設定初始的 selectedRole
  useEffect(() => {
    if (!result) return;
    const info = result.info as RavenkeeperHandlerInfo | undefined;
    if (!info) return;

    const { targetPlayer, isRecluse, isSpy, selectableRoles, reliable } = info;
    const needRoleSelection = isRecluse || isSpy || !reliable;

    if (needRoleSelection && selectableRoles.length > 0) {
      // 陌客/間諜不預選；不可靠時預選真實角色
      setSelectedRole(isRecluse || isSpy ? '' : targetPlayer.role);
    } else {
      setSelectedRole(targetPlayer.role);
    }
  }, [result]);

  // 載入中
  if (!triggerResult) {
    return <div className="ability-processor"><p>載入中...</p></div>;
  }

  const playerName = stateManager?.getPlayer(item.seat)?.name;

  // 跳過：未觸發（第一夜 / 今晚未死亡）
  if (triggerResult.skip) {
    return (
      <div className="ability-processor">
        <div className="ability-header">
          <h3>守鴉人（{item.seat}號 {playerName}）</h3>
        </div>
        <div className="ability-content">
          <p>{triggerResult.display}</p>
        </div>
        <div className="ability-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={onDone}>
            確認
          </button>
        </div>
      </div>
    );
  }

  // Step 2: 需要選擇目標玩家
  if (triggerResult.needInput && selectedTarget == null) {
    return (
      <div className="ability-processor">
        <div className="ability-header">
          <h3>守鴉人（{item.seat}號 {playerName}）</h3>
          <div className="ability-status">
            觸發原因：今晚被殺死
          </div>
        </div>
        <div className="ability-content">
          <p>{triggerResult.inputPrompt}</p>
          <PlayerSelector
            mode="single"
            canSelectSelf={true}
            onlyAlive={false}
            currentPlayerSeat={item.seat}
            onSelect={(players: Player[]) => {
              if (players[0]) {
                setSelectedTarget(players[0].seat);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // 等待結果
  if (!result) {
    return <div className="ability-processor"><p>處理中...</p></div>;
  }

  const info = result.info as RavenkeeperHandlerInfo | undefined;

  // 無 info（異常）
  if (!info) {
    return (
      <div className="ability-processor">
        <div className="ability-header">
          <h3>守鴉人（{item.seat}號 {playerName}）</h3>
        </div>
        <div className="ability-content">
          <p>{result.display}</p>
        </div>
        <div className="ability-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={onDone}>確認</button>
        </div>
      </div>
    );
  }

  const { targetPlayer, isRecluse, isSpy, selectableRoles, reliable, statusReason } = info;
  const needRoleSelection = isRecluse || isSpy || !reliable;

  // 能力狀態顯示
  const getStatusDisplay = () => {
    if (!reliable) {
      if (stateManager?.getPlayer(item.seat)?.role === 'drunk') {
        return '🍺 實際上是酒鬼（無能力）';
      }
      return '⚠️ 中毒/醉酒（能力不可靠）';
    }
    return '✅ 正常';
  };

  // 提示訊息
  const getHints = (): string[] => {
    const hints: string[] = [];

    if (isRecluse) {
      hints.push('陌客能力正常，可以被認定為邪惡角色');
    } else if (isSpy) {
      hints.push('間諜能力正常，可以被認定為善良角色');
    } else if (!reliable) {
      hints.push('能力不可靠，說書人可選擇給錯誤資訊');
    }

    if (targetPlayer.isDrunk && targetPlayer.believesRole) {
      hints.push(`目標玩家是酒鬼，以為自己是${roleRegistry?.getRoleName(targetPlayer.believesRole)}`);
    }

    return hints;
  };

  // 警告訊息
  const getWarning = () => {
    if (!reliable) {
      if (stateManager?.getPlayer(item.seat)?.role === 'drunk') {
        return {
          message: '⚠️ 此玩家實際上是酒鬼，能力無效',
          recommendation: '推薦：給予在場但錯誤的角色，增加混淆',
        };
      }
      return {
        message: '⚠️ 守鴉人中毒/醉酒，能力不可靠',
        recommendation: '推薦：給予在場但錯誤的角色，避免暴露投毒者',
      };
    }
    return null;
  };

  const warning = getWarning();
  const hints = getHints();

  // 確認處理
  const handleConfirm = () => {
    const roleName = roleRegistry?.getRoleName(selectedRole) || selectedRole;
    const description = `守鴉人得知：${targetPlayer.seat}號 ${targetPlayer.name} 的角色是【${roleName}】`;

    stateManager?.logEvent({
      type: 'ability_use',
      description,
      details: {
        role: 'ravenkeeper',
        ravenkeeperSeat: item.seat,
        targetSeat: targetPlayer.seat,
        targetRole: targetPlayer.role,
        shownRole: selectedRole,
        reliable,
      },
    });

    onDone();
  };

  // 重選目標
  const handleReset = () => {
    setSelectedTarget(null);
    setResult(null);
    setSelectedRole('');
  };

  return (
    <div className="ability-processor">
      {/* 標題 */}
      <div className="ability-header">
        <h3>守鴉人（{item.seat}號 {playerName}）</h3>
        <div className="ability-status">
          能力狀態：{getStatusDisplay()}
        </div>
        <div className="ability-status">
          觸發原因：今晚被殺死
        </div>
        {statusReason && (
          <div className="status-reason" style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25rem' }}>
            {statusReason}
          </div>
        )}
      </div>

      {/* 警告訊息 */}
      {warning && (
        <div className="ability-warning" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#ff6b6b' }}>{warning.message}</div>
          {warning.recommendation && (
            <div style={{ fontSize: '0.9em', color: '#ff6b6b' }}>{warning.recommendation}</div>
          )}
        </div>
      )}

      {/* 查看結果 */}
      <div className="ability-content">
        <div style={{ marginBottom: '1rem' }}>
          <strong>查看目標：</strong>
          <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
            {targetPlayer.seat}號 {targetPlayer.name}（{targetPlayer.roleName}）
            {targetPlayer.isDrunk && targetPlayer.believesRole && (
              <span style={{ color: '#ff6b6b', marginLeft: '0.5rem' }}>
                [酒鬼，以為自己是{roleRegistry?.getRoleName(targetPlayer.believesRole)}]
              </span>
            )}
          </div>
        </div>

        {/* 角色選擇（特殊情況） */}
        {needRoleSelection && selectableRoles.length > 0 && (
          <div className="ability-target" style={{ marginTop: '1rem' }}>
            <label htmlFor="role-select">選擇顯示角色：</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            >
              <option value="">-- 請選擇 --</option>
              {(isRecluse || isSpy) && (
                <option value={targetPlayer.role}>
                  {targetPlayer.roleName}（真實角色）
                </option>
              )}
              {selectableRoles.map(roleId => {
                // 避免重複顯示真實角色
                if (roleId === targetPlayer.role && (isRecluse || isSpy)) {
                  return null;
                }
                return (
                  <option key={roleId} value={roleId}>
                    {roleRegistry?.getRoleName(roleId)}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 提示訊息 */}
        {hints.length > 0 && (
          <div className="ability-hints" style={{ marginTop: '1rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>ℹ️ 提示：</div>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              {hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 按鈕 */}
      <div className="ability-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={needRoleSelection && !selectedRole}
        >
          確認
        </button>
        <button className="btn-secondary" onClick={handleReset}>
          重選目標
        </button>
      </div>
    </div>
  );
}
