/**
 * Ability Invalidation Contract Tests — RuleEngine 層
 *
 * 對應文件：docs/contracts/AbilityInvalidation.contract.md
 * - T1：poisoned 的 Monk 保護 → effectNullified: true
 * - T2：drunk 的資訊型技能回傳不保證正確
 * - T5：NightContext.blockedRoles 阻止 Demon 行動
 *
 * T3, T4, T6 由 GameState.contract.test.ts 覆蓋
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../GameState';
import { RuleEngine } from '../RuleEngine';

describe('Ability Invalidation — RuleEngine 層', () => {
  let m: GameStateManager;
  let engine: RuleEngine;

  beforeEach(() => {
    m = new GameStateManager();
    engine = new RuleEngine();
  });

  // T1: poisoned Monk 保護 → effectNullified: true
  describe('T1: AC1 狀態類失效（中毒的 Monk）', () => {
    it('中毒的 Monk 保護結果帶有 effectNullified: true', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'poisoner' },
        { seat: 3, name: 'C', role: 'fortuneteller' },
      ]);
      m.startNight();

      // Monk(1) 被中毒
      m.addStatus(1, 'poisoned', 2);

      const monk = m.getPlayer(1)!;
      const target = m.getPlayer(3)!;

      engine.startNightResolution();
      const result = engine.processNightAbility(monk, target, m.getState(), m);

      expect(result.effectNullified).toBe(true);
      // 仍有 display（喚醒玩家用），但效果不落地
      expect(result.display).toBeDefined();
    });

    it('未中毒的 Monk 保護正常生效', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'imp' },
        { seat: 3, name: 'C', role: 'fortuneteller' },
      ]);
      m.startNight();

      const monk = m.getPlayer(1)!;
      const target = m.getPlayer(3)!;

      engine.startNightResolution();
      const result = engine.processNightAbility(monk, target, m.getState(), m);

      expect(result.effectNullified).toBeFalsy();
      expect(result.action).toBe('add_protection');
    });
  });

  // T2: drunk 的資訊型技能回傳不保證正確
  describe('T2: AC1 狀態類失效（醉酒的資訊型）', () => {
    it('醉酒的 FortuneTeller 資訊不可靠（infoReliable=false）', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'drunk' },
        { seat: 2, name: 'B', role: 'imp' },
        { seat: 3, name: 'C', role: 'monk' },
      ]);
      m.startNight();

      // Drunk 以為自己是某角色，但 handler 跳過
      const drunk = m.getPlayer(1)!;
      engine.startNightResolution();
      const result = engine.processNightAbility(drunk, null, m.getState(), m);

      // Drunk handler 回傳 skip（酒鬼本身無夜間行動）
      expect(result.skip).toBe(true);
    });

    it('中毒的 FortuneTeller 仍回傳實際偵測結果（不反轉）', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'fortuneteller' },
        { seat: 2, name: 'B', role: 'poisoner' },
        { seat: 3, name: 'C', role: 'imp' },
      ]);
      m.startNight();

      // FT(1) 被中毒
      m.addStatus(1, 'poisoned', 2);

      const ft = m.getPlayer(1)!;
      const target = m.getPlayer(3)!; // Imp = demon
      const secondTarget = m.getPlayer(2)!; // Poisoner = minion

      engine.startNightResolution();
      const result = engine.processNightAbility(ft, target, m.getState(), m, secondTarget);

      // 中毒的 FT 不再自動反轉，回傳實際偵測結果
      expect(result.action).toBe('tell_alignment');
      const info = result.info as Record<string, unknown>;
      expect(info.rawDetection).toBe(true); // Imp 是惡魔，偵測到
      expect(result.mustFollow).toBe(false); // 說書人自行決定
      // 資訊型 action 不走 effect invalidation
      expect(result.effectNullified).toBeFalsy();
    });
  });

  // T5: NightContext.blockedRoles 阻止 Demon 行動
  describe('T5: AC4 NightContext 攔截', () => {
    it('blockedRoles 包含 demon 時，Imp 行動被跳過', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'imp' },
      ]);
      m.startNight();

      engine.startNightResolution();
      // 模擬驅魔人效果：將 demon 加入 blockedRoles
      (engine as any).nightContext.blockedRoles.add('demon');

      const imp = m.getPlayer(2)!;
      const target = m.getPlayer(1)!;

      const result = engine.processNightAbility(imp, target, m.getState(), m);

      expect(result.skip).toBe(true);
      expect(result.skipReason).toContain('攔截');
    });

    it('blockedRoles 為空時，Imp 正常行動', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'imp' },
      ]);
      m.startNight();

      engine.startNightResolution();

      const imp = m.getPlayer(2)!;
      const target = m.getPlayer(1)!;

      const result = engine.processNightAbility(imp, target, m.getState(), m);

      expect(result.skip).toBeFalsy();
      expect(result.action).toBe('kill');
    });

    it('startNightResolution 重置 blockedRoles', () => {
      engine.startNightResolution();
      (engine as any).nightContext.blockedRoles.add('demon');

      // 新的一夜開始
      engine.startNightResolution();

      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'imp' },
      ]);
      m.startNight();

      const imp = m.getPlayer(2)!;
      const target = m.getPlayer(1)!;
      const result = engine.processNightAbility(imp, target, m.getState(), m);

      expect(result.skip).toBeFalsy();
    });
  });

  // 死亡玩家不被喚醒
  describe('AC2: 死亡玩家跳過', () => {
    it('死亡且無死後能力的角色，行動被跳過', () => {
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'monk' },
        { seat: 2, name: 'B', role: 'imp' },
      ]);
      m.startNight();
      m.killPlayer(1, 'demon_kill');

      engine.startNightResolution();
      const monk = m.getPlayer(1)!;
      const result = engine.processNightAbility(monk, null, m.getState(), m);

      expect(result.skip).toBe(true);
      expect(result.skipReason).toContain('死亡');
    });
  });
});
