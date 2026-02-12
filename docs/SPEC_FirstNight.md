# 第一夜特殊流程 UI 組件規格

## 組件 1: MinionDemonRecognition

### 功能
顯示爪牙與惡魔互認階段的說書人引導。

### 組件結構
```typescript
interface MinionDemonRecognitionProps {
  onComplete: () => void;
}

export function MinionDemonRecognition({ onComplete }: Props) {
  const { gameState } = useGameStore();
  const minions = gameState.getMinionPlayers();
  const demon = gameState.getDemonPlayer();
  
  if (minions.length === 0) {
    // 沒有爪牙，自動跳過
    useEffect(() => {
      onComplete();
    }, []);
    return null;
  }
  
  return (
    <div className="first-night-special">
      <h2>爪牙與惡魔互認</h2>
      
      <div className="instruction">
        <p>請讓以下玩家睜眼：</p>
        <ul>
          {minions.map(m => (
            <li key={m.seat}>
              {m.seat}號 - {m.role}
            </li>
          ))}
          {demon && (
            <li>{demon.seat}號 - {demon.role} (惡魔)</li>
          )}
        </ul>
        
        <p>讓他們互相確認身份。</p>
        <p>確認完畢後，讓他們閉眼。</p>
      </div>
      
      <button onClick={onComplete}>完成</button>
    </div>
  );
}
```

---

## 組件 2: DemonBluffs

### 功能
顯示惡魔虛張聲勢階段的說書人引導。

### 組件結構
```typescript
interface DemonBluffsProps {
  onComplete: () => void;
}

export function DemonBluffs({ onComplete }: Props) {
  const { gameState } = useGameStore();
  const demon = gameState.getDemonPlayer();
  const [bluffs, setBluffs] = useState<string[]>([]);
  
  useEffect(() => {
    // 生成虛張聲勢
    const generated = gameState.generateDemonBluffs();
    setBluffs(generated);
  }, []);
  
  if (!demon) {
    useEffect(() => {
      onComplete();
    }, []);
    return null;
  }
  
  return (
    <div className="first-night-special">
      <h2>惡魔虛張聲勢</h2>
      
      <div className="instruction">
        <p>讓 {demon.seat}號 (惡魔) 睜眼</p>
        
        <p>展示以下三個角色標記：</p>
        <div className="bluff-tokens">
          {bluffs.map(roleId => {
            const roleData = gameState.getRoleData(roleId);
            return (
              <div key={roleId} className="token">
                <div className="token-icon">{roleData?.name_cn}</div>
                <div className="token-name">{roleData?.name}</div>
              </div>
            );
          })}
        </div>
        
        <p>這些是未被分配的角色，惡魔可以宣稱是這些角色。</p>
        <p>讓惡魔閉眼。</p>
      </div>
      
      <button onClick={onComplete}>完成</button>
    </div>
  );
}
```

---

## 整合到 NightView

在 `NightView.tsx` 中處理特殊階段：
```typescript
function NightView() {
  const nightOrder = gameState.generateNightOrder(isFirstNight);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentItem = nightOrder[currentIndex];
  
  // 渲染當前項目
  const renderCurrentProcessor = () => {
    // 特殊階段
    if (currentItem.role === '__minion_demon_recognition__') {
      return (
        <MinionDemonRecognition 
          onComplete={() => setCurrentIndex(currentIndex + 1)}
        />
      );
    }
    
    if (currentItem.role === '__demon_bluffs__') {
      return (
        <DemonBluffs 
          onComplete={() => setCurrentIndex(currentIndex + 1)}
        />
      );
    }
    
    // 正常角色處理
    // AbilityProcessor 內部查詢 ROLE_PROCESSORS 註冊表：
    // - 占卜師等複雜角色 → 路由至專屬 UI 處理器（如 FortunetellerProcessor）
    // - 其他角色 → 走 AbilityProcessor 通用流程
    return (
      <AbilityProcessor
        item={currentItem}
        onDone={() => setCurrentIndex(currentIndex + 1)}
      />
    );
  };
  
  return (
    <div className="night-view">
      <div className="night-order-list">
        {nightOrder.map((item, index) => (
          <div 
            key={index}
            className={index === currentIndex ? 'active' : ''}
          >
            {item.roleName}
          </div>
        ))}
      </div>
      
      <div className="processor">
        {renderCurrentProcessor()}
      </div>
    </div>
  );
}
```