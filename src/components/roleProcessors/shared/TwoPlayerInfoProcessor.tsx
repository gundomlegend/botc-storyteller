/**
 * 通用雙玩家資訊處理器
 *
 * Template Method Pattern：
 * - 定義 UI 流程骨架（模板方法）
 * - 透過配置函數（策略）自訂各步驟行為
 *
 * 適用角色：圖書管理員、調查員等第一晚獲取「兩名玩家+角色」資訊的角色
 */

import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { NightResult } from '../../../engine/types';
import type { RoleProcessorProps } from '../index';
import AbilityHeader from '../../shared/AbilityHeader';
import AbilityStatusIndicator from '../../shared/AbilityStatusIndicator';
import DrunkRoleIndicator from '../../shared/DrunkRoleIndicator';
import { usePlayerRealTimeStatus } from '../../../hooks/usePlayerRealTimeStatus';
import rolesData from '../../../data/roles/trouble-brewing.json';
import type { ProcessorContext, RoleProcessorConfig, TargetPlayerInfo, SpecialPlayerInfo } from './types';
import { AbilityPanel, AbilityActions, AbilityResult, ResultDisplay, ResultNote } from '../../shared/AbilityPanel';
import { Button } from '../../shared/Button';

/**
 * 格式化玩家選項文字（包含座號、名稱、角色、狀態圖示）
 */
function formatPlayerOption(player: any, roleRegistry: any): string {
  const statusIcons = [];
  if (player.isPoisoned) statusIcons.push('🧪');
  if (player.isDrunk) statusIcons.push('🍺');
  if (player.isProtected) statusIcons.push('🛡️');
  const statusStr = statusIcons.length > 0 ? ` ${statusIcons.join('')}` : '';
  return `${player.seat}號 - ${player.name} - ${roleRegistry.getPlayerRoleName(player)}${statusStr}`;
}

export interface TwoPlayerInfoProcessorProps<THandlerInfo = unknown> extends RoleProcessorProps {
  config: RoleProcessorConfig<THandlerInfo>;
}

/**
 * 通用雙玩家資訊處理器元件（泛型版本）
 *
 * Template Method Pattern 實作：
 * 1. 獲取資料（process Handler）
 * 2. 建立上下文（context）
 * 3. 執行配置策略（preselection, hints, warnings）
 * 4. 渲染 UI（固定結構，動態內容）
 *
 * @template THandlerInfo - Handler 返回的 info 型別
 */
export default function TwoPlayerInfoProcessor<THandlerInfo = unknown>({
  item,
  onDone,
  config,
}: TwoPlayerInfoProcessorProps<THandlerInfo>) {
  const { processAbility, stateManager, roleRegistry } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPlayer1, setSelectedPlayer1] = useState<number | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<number | null>(null);

  const roleData = roleRegistry.getRoleData(item.role);

  // 根據目標陣營過濾角色列表
  const targetRoles = useMemo(() => {
    return rolesData.filter(role => role.team === config.targetTeam);
  }, [config.targetTeam]);

  // 檢查是否為酒鬼角色
  const player = stateManager.getPlayer(item.seat);
  const isDrunkRole = player?.role === 'drunk' && player?.believesRole != null;

  // 讀取玩家即時狀態
  const { isPoisoned, isDrunk, isProtected, isDead } = usePlayerRealTimeStatus(item);
  const isReliable = !isPoisoned && !isDrunk && !isDrunkRole;

  // ============================================================
  // Step 1: 執行能力獲取 Handler 結果
  // ============================================================
  useEffect(() => {
    const r = processAbility(item.seat, null);
    setResult(r);
  }, [processAbility, item.seat]);

  // ============================================================
  // Step 2: 建立上下文（提供給配置函數使用）
  // ============================================================
  const context: ProcessorContext<THandlerInfo> = useMemo(() => {
    if (!result) {
      return {} as ProcessorContext<THandlerInfo>; // 暫時返回空上下文
    }
    return {
      result: result as NightResult<THandlerInfo>,
      isReliable,
      isDrunkRole,
      isPoisoned,
      isDrunk,
      stateManager,
      roleRegistry,
      currentPlayerSeat: item.seat,
    };
  }, [result, isReliable, isDrunkRole, isPoisoned, isDrunk, stateManager, roleRegistry, item.seat]);

  // ============================================================
  // Step 3: 執行配置策略 - 預選邏輯
  // ============================================================
  useEffect(() => {
    if (!result || !context.result || !config.getPreselection) return;

    const preselection = config.getPreselection(context);

    if (preselection.role) {
      setSelectedRole(preselection.role);
    }
    if (preselection.player1 !== null) {
      setSelectedPlayer1(preselection.player1);
    }
    if (preselection.player2 !== null) {
      setSelectedPlayer2(preselection.player2);
    }
  }, [result, context, config]);

  // ============================================================
  // Step 4: 事件處理器
  // ============================================================
  const handleConfirm = () => {
    const description = config.getConfirmEventDescription?.(
      context,
      selectedRole,
      selectedPlayer1!,
      selectedPlayer2!
    ) || `${item.roleName}資訊：展示${selectedRole}，指向${selectedPlayer1}號和${selectedPlayer2}號`;

    stateManager.logEvent({
      type: 'ability_use',
      description,
      details: {
        role: selectedRole,
        player1: selectedPlayer1,
        player2: selectedPlayer2,
      },
    });
    onDone();
  };

  const handleNoTarget = () => {
    const description = config.getNoTargetEventDescription?.(context) ||
      `${item.roleName}資訊：告知場上沒有目標`;

    stateManager.logEvent({
      type: 'ability_use',
      description,
      details: {
        noTarget: true,
      },
    });
    onDone();
  };

  // ============================================================
  // 載入中狀態
  // ============================================================
  if (!result) {
    return (
      <AbilityPanel>
        <AbilityHeader
          seat={item.seat}
          roleName={item.roleName}
          roleData={roleData}
          reminder={item.reminder}
        />
        <p>載入中...</p>
      </AbilityPanel>
    );
  }

  // 使用型別斷言來處理不同 Handler Info 的聯合型別
  type HandlerInfoUnion = { noOutsiderInGame?: boolean; noMinionInGame?: boolean; onlySpyInGame?: boolean };
  const info = result.info as THandlerInfo & HandlerInfoUnion;

  // ============================================================
  // 特殊情況：無目標（無外來者/無爪牙）
  // ============================================================
  if (info?.noOutsiderInGame || info?.noMinionInGame) {
    return (
      <AbilityPanel>
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
        <AbilityResult>
          <ResultDisplay>
            {config.targetTeam === 'outsider' ? '場上沒有任何外來者角色' : '場上沒有任何爪牙角色'}
          </ResultDisplay>
          <AbilityActions>
            <Button onClick={onDone}>確認</Button>
          </AbilityActions>
        </AbilityResult>
      </AbilityPanel>
    );
  }

  // ============================================================
  // Step 5: 執行配置策略 - 取得動態內容
  // ============================================================
  const targets = config.getTargets(context);
  const specialPlayers = config.getSpecialPlayers(context);

  const unreliableWarning = config.getUnreliableWarning?.(context);
  const hints = config.getHints?.(context) || [];
  const shouldShowNoTargetButton = config.shouldShowNoTargetButton?.(context) || false;
  const targetListLabel = config.getTargetListLabel?.(context) || '場上目標';
  const suspectedListLabel = config.getSuspectedListLabel?.(context) || '可疑目標';
  const noTargetButtonText = config.getNoTargetButtonText?.(context) || '給予「無目標」資訊';
  const targetRole = config.getTargetRoleLabel?.(context) || '目標';

  const isSelectionComplete = selectedRole !== '' && selectedPlayer1 !== null && selectedPlayer2 !== null;

  const onlySpyInGame = info?.onlySpyInGame ?? false;

  // ============================================================
  // Step 6: 渲染 UI（Template Method - 固定結構）
  // ============================================================
  return (
    <AbilityPanel>
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

      {/* 不可靠警告（Strategy） */}
      {unreliableWarning && (
        <ResultNote tone="warning" margin="mt-1.5 mb-4">
          ℹ️ {unreliableWarning.message}
          {unreliableWarning.recommendation && (
            <>
              <br />
              <small>{unreliableWarning.recommendation}</small>
            </>
          )}
        </ResultNote>
      )}

      {/* 顯示目標列表 */}
      {targets.length > 0 && (
        <div className="mb-4 p-2 bg-neutral-100 rounded-sm">
          <strong className="text-danger-soft">{targetListLabel}：</strong>
          <ul className="list-disc my-2 mx-0 pl-6">
            {targets.map((t: TargetPlayerInfo) => (
              <li className="text-danger-soft" key={t.seat}>
                {t.seat}號 - {t.name} - {t.roleName}
                {t.role === 'recluse' && config.targetTeam === 'outsider' && <span className="text-danger-soft"> [可不視為外來者]</span>}
                {t.role === 'spy' && config.targetTeam === 'minion' && <span className="text-danger-soft"> [可不視為爪牙]</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 顯示特殊玩家列表（間諜等） */}
      {specialPlayers.length > 0 && (
        <div className="mb-4 p-2 bg-alert-warning-surface rounded-sm">
          <strong className="text-danger-soft">{suspectedListLabel}：</strong>
          <ul className="list-disc my-2 mx-0 pl-6">
            {specialPlayers.map((sp: SpecialPlayerInfo) => (
              <li className="text-danger-soft" key={sp.seat}>
                {sp.seat}號 - {sp.name} - {sp.roleName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 提示訊息（Strategy） */}
      {hints.length > 0 && hints.map((hint: string, index: number) => (
        <ResultNote
          key={index}
          tone="hint"
          margin={`mt-1.5 ${index === hints.length - 1 ? 'mb-4' : 'mb-2'}`}
          className={onlySpyInGame ? 'p-2 bg-alert-info-surface-alt rounded-sm' : 'p-0 bg-transparent rounded-none'}
        >
          ℹ️ {onlySpyInGame && <strong>只有間諜在場</strong>} {hint}
        </ResultNote>
      ))}

      {/* 選擇角色 */}
      <div className="mb-3">
        <label htmlFor="role-select">選擇展示的{targetRole}角色：</label>
        <select
          id="role-select"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full p-2 mt-2"
        >
          <option value="">-- 請選擇 --</option>
          {targetRoles.map((role: any) => (
            <option key={role.id} value={role.id}>
              {roleRegistry.getRoleName(role.id)}
              {!targets.some((t: TargetPlayerInfo) => t.role === role.id) && !specialPlayers.some((sp: SpecialPlayerInfo) => sp.role === role.id) && ' (不在場)'}
            </option>
          ))}
        </select>
      </div>

      {/* 選擇兩位玩家 */}
      <div className="mt-4 mb-3">
        <label htmlFor="player1-select">選擇第一位玩家（該角色）：</label>
        <select
          id="player1-select"
          value={selectedPlayer1 ?? ''}
          onChange={(e) => setSelectedPlayer1(e.target.value ? Number(e.target.value) : null)}
          className="w-full p-2 mt-2"
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => config.includeSelfInPlayerList === true || p.seat !== item.seat)
            .map(p => (
              <option key={p.seat} value={p.seat}>
                {formatPlayerOption(p, roleRegistry)}
              </option>
            ))}
        </select>
      </div>

      <div className="mt-4 mb-3">
        <label htmlFor="player2-select">選擇第二位玩家（非該角色）：</label>
        <select
          id="player2-select"
          value={selectedPlayer2 ?? ''}
          onChange={(e) => setSelectedPlayer2(e.target.value ? Number(e.target.value) : null)}
          className="w-full p-2 mt-2"
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== selectedPlayer1)
            .map(p => (
              <option key={p.seat} value={p.seat}>
                {formatPlayerOption(p, roleRegistry)}
              </option>
            ))}
        </select>
      </div>

      {/* 確認按鈕 */}
      <AbilityActions margin="mt-4">
        <Button onClick={handleConfirm} disabled={!isSelectionComplete}>
          確認
        </Button>

        {/* 給予「無目標」資訊按鈕（Strategy） */}
        {shouldShowNoTargetButton && (
          <Button variant="secondary" onClick={handleNoTarget}>
            {noTargetButtonText}
          </Button>
        )}
      </AbilityActions>
    </AbilityPanel>
  );
}
