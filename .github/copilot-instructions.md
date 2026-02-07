# AI Coding Instructions for BOTC Storyteller

## Project Overview
**Blood on the Clocktower Storyteller Assistant** – An Electron + React + TypeScript desktop app that automates game management for the social deduction game "Blood on the Clocktower". Supports the Trouble Brewing script with 16 characters.

The architecture splits cleanly: **Electron main process** manages windows, **React UI** handles visualization, **TypeScript rule engine** processes game logic, and **JSON data files** define role abilities and game mechanics.

## Development Workflow

### Critical Commands
```bash
npm run dev              # Best for development - runs renderer (Vite on 5173) + electron concurrently
npm run build           # Builds both renderer and main process to dist/
npm run package         # Creates executable with electron-builder (output: release/)
npm run dev:renderer    # Isolated Vite dev for UI tweaking (http://localhost:5173)
npm run dev:electron    # Build main once, launch electron (useful for main process debugging)
```

**Key insight**: Development split between renderer (hot reload via Vite) and main process (requires TypeScript watch). Use `npm run dev` for most work; use isolated commands when debugging specific process separately.

## Architecture Patterns

### 1. Type-First Development
**Always lean on TypeScript.** Core types live in [src/engine/types.ts](src/engine/types.ts) – define them first, then implement.

```typescript
// ✓ Good: explicit types, interfaces for contracts
interface Player {
  seat: number;
  name: string;
  role: string;
  isAlive: boolean;
  statuses: Map<string, PlayerStatus>;
}

// ✗ Bad: avoid `any` – it defeats TypeScript
const player: any = {}; // fails in rest of engine
```

### 2. Role Handler Pattern
Complex role abilities use handler files in [src/engine/handlers/](src/engine/handlers/). Each role with special mechanics gets a dedicated handler:
- **Imp** (demon kill, succession) → `ImpHandler.ts`
- **Fortuneteller** (2-player info) → `FortunetellerHandler.ts`
- **Poisoner** (target ability) → `PoisonerHandler.ts`

Export handlers from [src/engine/handlers/index.ts](src/engine/handlers/index.ts) and register in `RuleEngine` constructor. Pattern:
```typescript
export interface RoleHandler {
  process(player: Player, target: Player | null, context: HandlerContext): NightResult;
}
```

### 3. Game State as Single Source of Truth
[src/engine/GameState.ts](src/engine/GameState.ts) manages all mutable state:
- Player data (seat, name, role, alive status)
- Player statuses (poisoned, protected, drunk)
- Game phase (setup/night/day)
- Night order and history

All mutations go through `GameStateManager` methods (e.g., `addStatus()`, `killPlayer()`). React components **read** from store, never mutate directly.

### 4. Configuration-Driven Design
Role abilities defined in [src/data/roles/trouble-brewing.json](src/data/roles/trouble-brewing.json) with fields:
- `id` (English kebab-case: "fortune-teller")
- `name_cn` (Chinese name)
- `ability_cn` (Chinese ability)
- `firstNightReminder_cn` (Chinese firstNightReminder)
- `otherNightReminder_cn` (Chinese otherNightReminder)
- `team` (townsfolk/outsider/minion/demon)
- `firstNight` / `otherNight` (sort order, 1-50 range)
- `affectedByPoison`, `affectedByDrunk`, `worksWhenDead` (state flags)

Jinx rules in [src/data/jinxes.json](src/data/jinxes.json) – if two roles trigger a Jinx, special rules apply.

## Code Organization & Naming

| Directory | Purpose |
|-----------|---------|
| `src/main/` | Electron main process, window creation, preload |
| `src/renderer/` | React app (Vite root), includes App.tsx, components/, styles/ |
| `src/engine/` | GameState, RuleEngine, type definitions – **no React imports** |
| `src/data/` | JSON: roles/trouble-brewing.json, jinxes.json |
| `botc-docs/` | Development specs (GameState, RuleEngine, data formats) |

### Naming Conventions
- **Components** (`.tsx`): `PascalCase` → `PlayerCard.tsx`, `NightView.tsx`
- **Utilities** (`.ts`): `camelCase` → `formatDate.ts`, `calculateVotes.ts`
- **Styles** (`.css`): `kebab-case` → `player-card.css`
- **Constants**: `UPPER_CASE` → `MAX_PLAYERS = 15`
- **Booleans**: `is/has/can` prefix → `isAlive`, `hasAbility`, `canVote`
- **Functions**: verb-first → `getPlayer()`, `handleClick()`, `processAbility()`

## State Management

Using Zustand (mentioned in docs). React components access game state through the store and receive updates when state changes. Example pattern:
```typescript
// In component
import { useGameStore } from '../store/gameStore';
const players = useGameStore(state => state.players);
```

The store wraps `GameStateManager` – mutations must go through the manager, not directly in store.

## Role Ability Processing Flow

When a role uses an ability at night:
1. **Dispatcher** calls `RuleEngine.processNightAbility(player, target, gameState, stateManager)`
2. **RuleEngine** checks:
   - Is role dead + has `worksWhenDead: false`? → skip
   - Is role poisoned + `affectedByPoison: true`? → mark info unreliable
   - Is role drunk + `affectedByDrunk: true`? → wrong info
   - Any Jinx rules with other alive roles? → apply jinx
3. **Specialized handler** or **default handler** processes the ability
4. **Returns** `NightResult`: { info, reliable, statusChanges, deaths }
5. **GameStateManager** applies result (update states, kill players, log event)

## File Structure Checklist
When adding a new feature:
- [ ] Type definitions in `src/engine/types.ts`
- [ ] Game logic in `src/engine/GameState.ts` or new handler in `src/engine/handlers/`
- [ ] React component in `src/renderer/components/`
- [ ] Styles in `src/renderer/styles/`, name matching component (kebab-case)
- [ ] Update JSON data if adding role/jinx to `src/data/`
- [ ] Document in `botc-docs/` if architecture-level change

## Testing Strategy
Unit tests focus on:
- **Type correctness**: Compiler catches most issues
- **GameState methods**: Player initialization, status management, night order generation
- **RuleEngine handlers**: Ability processing, jinx detection
- **Data validation**: Role JSON schema matches type definitions

Use TypeScript's compiler as first check – avoid `any` and lean on strict types.

## Key External Dependencies
- **React 18** – Components (Vite root: `src/renderer/`)
- **TypeScript 5.6** – Strict mode (enforce explicit types)
- **Vite 6** – Renderer bundler, HMR dev server
- **Electron 33** – Desktop app framework (main process in `src/main/`)
- **electron-builder** – Packaging for Windows/Mac/Linux

## Resources
- [botc-docs/SPEC_GameState.md](botc-docs/SPEC_GameState.md) – GameState API spec
- [botc-docs/SPEC_RuleEngine.md](botc-docs/SPEC_RuleEngine.md) – Rule processing engine
- [botc-docs/DATA_FORMAT.md](botc-docs/DATA_FORMAT.md) – Role and Jinx JSON schemas
- [botc-docs/DEVELOPMENT.md](botc-docs/DEVELOPMENT.md) – Code style, component patterns
