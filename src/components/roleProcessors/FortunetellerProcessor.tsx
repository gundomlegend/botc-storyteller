import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult, Player } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import PlayerSelector from '../PlayerSelector';
import AbilityHeader from '../shared/AbilityHeader';
import AbilityStatusIndicator from '../shared/AbilityStatusIndicator';
import { usePlayerRealTimeStatus } from '../../hooks/usePlayerRealTimeStatus';

export default function FortunetellerProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, roleRegistry, stateManager } = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [selectedSecondTarget, setSelectedSecondTarget] = useState<number | null>(null);
  const [result, setResult] = useState<NightResult | null>(null);
  const [storytellerAnswer, setStorytellerAnswer] = useState<boolean | null>(null);
  const [redHerringSet, setRedHerringSet] = useState(false);

  const roleData = roleRegistry.getRoleData(item.role);
  const isFirstNight = stateManager.getState().night === 1;
  const needsRedHerring = isFirstNight && stateManager.getRedHerring() === null && !redHerringSet;

  // 讀取玩家即時狀態
  const { isPoisoned, isDrunk, isProtected, isDead } = usePlayerRealTimeStatus(item);
  const isPoisonedOrDrunk = isPoisoned || isDrunk;

  // 當結果出來，根據中毒狀態設定預設答案
  useEffect(() => {
    if (result?.action === 'tell_alignment' && result.info && typeof result.info === 'object') {
      const info = result.info as Record<string, unknown>;
      if (isPoisonedOrDrunk) {
        setStorytellerAnswer(null); // 中毒/醉酒不預選
      } else {
        setStorytellerAnswer(info.rawDetection as boolean);
      }
    }
  }, [result, isPoisonedOrDrunk]);

  const handleRedHerringSelect = (player: Player) => {
    stateManager.setRedHerring(player.seat);
    useGameStore.getState()._refresh();
    setRedHerringSet(true);
  };

  const handleProcess = () => {
    const r = processAbility(item.seat, selectedTarget, selectedSecondTarget);
    setResult(r);
  };

  const handleReset = () => {
    setSelectedTarget(null);
    setSelectedSecondTarget(null);
    setResult(null);
    setStorytellerAnswer(null);
  };

  const handleConfirm = () => {
    if (storytellerAnswer === null) return;
    const info = result?.info as Record<string, unknown> | undefined;
    stateManager.logEvent({
      type: 'ability_use',
      description: `占卜師查驗結果：說書人回答${storytellerAnswer ? '有惡魔' : '無惡魔'}`,
      details: { answer: storytellerAnswer, rawDetection: info?.rawDetection },
    });
    onDone();
  };

  const isTargetReady = selectedTarget != null && selectedSecondTarget != null;

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

      {/* 第一晚：干擾項選擇 */}
      {needsRedHerring && (
        <div className="ability-target">
          <p>設定干擾項：選擇一位善良角色作為占卜師的干擾項</p>
          <p className="ability-reminder" style={{ color: '#ffffff' }}>
            想讓邪惡贏就選「資訊多或發言好的角色」；想讓遊戲簡單點就選「身分透明的好人」。
          </p>
          <div className="player-selector">
            <div className="player-container layout-grid">
              {stateManager.getAllPlayers()
                .filter((p) => {
                  if (p.team === 'minion' || p.team === 'demon') return false;
                  if (stateManager.getState().playerCount > 6 && p.seat === item.seat) return false;
                  return true;
                })
                .map((p) => {
                  const roleName = roleRegistry.getPlayerRoleName(p);
                  return (
                    <div
                      key={p.seat}
                      className="player-card selectable"
                      onClick={() => handleRedHerringSelect(p)}
                    >
                      <span style={{ fontWeight: 'bold' }}>{roleName}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 雙目標選擇 */}
      {!result && !needsRedHerring && (
        <>
          <div className="ability-target">
            {selectedTarget == null ? (
              <>
                <p>選擇第一位查驗玩家：</p>
                <PlayerSelector
                  mode="single"
                  canSelectSelf={false}
                  onlyAlive={true}
                  currentPlayerSeat={item.seat}
                  excludePlayers={[]}
                  onSelect={(players: Player[]) => setSelectedTarget(players[0]?.seat ?? null)}
                />
              </>
            ) : selectedSecondTarget == null ? (
              <>
                <p>已選擇 {selectedTarget}號，選擇第二位查驗玩家：</p>
                <PlayerSelector
                  mode="single"
                  canSelectSelf={false}
                  onlyAlive={true}
                  currentPlayerSeat={item.seat}
                  excludePlayers={[selectedTarget]}
                  onSelect={(players: Player[]) => setSelectedSecondTarget(players[0]?.seat ?? null)}
                />
              </>
            ) : (
              <p>已選擇 {selectedTarget}號 和 {selectedSecondTarget}號</p>
            )}
          </div>
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

      {/* 顯示結果 + 說書人選擇 */}
      {result && (
        <div className="ability-result">
          <div className="result-display">{result.display}</div>

          <div className="storyteller-choice">
            {isPoisonedOrDrunk && (
              <div className="result-warning">
                該占卜師已{isPoisoned && isDrunk ? '中毒且醉酒' : isPoisoned ? '中毒' : '醉酒'}，說書人可以任意回答。
              </div>
            )}
            <p>說書人選擇回答：</p>
            <label className="radio-option">
              <input
                type="radio"
                name="ft-answer"
                checked={storytellerAnswer === true}
                onChange={() => setStorytellerAnswer(true)}
              />
              有惡魔（點頭）
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="ft-answer"
                checked={storytellerAnswer === false}
                onChange={() => setStorytellerAnswer(false)}
              />
              無惡魔（搖頭）
            </label>
          </div>

          <div className="ability-actions">
            <button className="btn-primary" onClick={handleConfirm} disabled={storytellerAnswer === null}>
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
