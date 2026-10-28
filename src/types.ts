/** Baseball Deck v2 — shared types */

export type Side = 'home' | 'away'
export type Position =
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'DH'
  | 'SP'
  | 'RP'

export type AttrKey =
  | 'contact'
  | 'power'
  | 'eye'
  | 'speed'
  | 'arm'
  | 'glove'
  | 'range'
  | 'stuff'
  | 'command'
  | 'durability'

export type Attrs = Record<AttrKey, number>

export type OffenseCardKind =
  | 'single'
  | 'walk'
  | 'double'
  | 'home_run'
  | 'hbp'
  | 'triple'
  | 'sac_fly'
  | 'stolen_base'
  | 'wild_pitch'
  | 'error'
  | 'fielders_choice'
  | 'bunt'

export type DefenseCardKind =
  | 'strikeout'
  | 'ground_out'
  | 'fly_out'
  | 'line_out'
  | 'double_play'
  | 'caught_stealing'
  | 'intentional_walk'
  | 'pitchout'
  | 'infield_in'
  | 'high_heat'
  | 'paint_corner'
  | 'dive_catch'

export type SetupSlot = 'mound' | 'infield' | 'outfield' | 'baserunStop'

export type CardFamily = 'offense' | 'defense'

export interface CardDef {
  id: string
  family: CardFamily
  kind: OffenseCardKind | DefenseCardKind
  name: string
  text: string
  /** Defense setup slot when applicable */
  setupSlot?: SetupSlot
  /** Pool count in shared market */
  poolCount: number
  tags: string[]
}

export interface Player {
  id: string
  name: string
  position: Position
  attrs: Attrs
  /** Game Ding: attr reduced for rest of game */
  ding?: { attr: AttrKey; amount: number }
}

export interface ClubColors {
  primary: string
  secondary: string
  accent: string
  cream?: string
}

export interface Club {
  id: string
  city: string
  colors: ClubColors
  archetype: string
  roster: Player[]
}

export type Phase =
  | 'setup' // pick clubs / DH
  | 'defense'
  | 'offense'
  | 'free_agency'
  | 'game_over'

export type LadderStep =
  | 'HR'
  | '3B'
  | '2B'
  | '1B'
  | 'Error/FC'
  | 'LO'
  | 'FO'
  | 'GO'
  | 'K'

export interface Bases {
  first: boolean
  second: boolean
  third: boolean
}

export interface DefenseSetup {
  mound: string | null
  infield: string | null
  outfield: string | null
  baserunStop: string | null
}

export interface TeamState {
  side: Side
  clubId: string
  lineup: string[] // player ids in batting order
  pitcherId: string
  dhOn: boolean
  offenseBag: string[]
  offenseHand: string[]
  offenseDiscard: string[]
  defenseBag: string[]
  defenseHand: string[]
  defenseDiscard: string[]
  setup: DefenseSetup
  runs: number
  hits: number
  errors: number
  lineupIndex: number
  baserunUsedThisSet: boolean
  picksThisWindow: number
}

export interface MarketState {
  offenseFaceUp: string[]
  defenseFaceUp: string[]
  offensePool: string[]
  defensePool: string[]
}

export interface LogEntry {
  id: number
  text: string
}

export interface GameState {
  phase: Phase
  inning: number // 1-based; extras > 9
  half: 'top' | 'bottom'
  /** Whose set is active during defense/offense */
  acting: Side
  outs: number
  bases: Bases
  home: TeamState
  away: TeamState
  market: MarketState
  dhDefault: boolean
  log: LogEntry[]
  winner: Side | 'tie' | null
  endReason: string | null
  /** Free agency pick order queue of sides */
  faOrder: Side[]
  faActive: Side | null
  lastResult: string | null
  nextLogId: number
  rngSeed: number
}
