import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../engine/types';
import { checkVirginAbility, type VirginCheckResult } from '../engine/VirginAbility';
import { checkSaintExecution, type SaintCheckResult } from '../engine/SaintAbility';
import PlayerSelector from './PlayerSelector';
import { DawnAnnouncement } from './DawnAnnouncement';
import { ExecutionPhase } from './ExecutionPhase';
import { SlayerPanel } from './SlayerPanel';

// ── Local state types ──────────────────────────────────────

type VirginDialogState =
  | { type: 'none' }
  | { type: 'triggered'; nominator: Player; virgin: Player }
  | { type: 'not_triggered'; nominator: Player; virgin: Player; result: VirginCheckResult }
  | { type: 'spy_choice'; nominator: Player; virgin: Player };

type SaintDialogState =
  | { type: 'none' }
  | { type: 'game_ending'; player: Player; result: SaintCheckResult & { isSaint: true } }
  | { type: 'ability_failed'; player: Player; result: SaintCheckResult & { isSaint: true } };

interface NominationRecord {
  nominatorSeat: number;
  nomineeSeat: number;
  voteCount: number;
  passed: boolean;
}

// Max nominations per day (rule: 4)
const MAX_NOMINATIONS_PER_DAY = 4;

export default function DayView() {
  const {
    day, night, players, alivePlayers,
    killPlayer, useDeathVote, startNight,
    stateManager, roleRegistry,
    endGame, gameOver, winner, gameOverReason,
    setDisplayNomination, setDisplayVoting,
  } = useGameStore();

  // ── Per-nomination state ──────────────────────────────────
  const [nominatorSeat, setNominatorSeat] = useState<number | null>(null);
  const [nomineeSeat, setNomineeSeat] = useState<number | null>(null);
  const [votes, setVotes] = useState<Set<number>>(new Set());
  const [showVoting, setShowVoting] = useState(false);

  // ── Per-day nomination tracking (B2, B3, B5) ─────────────
  const [nominatedThisDay, setNominatedThisDay] = useState<Set<number>>(new Set());
  const [nominatedTargetsThisDay, setNominatedTargetsThisDay] = useState<Set<number>>(new Set());
  const [nominationCountToday, setNominationCountToday] = useState(0);
  const [nominationHistory, setNominationHistory] = useState<NominationRecord[]>([]);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [inExecutionPhase, setInExecutionPhase] = useState(false);
  const [hasExecutedToday, setHasExecutedToday] = useState(false);
  const [showSlayerPanel, setShowSlayerPanel] = useState(false);

  // ── Dawn announcement (B1) ────────────────────────────────
  const [dawnDismissed, setDawnDismissed] = useState(false);
  const dawnDeaths = players.filter((p) => !p.isAlive && p.deathNight === night);

  // ── Dialog state ──────────────────────────────────────────
  const [virginDialog, setVirginDialog] = useState<VirginDialogState>({ type: 'none' });
  const [saintDialog, setSaintDialog] = useState<SaintDialogState>({ type: 'none' });

  // ── Derived ───────────────────────────────────────────────
  const nominee = nomineeSeat != null ? players.find((p) => p.seat === nomineeSeat) : null;
  const voteThreshold = Math.ceil(alivePlayers.length / 2);
  const voteCount = votes.size;
  const votePassed = voteCount >= voteThreshold;

  // Butler warning
  const butler = players.find((p) => p.role === 'butler' && p.isAlive);
  const butlerVoted = butler != null && votes.has(butler.seat);
  const butlerPoisoned = butler != null && butler.isPoisoned;
  const masterSeat = stateManager.getButlerMaster();
  const masterVoted = masterSeat != null && votes.has(masterSeat);

  // Nomination limits (B2)
  const canNominate = nominationCountToday < MAX_NOMINATIONS_PER_DAY;
  const nominatorAlreadyNominated = nominatorSeat != null && nominatedThisDay.has(nominatorSeat);
  const nomineeAlreadyTargeted = nomineeSeat != null && nominatedTargetsThisDay.has(nomineeSeat);
  const nominateDisabled =
    nominatorSeat == null || nomineeSeat == null ||
    !canNominate || nominatorAlreadyNominated || nomineeAlreadyTargeted;

  // ── Helpers ───────────────────────────────────────────────

  const isVirginNominee = (player: Player): boolean =>
    player.role === 'virgin' || (player.role === 'drunk' && player.believesRole === 'virgin');

  const recordNomination = (nominatorSeat_: number, nomineeSeat_: number) => {
    setNominatedThisDay((prev) => new Set(prev).add(nominatorSeat_));
    setNominatedTargetsThisDay((prev) => new Set(prev).add(nomineeSeat_));
    setNominationCountToday((prev) => prev + 1);
  };

  /**
   * After voting completes — record result and check for execution phase triggers.
   */
  const recordVoteResult = (nominatorSeat_: number, nomineeSeat_: number, voteCount_: number, passed: boolean) => {
    const record: NominationRecord = { nominatorSeat: nominatorSeat_, nomineeSeat: nomineeSeat_, voteCount: voteCount_, passed };

    setNominationHistory((prev) => {
      const next = [...prev, record];

      // Check triggers: 4 nominations or 2 consecutive fails
      const newCountToday = next.length;
      const newConsecFails = passed ? 0 : consecutiveFails + 1;

      if (newCountToday >= MAX_NOMINATIONS_PER_DAY || newConsecFails >= 2) {
        setInExecutionPhase(true);
      }

      return next;
    });

    if (!passed) {
      setConsecutiveFails((prev) => {
        const next = prev + 1;
        if (next >= 2) setInExecutionPhase(true);
        return next;
      });
    } else {
      setConsecutiveFails(0);
    }
  };

  // ── Nomination flow ───────────────────────────────────────

  const handleNominate = () => {
    if (nominatorSeat == null || nomineeSeat == null) return;

    const nominator = players.find((p) => p.seat === nominatorSeat);
    const nomineePlayer = players.find((p) => p.seat === nomineeSeat);
    if (!nominator || !nomineePlayer) return;

    // Record nomination counters
    recordNomination(nominatorSeat, nomineeSeat);

    // Update Display
    setDisplayNomination({
      nominatorName: `${nominator.name} (${nominator.seat}號)`,
      nomineeName: `${nomineePlayer.name} (${nomineePlayer.seat}號)`,
    });

    // Virgin check
    if (isVirginNominee(nomineePlayer) && nomineePlayer.isAlive) {
      const result = checkVirginAbility(nomineePlayer, nominator);

      if (result.reason === '能力已使用') {
        setShowVoting(true);
        setVotes(new Set());
        startVoting(nomineePlayer);
        return;
      }

      stateManager.markAbilityUsed(nomineePlayer.seat);

      if (result.triggered) {
        setVirginDialog({ type: 'triggered', nominator, virgin: nomineePlayer });
        return;
      }

      if (result.spyCanRegisterAsTownsfolk) {
        setVirginDialog({ type: 'spy_choice', nominator, virgin: nomineePlayer });
        return;
      }

      setVirginDialog({ type: 'not_triggered', nominator, virgin: nomineePlayer, result });
      return;
    }

    setShowVoting(true);
    setVotes(new Set());
    startVoting(nomineePlayer);
  };

  const startVoting = (nomineePlayer: Player) => {
    setDisplayVoting({
      nomineeName: `${nomineePlayer.name} (${nomineePlayer.seat}號)`,
      voteCount: 0,
      threshold: voteThreshold,
      voters: [],
    });
  };

  // ── Virgin dialog handlers ────────────────────────────────

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

  const handleVirginContinueVoting = () => {
    setVirginDialog({ type: 'none' });
    setShowVoting(true);
    setVotes(new Set());
    if (nominee) startVoting(nominee);
  };

  // ── Vote toggle ───────────────────────────────────────────

  const toggleVote = (seat: number) => {
    setVotes((prev) => {
      const next = new Set(prev);
      if (next.has(seat)) {
        next.delete(seat);
      } else {
        next.add(seat);
      }

      if (nominee) {
        const voterNames = Array.from(next)
          .map((s) => players.find((p) => p.seat === s)?.name)
          .filter((n): n is string => n != null);

        setDisplayVoting({
          nomineeName: `${nominee.name} (${nominee.seat}號)`,
          voteCount: next.size,
          threshold: voteThreshold,
          voters: voterNames,
        });
      }

      return next;
    });
  };

  // ── Vote fail (new handler) ───────────────────────────────

  const handleVoteFail = () => {
    if (nominatorSeat == null || nomineeSeat == null) return;

    // Use death votes for dead players who voted
    players
      .filter((p) => !p.isAlive && p.hasDeathVote && votes.has(p.seat))
      .forEach((p) => useDeathVote(p.seat));

    recordVoteResult(nominatorSeat, nomineeSeat, voteCount, false);
    resetNomination();
  };

  // ── Execute ───────────────────────────────────────────────

  const handleExecute = () => {
    if (nomineeSeat == null) return;
    const nomineePlayer = players.find((p) => p.seat === nomineeSeat);
    if (!nomineePlayer) return;

    // Saint check
    const saintResult = checkSaintExecution(nomineePlayer);
    if (saintResult.isSaint) {
      setSaintDialog({
        type: saintResult.abilityWorks ? 'game_ending' : 'ability_failed',
        player: nomineePlayer,
        result: saintResult,
      });
      return;
    }

    // Use death votes for dead players who voted
    players
      .filter((p) => !p.isAlive && p.hasDeathVote && votes.has(p.seat))
      .forEach((p) => useDeathVote(p.seat));

    recordVoteResult(nominatorSeat!, nomineeSeat, voteCount, true);
    killPlayer(nomineeSeat, 'execution');
    setHasExecutedToday(true);
    resetNomination();
  };

  // ── Execution phase handlers ──────────────────────────────

  const handleForcedExecute = (seat: number) => {
    killPlayer(seat, 'execution');
    setHasExecutedToday(true);
    setInExecutionPhase(false);
    startNight();
  };

  const handleNoExecution = () => {
    setInExecutionPhase(false);
    startNight();
  };

  // ── Slayer handlers (C2) ──────────────────────────────────

  const handleSlayerSuccess = (claimantSeat_: number, targetSeat_: number) => {
    // Mark ability used and claim made
    stateManager.markAbilityUsed(claimantSeat_);
    const claimantPlayer = players.find((p) => p.seat === claimantSeat_);
    if (claimantPlayer) claimantPlayer.hasMadeSlayerClaim = true;

    // Kill the demon target
    killPlayer(targetSeat_, 'execution');

    stateManager.logEvent({
      type: 'ability_use',
      description: `獵手驅魔成功：惡魔死亡，遊戲結束`,
      details: { role: 'slayer', claimantSeat: claimantSeat_, targetSeat: targetSeat_ },
    });

    endGame('good', '獵手驅魔成功');
    setShowSlayerPanel(false);
  };

  const handleSlayerFail = (claimantSeat_: number) => {
    // Mark claim used (but NOT abilityUsed — only real Slayer uses that)
    const claimantPlayer = players.find((p) => p.seat === claimantSeat_);
    if (claimantPlayer) claimantPlayer.hasMadeSlayerClaim = true;

    stateManager.logEvent({
      type: 'ability_use',
      description: `獵手宣稱：無事發生（${claimantSeat_}號）`,
      details: { role: 'slayer', claimantSeat: claimantSeat_, success: false },
    });

    setShowSlayerPanel(false);
  };

  // ── End day ───────────────────────────────────────────────

  const handleEndDay = () => {
    if (!hasExecutedToday && nominationHistory.length > 0) {
      setInExecutionPhase(true);
    } else {
      startNight();
    }
  };

  // ── Saint dialog ─────────────────────────────────────────

  const handleSaintConfirmExecute = () => {
    if (saintDialog.type !== 'game_ending') return;
    const { player } = saintDialog;

    players
      .filter((p) => !p.isAlive && p.hasDeathVote && votes.has(p.seat))
      .forEach((p) => useDeathVote(p.seat));

    recordVoteResult(nominatorSeat!, player.seat, voteCount, true);
    killPlayer(player.seat, 'execution');
    setHasExecutedToday(true);

    stateManager.logEvent({
      type: 'ability_use',
      description: `聖徒能力觸發：善良陣營落敗`,
      details: { role: 'saint', saintSeat: player.seat },
    });

    endGame('evil', `聖徒（${player.seat}號 ${player.name}）被處決`);

    setSaintDialog({ type: 'none' });
    resetNomination();
  };

  const handleSaintExecuteNormal = () => {
    if (saintDialog.type !== 'ability_failed') return;
    const { player } = saintDialog;

    players
      .filter((p) => !p.isAlive && p.hasDeathVote && votes.has(p.seat))
      .forEach((p) => useDeathVote(p.seat));

    recordVoteResult(nominatorSeat!, player.seat, voteCount, true);
    killPlayer(player.seat, 'execution');
    setHasExecutedToday(true);

    setSaintDialog({ type: 'none' });
    resetNomination();
  };

  const handleSaintCancel = () => {
    setSaintDialog({ type: 'none' });
  };

  // ── Reset ─────────────────────────────────────────────────

  const resetNomination = () => {
    setNominatorSeat(null);
    setNomineeSeat(null);
    setVotes(new Set());
    setShowVoting(false);
    setDisplayNomination(null);
    setDisplayVoting(null);
  };

  // ── Nomination limit hints ────────────────────────────────

  const getNominatorHint = (): string | null => {
    if (nominatorSeat != null && nominatedThisDay.has(nominatorSeat)) {
      const p = players.find((x) => x.seat === nominatorSeat);
      return `${p?.name ?? nominatorSeat}號 今天已提名過，無法再提名`;
    }
    return null;
  };

  const getNomineeHint = (): string | null => {
    if (nomineeSeat != null && nominatedTargetsThisDay.has(nomineeSeat)) {
      const p = players.find((x) => x.seat === nomineeSeat);
      return `${p?.name ?? nomineeSeat}號 今天已被提名過，無法再被提名`;
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="day-view">
      <h2>第 {day} 天</h2>

      {/* B1: 黎明公告 */}
      {!dawnDismissed && (
        <DawnAnnouncement
          dawnDeaths={dawnDeaths.map((p) => ({ seat: p.seat, name: p.name }))}
          onDismiss={() => setDawnDismissed(true)}
        />
      )}

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
              {!p.isAlive && p.hasDeathVote && (
                <span className="ps-death-vote" title="持有死亡投票權">💀</span>
              )}
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

      {/* C2: 獵手宣稱 */}
      {showSlayerPanel && !gameOver && (
        <SlayerPanel
          players={players}
          roleRegistry={roleRegistry}
          onSuccess={handleSlayerSuccess}
          onFail={handleSlayerFail}
          onCancel={() => setShowSlayerPanel(false)}
        />
      )}

      {/* 強制處決階段 */}
      {inExecutionPhase && !gameOver && (
        <ExecutionPhase
          nominationHistory={nominationHistory}
          players={players}
          roleRegistry={roleRegistry}
          onExecute={handleForcedExecute}
          onNoExecution={handleNoExecution}
        />
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
      {!showVoting && !gameOver && !inExecutionPhase && virginDialog.type === 'none' && saintDialog.type === 'none' && (
        <div className="day-nomination">
          {/* B5: 提名計數 */}
          <h3>
            提名
            <span style={{ fontWeight: 'normal', fontSize: '0.9em', marginLeft: '0.5rem', color: nominationCountToday >= MAX_NOMINATIONS_PER_DAY ? '#dc3545' : '#666' }}>
              （今天第 {nominationCountToday} 次，最多 {MAX_NOMINATIONS_PER_DAY} 次）
            </span>
          </h3>

          {!canNominate && (
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>今天提名次數已達上限（{MAX_NOMINATIONS_PER_DAY} 次）</p>
          )}

          {canNominate && (
            <div className="nomination-selectors">
              <div className="nomination-group">
                <p>提名者：</p>
                <PlayerSelector
                  mode="single"
                  onlyAlive={true}
                  label="選擇提名者"
                  onSelect={(ps: Player[]) => setNominatorSeat(ps[0]?.seat ?? null)}
                />
                {getNominatorHint() && (
                  <p style={{ color: '#dc3545', fontSize: '0.85em' }}>{getNominatorHint()}</p>
                )}
              </div>
              <div className="nomination-group">
                <p>被提名者：</p>
                <PlayerSelector
                  mode="single"
                  onlyAlive={false}
                  excludePlayers={[
                    ...(nominatorSeat != null ? [nominatorSeat] : []),
                    ...Array.from(nominatedTargetsThisDay),
                  ]}
                  label="選擇被提名者"
                  onSelect={(ps: Player[]) => setNomineeSeat(ps[0]?.seat ?? null)}
                />
                {getNomineeHint() && (
                  <p style={{ color: '#dc3545', fontSize: '0.85em' }}>{getNomineeHint()}</p>
                )}
              </div>
            </div>
          )}

          {canNominate && (
            <button
              className="btn-primary"
              disabled={nominateDisabled}
              onClick={handleNominate}
            >
              發起投票
            </button>
          )}
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
            {/* B4: alive players */}
            {alivePlayers.map((p) => (
              <button
                key={p.seat}
                className={`vote-btn ${votes.has(p.seat) ? 'voted' : ''}`}
                onClick={() => toggleVote(p.seat)}
              >
                {p.seat} {p.name}
              </button>
            ))}
            {/* B4: dead players with death vote */}
            {players.filter((p) => !p.isAlive && p.hasDeathVote).map((p) => (
              <button
                key={p.seat}
                className={`vote-btn death-vote-btn ${votes.has(p.seat) ? 'voted' : ''}`}
                onClick={() => toggleVote(p.seat)}
                title="死亡投票權（使用後失效）"
                style={{ opacity: 0.75, border: '2px dashed #666' }}
              >
                {p.seat} {p.name} 💀
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
            {!votePassed && (
              <button className="btn-secondary" onClick={handleVoteFail}>
                確認票數不足，結束投票
              </button>
            )}
            <button className="btn-secondary" onClick={resetNomination}>
              取消
            </button>
          </div>
        </div>
      )}

      {!gameOver && !inExecutionPhase && (
        <div className="day-footer" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn-primary" onClick={handleEndDay}>
            進入夜晚
          </button>
          {!showSlayerPanel && !showVoting && (
            <button
              className="btn-secondary"
              onClick={() => setShowSlayerPanel(true)}
              title="任何存活玩家宣稱自己是獵手"
            >
              宣稱是獵手
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// VirginDialog (unchanged from original)
// ──────────────────────────────────────────────────────────────

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

  if (state.type === 'triggered') {
    return (
      <div className="virgin-dialog" style={{
        backgroundColor: '#fff3cd', border: '2px solid #ffc107', padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#856404' }}>⚡ 貞潔者能力觸發！</h3>
        <p style={{ color: '#000000' }}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
        <p style={{ color: '#000000' }}>提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}）← 鎮民</p>
        <p style={{ fontWeight: 'bold', marginTop: '0.5rem', color: '#ff6b6b' }}>
          → {nominator.seat}號 {nominator.name} 將被立即處決
        </p>
        <p style={{ fontWeight: 'bold', color: '#ff6b6b' }}>→ 直接進入夜間階段</p>
        <div style={{ marginTop: '1rem' }}>
          <button className="btn-danger" onClick={onExecute}>確認處決，進入夜間</button>
        </div>
      </div>
    );
  }

  if (state.type === 'spy_choice') {
    return (
      <div className="virgin-dialog" style={{
        backgroundColor: '#e8f4fd', border: '2px solid #0d6efd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#ff6b6b' }}>貞潔者被提名</h3>
        <p style={{ color: '#000000' }}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
        <p style={{ color: '#000000' }}>提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}，能力正常）</p>
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>選擇判定：</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button className="btn-danger" onClick={onExecute}>間諜被視為鎮民 → 觸發處決，進入夜間</button>
            <button className="btn-secondary" onClick={onContinueVoting}>間諜保持爪牙身份 → 不觸發，正常投票</button>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.9em', color: '#666' }}>
          ℹ️ 提示：間諜能力正常，可以被認定為善良角色
        </div>
      </div>
    );
  }

  const { result } = state;
  const isDrunk = virgin.role === 'drunk';
  const isMalfunctioned = result.abilityMalfunctioned;

  return (
    <div className="virgin-dialog" style={{
      backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
    }}>
      <h3 style={{ color: '#ff6b6b' }}>貞潔者被提名</h3>
      <p style={{ color: '#000000' }}>{virgin.seat}號 {virgin.name}（{virginRoleName}）被提名</p>
      {isMalfunctioned && (
        <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
          {isDrunk ? '🍺 實際上是酒鬼（無能力）' : '⚠️ 中毒（能力失效）'}
        </p>
      )}
      {!isDrunk && (
        <p style={{ color: '#000000' }}>
          提名者：{nominator.seat}號 {nominator.name}（{nominatorRoleName}）
          {nominator.team !== 'townsfolk' ? '← 非鎮民' : '← 鎮民'}
        </p>
      )}
      <p style={{ marginTop: '0.5rem', color: '#ff6b6b' }}>
        → 能力未觸發，正常進入投票（貞潔者能力已消耗）
      </p>
      <div style={{ marginTop: '1rem' }}>
        <button className="btn-primary" onClick={onContinueVoting}>確認，進入投票</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// SaintDialog (unchanged from original)
// ──────────────────────────────────────────────────────────────

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

  if (state.type === 'game_ending') {
    return (
      <div className="saint-dialog" style={{
        backgroundColor: '#f8d7da', border: '2px solid #f5c6cb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#721c24' }}>⚠️ 即將處決聖徒！</h3>
        <p style={{ color: '#000000' }}>{player.seat}號 {player.name}（{roleName}）即將被處決</p>
        <p style={{ color: '#000000' }}>能力狀態：✅ 能力正常</p>
        <p style={{ fontWeight: 'bold', marginTop: '0.5rem', color: '#721c24' }}>→ 若處決聖徒，善良陣營立即落敗！</p>
        <p style={{ fontWeight: 'bold', color: '#721c24' }}>→ 邪惡陣營獲勝，遊戲結束</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn-danger" onClick={onConfirmExecute}>確認處決 → 邪惡獲勝</button>
          <button className="btn-secondary" onClick={onCancel}>取消</button>
        </div>
      </div>
    );
  }

  const isDrunk = player.role === 'drunk';

  return (
    <div className="saint-dialog" style={{
      backgroundColor: '#fff3cd', border: '2px solid #ffc107', padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
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
        <button className="btn-primary" onClick={onExecuteNormal}>確認處決</button>
        <button className="btn-secondary" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
