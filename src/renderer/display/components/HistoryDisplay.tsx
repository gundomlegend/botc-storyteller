/**
 * History Display - 遊戲復盤顯示
 */

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
    <BaseDisplay title="遊戲復盤">
      <div>
        <div className="w-full max-w-200">
          {history.length === 0 ? (
            <p>尚無歷史記錄</p>
          ) : (
            history.map((event, index) => (
              // TODO(tailwind): 0.8rem is off the spacing grid — see Phase 3 batch 3 report
              <div key={index} className="bg-black/30 p-4 rounded-lg border-l-3 border-l-info" style={{ marginBottom: '0.8rem' }}>
                <p className="text-xl m-0">{event.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </BaseDisplay>
  );
}
