/**
 * SlayerPanel — 獵手宣稱 UI
 *
 * 任何存活玩家可宣稱自己是獵手（整場每人只能宣稱一次）。
 * 選擇目標後，由說書人確認結果。
 */

import { useState } from 'react';
import type { Player } from '../engine/types';
import { processSlayerClaim } from '../engine/handlers/SlayerHandler';
import PlayerSelector from './PlayerSelector';

interface SlayerPanelProps {
  players: Player[];
  roleRegistry: { getRoleName: (roleId: string) => string };
  onSuccess: (claimantSeat: number, targetSeat: number) => void; // success: kill target + end game
  onFail: (claimantSeat: number) => void;                         // fail: mark claim used only
  onCancel: () => void;
}

export function SlayerPanel({ players, roleRegistry, onSuccess, onFail, onCancel }: SlayerPanelProps) {
  const [claimantSeat, setClaimantSeat] = useState<number | null>(null);
  const [targetSeat, setTargetSeat] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: boolean; reason: string } | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);

  // Players who haven't made a Slayer claim yet (can still claim)
  const eligibleClaimants = alivePlayers.filter((p) => !p.hasMadeSlayerClaim);

  const handleProcess = () => {
    if (claimantSeat == null || targetSeat == null) return;

    const claimant = players.find((p) => p.seat === claimantSeat);
    const target = players.find((p) => p.seat === targetSeat);
    if (!claimant || !target) return;

    const slayerResult = processSlayerClaim(claimant, target);
    setResult(slayerResult);

    if (slayerResult.success) {
      onSuccess(claimantSeat, targetSeat);
    } else {
      onFail(claimantSeat);
    }
  };

  const roleName = (p: Player) =>
    p.role === 'drunk'
      ? `酒鬼（以為自己是${roleRegistry.getRoleName(p.believesRole ?? 'slayer')}）`
      : roleRegistry.getRoleName(p.role);

  return (
    <div
      className="slayer-panel"
      style={{
        backgroundColor: '#e8f4fd',
        border: '2px solid #0d6efd',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    >
      <h3 style={{ color: '#0d47a1' }}>獵手宣稱</h3>
      <p style={{ color: '#555', fontSize: '0.9em' }}>
        存活玩家可宣稱自己是獵手，並指定一名目標。整場每人只能宣稱一次。
      </p>

      {eligibleClaimants.length === 0 && (
        <p style={{ color: '#dc3545', fontWeight: 'bold' }}>所有存活玩家都已宣稱過獵手。</p>
      )}

      {!result && eligibleClaimants.length > 0 && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <p>宣稱者（選擇存活且尚未宣稱的玩家）：</p>
            <PlayerSelector
              mode="single"
              onlyAlive={true}
              excludePlayers={players.filter((p) => p.hasMadeSlayerClaim).map((p) => p.seat)}
              label="選擇宣稱者"
              onSelect={(ps: Player[]) => setClaimantSeat(ps[0]?.seat ?? null)}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p>目標（選擇存活玩家，可選任何人包含自己）：</p>
            <PlayerSelector
              mode="single"
              onlyAlive={true}
              label="選擇目標"
              onSelect={(ps: Player[]) => setTargetSeat(ps[0]?.seat ?? null)}
            />
          </div>

          {claimantSeat != null && (
            <p style={{ fontSize: '0.85em', color: '#555' }}>
              宣稱者：{players.find((p) => p.seat === claimantSeat)?.name}（{roleName(players.find((p) => p.seat === claimantSeat)!)}）
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              className="btn-primary"
              disabled={claimantSeat == null || targetSeat == null}
              onClick={handleProcess}
            >
              確認宣稱
            </button>
            <button className="btn-secondary" onClick={onCancel}>取消</button>
          </div>
        </>
      )}

      {result && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontWeight: 'bold', color: result.success ? '#155724' : '#721c24', fontSize: '1.1em' }}>
            {result.success ? '✅ ' : '❌ '}{result.reason}
          </p>
          {result.success && (
            <p style={{ color: '#155724' }}>遊戲結束 — 善良陣營獲勝！</p>
          )}
        </div>
      )}
    </div>
  );
}
