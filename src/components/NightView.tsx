import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import AbilityProcessor from './AbilityProcessor';
import MinionDemonRecognition from './MinionDemonRecognition';
import DemonBluffs from './DemonBluffs';

function isSpecialPhase(role: string): boolean {
  return role === '__minion_demon_recognition__' || role === '__demon_bluffs__';
}

export default function NightView() {
  const { night, nightOrder, startDay } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = nightOrder[currentIndex] ?? null;

  const handleDone = () => {
    if (currentIndex < nightOrder.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleEndNight = () => {
    setCurrentIndex(0);
    startDay();
  };

  const renderCurrentProcessor = () => {
    if (!currentItem) {
      return <div className="night-empty">沒有需要處理的角色</div>;
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
    <div className="night-view">
      <div className="night-header">
        <h2>第 {night} 夜</h2>
        <span className="night-progress">
          {currentIndex + 1} / {nightOrder.length}
        </span>
      </div>

      <div className="night-layout">
        {/* 左側：行動順序清單 */}
        <div className="night-order-list">
          {nightOrder.map((item, i) => (
            <button
              key={`${item.seat}-${item.role}`}
              className={[
                'night-order-item',
                i === currentIndex ? 'active' : '',
                item.isDead ? 'dead' : '',
                isSpecialPhase(item.role) ? 'special' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setCurrentIndex(i)}
            >
              <span className="order-priority">
                {isSpecialPhase(item.role) ? '★' : item.priority}
              </span>
              <span className="order-role">{item.roleName}</span>
              {!isSpecialPhase(item.role) && (
                <span className="order-seat">{item.seat}號</span>
              )}
              {item.isPoisoned && <span className="order-tag poisoned">中毒</span>}
              {item.isDrunk && <span className="order-tag drunk">醉酒</span>}
              {item.isDead && <span className="order-tag dead">死亡</span>}
            </button>
          ))}
        </div>

        {/* 右側：處理器 */}
        <div className="night-processor">
          {renderCurrentProcessor()}
        </div>
      </div>

      <div className="night-footer">
        <button className="btn-primary" onClick={handleEndNight}>
          結束夜晚 — 進入白天
        </button>
      </div>
    </div>
  );
}
