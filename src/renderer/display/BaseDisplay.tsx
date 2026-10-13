/**
 * Base Display Component - Template Method Pattern
 * 定義通用的 Display 元件結構，所有 Display 階段元件繼承此模板
 */

import React from 'react';

interface BaseDisplayProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Background utilities; defaults to the standard display gradient. */
  background?: string;
}

const DEFAULT_BACKGROUND = 'bg-linear-135/srgb from-surface to-surface-raised';

export function BaseDisplay({ title, children, className = '', background = DEFAULT_BACKGROUND }: BaseDisplayProps) {
  return (
    <div className={`min-h-screen flex flex-col text-white font-display ${background} ${className}`}>
      <header className="text-center py-8 px-4 bg-black/30 border-b-2 border-b-white/10">
        <h1 className="text-8xl m-0 mb-2 font-bold text-shadow-title">Blood on the Clocktower</h1>
        <h2 className="text-6xl m-0 font-normal text-neutral-200">{title}</h2>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">{children}</main>
    </div>
  );
}
