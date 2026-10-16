export type CardType =
  | 'hit'
  | 'swing'
  | 'scoreboard'
  | 'brushback'
  | 'leather'
  | 'junk'

export type CardId =
  | 'strike-looking'
  | 'single'
  | 'double'
  | 'home-run'
  | 'rally-cap'
  | 'pennant'
  | 'championship'
  | 'bunt'
  | 'stolen-base'
  | 'cleanup-hitter'
  | 'box-score'
  | 'bullpen-phone'
  | 'beanball'
  | 'dive-catch'
  | 'clutch-hit'
  | 'on-base-machine'
  | 'seventh-inning-stretch'

export interface CardDef {
  id: CardId
  name: string
  cost: number
  types: CardType[]
  runs?: number
  text: string
}

export const CARDS: Record<CardId, CardDef> = {
  'strike-looking': {
    id: 'strike-looking',
    name: 'Strike Looking',
    cost: 0,
    types: ['junk'],
    runs: -1,
    text: '−1 Run at end of game.',
  },
  single: {
    id: 'single',
    name: 'Single',
    cost: 0, // locked default: free to Sign (Copper analogue)
    types: ['hit'],
    text: '+1 Contact.',
  },
  double: {
    id: 'double',
    name: 'Double',
    cost: 4,
    types: ['hit'],
    text: '+2 Contact.',
  },
  'home-run': {
    id: 'home-run',
    name: 'Home Run',
    cost: 6,
    types: ['hit'],
    text: '+3 Contact.',
  },
  'rally-cap': {
    id: 'rally-cap',
    name: 'Rally Cap',
    cost: 2,
    types: ['scoreboard'],
    runs: 1,
    text: '1 Run.',
  },
  pennant: {
    id: 'pennant',
    name: 'Pennant',
    cost: 5,
    types: ['scoreboard'],
    runs: 3,
    text: '3 Runs.',
  },
  championship: {
    id: 'championship',
    name: 'Championship',
    cost: 8,
    types: ['scoreboard'],
    runs: 6,
    text: '6 Runs. End-game pile.',
  },
  bunt: {
    id: 'bunt',
    name: 'Bunt',
    cost: 2,
    types: ['swing'],
    text: '+1 Card, +1 Contact.',
  },
  'stolen-base': {
    id: 'stolen-base',
    name: 'Stolen Base',
    cost: 3,
    types: ['swing'],
    text: '+2 Cards. +1 Swing if you played a Hit this at-bat.',
  },
  'cleanup-hitter': {
    id: 'cleanup-hitter',
    name: 'Cleanup Hitter',
    cost: 5,
    types: ['swing'],
    text: '+1 Card, +1 Swing, +1 Contact.',
  },
  'box-score': {
    id: 'box-score',
    name: 'Box Score',
    cost: 3,
    types: ['swing'],
    text: 'Look at top 3. Put one in hand, rest back in any order.',
  },
  'bullpen-phone': {
    id: 'bullpen-phone',
    name: 'Bullpen Phone',
    cost: 4,
    types: ['swing'],
    text: 'Trash a card from hand. +2 Contact.',
  },
  beanball: {
    id: 'beanball',
    name: 'Beanball',
    cost: 4,
    types: ['swing', 'brushback'],
    text: '+2 Contact. Each other player gains a Strike Looking.',
  },
  'dive-catch': {
    id: 'dive-catch',
    name: 'Dive Catch',
    cost: 2,
    types: ['leather'],
    text: 'Reveal to cancel a Brushback against you, then discard.',
  },
  'clutch-hit': {
    id: 'clutch-hit',
    name: 'Clutch Hit',
    cost: 5,
    types: ['swing', 'hit'],
    text: '+2 Contact. +1 Card if you have 2+ Scoreboards in hand.',
  },
  'on-base-machine': {
    id: 'on-base-machine',
    name: 'On-Base Machine',
    cost: 5,
    types: ['swing'],
    text: 'Gain a Single to hand. +1 Swing.',
  },
  'seventh-inning-stretch': {
    id: 'seventh-inning-stretch',
    name: 'Seventh-Inning Stretch',
    cost: 5,
    types: ['swing'],
    text: '+2 Cards, +1 Signing. Each other player draws 1.',
  },
}

export const STARTER_KINGDOM: CardId[] = [
  'bunt',
  'stolen-base',
  'cleanup-hitter',
  'box-score',
  'bullpen-phone',
  'beanball',
  'dive-catch',
  'clutch-hit',
  'on-base-machine',
  'seventh-inning-stretch',
]

export const BASIC_SUPPLY: CardId[] = [
  'strike-looking',
  'single',
  'double',
  'home-run',
  'rally-cap',
  'pennant',
  'championship',
]

export function isHit(id: CardId): boolean {
  return CARDS[id].types.includes('hit')
}

export function isSwing(id: CardId): boolean {
  return CARDS[id].types.includes('swing')
}

export function isScoreboard(id: CardId): boolean {
  return CARDS[id].types.includes('scoreboard')
}

export function isBrushback(id: CardId): boolean {
  return CARDS[id].types.includes('brushback')
}

export function isLeather(id: CardId): boolean {
  return CARDS[id].types.includes('leather')
}
