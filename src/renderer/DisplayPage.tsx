/**
 * Display Page - Display 視窗主頁面
 * 使用 Factory Pattern 動態渲染不同階段的 Display 元件
 */

import { DisplayFactory } from './display/DisplayFactory';

function DisplayPage() {
  return (
    <div className="app display-app">
      <DisplayFactory />
    </div>
  );
}

export default DisplayPage;
