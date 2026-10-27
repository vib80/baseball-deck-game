import type { Attrs, Club, Player, Position } from '../types'

function attrs(partial: Partial<Attrs>): Attrs {
  return {
    contact: 5,
    power: 5,
    eye: 5,
    speed: 5,
    arm: 5,
    glove: 5,
    range: 5,
    stuff: 5,
    command: 5,
    durability: 6,
    ...partial,
  }
}

function p(
  id: string,
  name: string,
  position: Position,
  a: Partial<Attrs>,
): Player {
  return { id, name, position, attrs: attrs(a) }
}

/** Build a balanced 9-man + SP + RP prototype roster with a city flavor lean */
function roster(
  cityKey: string,
  lean: 'contact' | 'power' | 'glove' | 'stuff' | 'speed' | 'balanced',
  names: {
    c: string
    b1: string
    b2: string
    b3: string
    ss: string
    lf: string
    cf: string
    rf: string
    dh: string
    sp: string
    rp: string
  },
): Player[] {
  const bump =
    lean === 'contact'
      ? { contact: 2, eye: 1 }
      : lean === 'power'
        ? { power: 2, contact: 1 }
        : lean === 'glove'
          ? { glove: 2, arm: 1 }
          : lean === 'stuff'
            ? { stuff: 2, command: 1 }
            : lean === 'speed'
              ? { speed: 2, range: 1, contact: 1 }
              : { contact: 1, power: 1, stuff: 1 }

  const k = cityKey
  return [
    p(`${k}_c`, names.c, 'C', {
      contact: 6 + (bump.contact ?? 0) - 1,
      eye: 6,
      arm: 7 + (bump.arm ?? 0),
      glove: 6 + (bump.glove ?? 0),
      power: 5,
    }),
    p(`${k}_1b`, names.b1, '1B', {
      power: 7 + (bump.power ?? 0),
      contact: 6,
      eye: 5,
      glove: 5,
    }),
    p(`${k}_2b`, names.b2, '2B', {
      contact: 7 + (bump.contact ?? 0),
      speed: 6 + (bump.speed ?? 0),
      glove: 7 + (bump.glove ?? 0),
      eye: 6,
      power: 4,
    }),
    p(`${k}_3b`, names.b3, '3B', {
      power: 6 + (bump.power ?? 0),
      arm: 7,
      glove: 6,
      contact: 5,
    }),
    p(`${k}_ss`, names.ss, 'SS', {
      glove: 8 + (bump.glove ?? 0),
      range: 7,
      speed: 6,
      contact: 6 + (bump.contact ?? 0),
      arm: 7,
      power: 4,
    }),
    p(`${k}_lf`, names.lf, 'LF', {
      power: 7 + (bump.power ?? 0),
      contact: 6,
      range: 5,
      speed: 5,
    }),
    p(`${k}_cf`, names.cf, 'CF', {
      range: 8,
      speed: 8 + (bump.speed ?? 0),
      contact: 6,
      glove: 7,
      power: 5,
    }),
    p(`${k}_rf`, names.rf, 'RF', {
      arm: 8,
      power: 6 + (bump.power ?? 0),
      range: 6,
      contact: 6,
      speed: 5,
    }),
    p(`${k}_dh`, names.dh, 'DH', {
      power: 8 + (bump.power ?? 0),
      contact: 7 + (bump.contact ?? 0),
      eye: 6,
      speed: 3,
      glove: 2,
    }),
    p(`${k}_sp`, names.sp, 'SP', {
      stuff: 7 + (bump.stuff ?? 0),
      command: 7 + (bump.command ?? 0),
      durability: 8,
      contact: 3,
      power: 2,
      eye: 3,
    }),
    p(`${k}_rp`, names.rp, 'RP', {
      stuff: 8 + (bump.stuff ?? 0),
      command: 6,
      durability: 5,
      contact: 2,
      power: 2,
    }),
  ]
}

export const CLUBS: Club[] = [
  {
    id: 'boston',
    city: 'Boston',
    colors: { primary: '#0C2340', secondary: '#BD3039', accent: '#FFFFFF' },
    archetype: 'Contact / Eye; patient OBP',
    roster: roster('bos', 'contact', {
      c: 'Ned Harkin',
      b1: 'Cal Bridger',
      b2: 'Wes Quinlan',
      b3: 'Theo Marrow',
      ss: 'Finn Oakes',
      lf: 'Riley Voss',
      cf: 'Jonah Pike',
      rf: 'Sam Ellery',
      dh: 'Marcus Trent',
      sp: 'Hugh Callan',
      rp: 'Dex Morrow',
    }),
  },
  {
    id: 'new_york',
    city: 'New York',
    colors: { primary: '#0C2340', secondary: '#FFFFFF', accent: '#C4CED4' },
    archetype: 'Balanced power + pitching',
    roster: roster('ny', 'balanced', {
      c: 'Vince Rourke',
      b1: 'Dante Coles',
      b2: 'Leo Vargas',
      b3: 'Grant Hale',
      ss: 'Nico Prado',
      lf: 'Ellis Crane',
      cf: 'Jaylen Moss',
      rf: 'Reid Keller',
      dh: 'Bo Sterling',
      sp: 'Cole Brennan',
      rp: 'Ash Rivera',
    }),
  },
  {
    id: 'cleveland',
    city: 'Cleveland',
    colors: { primary: '#0C2340', secondary: '#E31937', accent: '#FFFFFF' },
    archetype: 'Glove / IF defense; Command arms',
    roster: roster('cle', 'glove', {
      c: 'Pat Keane',
      b1: 'Orion Bluff',
      b2: 'Miles Keaton',
      b3: 'Drew Lasker',
      ss: 'Caleb Orth',
      lf: 'Nate Shore',
      cf: 'Ivy Quinn',
      rf: 'Seth Rowan',
      dh: 'Hank Dobbs',
      sp: 'Reid Vos',
      rp: 'Clay Mercer',
    }),
  },
  {
    id: 'seattle',
    city: 'Seattle',
    colors: { primary: '#0C2340', secondary: '#005C5C', accent: '#C4CED4' },
    archetype: 'Stuff-first starters; OF Range',
    roster: roster('sea', 'stuff', {
      c: 'Kai Norden',
      b1: 'Brooks Hale',
      b2: 'Evan Softley',
      b3: 'Remy Cross',
      ss: 'Quinn Adler',
      lf: 'Tate Willow',
      cf: 'Jordan Skye',
      rf: 'Chris Vale',
      dh: 'Max Torren',
      sp: 'Felix Shore',
      rp: 'Ryo Tanaka',
    }),
  },
  {
    id: 'san_francisco',
    city: 'San Francisco',
    colors: { primary: '#FD5A1E', secondary: '#000000', accent: '#FFF1D5' },
    archetype: 'Mist + Speed / Contact gap power',
    roster: roster('sf', 'speed', {
      c: 'Marco Silva',
      b1: 'Luis Ortega',
      b2: 'Kenji Hale',
      b3: 'Paul Drex',
      ss: 'Ari Soto',
      lf: 'Devon Marsh',
      cf: 'Rio Caldera',
      rf: 'Casey Bloom',
      dh: 'Vic Lang',
      sp: 'Hunter Gray',
      rp: 'Neil Frost',
    }),
  },
  {
    id: 'chicago',
    city: 'Chicago',
    colors: { primary: '#0E3386', secondary: '#CC3433', accent: '#FFFFFF' },
    archetype: 'Day-game power; ExtraBase lean',
    roster: roster('chi', 'power', {
      c: 'Gabe Nolan',
      b1: 'Frank Dury',
      b2: 'Pete Alden',
      b3: 'Carl Voss',
      ss: 'Jimmy Rhee',
      lf: 'Omar Dante',
      cf: 'Will Prado',
      rf: 'Ty Beckett',
      dh: 'Slugger Kane',
      sp: 'Ron Packard',
      rp: 'Mick Doyle',
    }),
  },
  {
    id: 'los_angeles',
    city: 'Los Angeles',
    colors: { primary: '#005A9C', secondary: '#FFFFFF', accent: '#EF3E42' },
    archetype: 'Star Power + Speed; deep bullpen',
    roster: roster('la', 'speed', {
      c: 'Diego Rios',
      b1: 'Andre Cole',
      b2: 'Jalen West',
      b3: 'Troy Nakamura',
      ss: 'Ezra Kim',
      lf: 'Phoenix Lane',
      cf: 'Sky Ramirez',
      rf: 'Blake Ortega',
      dh: 'Ace Moreno',
      sp: 'Cruz Valen',
      rp: 'Nova Park',
    }),
  },
  {
    id: 'st_louis',
    city: 'St. Louis',
    colors: { primary: '#C41E3A', secondary: '#0C2340', accent: '#FFFFFF' },
    archetype: 'Contact / fundamentals',
    roster: roster('stl', 'contact', {
      c: 'Ben Yarrow',
      b1: 'Paul Crest',
      b2: 'Adam Birch',
      b3: 'Luke Banner',
      ss: 'Chris Wren',
      lf: 'Dan Harper',
      cf: 'Sam Reed',
      rf: 'Joe Lark',
      dh: 'Ray Cardinal',
      sp: 'Tom Bridge',
      rp: 'Phil Grove',
    }),
  },
]

export const CLUB_BY_ID: Record<string, Club> = Object.fromEntries(
  CLUBS.map((c) => [c.id, c]),
)

export function getPlayer(clubId: string, playerId: string): Player | undefined {
  return CLUB_BY_ID[clubId]?.roster.find((p) => p.id === playerId)
}

export function effectiveAttrs(player: Player): Attrs {
  const a = { ...player.attrs }
  if (player.ding) {
    a[player.ding.attr] = Math.max(1, a[player.ding.attr] - player.ding.amount)
  }
  return a
}

/** Default batting order: C through RF, then DH (or SP if DH off — handled at game start) */
export function defaultLineup(club: Club, dhOn: boolean): string[] {
  const orderPos: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
  const ids = orderPos.map(
    (pos) => club.roster.find((p) => p.position === pos)!.id,
  )
  if (dhOn) {
    ids.push(club.roster.find((p) => p.position === 'DH')!.id)
  } else {
    ids.push(club.roster.find((p) => p.position === 'SP')!.id)
  }
  return ids
}

export function defaultPitcher(club: Club): string {
  return club.roster.find((p) => p.position === 'SP')!.id
}
