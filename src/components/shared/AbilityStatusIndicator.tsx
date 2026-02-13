interface AbilityStatusIndicatorProps {
  isDead: boolean;
  isPoisoned: boolean;
  isDrunk: boolean;
  isProtected: boolean;
}

/**
 * 角色能力處理器的統一狀態指示器元件
 * 顯示玩家的即時狀態標籤（已死亡/中毒/醉酒/受保護）
 */
export default function AbilityStatusIndicator({
  isDead,
  isPoisoned,
  isDrunk,
  isProtected,
}: AbilityStatusIndicatorProps) {
  return (
    <div className="ability-status">
      {isDead && <span className="status-tag dead">已死亡</span>}
      {isPoisoned && <span className="status-tag poisoned">中毒</span>}
      {isDrunk && <span className="status-tag drunk">醉酒</span>}
      {isProtected && <span className="status-tag protected">受保護</span>}
    </div>
  );
}
