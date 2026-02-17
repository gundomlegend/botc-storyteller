/**
 * 送葬者 Processor
 *
 * 單獨實作，不使用 TwoPlayerInfoProcessor
 * UI 結構：顯示處決資訊 + 角色選擇（特殊情況）+ 確認
 */

import { useState, useEffect } from 'react';
import type { NightResult } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import type { UndertakerHandlerInfo } from './shared/types';
import { useGameStore } from '../../store/gameStore';

export default function UndertakerProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager, roleRegistry } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    if (!result) {
      const r = processAbility(item.seat, null);
      setResult(r);
    }
  }, [result, processAbility, item.seat]);

  // 當 result 取得後，設定初始的 selectedRole
  useEffect(() => {
    if (!result) return;
    const info = result.info as UndertakerHandlerInfo | undefined;
    if (!info) return;

    const { executedPlayer, isRecluse, isSpy, selectableRoles, reliable } = info;
    const needRoleSelection = isRecluse || isSpy || !reliable;

    if (needRoleSelection && selectableRoles.length > 0) {
      // 陌客/間諜不預選；不可靠時預選真實角色
      setSelectedRole(isRecluse || isSpy ? '' : executedPlayer.role);
    } else {
      setSelectedRole(executedPlayer.role);
    }
  }, [result]);

  if (!result) {
    return <div className="ability-processor"><p>載入中...</p></div>;
  }

  const info = result.info as UndertakerHandlerInfo | undefined;

  // 如果跳過或沒有資訊，顯示簡單的確認按鈕
  if (result.skip || !info) {
    return (
      <div className="ability-processor">
        <div className="ability-header">
          <h3>送葬者（{item.seat}號 {stateManager?.getPlayer(item.seat)?.name}）</h3>
        </div>

        <div className="ability-content">
          <p>{result.display}</p>
        </div>

        <div className="ability-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={onDone}>
            確認
          </button>
        </div>
      </div>
    );
  }

  const { executedPlayer, isRecluse, isSpy, selectableRoles, reliable, statusReason } = info;

  // 判斷是否需要角色選擇
  const needRoleSelection = isRecluse || isSpy || !reliable;

  // 能力狀態顯示
  const getStatusDisplay = () => {
    if (!reliable) {
      if (executedPlayer.isDrunk && stateManager?.getPlayer(item.seat)?.role === 'drunk') {
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
      hints.push('陌客，可以被認定為邪惡角色');
    } else if (isSpy) {
      hints.push('間諜，可以被認定為善良角色');
    } else if (!reliable) {
      hints.push('能力不可靠，說書人可選擇給錯誤資訊');
    }

    if (executedPlayer.isDrunk && executedPlayer.believesRole) {
      hints.push(`被處決玩家是酒鬼，以為自己是${roleRegistry?.getRoleName(executedPlayer.believesRole)}`);
    }

    return hints;
  };

  // 警告訊息
  const getWarning = () => {
    if (!reliable) {
      if (executedPlayer.isDrunk && stateManager?.getPlayer(item.seat)?.role === 'drunk') {
        return {
          message: '⚠️ 此玩家實際上是酒鬼，能力無效',
          recommendation: '推薦：給予在場但錯誤的角色，增加混淆',
        };
      }
      return {
        message: '⚠️ 送葬者中毒/醉酒，能力不可靠',
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
    const description = `送葬者得知：${executedPlayer.seat}號 ${executedPlayer.name} 的角色是【${roleName}】`;

    stateManager?.logEvent({
      type: 'ability_use',
      description,
      details: {
        role: 'undertaker',
        undertakerSeat: item.seat,
        executedSeat: executedPlayer.seat,
        executedRole: executedPlayer.role,
        shownRole: selectedRole,
        reliable,
      },
    });

    onDone();
  };

  return (
    <div className="ability-processor">
      {/* 標題 */}
      <div className="ability-header">
        <h3>送葬者（{item.seat}號 {stateManager?.getPlayer(item.seat)?.name}）</h3>
        <div className="ability-status" >
          能力狀態：{getStatusDisplay()}
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

      {/* 處決資訊 */}
      <div className="ability-content">
        <div style={{ marginBottom: '1rem' }}>
          <strong>今日處決：</strong>
          <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
            {executedPlayer.seat}號 {executedPlayer.name}（{executedPlayer.roleName}）
            {executedPlayer.isDrunk && executedPlayer.believesRole && (
              <span style={{ color: '#ff6b6b', marginLeft: '0.5rem' }}>
                [酒鬼，以為自己是{roleRegistry?.getRoleName(executedPlayer.believesRole)}]
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
                <option value={executedPlayer.role}>
                  {executedPlayer.roleName}（真實角色）
                </option>
              )}
              {selectableRoles.map(roleId => {
                // 避免重複顯示真實角色
                if (roleId === executedPlayer.role && (isRecluse || isSpy)) {
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
      </div>
    </div>
  );
}
