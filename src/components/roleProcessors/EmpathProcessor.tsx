import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult } from '../../engine/types';
import type { RoleProcessorProps } from './index';
import AbilityHeader from '../shared/AbilityHeader';
import AbilityStatusIndicator from '../shared/AbilityStatusIndicator';
import { usePlayerRealTimeStatus } from '../../hooks/usePlayerRealTimeStatus';
import { AbilityPanel, AbilityActions, AbilityResult, ResultDisplay, ResultNote } from '../shared/AbilityPanel';
import { Button } from '../shared/Button';

export default function EmpathProcessor({ item, onDone }: RoleProcessorProps) {
  const { processAbility, roleRegistry, stateManager } = useGameStore();
  const [result, setResult] = useState<NightResult | null>(null);
  const [toldEvilCount, setToldEvilCount] = useState<string>('');

  const roleData = roleRegistry.getRoleData(item.role);

  // 讀取玩家即時狀態
  const { isPoisoned, isDrunk, isProtected, isDead } = usePlayerRealTimeStatus(item);
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
      // 一律預填實際數字；中毒/醉酒時說書人可在輸入框改成其他數字
      setToldEvilCount(String(info.actualEvilCount ?? 0));
    }
  }, [result]);

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

      {/* 顯示結果 */}
      {result && (
        <AbilityResult>
          <ResultDisplay>{result.display}</ResultDisplay>

          <div>
            {isPoisonedOrDrunk && (
              <ResultNote tone="warning">
                ℹ️ 共情者已{isPoisoned && isDrunk ? '中毒且醉酒' : isPoisoned ? '中毒' : '醉酒'}，你可以提示 0-2 的數字。
                <br />
                <strong>ℹ️ 相鄰的邪惡玩家：{actualEvilCount} 位（你可以選擇說謊）</strong>
              </ResultNote>
            )}

            {isPoisonedOrDrunk && <div className="mt-4">
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
                className="ml-2 p-2 text-base w-25"
              />
              <span className="ml-2">位</span>
            </div>}

            {toldEvilCount !== '' && parseInt(toldEvilCount, 10) !== actualEvilCount && (
              <ResultNote tone="warning" margin="mt-4">
                ⚠️ 注意：你將告訴共情者不同於實際的數字（說謊）
              </ResultNote>
            )}
          </div>

          <AbilityActions>
            <Button onClick={handleConfirm} disabled={toldEvilCount === '' || isNaN(parseInt(toldEvilCount, 10))}>
              確認
            </Button>
            <Button variant="secondary" onClick={onDone}>
              跳過
            </Button>
          </AbilityActions>
        </AbilityResult>
      )}

      {/* 載入中 */}
      {!result && (
        <AbilityResult>
          <p>計算中...</p>
        </AbilityResult>
      )}
    </AbilityPanel>
  );
}
