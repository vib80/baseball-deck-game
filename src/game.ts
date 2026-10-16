import {
  BASIC_SUPPLY,
  CARDS,
  STARTER_KINGDOM,
  isHit,
  isScoreboard,
  isSwing,
} from './cards'
import type { CardId } from './cards'

export type Phase =
  | 'at-bat'
  | 'signing'
  | 'box-score'
  | 'bullpen-phone'
  | 'pass'
  | 'game-over'

export interface PlayerState {
  name: string
  deck: CardId[]
  hand: CardId[]
  dugout: CardId[]
  inPlay: CardId[]
  trash: CardId[]
}

export interface GameState {
  players: [PlayerState, PlayerState]
  current: 0 | 1
  phase: Phase
  swings: number
  signings: number
  contact: number
  playedHit: boolean
  supply: Record<CardId, number>
  log: string[]
  pendingBrushback: CardId | null
  boxScoreReveal: CardId[]
  winner: string | null
  scores: [number, number] | null
  gameEnding: boolean
}

function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function supplyCount(id: CardId, players = 2): number {
  switch (id) {
    case 'strike-looking':
      return 10 * players
    case 'single':
      return 46
    case 'double':
    case 'home-run':
      return 20
    case 'rally-cap':
    case 'pennant':
    case 'championship':
      return 8
    default:
      // 2-player: 8 copies of each kingdom
      return 8
  }
}

function startingDeck(): CardId[] {
  return shuffle([
    ...Array(7).fill('single'),
    ...Array(3).fill('rally-cap'),
  ] as CardId[])
}

function draw(player: PlayerState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (player.deck.length === 0) {
      if (player.dugout.length === 0) return
      player.deck = shuffle(player.dugout)
      player.dugout = []
    }
    const c = player.deck.pop()
    if (c) player.hand.push(c)
  }
}

function emptyPiles(supply: Record<CardId, number>): number {
  return Object.values(supply).filter((n) => n === 0).length
}

function checkEnd(state: GameState): boolean {
  if (state.supply.championship === 0) return true
  if (emptyPiles(state.supply) >= 3) return true
  return false
}

function pushLog(state: GameState, msg: string): void {
  state.log = [msg, ...state.log].slice(0, 40)
}

export function createGame(): GameState {
  const supply: Record<CardId, number> = {} as Record<CardId, number>
  for (const id of [...BASIC_SUPPLY, ...STARTER_KINGDOM]) {
    supply[id] = supplyCount(id)
  }

  const makePlayer = (name: string): PlayerState => {
    const deck = startingDeck()
    const p: PlayerState = {
      name,
      deck,
      hand: [],
      dugout: [],
      inPlay: [],
      trash: [],
    }
    draw(p, 5)
    return p
  }

  return {
    players: [makePlayer('Player 1'), makePlayer('Player 2')],
    current: 0,
    phase: 'at-bat',
    swings: 1,
    signings: 1,
    contact: 0,
    playedHit: false,
    supply,
    log: ['Play ball! Player 1 is up.'],
    pendingBrushback: null,
    boxScoreReveal: [],
    winner: null,
    scores: null,
    gameEnding: false,
  }
}

function other(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0
}

function gainCard(
  state: GameState,
  playerIndex: 0 | 1,
  id: CardId,
  to: 'dugout' | 'hand' = 'dugout',
): boolean {
  if ((state.supply[id] ?? 0) <= 0) return false
  state.supply[id]--
  if (to === 'hand') state.players[playerIndex].hand.push(id)
  else state.players[playerIndex].dugout.push(id)
  if (checkEnd(state)) state.gameEnding = true
  return true
}

function scorePlayer(p: PlayerState): number {
  const all = [...p.deck, ...p.hand, ...p.dugout, ...p.inPlay]
  return all.reduce((sum, id) => sum + (CARDS[id].runs ?? 0), 0)
}

function finalizeGame(state: GameState): GameState {
  const scores: [number, number] = [
    scorePlayer(state.players[0]),
    scorePlayer(state.players[1]),
  ]
  let winner: string
  if (scores[0] !== scores[1]) {
    winner = scores[0] > scores[1] ? state.players[0].name : state.players[1].name
  } else {
    const d0 =
      state.players[0].deck.length +
      state.players[0].hand.length +
      state.players[0].dugout.length
    const d1 =
      state.players[1].deck.length +
      state.players[1].hand.length +
      state.players[1].dugout.length
    if (d0 !== d1) winner = d0 < d1 ? state.players[0].name : state.players[1].name
    else winner = 'Tie'
  }
  return {
    ...state,
    phase: 'game-over',
    scores,
    winner,
    log: [`Final: ${state.players[0].name} ${scores[0]} – ${scores[1]} ${state.players[1].name}. ${winner === 'Tie' ? 'Tie!' : `${winner} wins!`}`, ...state.log],
  }
}

function applyBrushback(state: GameState, attacker: 0 | 1, card: CardId): GameState {
  const defender = other(attacker)
  const def = state.players[defender]
  const leatherIdx = def.hand.findIndex((c) => c === 'dive-catch')
  if (leatherIdx >= 0) {
    // Auto-reveal Dive Catch: cancel, then discard leather
    const [leather] = def.hand.splice(leatherIdx, 1)
    def.dugout.push(leather)
    pushLog(state, `${def.name} Dive Catches the ${CARDS[card].name}!`)
    return { ...state }
  }

  if (card === 'beanball') {
    if (gainCard(state, defender, 'strike-looking', 'dugout')) {
      pushLog(state, `${def.name} takes a Strike Looking.`)
    }
  }
  return { ...state }
}

export function playCard(state: GameState, handIndex: number): GameState {
  if (state.phase !== 'at-bat') return state
  const s = structuredClone(state) as GameState
  const p = s.players[s.current]
  const id = p.hand[handIndex]
  if (!id) return state

  const def = CARDS[id]

  if (isSwing(id)) {
    if (s.swings <= 0) return state
    s.swings--
  } else if (isHit(id)) {
    // pure hits are free during at-bat
  } else {
    // leather / scoreboard / junk not playable as actions
    return state
  }

  p.hand.splice(handIndex, 1)
  p.inPlay.push(id)
  pushLog(s, `${p.name} plays ${def.name}.`)

  if (isHit(id)) s.playedHit = true

  switch (id) {
    case 'single':
      s.contact += 1
      break
    case 'double':
      s.contact += 2
      break
    case 'home-run':
      s.contact += 3
      break
    case 'bunt':
      draw(p, 1)
      s.contact += 1
      break
    case 'stolen-base':
      draw(p, 2)
      if (s.playedHit) s.swings += 1
      break
    case 'cleanup-hitter':
      draw(p, 1)
      s.swings += 1
      s.contact += 1
      break
    case 'box-score': {
      const revealed: CardId[] = []
      for (let i = 0; i < 3; i++) {
        if (p.deck.length === 0) {
          if (p.dugout.length === 0) break
          p.deck = shuffle(p.dugout)
          p.dugout = []
        }
        const c = p.deck.pop()
        if (c) revealed.push(c)
      }
      s.boxScoreReveal = revealed
      s.phase = 'box-score'
      break
    }
    case 'bullpen-phone':
      s.phase = 'bullpen-phone'
      s.contact += 2 // contact granted after trash choice; grant now for simplicity if no cards
      break
    case 'beanball':
      s.contact += 2
      applyBrushback(s, s.current, 'beanball')
      break
    case 'clutch-hit': {
      s.contact += 2
      s.playedHit = true
      const scoreboardsInHand = p.hand.filter(isScoreboard).length
      if (scoreboardsInHand >= 2) draw(p, 1)
      break
    }
    case 'on-base-machine':
      if (gainCard(s, s.current, 'single', 'hand')) {
        pushLog(s, `${p.name} gains a Single to hand.`)
      }
      s.swings += 1
      break
    case 'seventh-inning-stretch': {
      draw(p, 2)
      s.signings += 1
      const o = s.players[other(s.current)]
      draw(o, 1)
      pushLog(s, `${o.name} draws 1 from Seventh-Inning Stretch.`)
      break
    }
    default:
      break
  }

  return s
}

export function resolveBoxScore(
  state: GameState,
  keepIndex: number,
  restOrder: number[],
): GameState {
  if (state.phase !== 'box-score') return state
  const s = structuredClone(state) as GameState
  const p = s.players[s.current]
  const revealed = s.boxScoreReveal
  if (keepIndex < 0 || keepIndex >= revealed.length) return state
  const keep = revealed[keepIndex]
  p.hand.push(keep)
  // restOrder: indices of non-kept cards, first = deepest, last = top
  const ordered =
    restOrder.length > 0
      ? restOrder.filter((i) => i !== keepIndex).map((i) => revealed[i])
      : revealed.filter((_, i) => i !== keepIndex)
  for (const c of ordered) p.deck.push(c)
  s.boxScoreReveal = []
  s.phase = 'at-bat'
  pushLog(s, `${p.name} keeps ${CARDS[keep].name} from Box Score.`)
  return s
}

export function resolveBullpenPhone(state: GameState, handIndex: number): GameState {
  if (state.phase !== 'bullpen-phone') return state
  const s = structuredClone(state) as GameState
  const p = s.players[s.current]
  if (handIndex < 0 || handIndex >= p.hand.length) {
    // nothing to trash — just return to at-bat (contact already granted)
    s.phase = 'at-bat'
    return s
  }
  const [trashed] = p.hand.splice(handIndex, 1)
  p.trash.push(trashed)
  s.phase = 'at-bat'
  pushLog(s, `${p.name} trashes ${CARDS[trashed].name} via Bullpen Phone.`)
  return s
}

export function skipBullpenTrash(state: GameState): GameState {
  if (state.phase !== 'bullpen-phone') return state
  const s = structuredClone(state) as GameState
  s.phase = 'at-bat'
  pushLog(s, `${s.players[s.current].name} has nothing to trash.`)
  return s
}

export function goToSigning(state: GameState): GameState {
  if (state.phase !== 'at-bat') return state
  const s = structuredClone(state) as GameState
  s.phase = 'signing'
  pushLog(s, `${s.players[s.current].name} goes to Signing (${s.contact} Contact, ${s.signings} Signing).`)
  return s
}

export function signCard(state: GameState, id: CardId): GameState {
  if (state.phase !== 'signing') return state
  if (id === 'strike-looking') return state // not voluntarily signable
  if (state.signings <= 0) return state
  const cost = CARDS[id].cost
  if (state.contact < cost) return state
  if ((state.supply[id] ?? 0) <= 0) return state

  const s = structuredClone(state) as GameState
  s.contact -= cost
  s.signings--
  gainCard(s, s.current, id, 'dugout')
  pushLog(s, `${s.players[s.current].name} signs ${CARDS[id].name} for ${cost}.`)
  return s
}

export function endSigning(state: GameState): GameState {
  if (state.phase !== 'signing') return state
  const s = structuredClone(state) as GameState
  if (s.gameEnding) {
    return finalizeGame(s)
  }
  s.phase = 'pass'
  pushLog(s, `${s.players[s.current].name} finishes the at-bat. Pass the device.`)
  return s
}

export function confirmPass(state: GameState): GameState {
  if (state.phase !== 'pass') return state
  const s = structuredClone(state) as GameState
  const p = s.players[s.current]
  // Cleanup
  p.dugout.push(...p.inPlay, ...p.hand)
  p.inPlay = []
  p.hand = []
  draw(p, 5)

  s.current = other(s.current)
  s.phase = 'at-bat'
  s.swings = 1
  s.signings = 1
  s.contact = 0
  s.playedHit = false
  s.pendingBrushback = null
  s.boxScoreReveal = []
  pushLog(s, `${s.players[s.current].name} steps in.`)
  return s
}

export function countRuns(p: PlayerState): number {
  return scorePlayer(p)
}

export { STARTER_KINGDOM, BASIC_SUPPLY }
