/**
 * Display Page - Display 視窗主頁面
 * 使用 Factory Pattern 動態渲染不同階段的 Display 元件
 */

import { DisplayFactory } from './display/DisplayFactory';
import './styles/display.css';

function DisplayPage() {
  try {
    return (
      <div className="app display-app">
        <DisplayFactory />
      </div>
    );
  } catch (error) {
    console.error('DisplayPage render error:', error);
    return (
      <div className="app display-app" style={{ padding: '2rem', color: 'white', background: '#1a1a2e' }}>
        <h1>Display 視窗初始化錯誤</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default DisplayPage;
