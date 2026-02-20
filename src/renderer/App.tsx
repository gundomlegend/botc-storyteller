import { useGameStore } from '../store/gameStore';
import SetupView from '../components/SetupView';
import NightView from '../components/NightView';
import DayView from '../components/DayView';

function App() {
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
}

export default App;
