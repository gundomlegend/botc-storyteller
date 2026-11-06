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
import { Button } from './shared/Button';

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
    <div className="bg-alert-info-surface border-2 border-alert-info-border p-4 rounded-lg mb-4">
      <h3 className="text-lg font-bold text-alert-info-text mb-2.5">獵手宣稱</h3>
      <p className="text-neutral-700 text-sm">
        存活玩家可宣稱自己是獵手，並指定一名目標。整場每人只能宣稱一次。
      </p>

      {eligibleClaimants.length === 0 && (
        <p className="text-alert-danger-accent font-bold">所有存活玩家都已宣稱過獵手。</p>
      )}

      {!result && eligibleClaimants.length > 0 && (
        <>
          <div className="mb-3">
            <p>宣稱者（選擇存活且尚未宣稱的玩家）：</p>
            <PlayerSelector
              mode="single"
              onlyAlive={true}
              excludePlayers={players.filter((p) => p.hasMadeSlayerClaim).map((p) => p.seat)}
              label="選擇宣稱者"
              onSelect={(ps: Player[]) => setClaimantSeat(ps[0]?.seat ?? null)}
            />
          </div>

          <div className="mb-3">
            <p>目標（選擇存活玩家，可選任何人包含自己）：</p>
            <PlayerSelector
              mode="single"
              onlyAlive={true}
              label="選擇目標"
              onSelect={(ps: Player[]) => setTargetSeat(ps[0]?.seat ?? null)}
            />
          </div>

          {claimantSeat != null && (
            <p className="text-xs text-neutral-700">
              宣稱者：{players.find((p) => p.seat === claimantSeat)?.name}（{roleName(players.find((p) => p.seat === claimantSeat)!)}）
            </p>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              disabled={claimantSeat == null || targetSeat == null}
              onClick={handleProcess}
            >
              確認宣稱
            </Button>
            <Button variant="secondary" onClick={onCancel}>取消</Button>
          </div>
        </>
      )}

      {result && (
        <div className="mt-3">
          <p className={`font-bold text-lg ${result.success ? 'text-alert-success-text' : 'text-alert-danger-text'}`}>
            {result.success ? '✅ ' : '❌ '}{result.reason}
          </p>
          {result.success && (
            <p className="text-alert-success-text">遊戲結束 — 善良陣營獲勝！</p>
          )}
        </div>
      )}
    </div>
  );
}
