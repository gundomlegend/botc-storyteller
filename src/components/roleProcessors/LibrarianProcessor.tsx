/**
 * 圖書管理員 Processor（重構版）
 *
 * Adapter Pattern：
 * 將圖書管理員的配置適配到通用 TwoPlayerInfoProcessor
 * 只需 5 行程式碼！
 */

import TwoPlayerInfoProcessor from './shared/TwoPlayerInfoProcessor';
import { librarianConfig } from './shared/roleConfigs';
import type { RoleProcessorProps } from './index';
import type { LibrarianHandlerInfo } from './shared/types';

export default function LibrarianProcessor(props: RoleProcessorProps) {
  return <TwoPlayerInfoProcessor<LibrarianHandlerInfo> {...props} config={librarianConfig} />;
}
