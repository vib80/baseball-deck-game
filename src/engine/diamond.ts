import type { Bases } from '../types'

export function emptyBases(): Bases {
  return { first: false, second: false, third: false }
}

export function basesOccupied(b: Bases): number {
  return (b.first ? 1 : 0) + (b.second ? 1 : 0) + (b.third ? 1 : 0)
}

export function anyRunners(b: Bases): boolean {
  return b.first || b.second || b.third
}

/** Advance all runners by `n` bases; batter placed according to hitBases (0 = out / no batter). Returns runs scored. */
export function advanceAll(
  bases: Bases,
  n: number,
  placeBatterOn: 0 | 1 | 2 | 3 | 4,
): { bases: Bases; runs: number } {
  type Spot = 'H' | 1 | 2 | 3
  const runners: Spot[] = []
  if (bases.third) runners.push(3)
  if (bases.second) runners.push(2)
  if (bases.first) runners.push(1)

  let runs = 0
  const landed: Spot[] = []

  for (const r of runners) {
    const dest = (r as number) + n
    if (dest >= 4) runs++
    else landed.push(dest as Spot)
  }

  if (placeBatterOn === 4) runs++
  else if (placeBatterOn > 0) landed.push(placeBatterOn as Spot)

  // Collapse collisions toward higher bases preferentially (simple model)
  const next = emptyBases()
  const uniq = [...new Set(landed)].sort((a, b) => (b as number) - (a as number))
  for (const s of uniq) {
    if (s === 3 && !next.third) next.third = true
    else if (s === 2 && !next.second) next.second = true
    else if (s === 1 && !next.first) next.first = true
    else runs++ // overflow collision → score (rare)
  }
  return { bases: next, runs }
}

/** Force advance on walk/HBP */
export function walkAdvance(bases: Bases): { bases: Bases; runs: number } {
  let runs = 0
  const next = { ...bases }
  if (next.first && next.second && next.third) {
    runs = 1
    // bases stay loaded; batter takes 1B — already occupied so third scores conceptually
  } else if (next.first && next.second) {
    next.third = true
  } else if (next.first) {
    next.second = true
  }
  next.first = true
  return { bases: next, runs }
}

/** Steal: advance lead runner one base; fail → out (caller handles) */
export function stealAdvance(bases: Bases): { bases: Bases; runs: number; ok: boolean } {
  if (!anyRunners(bases)) return { bases, runs: 0, ok: false }
  // Lead runner: prefer 3rd→home, 2nd→3rd, 1st→2nd
  const next = { ...bases }
  let runs = 0
  if (next.third && !next.first && !next.second) {
    // alone on third — steal home
    next.third = false
    runs = 1
  } else if (next.second && !next.third) {
    // advance lead runner 2→3 (covers 1st+2nd double-steal lite)
    next.second = false
    next.third = true
  } else if (next.first && !next.second) {
    next.first = false
    next.second = true
  } else if (next.third) {
    next.third = false
    runs = 1
  }
  return { bases: next, runs, ok: true }
}

/** Sac fly: out + score from third if outs < 2 */
export function sacFly(
  bases: Bases,
  outs: number,
): { bases: Bases; runs: number; outs: number } {
  const next = { ...bases }
  let runs = 0
  if (next.third && outs < 2) {
    next.third = false
    runs = 1
  }
  return { bases: next, runs, outs: outs + 1 }
}

/** Fielder's choice: batter safe 1B; lead force out if any runner */
export function fieldersChoice(
  bases: Bases,
): { bases: Bases; runs: number; outsDelta: number } {
  if (!anyRunners(bases)) {
    return { bases: { first: true, second: false, third: false }, runs: 0, outsDelta: 0 }
  }
  const next = { ...bases }
  let outsDelta = 1
  if (next.first) {
    // force at 2B — remove first, batter to 1B
    next.first = false
    // other runners stay
  } else if (next.second) {
    next.second = false
  } else if (next.third) {
    next.third = false
  }
  next.first = true
  return { bases: next, runs: 0, outsDelta }
}
