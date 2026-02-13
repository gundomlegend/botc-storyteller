import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { NightOrderItem, NightResult, Player } from '../engine/types';
import { ROLE_PROCESSORS } from './roleProcessors';
import PlayerSelector from './PlayerSelector';
import AbilityHeader from './shared/AbilityHeader';
import AbilityStatusIndicator from './shared/AbilityStatusIndicator';
import { usePlayerRealTimeStatus } from '../hooks/usePlayerRealTimeStatus';
import { MayorBounceUI } from './mayorBounce';

interface AbilityProcessorProps {
  item: NightOrderItem;
  onDone: () => void;
}

/** 需要玩家選擇目標的角色（其餘角色為資訊型，不需選擇） */
const ROLES_NEEDING_TARGET = new Set(['monk', 'poisoner', 'imp', 'butler']);

export default function AbilityProcessor({ item, onDone }: AbilityProcessorProps) {
  // 註冊表路由：有專屬處理器的角色委託給該處理器
  const CustomProcessor = ROLE_PROCESSORS[item.role];
  if (CustomProcessor) {
    return <CustomProcessor item={item} onDone={onDone} />;
  }

  // ─── 以下為通用流程 ───
  const { processAbility, stateManager } = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [result, setResult] = useState<NightResult | null>(null);

  const roleData = stateManager.getRoleData(item.role);
  const needsTarget = ROLES_NEEDING_TARGET.has(item.role);

  // 讀取玩家即時狀態
  const { isPoisoned, isDrunk, isProtected, isDead } = usePlayerRealTimeStatus(item);

  const handleProcess = () => {
    const r = processAbility(item.seat, selectedTarget);
    setResult(r);
  };

  const handleReset = () => {
    setSelectedTarget(null);
    setResult(null);
  };

  const handleConfirm = () => {
    // effectNullified: 中毒/醉酒導致效果不落地，跳過狀態變更
    if (result?.effectNullified) {
      onDone();
      return;
    }

    // 根據結果執行狀態變更
    if (result?.action === 'set_master' && selectedTarget != null) {
      useGameStore.getState().setButlerMaster(selectedTarget);
    } else if (result?.action === 'add_protection' && selectedTarget != null) {
      useGameStore.getState().addStatus(selectedTarget, 'protected', item.seat);
    } else if (result?.action === 'add_poison' && selectedTarget != null) {
      useGameStore.getState().addStatus(selectedTarget, 'poisoned', item.seat);
    } else if (
      result?.action === 'kill' &&
      result.info &&
      typeof result.info === 'object' &&
      !(result.info as Record<string, unknown>).blocked
    ) {
      const killInfo = result.info as Record<string, unknown>;

      if (killInfo.starPass) {
        // Star Pass：Imp 自殺 → 爪牙繼承
        useGameStore.getState().killPlayer(item.seat, 'demon_kill');
        if (typeof killInfo.newDemonSeat === 'number') {
          useGameStore.getState().stateManager.replaceRole(killInfo.newDemonSeat as number, 'imp');
          useGameStore.getState()._refresh();
        }
      } else if (selectedTarget != null) {
        useGameStore.getState().killPlayer(selectedTarget, 'demon_kill');
      }
    }
    onDone();
  };

  const isTargetReady = !needsTarget || selectedTarget != null;

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

      {/* 還沒有結果：選擇目標（或直接執行） */}
      {!result && (
        <>
          {needsTarget && (
            <div className="ability-target">
              <p>選擇目標玩家：</p>
              <PlayerSelector
                mode="single"
                canSelectSelf={item.role === 'imp' || item.role === 'poisoner'}
                onlyAlive={true}
                currentPlayerSeat={item.seat}
                excludePlayers={item.role === 'monk' || item.role === 'butler' ? [item.seat] : []}
                onSelect={(players: Player[]) => setSelectedTarget(players[0]?.seat ?? null)}
              />
            </div>
          )}
          <div className="ability-actions">
            <button
              className="btn-primary"
              onClick={handleProcess}
              disabled={!isTargetReady}
            >
              執行能力
            </button>
            <button className="btn-secondary" onClick={onDone}>
              跳過
            </button>
          </div>
        </>
      )}

      {/* 鎮長轉移 UI（特殊結果類型） */}
      {result && result.action === 'mayor_bounce' && (
        <MayorBounceUI result={result} item={item} onDone={onDone} />
      )}

      {/* 一般結果顯示 */}
      {result && result.action !== 'mayor_bounce' && (
        <div className="ability-result">
          <div className="result-display">{result.display}</div>

          {result.gesture && result.gesture !== 'none' && (
            <div className="result-gesture">
              建議手勢：{result.gesture === 'nod' ? '點頭（善良）' : '搖頭（邪惡）'}
            </div>
          )}

          {result.reasoning && (
            <div className="result-reasoning">{result.reasoning}</div>
          )}

          {result.effectNullified && (
            <div className="result-warning">效果已無效化（中毒/醉酒），不會實際生效</div>
          )}

          {result.mustFollow && (
            <div className="result-warning">必須遵守此結果</div>
          )}

          {result.canLie && (
            <div className="result-hint">說書人可自行決定是否給不同資訊</div>
          )}

          <div className="ability-actions">
            <button className="btn-primary" onClick={handleConfirm}>
              確認
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              重選
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
