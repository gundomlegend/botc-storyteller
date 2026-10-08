import type { ReactNode } from 'react';

/**
 * 角色能力處理器的共用版面元件
 * （取代 .ability-processor / .ability-target / .ability-actions / .ability-result / .result-*）
 */

interface ChildrenProps {
  children?: ReactNode;
}

/** 能力處理器外框 */
export function AbilityPanel({ children }: ChildrenProps) {
  return <div className="bg-surface-raised rounded-lg p-4">{children}</div>;
}

/** 目標選擇區塊 */
export function AbilityTarget({ children }: ChildrenProps) {
  return <div className="mb-3">{children}</div>;
}

/** 目標選擇區塊內的說明文字 */
export function TargetLabel({ children }: ChildrenProps) {
  return <p className="text-fg-muted mb-2 text-sm">{children}</p>;
}

/** 按鈕列；`margin` 取代預設的上邊距 */
export function AbilityActions({ margin = 'mt-3', children }: ChildrenProps & { margin?: string }) {
  return <div className={`flex gap-2 ${margin}`}>{children}</div>;
}

/** 結果區塊 */
export function AbilityResult({ children }: ChildrenProps) {
  return <div className="mt-3">{children}</div>;
}

/** 結果文字框 */
export function ResultDisplay({ children }: ChildrenProps) {
  return (
    <div className="bg-surface-card p-3 rounded-md whitespace-pre-line text-sm leading-normal">{children}</div>
  );
}

type NoteTone = 'gesture' | 'reasoning' | 'warning' | 'hint';

const NOTE_TONES: Record<NoteTone, string> = {
  gesture: 'text-lg font-bold text-primary',
  reasoning: 'text-fg-muted text-xs',
  warning: 'text-danger-hover font-bold text-sm',
  hint: 'text-success text-xs',
};

const NOTE_MARGINS: Record<NoteTone, string> = {
  gesture: 'mt-2',
  reasoning: 'mt-1.5',
  warning: 'mt-1.5',
  hint: 'mt-1.5',
};

/** 結果下方的補充說明；`margin` 取代預設的上邊距（避免兩個 mt-* 互相衝突） */
export function ResultNote({ tone, margin, children }: ChildrenProps & { tone: NoteTone; margin?: string }) {
  return <div className={`${margin ?? NOTE_MARGINS[tone]} ${NOTE_TONES[tone]}`}>{children}</div>;
}

/** 自訂處理器標題（與 AbilityHeader 的標題同樣式） */
export function ProcessorTitle({ children }: ChildrenProps) {
  return <h3 className="text-xl font-bold text-primary mb-2">{children}</h3>;
}

/** 標題下方的狀態列 */
export function StatusLine({ children }: ChildrenProps) {
  return <div className="flex gap-1.5 mb-3">{children}</div>;
}

/** 狀態原因（小字） */
export function StatusReason({ children }: ChildrenProps) {
  return <div className="text-sm text-neutral-600 mt-1">{children}</div>;
}

/** 黃底警告框 */
export function WarningBox({ message, recommendation }: { message: ReactNode; recommendation?: ReactNode }) {
  return (
    <div className="bg-alert-warning-surface border border-alert-warning-border p-3 rounded-sm mb-4">
      <div className="font-bold mb-2 text-danger-soft">{message}</div>
      {recommendation && <div className="text-sm text-danger-soft">{recommendation}</div>}
    </div>
  );
}

/** 提示清單 */
export function HintList({ hints }: { hints: ReactNode[] }) {
  return (
    <div className="mt-4">
      <div className="font-bold mb-2">ℹ️ 提示：</div>
      <ul className="list-disc ml-6 mt-2">
        {hints.map((hint, index) => (
          <li key={index}>{hint}</li>
        ))}
      </ul>
    </div>
  );
}
