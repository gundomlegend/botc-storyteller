import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { t } from '../../engine/locale';
import type { NightResult } from '../../engine/types';
import type { RoleProcessorProps } from './index';

export default function ChefProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [toldPairCount, setToldPairCount] = useState<string>('');

  const roleData = stateManager.getRoleData(item.role);

  // 從 stateManager 讀即時狀態
  const currentPlayer = stateManager.getPlayer(item.seat);
  const isPoisoned = currentPlayer?.isPoisoned ?? item.isPoisoned;
  const isDrunk = currentPlayer?.isDrunk ?? item.isDrunk;
  const isProtected = currentPlayer?.isProtected ?? item.isProtected;
  const isDead = currentPlayer ? !currentPlayer.isAlive : item.isDead;
  const isPoisonedOrDrunk = isPoisoned || isDrunk;

  // 自動執行能力（廚師不需選擇目標）
  useEffect(() => {
    if (!result) {
      const r = processAbility(item.seat, null);
      setResult(r);
    }
  }, [result, processAbility, item.seat]);

  // 根據狀態預填數字
  useEffect(() => {
    if (result?.action === 'tell_number' && result.info && typeof result.info === 'object') {
      const info = result.info as Record<string, unknown>;
      if (!isPoisonedOrDrunk) {
        // 正常狀態：預填實際數字
        setToldPairCount(String(info.actualPairCount ?? 0));
      }
      // 中毒/醉酒：不預填（保持空字串）
    }
  }, [result, isPoisonedOrDrunk]);

  const handleConfirm = () => {
    if (toldPairCount === '') return;

    const info = result?.info as Record<string, unknown> | undefined;
    const actualPairCount = (info?.actualPairCount as number) ?? 0;
    const toldNumber = parseInt(toldPairCount, 10);
    const storytellerOverride = actualPairCount !== toldNumber;

    stateManager.logEvent({
      type: 'ability_use',
      description: `廚師資訊：說書人告知 ${toldNumber} 組相鄰邪惡配對${storytellerOverride ? ` (實際: ${actualPairCount})` : ''}`,
      details: {
        actualPairCount,
        toldPairCount: toldNumber,
        isPoisoned,
        isDrunk,
        storytellerOverride,
        segments: info?.segments,
        pairDetails: info?.pairDetails,
        recluseSeats: info?.recluseSeats,
        spySeats: info?.spySeats,
      },
    });
    onDone();
  };

  const handleReset = () => {
    setResult(null);
    setToldPairCount('');
  };

  const info = result?.info as Record<string, unknown> | undefined;
  const actualPairCount = (info?.actualPairCount as number) ?? 0;
  const evilSeats = (info?.evilSeats as number[]) ?? [];
  const maxPossiblePairs = Math.max(0, evilSeats.length - 1);

  return (
    <div className="ability-processor">
      {/* Header */}
      <div className="ability-header">
        <h3>
          {item.seat}號 — {item.roleName}
        </h3>
        {roleData && <p className="ability-desc">{t(roleData, 'ability')}</p>}
        <p className="ability-reminder">{item.reminder}</p>
      </div>

      {/* 狀態警告 */}
      <div className="ability-status">
        {isDead && <span className="status-tag dead">已死亡</span>}
        {isPoisoned && <span className="status-tag poisoned">中毒</span>}
        {isDrunk && <span className="status-tag drunk">醉酒</span>}
        {isProtected && <span className="status-tag protected">受保護</span>}
      </div>

      {/* 顯示結果 */}
      {result && (
        <div className="ability-result">
          <div className="result-display">{result.display}</div>

          <div className="storyteller-choice">
            {isPoisonedOrDrunk && (
              <div className="result-warning">
                ⚠️ 廚師已{isPoisoned && isDrunk ? '中毒且醉酒' : isPoisoned ? '中毒' : '醉酒'}，你可以告訴玩家任意數字。
                <br />
                <strong>🍽 相鄰的邪惡客人：{actualPairCount} 組（你可以選擇撒謊）</strong>
              </div>
            )}

            {isPoisonedOrDrunk && <div style={{ marginTop: '1rem' }}>
              <label htmlFor="chef-number">
                <strong>告訴廚師的數字 (建議範圍: 0-{maxPossiblePairs})：</strong>
              </label>
              <input
                id="chef-number"
                type="number"
                min="0"
                max={maxPossiblePairs}
                value={toldPairCount}
                onChange={(e) => setToldPairCount(e.target.value)}
                placeholder={isPoisonedOrDrunk ? '請輸入數字' : String(actualPairCount)}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  width: '100px',
                }}
              />
              <span style={{ marginLeft: '0.5rem' }}>組</span>
            </div>}

            {toldPairCount !== '' && parseInt(toldPairCount, 10) !== actualPairCount && (
              <div className="result-warning" style={{ marginTop: '1rem' }}>
                ⚠️ 注意：你將告訴廚師不同於實際的數字（撒謊）
              </div>
            )}
          </div>

          <div className="ability-actions">
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={toldPairCount === '' || isNaN(parseInt(toldPairCount, 10))}
            >
              確認
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              重新計算
            </button>
            <button className="btn-secondary" onClick={onDone}>
              跳過
            </button>
          </div>
        </div>
      )}

      {/* 載入中 */}
      {!result && (
        <div className="ability-result">
          <p>計算中...</p>
        </div>
      )}
    </div>
  );
}
