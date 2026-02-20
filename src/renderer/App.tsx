import { useGameStore } from '../store/gameStore';
import SetupView from '../components/SetupView';
import NightView from '../components/NightView';
import DayView from '../components/DayView';

function App() {
  try {
    const { phase } = useGameStore();

    return (
      <div className="app">
        <header className="app-header">
          <h1>Blood on the Clocktower</h1>
          <p className="subtitle">說書人魔典</p>
        </header>

        <main className="main-content">
          {phase === 'setup' && <SetupView />}
          {phase === 'night' && <NightView />}
          {phase === 'day' && <DayView />}
        </main>
      </div>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div className="app" style={{ padding: '2rem' }}>
        <h1>應用初始化錯誤</h1>
        <pre style={{ background: '#f0f0f0', padding: '1rem', overflow: 'auto' }}>
          {String(error)}
        </pre>
        <p>請檢查瀏覽器 Console 獲取更多資訊</p>
      </div>
    );
  }
}

export default App;
