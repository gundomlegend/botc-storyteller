import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../engine/types';
import { checkVirginAbility, type VirginCheckResult } from '../engine/VirginAbility';
import { checkSaintExecution, type SaintCheckResult } from '../engine/SaintAbility';
import PlayerSelector from './PlayerSelector';

type VirginDialogState =
  | { type: 'none' }
  | { type: 'triggered'; nominator: Player; virgin: Player }
  | { type: 'not_triggered'; nominator: Player; virgin: Player; result: VirginCheckResult }
  | { type: 'spy_choice'; nominator: Player; virgin: Player };

type SaintDialogState =
  | { type: 'none' }
  | { type: 'game_ending'; player: Player; result: SaintCheckResult & { isSaint: true } }
  | { type: 'ability_failed'; player: Player; result: SaintCheckResult & { isSaint: true } };

export default function DayView() {
  const { day, players, alivePlayers, killPlayer, startNight, stateManager, roleRegistry, endGame, gameOver, winner, gameOverReason } = useGameStore();

  const [nominatorSeat, setNominatorSeat] = useState<number | null>(null);
  const [nomineeSeat, setNomineeSeat] = useState<number | null>(null);
  const [votes, setVotes] = useState<Set<number>>(new Set());
  const [showVoting, setShowVoting] = useState(false);
  const [virginDialog, setVirginDialog] = useState<VirginDialogState>({ type: 'none' });
  const [saintDialog, setSaintDialog] = useState<SaintDialogState>({ type: 'none' });

  const nominee = nomineeSeat != null ? players.find((p) => p.seat === nomineeSeat) : null;
  const voteThreshold = Math.ceil(alivePlayers.length / 2);
  const voteCount = votes.size;
  const votePassed = voteCount >= voteThreshold;

  // 管家投票警告：票數照算，但提醒說書人主人是否投票
  // 中毒時能力失效，可自由投票，不顯示警告
  const butler = players.find((p) => p.role === 'butler' && p.isAlive);
  const butlerVoted = butler != null && votes.has(butler.seat);
  const butlerPoisoned = butler != null && butler.isPoisoned;
  const masterSeat = stateManager.getButlerMaster();
  const masterVoted = masterSeat != null && votes.has(masterSeat);

  /**
   * 檢查被提名者是否為貞潔者（或酒鬼以為自己是貞潔者）
   */
  const isVirginNominee = (player: Player): boolean => {
    return player.role === 'virgin'
      || (player.role === 'drunk' && player.believesRole === 'virgin');
  };

  const handleNominate = () => {
    if (nominatorSeat == null || nomineeSeat == null) return;

    const nominator = players.find((p) => p.seat === nominatorSeat);
    const nomineePlayer = players.find((p) => p.seat === nomineeSeat);
    if (!nominator || !nomineePlayer) return;

    // 檢查貞潔者能力
    if (isVirginNominee(nomineePlayer) && nomineePlayer.isAlive) {
      const result = checkVirginAbility(nomineePlayer, nominator);

      if (result.reason === '能力已使用') {
        // 能力已消耗，當作普通提名
        setShowVoting(true);
        setVotes(new Set());
        return;
      }

      // 標記能力已使用
      stateManager.markAbilityUsed(nomineePlayer.seat);

      if (result.triggered) {
        setVirginDialog({ type: 'triggered', nominator, virgin: nomineePlayer });
        return;
      }

      if (result.spyCanRegisterAsTownsfolk) {
        setVirginDialog({ type: 'spy_choice', nominator, virgin: nomineePlayer });
        return;
      }

      // 能力未觸發（非鎮民、中毒/醉酒）
      setVirginDialog({ type: 'not_triggered', nominator, virgin: nomineePlayer, result });
      return;
    }

    // 普通提名
    setShowVoting(true);
    setVotes(new Set());
  };

  /**
   * 貞潔者觸發：處決提名者，進入夜間
   */
  const handleVirginExecute = () => {
    if (virginDialog.type !== 'triggered' && virginDialog.type !== 'spy_choice') return;
    const { nominator, virgin } = virginDialog;

    killPlayer(nominator.seat, 'virgin_ability');

    stateManager.logEvent({
      type: 'ability_use',
      description: `貞潔者能力觸發：${nominator.seat}號 ${nominator.name} 被立即處決`,
      details: {
        role: 'virgin',
        virginSeat: virgin.seat,
        nominatorSeat: nominator.seat,
        nominatorRole: nominator.role,
      },
    });

    setVirginDialog({ type: 'none' });
    resetNomination();
    startNight();
  };

  /**
   * 貞潔者未觸發 / 間諜選擇不觸發：進入投票
   */
  const handleVirginContinueVoting = () => {
    setVirginDialog({ type: 'none' });
    setShowVoting(true);
    setVotes(new Set());
  };

  const toggleVote = (seat: number) => {
    setVotes((prev) => {
      const next = new Set(prev);
      if (next.has(seat)) {
        next.delete(seat);
      } else {
        next.add(seat);
      }
      return next;
    });
  };

  const handleExecute = () => {
    if (nomineeSeat == null) return;
    const nomineePlayer = players.find((p) => p.seat === nomineeSeat);
    if (!nomineePlayer) return;

    // 聖徒檢查
    const saintResult = checkSaintExecution(nomineePlayer);
    if (saintResult.isSaint) {
      setSaintDialog({
        type: saintResult.abilityWorks ? 'game_ending' : 'ability_failed',
        player: nomineePlayer,
        result: saintResult,
      });
      return;
    }

    killPlayer(nomineeSeat, 'execution');
    resetNomination();
  };

  /**
   * 聖徒能力正常 → 處決 + 遊戲結束
   */
  const handleSaintConfirmExecute = () => {
    if (saintDialog.type !== 'game_ending') return;
    const { player } = saintDialog;

    killPlayer(player.seat, 'execution');

    stateManager.logEvent({
      type: 'ability_use',
      description: `聖徒能力觸發：善良陣營落敗`,
      details: { role: 'saint', saintSeat: player.seat },
    });

    endGame('evil', `聖徒（${player.seat}號 ${player.name}）被處決`);

    setSaintDialog({ type: 'none' });
    resetNomination();
  };

  /**
   * 聖徒能力失效 → 正常處決
   */
  const handleSaintExecuteNormal = () => {
    if (saintDialog.type !== 'ability_failed') return;
    const { player } = saintDialog;

    killPlayer(player.seat, 'execution');
    setSaintDialog({ type: 'none' });
    resetNomination();
  };

  /**
   * 取消處決（說書人改變主意）
   */
  const handleSaintCancel = () => {
    setSaintDialog({ type: 'none' });
  };

  const resetNomination = () => {
    setNominatorSeat(null);
    setNomineeSeat(null);
    setVotes(new Set());
    setShowVoting(false);
  };

  return (
    <div className="day-view">
      <h2>第 {day} 天</h2>

      {/* 玩家狀態列表 */}
      <div className="day-players">
        <h3>玩家狀態</h3>
        <div className="player-status-list">
          {players.map((p) => (
            <div
              key={p.seat}
              className={`player-status-row ${!p.isAlive ? 'dead' : ''}`}
            >
              <span className="ps-seat">{p.seat}</span>
              <span className="ps-name">{p.name}</span>
              <span className="ps-role">{roleRegistry.getPlayerRoleName(p)}</span>
              <span className="ps-alive">{p.isAlive ? '存活' : '死亡'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 遊戲結束畫面 */}
      {gameOver && (
        <div style={{
          backgroundColor: winner === 'evil' ? '#f8d7da' : '#d4edda',
          border: `2px solid ${winner === 'evil' ? '#f5c6cb' : '#c3e6cb'}`,
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          <h2>遊戲結束</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: winner === 'evil' ? '#721c24' : '#155724' }}>
            {winner === 'evil' ? '邪惡陣營獲勝！' : '善良陣營獲勝！'}
          </p>
          {gameOverReason && <p style={{ color: '#333' }}>{gameOverReason}</p>}
        </div>
      )}

      {/* 聖徒判定對話框 */}
      {saintDialog.type !== 'none' && (
        <SaintDialog
          state={saintDialog}
          roleRegistry={roleRegistry}
          onConfirmExecute={handleSaintConfirmExecute}
          onExecuteNormal={handleSaintExecuteNormal}
          onCancel={handleSaintCancel}
        />
      )}

      {/* 貞潔者判定對話框 */}
      {virginDialog.type !== 'none' && (
        <VirginDialog
          state={virginDialog}
          roleRegistry={roleRegistry}
          onExecute={handleVirginExecute}
          onContinueVoting={handleVirginContinueVoting}
        />
      )}

      {/* 提名區域 */}
      {!showVoting && !gameOver && virginDialog.type === 'none' && saintDialog.type === 'none' && (
        <div className="day-nomination">
          <h3>提名</h3>
          <div className="nomination-selectors">
            <div className="nomination-group">
              <p>提名者：</p>
              <PlayerSelector
                mode="single"
                onlyAlive={true}
                label="選擇提名者"
                onSelect={(ps: Player[]) => setNominatorSeat(ps[0]?.seat ?? null)}
              />
            </div>
            <div className="nomination-group">
              <p>被提名者：</p>
              <PlayerSelector
                mode="single"
                onlyAlive={false}
                excludePlayers={nominatorSeat != null ? [nominatorSeat] : []}
                label="選擇被提名者"
                onSelect={(ps: Player[]) => setNomineeSeat(ps[0]?.seat ?? null)}
              />
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={nominatorSeat == null || nomineeSeat == null}
            onClick={handleNominate}
          >
            發起投票
          </button>
        </div>
      )}

      {/* 投票區域 */}
      {showVoting && !gameOver && nominee && (
        <div className="day-voting">
          <h3>
            投票 — {nominee.name}（{nominee.seat}號）
          </h3>
          <p>
            需要 {voteThreshold} 票通過（存活 {alivePlayers.length} 人）
          </p>

          <div className="voting-players">
            {alivePlayers.map((p) => (
              <button
                key={p.seat}
                className={`vote-btn ${votes.has(p.seat) ? 'voted' : ''}`}
                onClick={() => toggleVote(p.seat)}
              >
                {p.seat} {p.name}
              </button>
            ))}
          </div>

          <div className="voting-result">
            <span>
              票數：{voteCount} / {voteThreshold}
            </span>
            {votePassed && <span className="vote-passed">通過</span>}
          </div>

          {butlerVoted && !masterVoted && !butlerPoisoned && (
            <div className="voting-warning">
              注意：管家（{butler!.name}）已投票，但主人（{masterSeat}號）尚未投票，此票可能無效
            </div>
          )}

          <div className="voting-actions">
            {votePassed && (
              <button className="btn-danger" onClick={handleExecute}>
                處決 {nominee.name}
              </button>
            )}
            <button className="btn-secondary" onClick={resetNomination}>
              取消
            </button>
          </div>
        </div>
      )}

      {!gameOver && (
        <div className="day-footer">
          <button className="btn-primary" onClick={startNight}>
            進入夜晚
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 貞潔者判定對話框
 */
function VirginDialog({
  state,
  roleRegistry,
  onExecute,
  onContinueVoting,
}: {
  state: Exclude<VirginDialogState, { type: 'none' }>;
  roleRegistry: { getRoleName: (roleId: string) => string; getPlayerRoleName: (player: Player) => string };
  onExecute: () => void;
  onContinueVoting: () => void;
}) {
  const { nominator, virgin } = state;
  const nominatorRoleName = roleRegistry.getRoleName(nominator.role);
  const virginRoleName = virgin.role === 'drunk'
    ? `酒鬼（以為自己是${roleRegistry.getRoleName(virgin.believesRole ?? 'virgin')}）`
    : roleRegistry.getRoleName(virgin.role);

  // 能力觸發
  if (state.type === 'triggered') {
    return (
      <div className="virgin-dialog" style={{
        backgroundColor: '#fff3cd',
        border: '2px solid #ffc107',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#856404' }}>⚡ 貞潔者能力觸發！</h3>
        <p style={{ color: '#000000'}}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
        <p style={{ color: '#000000'}}>提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}）← 鎮民</p>
        <p style={{ fontWeight: 'bold', marginTop: '0.5rem', color: '#ff6b6b' }}>
          → {nominator.seat}號 {nominator.name} 將被立即處決
        </p>
        <p style={{ fontWeight: 'bold', color: '#ff6b6b' }}>→ 直接進入夜間階段</p>
        <div style={{ marginTop: '1rem' }}>
          <button className="btn-danger" onClick={onExecute}>
            確認處決，進入夜間
          </button>
        </div>
      </div>
    );
  }

  // 間諜選擇
  if (state.type === 'spy_choice') {
    return (
      <div className="virgin-dialog" style={{
        backgroundColor: '#e8f4fd',
        border: '2px solid #0d6efd',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#ff6b6b'}}>貞潔者被提名</h3>
        <p style={{ color: '#000000'}}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
        <p style={{ color: '#000000'}}>提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}，能力正常）</p>
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>選擇判定：</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button className="btn-danger" onClick={onExecute}>
              間諜被視為鎮民 → 觸發處決，進入夜間
            </button>
            <button className="btn-secondary" onClick={onContinueVoting}>
              間諜保持爪牙身份 → 不觸發，正常投票
            </button>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.9em', color: '#666' }}>
          ℹ️ 提示：間諜能力正常，可以被認定為善良角色
        </div>
      </div>
    );
  }

  // 能力未觸發
  const { result } = state;
  const isDrunk = virgin.role === 'drunk';
  const isMalfunctioned = result.abilityMalfunctioned;

  return (
    <div className="virgin-dialog" style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
    }}>
      <h3 style={{ color: '#ff6b6b'}}>貞潔者被提名</h3>
      <p style={{ color: '#000000' }}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
      {isMalfunctioned && (
        <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
          {isDrunk ? '🍺 實際上是酒鬼（無能力）' : '⚠️ 中毒（能力失效）'}
        </p>
      )}
      {!isDrunk && (
        <p style={{ color: '#000000'}}>提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}）
          {nominator.team !== 'townsfolk' ? '← 非鎮民' : '← 鎮民'}
        </p>
      )}
      <p style={{ marginTop: '0.5rem', color: '#ff6b6b' }}>
        → 能力未觸發，正常進入投票（貞潔者能力已消耗）
      </p>
      <div style={{ marginTop: '1rem' }}>
        <button className="btn-primary" onClick={onContinueVoting}>
          確認，進入投票
        </button>
      </div>
    </div>
  );
}

/**
 * 聖徒判定對話框
 */
function SaintDialog({
  state,
  roleRegistry,
  onConfirmExecute,
  onExecuteNormal,
  onCancel,
}: {
  state: Exclude<SaintDialogState, { type: 'none' }>;
  roleRegistry: { getRoleName: (roleId: string) => string; getPlayerRoleName: (player: Player) => string };
  onConfirmExecute: () => void;
  onExecuteNormal: () => void;
  onCancel: () => void;
}) {
  const { player, result } = state;
  const roleName = player.role === 'drunk'
    ? `酒鬼（以為自己是${roleRegistry.getRoleName(player.believesRole ?? 'saint')}）`
    : roleRegistry.getRoleName(player.role);

  // 能力正常 → 處決將導致善良落敗
  if (state.type === 'game_ending') {
    return (
      <div className="saint-dialog" style={{
        backgroundColor: '#f8d7da',
        border: '2px solid #f5c6cb',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#721c24' }}>⚠️ 即將處決聖徒！</h3>
        <p style={{ color: '#000000' }}>{player.seat}號 {player.name}（{roleName}）即將被處決</p>
        <p style={{ color: '#000000' }}>能力狀態：✅ 能力正常</p>
        <p style={{ fontWeight: 'bold', marginTop: '0.5rem', color: '#721c24' }}>
          → 若處決聖徒，善良陣營立即落敗！
        </p>
        <p style={{ fontWeight: 'bold', color: '#721c24' }}>
          → 邪惡陣營獲勝，遊戲結束
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn-danger" onClick={onConfirmExecute}>
            確認處決 → 邪惡獲勝
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    );
  }

  // 能力失效（中毒/酒鬼）
  const isDrunk = player.role === 'drunk';

  return (
    <div className="saint-dialog" style={{
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
    }}>
      <h3 style={{ color: '#856404' }}>
        {isDrunk ? '「聖徒」即將被處決' : '即將處決聖徒'}
      </h3>
      <p style={{ color: '#000000' }}>{player.seat}號 {player.name}（{roleName}）即將被處決</p>
      <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
        {isDrunk ? '🍺 實際上是酒鬼（無能力）' : `⚠️ ${result.reason}`}
      </p>
      <p style={{ marginTop: '0.5rem', color: '#000000' }}>
        → {isDrunk ? '無聖徒能力，正常處決' : '聖徒中毒，處決不會導致善良陣營落敗'}
      </p>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn-primary" onClick={onExecuteNormal}>
          確認處決
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
