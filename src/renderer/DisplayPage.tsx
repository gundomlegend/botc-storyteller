import { useGameStore } from '../store/gameStore';

function DisplayPage() {
  const { phase, night, day, alivePlayers, players } = useGameStore();

  return (
    <div className="app display-app">
      <header className="app-header">
        <h1>Blood on the Clocktower</h1>
        <p className="subtitle">城鎮公告</p>
      </header>

      <main className="display-main">
        {phase === 'setup' && (
          <div className="display-phase">
            <h2>等待遊戲開始</h2>
          </div>
        )}

        {phase === 'night' && (
          <div className="display-phase night">
            <h2>第 {night} 夜</h2>
            <p>夜晚降臨，請閉上眼睛...</p>
          </div>
        )}

        {phase === 'day' && (
          <div className="display-phase day">
            <h2>第 {day} 天</h2>
            <p>
              存活玩家：{alivePlayers.length} / {players.length}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default DisplayPage;
