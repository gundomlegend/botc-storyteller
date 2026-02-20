/**
 * Display Factory - Factory Pattern
 * 根據階段動態選擇對應的 Display 元件
 */

import React from 'react';
import { useDisplayStore } from './useDisplayStore';
import { SetupDisplay } from './components/SetupDisplay';
import { NightDisplay } from './components/NightDisplay';
import { DayDisplay } from './components/DayDisplay';
import { GameOverDisplay } from './components/GameOverDisplay';
import { HistoryDisplay } from './components/HistoryDisplay';

type DisplayPhase = 'setup' | 'night' | 'day' | 'game_over' | 'history';

/**
 * Display Factory
 * 集中管理所有階段的 Display 元件
 */
export function DisplayFactory() {
  const store = useDisplayStore();
  const { phase } = store;

  // Factory Pattern: 根據 phase 選擇元件
  switch (phase) {
    case 'setup':
      return <SetupDisplay playerCount={store.playerCount} />;

    case 'night':
      return (
        <NightDisplay
          night={store.night}
          nightAction={store.displayState.nightAction}
        />
      );

    case 'day':
      return (
        <DayDisplay
          day={store.day}
          alivePlayers={store.alivePlayers}
          nomination={store.displayState.nomination}
          voting={store.displayState.voting}
        />
      );

    case 'game_over':
      return (
        <GameOverDisplay
          winner={store.winner}
          gameOverReason={store.gameOverReason}
          players={store.players}
        />
      );

    case 'history':
      return <HistoryDisplay history={store.history} />;

    default:
      // Fallback to setup
      return <SetupDisplay playerCount={0} />;
  }
}
