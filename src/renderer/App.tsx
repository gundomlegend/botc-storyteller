import { useState } from 'react';

type GamePhase = 'setup' | 'day' | 'night';

function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blood on the Clocktower</h1>
        <p className="subtitle">说书人助手</p>
      </header>

      <nav className="phase-nav">
        <button
          className={phase === 'setup' ? 'active' : ''}
          onClick={() => setPhase('setup')}
        >
          游戏设置
        </button>
        <button
          className={phase === 'night' ? 'active' : ''}
          onClick={() => setPhase('night')}
        >
          夜晚阶段
        </button>
        <button
          className={phase === 'day' ? 'active' : ''}
          onClick={() => setPhase('day')}
        >
          白天阶段
        </button>
      </nav>

      <main className="main-content">
        {phase === 'setup' && <SetupPhase />}
        {phase === 'night' && <NightPhase />}
        {phase === 'day' && <DayPhase />}
      </main>
    </div>
  );
}

function SetupPhase() {
  return (
    <section className="phase-panel">
      <h2>游戏设置</h2>
      <p>选择剧本、分配角色、设置玩家人数</p>
      <div className="placeholder">剧本和角色配置区域</div>
    </section>
  );
}

function NightPhase() {
  return (
    <section className="phase-panel">
      <h2>夜晚阶段</h2>
      <p>按顺序唤醒角色，处理夜间行动</p>
      <div className="placeholder">夜间行动顺序列表</div>
    </section>
  );
}

function DayPhase() {
  return (
    <section className="phase-panel">
      <h2>白天阶段</h2>
      <p>管理讨论、提名与投票流程</p>
      <div className="placeholder">投票与处决管理区域</div>
    </section>
  );
}

export default App;
