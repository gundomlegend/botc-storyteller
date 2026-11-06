import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import AbilityProcessor from './AbilityProcessor';
import MinionDemonRecognition from './MinionDemonRecognition';
import DemonBluffs from './DemonBluffs';
import { Button } from './shared/Button';

const ORDER_TAG = 'text-4xs py-px px-1 rounded-xs';

/** 行動順序按鈕：.special 在舊 CSS 中蓋過 :hover 與 .active 的邊框/文字色，因此特殊階段不加 hover 樣式 */
function orderItemClass(active: boolean, dead: boolean, special: boolean): string {
  const tone = special
    ? `border-warning text-warning ${active ? 'bg-warning/15' : 'bg-transparent'}`
    : active
      ? 'bg-surface-card border-primary text-fg'
      : 'bg-transparent border-border text-fg-muted hover:border-primary hover:text-fg';
  return `flex items-center gap-1.5 py-2 px-2.5 border rounded-md text-xs cursor-pointer text-left transition-all ${tone}${dead ? ' opacity-40' : ''}`;
}

function isSpecialPhase(role: string): boolean {
  return role === '__minion_demon_recognition__' || role === '__demon_bluffs__';
}

export default function NightView() {
  const { night, nightOrder, startDay, setDisplayNightAction, clearDisplayState } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const currentItem = nightOrder[currentIndex] ?? null;

  // Update Display state when currentIndex changes
  useEffect(() => {
    if (!currentItem) {
      setDisplayNightAction(null);
      return;
    }

    if (isSpecialPhase(currentItem.role)) {
      // Special phase components manage their own display state
      return;
    }

    // Regular role: set to 'waking' phase
    setDisplayNightAction({
      index: currentIndex,
      seat: currentItem.seat,
      roleName: currentItem.roleName,
      phase: 'waking',
    });
  }, [currentIndex, currentItem, setDisplayNightAction]);

  const handleDone = () => {
    if (currentIndex < nightOrder.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All done: all sleeping
      setDisplayNightAction(null);
      setAllDone(true);
    }
  };

  const handleSelectItem = (i: number) => {
    setAllDone(false);
    setCurrentIndex(i);
  };

  const handleEndNight = () => {
    setCurrentIndex(0);
    setAllDone(false);
    clearDisplayState(); // Clear all display state when ending night
    startDay();
  };

  const renderCurrentProcessor = () => {
    if (allDone) {
      return (
        <div className="bg-surface-raised rounded-lg p-10 text-center">
          <h3 className="text-xl font-bold text-primary mb-2">所有角色行動完畢</h3>
          <p className="text-fg-muted mb-5">讓所有玩家閉眼，準備進入白天。</p>
          <Button onClick={handleEndNight}>進入白天 →</Button>
        </div>
      );
    }

    if (!currentItem) {
      return <div className="text-fg-muted text-center p-10">沒有需要處理的角色</div>;
    }

    if (currentItem.role === '__minion_demon_recognition__') {
      return <MinionDemonRecognition onComplete={handleDone} />;
    }

    if (currentItem.role === '__demon_bluffs__') {
      return <DemonBluffs onComplete={handleDone} />;
    }

    return (
      <AbilityProcessor
        key={`${currentItem.seat}-${currentIndex}`}
        item={currentItem}
        onDone={handleDone}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-primary">第 {night} 夜</h2>
        <span className="text-fg-muted text-sm">
          {allDone ? '完成' : `${currentIndex + 1} / ${nightOrder.length}`}
        </span>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左側：行動順序清單 */}
        <div className="w-55 overflow-y-auto flex flex-col gap-1 shrink-0">
          {nightOrder.map((item, i) => (
            <button
              key={`${item.seat}-${item.role}`}
              className={orderItemClass(i === currentIndex && !allDone, !!item.isDead, isSpecialPhase(item.role))}
              onClick={() => handleSelectItem(i)}
            >
              <span className="text-fg-muted text-3xs min-w-5">
                {isSpecialPhase(item.role) ? '★' : item.priority}
              </span>
              <span className="flex-1">{item.roleName}</span>
              {!isSpecialPhase(item.role) && (
                <span className="text-fg-muted text-2xs">{item.seat}號</span>
              )}
              {item.isPoisoned && <span className={`${ORDER_TAG} bg-poisoned text-white`}>中毒</span>}
              {item.isDrunk && <span className={`${ORDER_TAG} bg-drunk text-white`}>醉酒</span>}
              {item.isDead && <span className={`${ORDER_TAG} bg-dead text-neutral-400`}>死亡</span>}
            </button>
          ))}
        </div>

        {/* 右側：處理器 */}
        <div className="flex-1 overflow-y-auto">
          {renderCurrentProcessor()}
        </div>
      </div>

      <div className="pt-4 text-right">
        <Button onClick={handleEndNight}>結束夜晚 — 進入白天</Button>
      </div>
    </div>
  );
}
