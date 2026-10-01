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

/** 按鈕列 */
export function AbilityActions({ children }: ChildrenProps) {
  return <div className="flex gap-2 mt-3">{children}</div>;
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
  gesture: 'mt-2 text-lg font-bold text-primary',
  reasoning: 'mt-1.5 text-fg-muted text-xs',
  warning: 'mt-1.5 text-danger-hover font-bold text-sm',
  hint: 'mt-1.5 text-success text-xs',
};

/** 結果下方的補充說明 */
export function ResultNote({ tone, children }: ChildrenProps & { tone: NoteTone }) {
  return <div className={NOTE_TONES[tone]}>{children}</div>;
}
