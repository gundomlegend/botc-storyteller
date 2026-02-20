/**
 * History Display - 遊戲復盤顯示
 */

import React from 'react';
import { BaseDisplay } from '../BaseDisplay';

interface GameEvent {
  type: string;
  description: string;
}

interface HistoryDisplayProps {
  history: GameEvent[];
}

export function HistoryDisplay({ history }: HistoryDisplayProps) {
  return (
    <BaseDisplay title="遊戲復盤" className="history-display">
      <div className="history-content">
        <div className="timeline">
          {history.length === 0 ? (
            <p>尚無歷史記錄</p>
          ) : (
            history.map((event, index) => (
              <div key={index} className="event-item">
                <p className="event-description">{event.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </BaseDisplay>
  );
}
