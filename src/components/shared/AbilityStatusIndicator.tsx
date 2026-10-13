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
    <div className="flex gap-1.5 mb-3">
      {isDead && <span className="text-2xs px-2 py-0.5 rounded-sm font-bold bg-dead text-neutral-300">已死亡</span>}
      {isPoisoned && <span className="text-2xs px-2 py-0.5 rounded-sm font-bold bg-poisoned text-white">中毒</span>}
      {isDrunk && <span className="text-2xs px-2 py-0.5 rounded-sm font-bold bg-drunk text-white">醉酒</span>}
      {isProtected && <span className="text-2xs px-2 py-0.5 rounded-sm font-bold bg-protected text-white">受保護</span>}
    </div>
  );
}
