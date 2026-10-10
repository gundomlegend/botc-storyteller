import { useGameStore } from '../store/gameStore';
import SetupView from '../components/SetupView';
import NightView from '../components/NightView';
import DayView from '../components/DayView';

function App() {
  const { phase } = useGameStore();

  return (
    <div className="flex flex-col h-screen">
      <header className="text-center p-5 bg-surface-raised border-b-2 border-b-primary">
        <h1 className="text-6xl font-bold text-primary tracking-title">Blood on the Clocktower</h1>
        <p className="text-fg-muted mt-1 text-md">說書人魔典</p>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {phase === 'setup' && <SetupView />}
        {phase === 'night' && <NightView />}
        {phase === 'day' && <DayView />}
      </main>
    </div>
  );
}

export default App;
