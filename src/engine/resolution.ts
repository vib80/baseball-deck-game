import { ALL_DEFS, ladderFromOffenseKind } from '../data/cards'
import { effectiveAttrs } from '../data/clubs'
import type {
  DefenseSetup,
  LadderStep,
  OffenseCardKind,
  Player,
} from '../types'

export const FAIL_LADDER: LadderStep[] = [
  'HR',
  '3B',
  '2B',
  '1B',
  'Error/FC',
  'LO',
  'FO',
  'GO',
  'K',
]

export function stepLadder(
  from: LadderStep,
  steps: number,
): LadderStep {
  const i = FAIL_LADDER.indexOf(from)
  const j = Math.min(FAIL_LADDER.length - 1, Math.max(0, i + steps))
  return FAIL_LADDER[j]
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function setupBonus(
  setup: DefenseSetup,
  kind: OffenseCardKind,
): number {
  let bonus = 0
  const mound = setup.mound ? ALL_DEFS[setup.mound] : null
  const inf = setup.infield ? ALL_DEFS[setup.infield] : null
  const of = setup.outfield ? ALL_DEFS[setup.outfield] : null
  const br = setup.baserunStop ? ALL_DEFS[setup.baserunStop] : null

  if (mound?.kind === 'high_heat') {
    if (['single', 'double', 'triple', 'home_run', 'bunt'].includes(kind))
      bonus += 2
  }
  if (mound?.kind === 'paint_corner') {
    if (kind === 'walk' || kind === 'hbp') bonus += 2
  }
  if (mound?.kind === 'strikeout') bonus += 1
  if (inf?.kind === 'ground_out') bonus += 1
  if (inf?.kind === 'infield_in' && (kind === 'error' || kind === 'bunt'))
    bonus += 2
  if (inf?.kind === 'double_play') bonus += 1
  if (of?.kind === 'fly_out' || of?.kind === 'line_out') bonus += 1
  if (of?.kind === 'dive_catch') {
    if (['double', 'triple', 'home_run'].includes(kind)) bonus += 3
  }
  if (br && (kind === 'stolen_base' || kind === 'wild_pitch')) bonus += 2
  return bonus
}

/** Scale so typical PA deltas land near −3…+3 with setup mattering but not dominating. */
function offenseRating(kind: OffenseCardKind, batter: Player): number {
  const a = effectiveAttrs(batter)
  switch (kind) {
    case 'home_run':
      return a.power * 1.4 + a.contact * 0.6 + 4
    case 'double':
    case 'triple':
      return a.power * 1.2 + a.speed * 0.8 + 3
    case 'single':
    case 'bunt':
    case 'error':
    case 'fielders_choice':
      return a.contact * 1.3 + a.speed * 0.7 + 4
    case 'walk':
    case 'hbp':
    case 'sac_fly':
      return a.eye * 1.5 + a.contact * 0.4 + 3
    case 'stolen_base':
    case 'wild_pitch':
      return a.speed * 1.6 + a.eye * 0.3 + 2
    default:
      return a.contact + a.power + 3
  }
}

function defenseRating(
  kind: OffenseCardKind,
  pitcher: Player,
  fielders: Player[],
  setup: DefenseSetup,
): number {
  const p = effectiveAttrs(pitcher)
  const best = (fn: (a: ReturnType<typeof effectiveAttrs>) => number) =>
    Math.max(
      4,
      ...fielders.map((f) => fn(effectiveAttrs(f))),
    )

  let base = 0
  switch (kind) {
    case 'home_run':
    case 'double':
    case 'triple':
      base = p.stuff * 1.1 + best((a) => a.range) * 0.7
      break
    case 'single':
    case 'bunt':
    case 'error':
    case 'fielders_choice':
      base = p.stuff * 1.0 + best((a) => a.glove) * 0.7
      break
    case 'walk':
    case 'hbp':
      base = p.command * 1.4 + 2
      break
    case 'sac_fly':
      base = p.stuff * 0.9 + best((a) => a.range) * 0.6
      break
    case 'stolen_base':
    case 'wild_pitch': {
      const catcher = fielders.find((f) => f.position === 'C')
      const arm = catcher ? effectiveAttrs(catcher).arm : 5
      base = arm * 1.1 + p.command * 0.7
      break
    }
    default:
      base = p.stuff + p.command * 0.5
  }
  return base + setupBonus(setup, kind)
}

export interface ResolveResult {
  delta: number
  band: string
  printed: LadderStep | null
  outcome: LadderStep | 'walk' | 'hbp' | 'sac_fly' | 'sb' | 'wp' | 'out'
  namedOut: boolean
  softFail: boolean
  text: string
}

function outFromLadder(step: LadderStep): boolean {
  return step === 'LO' || step === 'FO' || step === 'GO' || step === 'K'
}

/** Map setup out cards to ladder steps they can name */
function namedOutFromSetup(setup: DefenseSetup): LadderStep | null {
  const cards = [
    setup.mound,
    setup.infield,
    setup.outfield,
    setup.baserunStop,
  ]
  for (const id of cards) {
    if (!id) continue
    const k = ALL_DEFS[id]?.kind
    if (k === 'strikeout') return 'K'
    if (k === 'ground_out' || k === 'double_play') return 'GO'
    if (k === 'fly_out') return 'FO'
    if (k === 'line_out') return 'LO'
  }
  return null
}

export function resolveOffenseEvent(
  cardId: string,
  batter: Player,
  pitcher: Player,
  fielders: Player[],
  setup: DefenseSetup,
  rand: () => number,
  softFailExtra = false,
): ResolveResult {
  const def = ALL_DEFS[cardId]
  const kind = def.kind as OffenseCardKind

  // Non-ladder events
  if (kind === 'walk' || kind === 'hbp') {
    const off = offenseRating(kind, batter)
    const defR = defenseRating(kind, pitcher, fielders, setup)
    const delta = clamp(off - defR, -6, 6)
    if (delta <= -2) {
      return {
        delta,
        band: delta <= -4 ? 'Dominated' : 'Smothered',
        printed: null,
        outcome: 'out',
        namedOut: true,
        softFail: false,
        text: `${def.name} denied — out.`,
      }
    }
    if (delta <= 0 && rand() < 0.45) {
      return {
        delta,
        band: 'Toss-up',
        printed: null,
        outcome: 'out',
        namedOut: false,
        softFail: false,
        text: `${def.name} chased — out.`,
      }
    }
    return {
      delta,
      band: delta >= 1 ? 'Clean' : 'Toss-up',
      printed: null,
      outcome: kind === 'walk' ? 'walk' : 'hbp',
      namedOut: false,
      softFail: false,
      text: `${def.name} — batter awarded first.`,
    }
  }

  if (kind === 'sac_fly') {
    return {
      delta: 0,
      band: 'Clean',
      printed: null,
      outcome: 'sac_fly',
      namedOut: false,
      softFail: false,
      text: 'Sacrifice fly.',
    }
  }

  if (kind === 'stolen_base') {
    const off = offenseRating(kind, batter)
    const defR = defenseRating(kind, pitcher, fielders, setup)
    const delta = clamp(off - defR, -6, 6)
    if (delta <= -1) {
      return {
        delta,
        band: 'Smothered',
        printed: null,
        outcome: 'out',
        namedOut: true,
        softFail: false,
        text: 'Caught stealing!',
      }
    }
    return {
      delta,
      band: 'Clean',
      printed: null,
      outcome: 'sb',
      namedOut: false,
      softFail: false,
      text: 'Stolen base!',
    }
  }

  if (kind === 'wild_pitch') {
    const off = offenseRating(kind, batter)
    const defR = defenseRating(kind, pitcher, fielders, setup)
    const delta = clamp(off - defR, -6, 6)
    if (delta <= -2) {
      return {
        delta,
        band: 'Smothered',
        printed: null,
        outcome: 'out',
        namedOut: false,
        softFail: false,
        text: 'Pitch held — no advance.',
      }
    }
    return {
      delta,
      band: 'Clean',
      printed: null,
      outcome: 'wp',
      namedOut: false,
      softFail: false,
      text: 'Wild pitch / passed ball — runners advance.',
    }
  }

  const printed = ladderFromOffenseKind(kind)
  if (!printed) {
    return {
      delta: 0,
      band: 'Clean',
      printed: null,
      outcome: '1B',
      namedOut: false,
      softFail: false,
      text: def.name,
    }
  }

  const off = offenseRating(kind, batter)
  const defR = defenseRating(kind, pitcher, fielders, setup)
  // Round so bands are stable; slight defense lean so Setup can earn outs
  const delta = clamp(Math.round(off - defR - 1), -6, 6)

  let stepsDown = 0
  let band = 'Clean'
  const softFail = softFailExtra

  if (softFailExtra) stepsDown += 1

  if (delta >= 4) band = 'Crush'
  else if (delta >= 1) band = 'Clean'
  else if (delta === 0) {
    band = 'Toss-up'
    // Leap toward outs so empty-Setup innings still end
    stepsDown += rand() < 0.5 ? 2 : 3
  } else if (delta >= -3) {
    band = 'Smothered'
    stepsDown += 3
  } else {
    band = 'Dominated'
    stepsDown += 4
  }

  // Clean contact: Setup out cards still get a cut (~half)
  if (band === 'Clean' && namedOutFromSetup(setup) && rand() < 0.5) {
    stepsDown += 2
  }

  let outcome = stepLadder(printed, stepsDown)
  let namedOut = false
  const named = namedOutFromSetup(setup)

  // Spent out naming (prototype default): Delta ≤ −1 names if at/below step;
  // Toss-up always; Clean ~55%.
  const canName =
    !!named &&
    (delta <= -1 || delta === 0 || (delta >= 1 && delta <= 3 && rand() < 0.55))

  if (canName && named) {
    const outIdx = FAIL_LADDER.indexOf(named)
    const curIdx = FAIL_LADDER.indexOf(outcome)
    if (outIdx >= curIdx) {
      outcome = named
      namedOut = true
    }
  }

  // Guarantee outs when Defense wins the Delta hard
  if (!outFromLadder(outcome) && delta <= -1) {
    outcome = named ?? 'GO'
    namedOut = !!named
  }

  return {
    delta,
    band,
    printed,
    outcome,
    namedOut,
    softFail,
    text: `${def.name} [${band} Δ${delta >= 0 ? '+' : ''}${delta}] → ${outcome}${namedOut ? ' (named)' : ''}${softFail ? ' (soft-fail)' : ''}`,
  }
}
