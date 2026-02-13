import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { NightOrderItem, NightResult, Player } from '../engine/types';
import { ROLE_PROCESSORS } from './roleProcessors';
import PlayerSelector from './PlayerSelector';
import AbilityHeader from './shared/AbilityHeader';
import AbilityStatusIndicator from './shared/AbilityStatusIndicator';
import { usePlayerRealTimeStatus } from '../hooks/usePlayerRealTimeStatus';

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

  // 鎮長轉移決策狀態
  const [mayorBounceDecision, setMayorBounceDecision] = useState<'keep' | 'bounce' | null>(null);
  const [mayorBounceTarget, setMayorBounceTarget] = useState<number | null>(null);

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

      {/* 顯示結果 */}
      {result && result.action === 'mayor_bounce' && (
        <div className="ability-result">
          <div className="result-display">{result.display}</div>

          {/* 鎮長轉移 UI */}
          {mayorBounceDecision === null && (
            <div className="storyteller-choice" style={{ marginTop: '1.5rem' }}>
              <div className="ability-actions">
                <button
                  className="btn-primary"
                  onClick={() => setMayorBounceDecision('keep')}
                  style={{ flex: 1 }}
                >
                  不轉移 → 鎮長死亡
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setMayorBounceDecision('bounce')}
                  style={{ flex: 1 }}
                >
                  轉移死亡 → 選擇目標
                </button>
              </div>
            </div>
          )}

          {/* 不轉移：擊殺鎮長 */}
          {mayorBounceDecision === 'keep' && (() => {
            const info = result.info as Record<string, unknown>;
            const mayorSeat = info.mayorSeat as number;
            const mayorName = info.mayorName as string;
            useGameStore.getState().killPlayer(mayorSeat, 'demon_kill');
            stateManager.logEvent({
              type: 'ability_use',
              description: `鎮長 ${mayorSeat}號 (${mayorName}) 被小惡魔擊殺（說書人選擇不轉移）`,
              details: { mayorSeat, mayorName, bounced: false },
            });
            onDone();
            return null;
          })()}

          {/* 轉移：選擇目標 */}
          {mayorBounceDecision === 'bounce' && mayorBounceTarget === null && (
            <div style={{ marginTop: '1rem' }}>
              <h4>🎯 選擇轉移目標</h4>
              <p>鎮長的死亡將轉移給選定的玩家（不包含惡魔）</p>
              <div className="ability-target">
                <PlayerSelector
                  mode="single"
                  canSelectSelf={false}
                  onlyAlive={true}
                  currentPlayerSeat={item.seat}
                  excludePlayers={[(result.info as Record<string, unknown>).mayorSeat as number]}
                  onSelect={(players) => setMayorBounceTarget(players[0]?.seat ?? null)}
                />
              </div>
              <div className="ability-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (mayorBounceTarget !== null) {
                      const info = result.info as Record<string, unknown>;
                      const mayorSeat = info.mayorSeat as number;
                      const mayorName = info.mayorName as string;
                      useGameStore.getState().killPlayer(mayorBounceTarget, 'demon_kill');
                      const target = stateManager.getPlayer(mayorBounceTarget);
                      stateManager.logEvent({
                        type: 'ability_use',
                        description: `鎮長轉移死亡：${mayorBounceTarget}號 ${target?.name ?? ''} 被擊殺（原目標：鎮長 ${mayorSeat}號）`,
                        details: {
                          mayorSeat,
                          mayorName,
                          bounced: true,
                          bouncedTo: mayorBounceTarget,
                          bouncedToName: target?.name,
                          bouncedToRole: target?.role,
                        },
                      });
                      onDone();
                    }
                  }}
                  disabled={mayorBounceTarget === null}
                >
                  確認轉移
                </button>
                <button className="btn-secondary" onClick={() => setMayorBounceDecision(null)}>
                  返回
                </button>
              </div>
            </div>
          )}
        </div>
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
