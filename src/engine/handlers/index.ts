import type { RoleHandler } from '../types';
import { FortunetellerHandler } from './FortunetellerHandler';
import { MonkHandler } from './MonkHandler';
import { PoisonerHandler } from './PoisonerHandler';
import { ImpHandler } from './ImpHandler';
import { DrunkHandler } from './DrunkHandler';
import { ButlerHandler } from './ButlerHandler';

export const handlers = new Map<string, RoleHandler>([
  ['fortuneteller', new FortunetellerHandler()],
  ['monk', new MonkHandler()],
  ['poisoner', new PoisonerHandler()],
  ['imp', new ImpHandler()],
  ['drunk', new DrunkHandler()],
  ['butler', new ButlerHandler()],
]);
