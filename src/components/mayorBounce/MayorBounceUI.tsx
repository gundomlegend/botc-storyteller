import type { NightOrderItem, NightResult } from '../../engine/types';
import PlayerSelector from '../PlayerSelector';
import { useMayorBounce } from './useMayorBounce';
import { Button } from '../shared/Button';
import { AbilityTarget, TargetLabel, AbilityActions, AbilityResult, ResultDisplay } from '../shared/AbilityPanel';

interface MayorBounceUIProps {
  result: NightResult;
  item: NightOrderItem;
  onDone: () => void;
}

/**
 * 鎮長死亡轉移 UI 元件
 * 處理鎮長被惡魔攻擊時的死亡轉移決策介面
 */
export default function MayorBounceUI({ result, item, onDone }: MayorBounceUIProps) {
  const {
    target,
    confirmed,
    mayorSeat,
    mayorName,
    handleTargetSelect,
    handleNoTransfer,
    handleConfirmTransfer,
    handleReset,
    executeNoTransfer,
    executeTransfer,
    stateManager,
  } = useMayorBounce(result, onDone);

  return (
    <AbilityResult>
      <ResultDisplay>{result.display}</ResultDisplay>

      {/* 未確認階段：選擇處理方式 */}
      {!confirmed && (
        <div className="mt-6">
          <h4 className="font-bold">🎯 選擇處理方式</h4>
          <AbilityTarget>
            <TargetLabel>轉移給其他角色（不包含惡魔）：</TargetLabel>
            <PlayerSelector
              mode="single"
              canSelectSelf={false}
              onlyAlive={true}
              showUsers={false}
              showRoles={true}
              currentPlayerSeat={item.seat}
              excludePlayers={[mayorSeat]}
              onSelect={handleTargetSelect}
            />
          </AbilityTarget>
          <AbilityActions>
            <Button
              onClick={handleConfirmTransfer}
              disabled={target === null || target === -1}
            >
              確認轉移
            </Button>
            <Button variant="secondary" onClick={handleNoTransfer}>
              不轉移 - 鎮長死亡
            </Button>
          </AbilityActions>
        </div>
      )}

      {/* 已確認階段：顯示最終決定 */}
      {confirmed && (
        <div className="mt-6">
          {/* 不轉移：鎮長死亡 */}
          {target === -1 && (
            <>
              <ResultDisplay>
                ✅ 確認：鎮長 {mayorSeat}號 ({mayorName}) 被小惡魔擊殺
              </ResultDisplay>
              <AbilityActions>
                <Button onClick={executeNoTransfer}>
                  確認
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  重選
                </Button>
              </AbilityActions>
            </>
          )}

          {/* 轉移：目標玩家死亡 */}
          {target !== null && target !== -1 && (
            <>
              <ResultDisplay>
                ✅ 確認轉移：{target}號 {stateManager.getPlayer(target)?.name ?? ''} 被擊殺
                <br />
                <small>（原目標：鎮長 {mayorSeat}號）</small>
              </ResultDisplay>
              <AbilityActions>
                <Button onClick={() => executeTransfer(target)}>
                  確認
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  重選
                </Button>
              </AbilityActions>
            </>
          )}
        </div>
      )}
    </AbilityResult>
  );
}
