/**
 * 調查員 Processor（重構版）
 *
 * Adapter Pattern：
 * 將調查員的配置適配到通用 TwoPlayerInfoProcessor
 * 只需 5 行程式碼！
 */

import TwoPlayerInfoProcessor from './shared/TwoPlayerInfoProcessor';
import { ROLE_CONFIGS } from './shared/roleConfigs';
import type { RoleProcessorProps } from './index';

export default function InvestigatorProcessor(props: RoleProcessorProps) {
  return <TwoPlayerInfoProcessor {...props} config={ROLE_CONFIGS.investigator} />;
}
