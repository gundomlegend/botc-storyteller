import type { RoleHandler, HandlerContext, NightResult } from '../types';

export class DrunkHandler implements RoleHandler {
  process(_context: HandlerContext): NightResult {
    return {
      skip: true,
      skipReason: '酒鬼無夜間行動（狀態已在設置時配置）',
      display: '酒鬼無夜間行動',
    };
  }
}
