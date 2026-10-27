import {
  ALL_DEFS,
  DEFENSE_DEFS,
  OFFENSE_DEFS,
  STARTER_DEFENSE,
  STARTER_OFFENSE,
  buildPool,
  isBaserunEvent,
  isPaEvent,
} from '../data/cards'
import {
  CLUB_BY_ID,
  defaultLineup,
  defaultPitcher,
  effectiveAttrs,
  getPlayer,
} from '../data/clubs'
import type {
  Bases,
  DefenseSetup,
  GameState,
  LadderStep,
  Side,
  TeamState,
} from '../types'
import {
  advanceAll,
  anyRunners,
  emptyBases,
  fieldersChoice,
  sacFly,
  stealAdvance,
  walkAdvance,
} from './diamond'
import { buyEligibility, playGateOk } from './eligibility'
import { resolveOffenseEvent } from './resolution'
import { drawN, mulberry32, shuffle } from './rng'

function emptySetup(): DefenseSetup {
  return { mound: null, infield: null, outfield: null, baserunStop: null }
}

function teamFromClub(
  side: Side,
  clubId: string,
  dhOn: boolean,
  rand: () => number,
): TeamState {
  const club = CLUB_BY_ID[clubId]
  const lineup = defaultLineup(club, dhOn)
  const pitcherId = defaultPitcher(club)
  let offBag = shuffle([...STARTER_OFFENSE], rand)
  let defBag = shuffle([...STARTER_DEFENSE], rand)
  const offDraw = drawN(offBag, 5, [], rand)
  offBag = offDraw.bag
  const defDraw = drawN(defBag, 5, [], rand)
  defBag = defDraw.bag
  return {
    side,
    clubId,
    lineup,
    pitcherId,
    dhOn,
    offenseBag: offBag,
    offenseHand: offDraw.drawn,
    offenseDiscard: [],
    defenseBag: defBag,
    defenseHand: defDraw.drawn,
    defenseDiscard: [],
    setup: emptySetup(),
    runs: 0,
    hits: 0,
    errors: 0,
    lineupIndex: 0,
    baserunUsedThisSet: false,
    picksThisWindow: 0,
  }
}

function log(state: GameState, text: string): GameState {
  return {
    ...state,
    log: [{ id: state.nextLogId, text }, ...state.log].slice(0, 40),
    nextLogId: state.nextLogId + 1,
    lastResult: text,
  }
}

function team(state: GameState, side: Side): TeamState {
  return side === 'home' ? state.home : state.away
}

function setTeam(state: GameState, side: Side, t: TeamState): GameState {
  return side === 'home' ? { ...state, home: t } : { ...state, away: t }
}

function opposing(side: Side): Side {
  return side === 'home' ? 'away' : 'home'
}

function refillHand(
  t: TeamState,
  which: 'offense' | 'defense',
  rand: () => number,
): TeamState {
  const need = 5 - (which === 'offense' ? t.offenseHand.length : t.defenseHand.length)
  if (need <= 0) return t
  if (which === 'offense') {
    const d = drawN(t.offenseBag, need, t.offenseDiscard, rand)
    return {
      ...t,
      offenseBag: d.bag,
      offenseDiscard: d.discard,
      offenseHand: [...t.offenseHand, ...d.drawn],
    }
  }
  const d = drawN(t.defenseBag, need, t.defenseDiscard, rand)
  return {
    ...t,
    defenseBag: d.bag,
    defenseDiscard: d.discard,
    defenseHand: [...t.defenseHand, ...d.drawn],
  }
}

function spendSetup(t: TeamState): TeamState {
  const spent: string[] = []
  for (const slot of ['mound', 'infield', 'outfield', 'baserunStop'] as const) {
    if (t.setup[slot]) spent.push(t.setup[slot]!)
  }
  return {
    ...t,
    setup: emptySetup(),
    defenseDiscard: [...t.defenseDiscard, ...spent],
  }
}

function currentBatter(state: GameState, offenseSide: Side) {
  const t = team(state, offenseSide)
  const pid = t.lineup[t.lineupIndex % t.lineup.length]
  return getPlayer(t.clubId, pid)!
}

function defenseFielders(state: GameState, defenseSide: Side) {
  const t = team(state, defenseSide)
  const club = CLUB_BY_ID[t.clubId]
  return club.roster.filter((p) => p.position !== 'SP' && p.position !== 'RP')
}

function applyLadderToDiamond(
  outcome: LadderStep | 'walk' | 'hbp' | 'sac_fly' | 'sb' | 'wp' | 'out',
  bases: Bases,
  outs: number,
): { bases: Bases; outs: number; runs: number; hit: boolean; error: boolean } {
  if (outcome === 'out' || outcome === 'K' || outcome === 'GO' || outcome === 'FO' || outcome === 'LO') {
    return { bases, outs: outs + 1, runs: 0, hit: false, error: false }
  }
  if (outcome === 'walk' || outcome === 'hbp') {
    const r = walkAdvance(bases)
    return { bases: r.bases, outs, runs: r.runs, hit: false, error: false }
  }
  if (outcome === 'sac_fly') {
    const r = sacFly(bases, outs)
    return { bases: r.bases, outs: r.outs, runs: r.runs, hit: false, error: false }
  }
  if (outcome === 'sb') {
    const r = stealAdvance(bases)
    return { bases: r.bases, outs, runs: r.runs, hit: false, error: false }
  }
  if (outcome === 'wp') {
    const r = advanceAll(bases, 1, 0)
    return { bases: r.bases, outs, runs: r.runs, hit: false, error: false }
  }
  if (outcome === 'HR') {
    const r = advanceAll(bases, 4, 4)
    return { bases: r.bases, outs, runs: r.runs, hit: true, error: false }
  }
  if (outcome === '3B') {
    const r = advanceAll(bases, 3, 3)
    return { bases: r.bases, outs, runs: r.runs, hit: true, error: false }
  }
  if (outcome === '2B') {
    const r = advanceAll(bases, 2, 2)
    return { bases: r.bases, outs, runs: r.runs, hit: true, error: false }
  }
  if (outcome === '1B') {
    const r = advanceAll(bases, 1, 1)
    return { bases: r.bases, outs, runs: r.runs, hit: true, error: false }
  }
  if (outcome === 'Error/FC') {
    // treat as error reach for simplicity when from ladder
    const r = advanceAll(bases, 1, 1)
    return { bases: r.bases, outs, runs: r.runs, hit: false, error: true }
  }
  return { bases, outs, runs: 0, hit: false, error: false }
}

export function createSetupState(seed = Date.now()): GameState {
  const marketOff = shuffle(buildPool(OFFENSE_DEFS), mulberry32(seed))
  const marketDef = shuffle(buildPool(DEFENSE_DEFS), mulberry32(seed + 1))
  // Remove starter commons quantities from pools lightly (approximate)
  return {
    phase: 'setup',
    inning: 1,
    half: 'top',
    acting: 'home',
    outs: 0,
    bases: emptyBases(),
    home: null as unknown as TeamState,
    away: null as unknown as TeamState,
    market: {
      offenseFaceUp: [],
      defenseFaceUp: [],
      offensePool: marketOff,
      defensePool: marketDef,
    },
    dhDefault: true,
    log: [],
    winner: null,
    endReason: null,
    faOrder: [],
    faActive: null,
    lastResult: null,
    nextLogId: 1,
    rngSeed: seed,
  }
}

export interface StartGameOpts {
  homeClubId: string
  awayClubId: string
  dhOn?: boolean
  seed?: number
}

export function startGame(opts: StartGameOpts): GameState {
  const seed = opts.seed ?? Date.now()
  const rand = mulberry32(seed)
  const dhOn = opts.dhOn ?? true
  let state = createSetupState(seed)
  state = {
    ...state,
    phase: 'defense',
    inning: 1,
    half: 'top',
    acting: 'home',
    dhDefault: dhOn,
    home: teamFromClub('home', opts.homeClubId, dhOn, rand),
    away: teamFromClub('away', opts.awayClubId, dhOn, rand),
    rngSeed: seed ^ 0x9e3779b9,
  }
  state = log(
    state,
    `${CLUB_BY_ID[opts.awayClubId].city} @ ${CLUB_BY_ID[opts.homeClubId].city} — DH ${dhOn ? 'ON' : 'OFF'}. Home Defense sets for top 1.`,
  )
  return state
}

function nextRand(state: GameState): { state: GameState; rand: () => number } {
  const seed = (state.rngSeed + 0x6d2b79f5) >>> 0
  return { state: { ...state, rngSeed: seed }, rand: mulberry32(seed) }
}

/** Play up to 3 defense cards into setup slots */
export function playDefenseCard(
  state: GameState,
  cardId: string,
): GameState {
  if (state.phase !== 'defense') return state
  const side = state.acting
  let t = team(state, side)
  if (!t.defenseHand.includes(cardId)) return state
  const def = ALL_DEFS[cardId]
  if (!def || def.family !== 'defense') return state

  const slot = def.setupSlot ?? 'mound'
  const primaryFilled = [t.setup.mound, t.setup.infield, t.setup.outfield].filter(
    Boolean,
  ).length

  // Place in the card's own slot (replace if occupied). Cap 3 primary slots.
  if (slot !== 'baserunStop') {
    if (!t.setup[slot] && primaryFilled >= 3) return state
  }

  const replaced = t.setup[slot] as string | null
  // Prefer removing this instance from hand (first match)
  const idx = t.defenseHand.indexOf(cardId)
  if (idx < 0) return state
  const hand = [...t.defenseHand.slice(0, idx), ...t.defenseHand.slice(idx + 1)]
  const setup = { ...t.setup, [slot]: cardId }
  t = {
    ...t,
    defenseHand: hand,
    setup,
    defenseDiscard: replaced ? [...t.defenseDiscard, replaced] : t.defenseDiscard,
  }
  let s = setTeam(state, side, t)
  s = log(s, `${side === 'home' ? 'Home' : 'Away'} sets ${def.name} → ${slot}.`)
  return s
}

export function endDefenseSet(state: GameState): GameState {
  if (state.phase !== 'defense') return state
  const defenseSide = state.acting
  const offenseSide = opposing(defenseSide)
  let { state: s, rand } = nextRand(state)

  // Offense refill
  let off = refillHand(team(s, offenseSide), 'offense', rand)
  off = { ...off, baserunUsedThisSet: false }
  s = setTeam(s, offenseSide, off)
  s = {
    ...s,
    phase: 'offense',
    acting: offenseSide,
    outs: 0,
    bases: emptyBases(),
    half: offenseSide === 'away' ? 'top' : 'bottom',
  }
  const batter = currentBatter(s, offenseSide)
  s = log(
    s,
    `${offenseSide === 'away' ? 'Away' : 'Home'} Offense — ${batter.name} at the plate. Bases empty, 0 outs.`,
  )
  return s
}

function advanceLineup(t: TeamState): TeamState {
  return { ...t, lineupIndex: (t.lineupIndex + 1) % t.lineup.length }
}

function checkWalkOff(state: GameState, homeRunsBefore: number): GameState | null {
  // Bottom 9+ : Home goes strictly ahead → walk-off
  if (state.half !== 'bottom') return null
  if (state.inning < 9) return null
  if (state.home.runs > state.away.runs && state.home.runs > homeRunsBefore) {
    return {
      ...state,
      phase: 'game_over',
      winner: 'home',
      endReason: `Walk-off! Final ${state.away.runs}–${state.home.runs}`,
    }
  }
  return null
}

function endOffenseSet(state: GameState): GameState {
  let s = state
  const offenseSide = s.acting
  const defenseSide = opposing(offenseSide)

  // Spend defense setup
  s = setTeam(s, defenseSide, spendSetup(team(s, defenseSide)))

  // Completed half-inning
  if (offenseSide === 'away') {
    // Top done → check 8.5 after top of 9+
    if (s.inning >= 9 && s.home.runs > s.away.runs) {
      s = {
        ...s,
        phase: 'game_over',
        winner: 'home',
        endReason: `Home wins after ${s.inning - 1}.5 — ${s.away.runs}–${s.home.runs}`,
      }
      return log(s, s.endReason!)
    }
    // Away Defense for bottom
    let { state: s2, rand } = nextRand(s)
    s = s2
    let def = refillHand(team(s, 'away'), 'defense', rand)
    s = setTeam(s, 'away', def)
    s = { ...s, phase: 'defense', acting: 'away', half: 'bottom', outs: 0, bases: emptyBases() }
    return log(s, `End of top ${s.inning}. Away Defense sets for bottom.`)
  }

  // Bottom done → inning complete → Free Agency (unless game should end)
  if (s.inning >= 9) {
    if (s.home.runs !== s.away.runs) {
      const winner: Side = s.home.runs > s.away.runs ? 'home' : 'away'
      s = {
        ...s,
        phase: 'game_over',
        winner,
        endReason: `Final after ${s.inning}: Away ${s.away.runs} – Home ${s.home.runs}`,
      }
      return log(s, s.endReason!)
    }
    // Tie → extras: next inning, Home Defense
    return beginNextInning(s, true)
  }

  return beginFreeAgency(s)
}

function dealMarket(state: GameState, rand: () => number): GameState {
  let offPool = [...state.market.offensePool]
  let defPool = [...state.market.defensePool]
  const take = (pool: string[], n: number) => {
    const out: string[] = []
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.floor(rand() * pool.length)
      out.push(pool.splice(idx, 1)[0])
    }
    return out
  }
  // Return previous face-up to bottom
  offPool = [...offPool, ...state.market.offenseFaceUp]
  defPool = [...defPool, ...state.market.defenseFaceUp]
  const offenseFaceUp = take(offPool, 2)
  const defenseFaceUp = take(defPool, 2)
  return {
    ...state,
    market: { offenseFaceUp, defenseFaceUp, offensePool: offPool, defensePool: defPool },
  }
}

function beginFreeAgency(state: GameState): GameState {
  let { state: s, rand } = nextRand(state)
  s = dealMarket(s, rand)
  // Trail first; tie → Home
  const homeRuns = s.home.runs
  const awayRuns = s.away.runs
  let order: Side[]
  if (awayRuns < homeRuns) order = ['away', 'home', 'away', 'home']
  else if (homeRuns < awayRuns) order = ['home', 'away', 'home', 'away']
  else order = ['home', 'away', 'home', 'away']

  s = setTeam(s, 'home', { ...s.home, picksThisWindow: 0 })
  s = setTeam(s, 'away', { ...s.away, picksThisWindow: 0 })
  s = {
    ...s,
    phase: 'free_agency',
    faOrder: order,
    faActive: order[0],
  }
  return log(
    s,
    `End of inning ${s.inning}. Free Agency — market 2 Off + 2 Def. Trail picks first.`,
  )
}

function beginNextInning(state: GameState, extras = false): GameState {
  let { state: s, rand } = nextRand(state)
  const nextInning = s.inning + 1
  let home = refillHand(s.home, 'defense', rand)
  s = {
    ...s,
    home,
    inning: nextInning,
    half: 'top',
    phase: 'defense',
    acting: 'home',
    outs: 0,
    bases: emptyBases(),
    faOrder: [],
    faActive: null,
  }
  return log(
    s,
    extras
      ? `Extras! Inning ${nextInning} — Home Defense.`
      : `Inning ${nextInning} — Home Defense.`,
  )
}

export function finishFreeAgency(state: GameState): GameState {
  if (state.phase !== 'free_agency') return state
  return beginNextInning(state)
}

export function passFreeAgencyPick(state: GameState): GameState {
  if (state.phase !== 'free_agency' || !state.faActive) return state
  const side = state.faActive
  const t = team(state, side)
  // Mark as done (2 picks used) so they can't take more
  let s = setTeam(state, side, { ...t, picksThisWindow: 2 })
  return advanceFaOrder(s)
}

function advanceFaOrder(state: GameState): GameState {
  // Both sides done if each has picksThisWindow >= 1 and no one wants more,
  // or both at 2, or order exhausted with both having ≥1 pick opportunity used.
  const homeDone = state.home.picksThisWindow >= 2 ||
    (state.home.picksThisWindow >= 1 && !canSideStillPick(state, 'home'))
  const awayDone = state.away.picksThisWindow >= 2 ||
    (state.away.picksThisWindow >= 1 && !canSideStillPick(state, 'away'))

  // Simpler: walk faOrder; skip sides that already have 2 picks
  const remaining = state.faOrder.slice(1)
  while (remaining.length && team(state, remaining[0]).picksThisWindow >= 2) {
    remaining.shift()
  }

  // Auto-end when both have taken at least 1 and neither can/wants more, or both at cap
  if (
    (state.home.picksThisWindow >= 1 && state.away.picksThisWindow >= 1 &&
      remaining.every((side) => team(state, side).picksThisWindow >= 1)) ||
    (homeDone && awayDone && state.home.picksThisWindow >= 1 && state.away.picksThisWindow >= 1)
  ) {
    // Keep going if order still has sides under 2 who might pick — only auto finish via UI button
  }

  if (remaining.length === 0) {
    return {
      ...state,
      faOrder: [],
      faActive: null,
    }
  }
  return {
    ...state,
    faOrder: remaining,
    faActive: remaining[0],
  }
}

function canSideStillPick(state: GameState, side: Side): boolean {
  const t = team(state, side)
  if (t.picksThisWindow >= 2) return false
  const club = CLUB_BY_ID[t.clubId]
  const cards = [...state.market.offenseFaceUp, ...state.market.defenseFaceUp]
  return cards.some((id) => {
    const el = buyEligibility(id, club.roster, t.pitcherId, t.lineup)
    if (!el.ok) return false
    if (t.picksThisWindow + el.pickCost > 2) return false
    return true
  })
}

export function freeAgencyPick(state: GameState, cardId: string): GameState {
  if (state.phase !== 'free_agency' || !state.faActive) return state
  const side = state.faActive
  let t = team(state, side)
  if (t.picksThisWindow >= 2) return state

  const inOff = state.market.offenseFaceUp.includes(cardId)
  const inDef = state.market.defenseFaceUp.includes(cardId)
  if (!inOff && !inDef) return state

  const club = CLUB_BY_ID[t.clubId]
  const el = buyEligibility(cardId, club.roster, t.pitcherId, t.lineup)
  if (!el.ok) return log(state, `Not eligible: ${el.reason}`)
  if (t.picksThisWindow + el.pickCost > 2) {
    return log(state, `Pick costs ${el.pickCost}; only ${2 - t.picksThisWindow} left.`)
  }

  const def = ALL_DEFS[cardId]
  if (inOff) {
    t = {
      ...t,
      offenseBag: shuffle([...t.offenseBag, cardId], mulberry32(state.rngSeed)),
      picksThisWindow: t.picksThisWindow + el.pickCost,
    }
  } else {
    t = {
      ...t,
      defenseBag: shuffle([...t.defenseBag, cardId], mulberry32(state.rngSeed)),
      picksThisWindow: t.picksThisWindow + el.pickCost,
    }
  }

  let s = setTeam(state, side, t)
  s = {
    ...s,
    market: {
      ...s.market,
      offenseFaceUp: s.market.offenseFaceUp.filter((c) => c !== cardId),
      defenseFaceUp: s.market.defenseFaceUp.filter((c) => c !== cardId),
    },
  }
  s = log(
    s,
    `${side === 'home' ? 'Home' : 'Away'} signs ${def.name}${el.pickCost === 2 ? ' (2 picks)' : ''}.`,
  )
  return advanceFaOrder(s)
}

export function trashFromBag(
  state: GameState,
  family: 'offense' | 'defense',
  cardId: string,
): GameState {
  if (state.phase !== 'free_agency' || !state.faActive) return state
  const side = state.faActive
  let t = team(state, side)
  if (family === 'offense') {
    if (!t.offenseBag.includes(cardId) && !t.offenseDiscard.includes(cardId)) return state
    t = {
      ...t,
      offenseBag: t.offenseBag.filter((c) => c !== cardId),
      offenseDiscard: t.offenseDiscard.filter((c) => c !== cardId),
    }
  } else {
    if (!t.defenseBag.includes(cardId) && !t.defenseDiscard.includes(cardId)) return state
    t = {
      ...t,
      defenseBag: t.defenseBag.filter((c) => c !== cardId),
      defenseDiscard: t.defenseDiscard.filter((c) => c !== cardId),
    }
  }
  let s = setTeam(state, side, t)
  return log(s, `${side === 'home' ? 'Home' : 'Away'} trashes a ${family} card.`)
}

function ensureLegalOffenseCard(
  state: GameState,
  offenseSide: Side,
  rand: () => number,
): { state: GameState; cardId: string | null } {
  let t = team(state, offenseSide)
  const runners = anyRunners(state.bases)
  const legal = (id: string) => {
    if (isBaserunEvent(id)) {
      return runners && !t.baserunUsedThisSet
    }
    return isPaEvent(id)
  }

  if (t.offenseHand.some(legal)) {
    return { state, cardId: null } // player chooses
  }

  // Draw until legal or auto from bag
  for (let i = 0; i < 12; i++) {
    if (t.offenseHand.some(legal)) break
    const d = drawN(t.offenseBag, 1, t.offenseDiscard, rand)
    if (d.drawn.length === 0) break
    t = {
      ...t,
      offenseBag: d.bag,
      offenseDiscard: d.discard,
      offenseHand: [...t.offenseHand, ...d.drawn],
    }
  }

  let s = setTeam(state, offenseSide, t)
  if (t.offenseHand.some(legal)) return { state: s, cardId: null }

  // Weak Contact contingency: auto top legal from bag (or force single from thin air)
  const search = [...t.offenseBag, ...t.offenseDiscard]
  const found = search.find(legal)
  if (found) {
    t = {
      ...t,
      offenseBag: t.offenseBag.filter((c) => c !== found),
      offenseDiscard: t.offenseDiscard.filter((c) => c !== found),
      offenseHand: [...t.offenseHand, found],
    }
    s = setTeam(s, offenseSide, t)
    s = log(s, 'Weak Contact contingency — drew a playable event.')
    return { state: s, cardId: found }
  }
  // Absolute fallback: inject a single
  t = { ...t, offenseHand: [...t.offenseHand, 'off_single'] }
  s = setTeam(s, offenseSide, t)
  s = log(s, 'Weak Contact contingency — auto Single.')
  return { state: s, cardId: 'off_single' }
}

/** Draw until a legal play exists (Weak Contact contingency). Call before reading the hand. */
export function prepareOffenseHand(state: GameState): GameState {
  if (state.phase !== 'offense') return state
  const { state: s, rand } = nextRand(state)
  return ensureLegalOffenseCard(s, s.acting, rand).state
}

export function playOffenseCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'offense') return state
  const offenseSide = state.acting
  const defenseSide = opposing(offenseSide)
  let { state: s, rand } = nextRand(state)

  const ensured = ensureLegalOffenseCard(s, offenseSide, rand)
  s = ensured.state
  let t = team(s, offenseSide)
  if (!t.offenseHand.includes(cardId)) return s

  const def = ALL_DEFS[cardId]
  if (!def || def.family !== 'offense') return s

  if (isBaserunEvent(cardId)) {
    if (!anyRunners(s.bases) || t.baserunUsedThisSet) return s
  }

  const batter = currentBatter(s, offenseSide)
  const softFail = !playGateOk(cardId, batter)
  const defTeam = team(s, defenseSide)
  const pitcher = getPlayer(defTeam.clubId, defTeam.pitcherId)!
  const fielders = defenseFielders(s, defenseSide)

  // Special FC handling if printed as fielders_choice and clean
  let result = resolveOffenseEvent(
    cardId,
    batter,
    pitcher,
    fielders,
    defTeam.setup,
    rand,
    softFail,
  )

  const homeBefore = s.home.runs

  // Remove card from hand
  t = {
    ...t,
    offenseHand: t.offenseHand.filter((c) => c !== cardId),
    offenseDiscard: [...t.offenseDiscard, cardId],
    baserunUsedThisSet: isBaserunEvent(cardId) ? true : t.baserunUsedThisSet,
  }

  let bases = s.bases
  let outs = s.outs
  let runs = 0
  let hit = false
  let error = false

  if (def.kind === 'fielders_choice' && result.outcome === 'Error/FC') {
    const fc = fieldersChoice(bases)
    bases = fc.bases
    outs += fc.outsDelta
    runs = fc.runs
  } else {
    const d = applyLadderToDiamond(result.outcome, bases, outs)
    bases = d.bases
    outs = d.outs
    runs = d.runs
    hit = d.hit
    error = d.error
  }

  t = {
    ...t,
    runs: t.runs + runs,
    hits: t.hits + (hit ? 1 : 0),
    errors: t.errors + (error ? 0 : 0),
  }
  // Errors charged to defense
  if (error) {
    const dt = team(s, defenseSide)
    s = setTeam(s, defenseSide, { ...dt, errors: dt.errors + 1 })
  }

  // Advance lineup only on PA events
  if (!isBaserunEvent(cardId)) {
    t = advanceLineup(t)
  }

  s = setTeam(s, offenseSide, t)
  s = { ...s, bases, outs }
  s = log(s, `${batter.name}: ${result.text}${runs ? ` (+${runs} R)` : ''}`)

  // Walk-off check
  const wo = checkWalkOff(s, homeBefore)
  if (wo) return log(wo, wo.endReason!)

  if (outs >= 3) {
    s = { ...s, outs: 3, bases: emptyBases() }
    return endOffenseSet(s)
  }

  // Rare injury stub ~3%
  if (rand() < 0.03) {
    const attrKeys = ['contact', 'power', 'speed', 'glove'] as const
    const attr = attrKeys[Math.floor(rand() * attrKeys.length)]
    const club = CLUB_BY_ID[t.clubId]
    const victim = club.roster[Math.floor(rand() * Math.min(9, club.roster.length))]
    s = log(s, `Game Ding: ${victim.name} −1 ${attr} (rest of game).`)
    void effectiveAttrs
  }

  // Keep drawing so long innings don't stall on an empty hand
  const topUp = ensureLegalOffenseCard(s, offenseSide, rand)
  s = topUp.state

  const nextBatter = currentBatter(s, offenseSide)
  s = log(
    s,
    `Baserunners ${basesLabel(bases)} · ${outs} out${outs === 1 ? '' : 's'} · ${nextBatter.name} up.`,
  )
  return s
}

function basesLabel(b: Bases): string {
  if (!anyRunners(b)) return 'empty'
  const parts = []
  if (b.first) parts.push('1B')
  if (b.second) parts.push('2B')
  if (b.third) parts.push('3B')
  return parts.join('-')
}

export function legalOffensePlays(state: GameState): string[] {
  if (state.phase !== 'offense') return []
  const t = team(state, state.acting)
  return t.offenseHand.filter((id) => {
    if (isBaserunEvent(id)) return anyRunners(state.bases) && !t.baserunUsedThisSet
    return isPaEvent(id)
  })
}

export function clubName(clubId: string): string {
  return CLUB_BY_ID[clubId]?.city ?? clubId
}
