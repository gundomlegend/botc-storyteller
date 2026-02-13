import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { t } from '../../engine/locale';
import type { NightResult } from '../../engine/types';
import type { RoleProcessorProps } from './index';

export default function EmpathProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, stateManager } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [toldEvilCount, setToldEvilCount] = useState<string>('');

  const roleData = stateManager.getRoleData(item.role);

  // 从 stateManager 讀及時狀態
  const currentPlayer = stateManager.getPlayer(item.seat);
  const isPoisoned = currentPlayer?.isPoisoned ?? item.isPoisoned;
  const isDrunk = currentPlayer?.isDrunk ?? item.isDrunk;
  const isProtected = currentPlayer?.isProtected ?? item.isProtected;
  const isDead = currentPlayer ? !currentPlayer.isAlive : item.isDead;
  const isPoisonedOrDrunk = isPoisoned || isDrunk;

  // 自動執行能力（共情者不需要選擇目標）
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
        setToldEvilCount(String(info.actualEvilCount ?? 0));
      }
      // 中毒/醉酒：不預填（保持空字串）
    }
  }, [result, isPoisonedOrDrunk]);

  const handleConfirm = () => {
    if (toldEvilCount === '') return;

    const info = result?.info as Record<string, unknown> | undefined;
    const actualEvilCount = (info?.actualEvilCount as number) ?? 0;
    const toldNumber = parseInt(toldEvilCount, 10);
    const storytellerOverride = actualEvilCount !== toldNumber;

    stateManager.logEvent({
      type: 'ability_use',
      description: `共情者資訊：說書人告知 ${toldNumber} 位相鄰邪惡玩家${storytellerOverride ? ` (實際: ${actualEvilCount})` : ''}`,
      details: {
        actualEvilCount,
        toldEvilCount: toldNumber,
        isPoisoned,
        isDrunk,
        storytellerOverride,
        leftNeighbor: info?.leftNeighbor,
        rightNeighbor: info?.rightNeighbor,
        recluseSeats: info?.recluseSeats,
        spySeats: info?.spySeats,
      },
    });
    onDone();
  };

  const info = result?.info as Record<string, unknown> | undefined;
  const actualEvilCount = (info?.actualEvilCount as number) ?? 0;

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
                ℹ️ 共情者已{isPoisoned && isDrunk ? '中毒且醉酒' : isPoisoned ? '中毒' : '醉酒'}，你可以提示 0-2 的數字。
                <br />
                <strong>ℹ️ 相鄰的邪惡玩家：{actualEvilCount} 位（你可以選擇說謊）</strong>
              </div>
            )}

            {isPoisonedOrDrunk && <div style={{ marginTop: '1rem' }}>
              <label htmlFor="empath-number">
                <strong>告訴共情者的數字 (建議範圍: 0-2)：</strong>
              </label>
              <input
                id="empath-number"
                type="number"
                min="0"
                max="2"
                value={toldEvilCount}
                onChange={(e) => setToldEvilCount(e.target.value)}
                placeholder={isPoisonedOrDrunk ? '請輸入數字' : String(actualEvilCount)}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  width: '100px',
                }}
              />
              <span style={{ marginLeft: '0.5rem' }}>位</span>
            </div>}

            {toldEvilCount !== '' && parseInt(toldEvilCount, 10) !== actualEvilCount && (
              <div className="result-warning" style={{ marginTop: '1rem' }}>
                ⚠️ 注意：你將告訴共情者不同於實際的數字（說謊）
              </div>
            )}
          </div>

          <div className="ability-actions">
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={toldEvilCount === '' || isNaN(parseInt(toldEvilCount, 10))}
            >
              確認
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
