import type { CardDef, DefenseCardKind, OffenseCardKind } from '../types'

function o(
  kind: OffenseCardKind,
  name: string,
  text: string,
  poolCount: number,
  tags: string[],
): CardDef {
  return {
    id: `off_${kind}`,
    family: 'offense',
    kind,
    name,
    text,
    poolCount,
    tags,
  }
}

function d(
  kind: DefenseCardKind,
  name: string,
  text: string,
  poolCount: number,
  tags: string[],
  setupSlot?: CardDef['setupSlot'],
): CardDef {
  return {
    id: `def_${kind}`,
    family: 'defense',
    kind,
    name,
    text,
    poolCount,
    tags,
    setupSlot,
  }
}

/** Canonical card definitions (one def per kind; instances are id copies in bags) */
export const OFFENSE_DEFS: CardDef[] = [
  o('single', 'Single', 'Batter reaches first. Advance runners +1.', 12, [
    'PA',
    'Reach',
  ]),
  o('walk', 'Walk', 'Free pass. Batter to first; force advance.', 8, [
    'PA',
    'Reach',
  ]),
  o('double', 'Double', 'Batter to second. Score from second; +2 bases.', 5, [
    'PA',
    'Reach',
    'ExtraBase',
  ]),
  o('home_run', 'Home Run', 'Clear the bases. All runners + batter score.', 4, [
    'PA',
    'Reach',
    'ExtraBase',
  ]),
  o('hbp', 'Hit By Pitch', 'Batter awarded first. Force advance.', 2, [
    'PA',
    'Reach',
  ]),
  o('triple', 'Triple', 'Batter to third. Score from first.', 1, [
    'PA',
    'Reach',
    'ExtraBase',
  ]),
  o(
    'sac_fly',
    'Sacrifice Fly',
    'Out; runner from third scores if less than 2 outs.',
    2,
    ['PA', 'Advance'],
  ),
  o('stolen_base', 'Stolen Base', 'Baserun: advance lead runner one base.', 4, [
    'Baserun',
    'Advance',
  ]),
  o(
    'wild_pitch',
    'Wild Pitch / Passed Ball',
    'Baserun: advance all runners one base.',
    2,
    ['Baserun', 'Advance'],
  ),
  o('error', 'Error', 'Reach on misplay. Batter to first.', 2, ['PA', 'Reach']),
  o(
    'fielders_choice',
    "Fielder's Choice",
    'Batter safe; lead force runner is out (if any).',
    1,
    ['PA', 'Reach'],
  ),
  o(
    'bunt',
    'Bunt Single / Sac Bunt',
    'With empty bases: single. Else: out, runners +1.',
    2,
    ['PA', 'Reach'],
  ),
]

export const DEFENSE_DEFS: CardDef[] = [
  d(
    'strikeout',
    'Strikeout',
    'Mound out. Names K when Defense smothers.',
    14,
    ['Pitch', 'Out'],
    'mound',
  ),
  d(
    'ground_out',
    'Ground Out',
    'Infield out. Names GO on smothered contact.',
    12,
    ['Field', 'Out'],
    'infield',
  ),
  d(
    'fly_out',
    'Fly Out',
    'Outfield can of corn. Names FO on smother.',
    8,
    ['Field', 'Out'],
    'outfield',
  ),
  d(
    'line_out',
    'Line Out',
    'Hard contact snared. Names LO on smother.',
    3,
    ['Field', 'Out'],
    'outfield',
  ),
  d(
    'double_play',
    'Double Play',
    'Force twin killing when applicable.',
    3,
    ['Field', 'Out'],
    'infield',
  ),
  d(
    'caught_stealing',
    'Caught Stealing',
    'Baserun stop — gun down a steal.',
    2,
    ['BaserunStop', 'Out'],
    'baserunStop',
  ),
  d(
    'intentional_walk',
    'Intentional Walk',
    'Strategy: force a free pass outcome.',
    1,
    ['Pitch'],
    'mound',
  ),
  d(
    'pitchout',
    'Pitchout / Hold Runner',
    '+ vs steals; BaserunStop slot.',
    2,
    ['BaserunStop'],
    'baserunStop',
  ),
  d(
    'infield_in',
    'Infield In / Guard Line',
    'Position mod: kill Error/FC stretches.',
    2,
    ['Position'],
    'infield',
  ),
  d(
    'high_heat',
    'High Heat / Soft Contact',
    'Stuff package: +2 Mound vs contact/power.',
    4,
    ['Pitch', 'Modifier'],
    'mound',
  ),
  d(
    'paint_corner',
    'Paint the Corner',
    'Command package: +2 vs walks / HBP.',
    2,
    ['Pitch', 'Modifier'],
    'mound',
  ),
  d(
    'dive_catch',
    'Dive Catch / Web Gem',
    'Leather flash: +3 Outfield vs ExtraBase.',
    2,
    ['Field', 'Modifier'],
    'outfield',
  ),
]

export const ALL_DEFS: Record<string, CardDef> = Object.fromEntries(
  [...OFFENSE_DEFS, ...DEFENSE_DEFS].map((c) => [c.id, c]),
)

/** Starter commons each club begins with (6 Off + 6 Def) */
export const STARTER_OFFENSE: string[] = [
  'off_single',
  'off_single',
  'off_single',
  'off_walk',
  'off_walk',
  'off_single',
]

export const STARTER_DEFENSE: string[] = [
  'def_strikeout',
  'def_strikeout',
  'def_ground_out',
  'def_ground_out',
  'def_fly_out',
  'def_high_heat',
]

export function buildPool(defs: CardDef[]): string[] {
  const pool: string[] = []
  for (const def of defs) {
    for (let i = 0; i < def.poolCount; i++) pool.push(def.id)
  }
  return pool
}

export function isBaserunEvent(cardId: string): boolean {
  const k = ALL_DEFS[cardId]?.kind
  return k === 'stolen_base' || k === 'wild_pitch'
}

export function isPaEvent(cardId: string): boolean {
  return ALL_DEFS[cardId]?.family === 'offense' && !isBaserunEvent(cardId)
}

export function ladderFromOffenseKind(
  kind: OffenseCardKind,
): import('../types').LadderStep | null {
  switch (kind) {
    case 'home_run':
      return 'HR'
    case 'triple':
      return '3B'
    case 'double':
      return '2B'
    case 'single':
    case 'bunt':
      return '1B'
    case 'error':
    case 'fielders_choice':
      return 'Error/FC'
    case 'walk':
    case 'hbp':
    case 'sac_fly':
    case 'stolen_base':
    case 'wild_pitch':
      return null
    default:
      return null
  }
}
