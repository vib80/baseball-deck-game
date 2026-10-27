/** Mulberry32 seeded PRNG */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function drawN<T>(
  bag: T[],
  n: number,
  discard: T[],
  rand: () => number,
): { drawn: T[]; bag: T[]; discard: T[] } {
  const drawn: T[] = []
  let b = [...bag]
  let d = [...discard]
  for (let i = 0; i < n; i++) {
    if (b.length === 0) {
      if (d.length === 0) break
      b = shuffle(d, rand)
      d = []
    }
    drawn.push(b.shift()!)
  }
  return { drawn, bag: b, discard: d }
}
