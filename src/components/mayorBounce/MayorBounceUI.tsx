import type { NightOrderItem, NightResult } from '../../engine/types';
import PlayerSelector from '../PlayerSelector';
import { useMayorBounce } from './useMayorBounce';

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
    <div className="mt-3">
      <div className="bg-surface-card p-3 rounded-md whitespace-pre-line text-sm leading-normal">{result.display}</div>

      {/* 未確認階段：選擇處理方式 */}
      {!confirmed && (
        <div className="mt-6">
          <h4 className="font-bold">🎯 選擇處理方式</h4>
          <div className="mb-3">
            <p className="text-fg-muted mb-2 text-sm">轉移給其他角色（不包含惡魔）：</p>
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
          </div>
          <div className="flex gap-2 mt-3">
            <button
              className="btn-primary"
              onClick={handleConfirmTransfer}
              disabled={target === null || target === -1}
            >
              確認轉移
            </button>
            <button className="btn-secondary" onClick={handleNoTransfer}>
              不轉移 - 鎮長死亡
            </button>
          </div>
        </div>
      )}

      {/* 已確認階段：顯示最終決定 */}
      {confirmed && (
        <div className="mt-6">
          {/* 不轉移：鎮長死亡 */}
          {target === -1 && (
            <>
              <div className="bg-surface-card p-3 rounded-md whitespace-pre-line text-sm leading-normal">
                ✅ 確認：鎮長 {mayorSeat}號 ({mayorName}) 被小惡魔擊殺
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary" onClick={executeNoTransfer}>
                  確認
                </button>
                <button className="btn-secondary" onClick={handleReset}>
                  重選
                </button>
              </div>
            </>
          )}

          {/* 轉移：目標玩家死亡 */}
          {target !== null && target !== -1 && (
            <>
              <div className="bg-surface-card p-3 rounded-md whitespace-pre-line text-sm leading-normal">
                ✅ 確認轉移：{target}號 {stateManager.getPlayer(target)?.name ?? ''} 被擊殺
                <br />
                <small>（原目標：鎮長 {mayorSeat}號）</small>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary" onClick={() => executeTransfer(target)}>
                  確認
                </button>
                <button className="btn-secondary" onClick={handleReset}>
                  重選
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
