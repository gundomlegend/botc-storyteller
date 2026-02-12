import type { ComponentType } from 'react';
import type { NightOrderItem } from '../../engine/types';
import FortunetellerProcessor from './FortunetellerProcessor';

export interface RoleProcessorProps {
  item: NightOrderItem;
  onDone: () => void;
}

/**
 * UI 層角色處理器註冊表。
 * 列入的角色由專屬元件處理夜間能力 UI；
 * 未列入的角色走 AbilityProcessor 通用流程。
 */
export const ROLE_PROCESSORS: Record<string, ComponentType<RoleProcessorProps>> = {
  fortuneteller: FortunetellerProcessor,
};
