/**
 * 洗衣婦 Processor（重構版）
 *
 * Adapter Pattern：
 * 將洗衣婦的配置適配到通用 TwoPlayerInfoProcessor
 * 只需 5 行程式碼！
 */

import TwoPlayerInfoProcessor from './shared/TwoPlayerInfoProcessor';
import { washerwomanConfig } from './shared/roleConfigs';
import type { RoleProcessorProps } from './index';
import type { WasherwomanHandlerInfo } from './shared/types';

export default function WasherwomanProcessor(props: RoleProcessorProps) {
  return <TwoPlayerInfoProcessor<WasherwomanHandlerInfo> {...props} config={washerwomanConfig} />;
}
