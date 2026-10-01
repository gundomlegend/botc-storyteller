import { t } from '../../engine/locale';
import type { RoleData } from '../../engine/types';

interface AbilityHeaderProps {
  seat: number;
  roleName: string;
  roleData: RoleData | undefined;
  reminder: string;
}

/**
 * 角色能力處理器的統一 Header 元件
 * 顯示座位號、角色名稱、能力描述、提示文字
 */
export default function AbilityHeader({
  seat,
  roleName,
  roleData,
  reminder,
}: AbilityHeaderProps) {
  return (
    <div>
      <h3 className="text-xl font-bold text-primary mb-2">
        {seat}號 — {roleName}
      </h3>
      {roleData && <p className="text-xs text-fg-muted mb-1">{t(roleData, 'ability')}</p>}
      <p className="text-sm text-fg p-2 bg-surface-card rounded-sm mb-3">{reminder}</p>
    </div>
  );
}
