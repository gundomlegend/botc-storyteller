/**
 * Base Display Component - Template Method Pattern
 * 定義通用的 Display 元件結構，所有 Display 階段元件繼承此模板
 */

import React from 'react';

interface BaseDisplayProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function BaseDisplay({ title, children, className = '' }: BaseDisplayProps) {
  return (
    <div className={`display-container ${className}`}>
      <header className="display-header">
        <h1>Blood on the Clocktower</h1>
        <h2>{title}</h2>
      </header>
      <main className="display-content">{children}</main>
    </div>
  );
}
