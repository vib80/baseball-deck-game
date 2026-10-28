import { ALL_DEFS } from '../data/cards'
import { effectiveAttrs } from '../data/clubs'
import type { Player } from '../types'

export type BuyResult =
  | { ok: true; pickCost: 1 | 2 }
  | { ok: false; reason: string }

/** Attr eligibility to buy a card into a bag (Model B). Uses best matching roster player. */
export function buyEligibility(
  cardId: string,
  roster: Player[],
  pitcherId: string,
  lineupIds: string[],
): BuyResult {
  const def = ALL_DEFS[cardId]
  if (!def) return { ok: false, reason: 'Unknown card' }

  const bats = lineupIds
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean) as Player[]
  const pitcher = roster.find((p) => p.id === pitcherId)
  const fielders = roster.filter((p) => p.position !== 'SP' && p.position !== 'RP')
  const catcher = roster.find((p) => p.position === 'C')

  const best = (pick: (a: ReturnType<typeof effectiveAttrs>) => number) =>
    Math.max(0, ...bats.map((p) => pick(effectiveAttrs(p))))

  const bestFielder = (
    pick: (a: ReturnType<typeof effectiveAttrs>) => number,
  ) => Math.max(0, ...fielders.map((p) => pick(effectiveAttrs(p))))

  const pAttrs = pitcher ? effectiveAttrs(pitcher) : null
  const cAttrs = catcher ? effectiveAttrs(catcher) : null

  switch (def.kind) {
    case 'single':
      return best((a) => a.contact) >= 3
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Need Contact ≥ 3' }
    case 'walk': {
      const eye = best((a) => a.eye)
      if (eye < 2) return { ok: false, reason: 'Eye < 2 blocked' }
      return eye >= 4
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Need Eye ≥ 4' }
    }
    case 'double': {
      const ok = bats.some((p) => {
        const a = effectiveAttrs(p)
        return a.power >= 5 || (a.contact >= 6 && a.power >= 4)
      })
      return ok
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Need Power ≥ 5 (or Contact 6 + Power 4)' }
    }
    case 'home_run': {
      const pow = best((a) => a.power)
      if (pow >= 7) return { ok: true, pickCost: 1 }
      if (pow >= 6) return { ok: true, pickCost: 2 }
      return { ok: false, reason: 'Need Power ≥ 6' }
    }
    case 'triple': {
      const ok = bats.some((p) => {
        const a = effectiveAttrs(p)
        return a.power >= 5 && a.speed >= 7
      })
      return ok
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Need Power ≥ 5 and Speed ≥ 7' }
    }
    case 'stolen_base': {
      const spd = best((a) => a.speed)
      if (spd >= 6) return { ok: true, pickCost: 1 }
      if (spd >= 5) return { ok: true, pickCost: 2 }
      return { ok: false, reason: 'Need Speed ≥ 5' }
    }
    case 'sac_fly':
      return best((a) => a.eye) >= 3
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Need Eye ≥ 3' }
    case 'hbp':
    case 'error':
    case 'fielders_choice':
    case 'bunt':
    case 'wild_pitch':
      return { ok: true, pickCost: 1 }

    case 'strikeout': {
      const stuff = pAttrs?.stuff ?? 0
      if (stuff >= 6) return { ok: true, pickCost: 1 }
      if (stuff >= 4) return { ok: true, pickCost: 2 }
      return { ok: false, reason: 'Pitcher Stuff ≥ 4' }
    }
    case 'ground_out': {
      const ok =
        bestFielder((a) => a.glove) >= 5 || (pAttrs?.stuff ?? 0) >= 5
      return ok
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'IF Glove ≥ 5 or Stuff ≥ 5' }
    }
    case 'fly_out':
    case 'line_out': {
      const ok =
        bestFielder((a) => a.range) >= 5 || bestFielder((a) => a.glove) >= 5
      return ok
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'OF Range or Glove ≥ 5' }
    }
    case 'high_heat':
      return (pAttrs?.stuff ?? 0) >= 7
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Stuff ≥ 7' }
    case 'paint_corner':
      return (pAttrs?.command ?? 0) >= 6
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Command ≥ 6' }
    case 'dive_catch': {
      const ok =
        bestFielder((a) => a.range) >= 7 || bestFielder((a) => a.glove) >= 7
      return ok
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Range or Glove ≥ 7' }
    }
    case 'pitchout':
    case 'caught_stealing':
      return (cAttrs?.arm ?? 0) >= 6
        ? { ok: true, pickCost: 1 }
        : { ok: false, reason: 'Catcher Arm ≥ 6' }
    case 'double_play':
    case 'infield_in':
    case 'intentional_walk':
      return { ok: true, pickCost: 1 }
    default:
      return { ok: true, pickCost: 1 }
  }
}

/** Soft play-gate: if illegal, resolution soft-fails one ladder step */
export function playGateOk(cardId: string, batter: Player, runnerSpeed?: number): boolean {
  const def = ALL_DEFS[cardId]
  if (!def || def.family !== 'offense') return true
  const a = effectiveAttrs(batter)
  switch (def.kind) {
    case 'home_run':
      return a.power >= 6
    case 'triple':
      return a.power >= 5 && a.speed >= 7
    case 'stolen_base':
      return (runnerSpeed ?? a.speed) >= 5
    default:
      return true
  }
}
