import { useMemo, useState } from 'react'
import { ALL_DEFS } from './data/cards'
import { CLUBS, CLUB_BY_ID, getPlayer } from './data/clubs'
import { buyEligibility } from './engine/eligibility'
import {
  clubName,
  endDefenseSet,
  finishFreeAgency,
  freeAgencyPick,
  legalOffensePlays,
  passFreeAgencyPick,
  playDefenseCard,
  playOffenseCard,
  prepareOffenseHand,
  startGame,
} from './engine/game'
import type { GameState, Side } from './types'
import './App.css'

type Screen = 'menu' | 'game'

function SideLabel({ side }: { side: Side }) {
  return <span className={`side-tag ${side}`}>{side === 'home' ? 'Home' : 'Away'}</span>
}

function Diamond({ bases, outs }: { bases: GameState['bases']; outs: number }) {
  return (
    <div className="diamond" aria-label="Bases">
      <div className={`bag second ${bases.second ? 'on' : ''}`} />
      <div className="diamond-mid">
        <div className={`bag third ${bases.third ? 'on' : ''}`} />
        <div className="mound" />
        <div className={`bag first ${bases.first ? 'on' : ''}`} />
      </div>
      <div className="home-plate" />
      <div className="outs">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`out-dot ${i < outs ? 'lit' : ''}`} />
        ))}
        <span className="outs-label">{outs} out</span>
      </div>
    </div>
  )
}

function Scoreboard({ game }: { game: GameState }) {
  const maxInning = Math.max(9, game.inning)
  const inns = Array.from({ length: maxInning }, (_, i) => i + 1)
  return (
    <div className="scoreboard">
      <div className="sb-brand">Baseball Deck</div>
      <table>
        <thead>
          <tr>
            <th />
            {inns.map((n) => (
              <th key={n} className={n === game.inning ? 'cur' : ''}>
                {n}
              </th>
            ))}
            <th>R</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['away', game.away],
              ['home', game.home],
            ] as const
          ).map(([side, t]) => (
            <tr key={side} className={game.acting === side ? 'active-row' : ''}>
              <td className="club-cell">
                <span
                  className="club-swatch"
                  style={{ background: CLUB_BY_ID[t.clubId].colors.primary }}
                />
                {clubName(t.clubId)}
              </td>
              {inns.map((n) => (
                <td key={n} className={n === game.inning ? 'cur' : ''}>
                  {n < game.inning || (n === game.inning && game.half === 'bottom' && side === 'away')
                    ? '·'
                    : n === game.inning
                      ? side === 'away' && game.half === 'top'
                        ? t.runs
                        : side === 'home' && game.half === 'bottom'
                          ? t.runs
                          : ''
                      : ''}
                </td>
              ))}
              <td className="runs">{t.runs}</td>
              <td>{t.hits}</td>
              <td>{t.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sb-meta">
        {game.phase === 'game_over'
          ? game.endReason
          : `${game.half === 'top' ? 'Top' : 'Bot'} ${game.inning} · ${
              game.phase === 'defense'
                ? 'Defense set'
                : game.phase === 'offense'
                  ? 'Offense set'
                  : game.phase === 'free_agency'
                    ? 'Free Agency'
                    : game.phase
            }`}
      </div>
    </div>
  )
}

function CardTile({
  id,
  onClick,
  disabled,
  accent,
  badge,
}: {
  id: string
  onClick?: () => void
  disabled?: boolean
  accent?: string
  badge?: string
}) {
  const def = ALL_DEFS[id]
  if (!def) return null
  return (
    <button
      type="button"
      className={`card-tile ${def.family} ${disabled ? 'disabled' : ''}`}
      style={accent ? { borderColor: accent } : undefined}
      onClick={onClick}
      disabled={disabled}
      title={def.text}
    >
      <span className="ct-family">{def.family}</span>
      <span className="ct-name">{def.name}</span>
      <span className="ct-text">{def.text}</span>
      {badge ? <span className="ct-badge">{badge}</span> : null}
    </button>
  )
}

function SetupSlots({ game, side }: { game: GameState; side: Side }) {
  const t = side === 'home' ? game.home : game.away
  const slots = [
    ['mound', t.setup.mound],
    ['infield', t.setup.infield],
    ['outfield', t.setup.outfield],
    ['baserunStop', t.setup.baserunStop],
  ] as const
  return (
    <div className="setup-slots">
      {slots.map(([name, card]) => (
        <div key={name} className={`setup-slot ${card ? 'filled' : ''}`}>
          <span className="slot-label">{name}</span>
          <span className="slot-card">{card ? ALL_DEFS[card].name : '—'}</span>
        </div>
      ))}
    </div>
  )
}

function Menu({
  onStart,
}: {
  onStart: (home: string, away: string, dh: boolean) => void
}) {
  const [home, setHome] = useState('new_york')
  const [away, setAway] = useState('chicago')
  const [dh, setDh] = useState(true)

  return (
    <div className="menu">
      <header className="menu-hero">
        <p className="eyebrow">Nine innings · Hotseat 1v1</p>
        <h1>Baseball Deck</h1>
        <p className="lede">
          City clubs, Defense sets, Offense events, and Free Agency between
          innings — not a pre-game draft.
        </p>
      </header>

      <section className="club-pick">
        <div className="pick-col">
          <h2>Away</h2>
          <div className="club-grid">
            {CLUBS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`club-btn ${away === c.id ? 'selected' : ''}`}
                style={
                  {
                    '--c1': c.colors.primary,
                    '--c2': c.colors.secondary,
                    '--c3': c.colors.accent,
                  } as React.CSSProperties
                }
                onClick={() => setAway(c.id)}
              >
                <span className="club-city">{c.city}</span>
                <span className="club-arch">{c.archetype}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="pick-col">
          <h2>Home</h2>
          <div className="club-grid">
            {CLUBS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`club-btn ${home === c.id ? 'selected' : ''}`}
                style={
                  {
                    '--c1': c.colors.primary,
                    '--c2': c.colors.secondary,
                    '--c3': c.colors.accent,
                  } as React.CSSProperties
                }
                onClick={() => setHome(c.id)}
              >
                <span className="club-city">{c.city}</span>
                <span className="club-arch">{c.archetype}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <label className="dh-toggle">
        <input type="checkbox" checked={dh} onChange={(e) => setDh(e.target.checked)} />
        Designated Hitter (default ON)
      </label>

      <button
        type="button"
        className="cta"
        onClick={() => onStart(home, away, dh)}
      >
        Play ball
      </button>
      <p className="rules-pointer">
        Rules: 9 innings · Home Defense first · Model B Free Agency after each
        inning · no Pass on offense · walk-off / 8.5 as locked in design.
      </p>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [game, setGame] = useState<GameState | null>(null)

  const actingClub = useMemo(() => {
    if (!game || !game.home) return null
    const t = game.acting === 'home' ? game.home : game.away
    return CLUB_BY_ID[t.clubId]
  }, [game])

  function begin(home: string, away: string, dh: boolean) {
    setGame(startGame({ homeClubId: home, awayClubId: away, dhOn: dh }))
    setScreen('game')
  }

  function withOffenseReady(next: GameState): GameState {
    if (next.phase !== 'offense') return next
    if (legalOffensePlays(next).length > 0) return next
    return prepareOffenseHand(next)
  }

  if (screen === 'menu' || !game) {
    return (
      <div className="app shell">
        <Menu onStart={begin} />
      </div>
    )
  }

  const acting = game.acting === 'home' ? game.home : game.away
  const accent = actingClub?.colors.primary ?? '#0C2340'
  const legal = legalOffensePlays(game)
  const defenseSetupCount = [
    acting.setup.mound,
    acting.setup.infield,
    acting.setup.outfield,
  ].filter(Boolean).length

  return (
    <div
      className="app shell game-shell"
      style={
        {
          '--accent': accent,
          '--accent-2': actingClub?.colors.secondary ?? '#fff',
        } as React.CSSProperties
      }
    >
      <Scoreboard game={game} />

      <div className="play-grid">
        <Diamond bases={game.bases} outs={game.outs} />

        <div className="panel">
          {game.phase === 'defense' && (
            <>
              <h2>
                <SideLabel side={game.acting} /> Defense set
              </h2>
              <p className="hint">
                Play up to 3 cards into Mound / Infield / Outfield (optional
                BaserunStop). Then reveal for the opponent.
              </p>
              <SetupSlots game={game} side={game.acting} />
              <div className="hand">
                {acting.defenseHand.map((id, i) => (
                  <CardTile
                    key={`${id}-${i}`}
                    id={id}
                    accent={accent}
                    disabled={
                      defenseSetupCount >= 3 &&
                      !acting.setup[ALL_DEFS[id]?.setupSlot ?? 'mound']
                    }
                    onClick={() => setGame(playDefenseCard(game, id))}
                  />
                ))}
              </div>
              <button
                type="button"
                className="cta"
                onClick={() => setGame(withOffenseReady(endDefenseSet(game)))}
              >
                Reveal setup · Start offense
              </button>
            </>
          )}

          {game.phase === 'offense' && (
            <>
              <h2>
                <SideLabel side={game.acting} /> Offense set
              </h2>
              <p className="hint">
                Must play one event (no Pass). Baserun event once per set when
                runners are on.
              </p>
              <p className="batter">
                At bat:{' '}
                <strong>
                  {
                    getPlayer(
                      acting.clubId,
                      acting.lineup[acting.lineupIndex % acting.lineup.length],
                    )?.name
                  }
                </strong>
              </p>
              <SetupSlots game={game} side={game.acting === 'home' ? 'away' : 'home'} />
              <div className="hand">
                {acting.offenseHand.map((id, i) => {
                  const ok = legal.includes(id)
                  return (
                    <CardTile
                      key={`${id}-${i}`}
                      id={id}
                      accent={accent}
                      disabled={!ok}
                      badge={ok ? 'Play' : undefined}
                      onClick={() =>
                        ok &&
                        setGame(withOffenseReady(playOffenseCard(game, id)))
                      }
                    />
                  )
                })}
              </div>
            </>
          )}

          {game.phase === 'free_agency' && (
            <>
              <h2>Free Agency · Inning {game.inning}</h2>
              <p className="hint">
                Market: 2 Offense + 2 Defense. Trail picks first. 1–2
                attr-eligible cards each.
                {game.faActive ? (
                  <>
                    {' '}
                    Now: <SideLabel side={game.faActive} /> (
                    {
                      (game.faActive === 'home' ? game.home : game.away)
                        .picksThisWindow
                    }
                    /2 picks)
                  </>
                ) : (
                  ' Both sides done — continue.'
                )}
              </p>
              <div className="market">
                <div>
                  <h3>Offense market</h3>
                  <div className="hand">
                    {game.market.offenseFaceUp.map((id, i) => {
                      const side = game.faActive
                      const t = side === 'home' ? game.home : game.away
                      const el = side
                        ? buyEligibility(
                            id,
                            CLUB_BY_ID[t.clubId].roster,
                            t.pitcherId,
                            t.lineup,
                          )
                        : { ok: false as const, reason: '' }
                      const blocked =
                        !side ||
                        !el.ok ||
                        t.picksThisWindow + (el.ok ? el.pickCost : 99) > 2
                      return (
                        <CardTile
                          key={`m-${id}-${i}`}
                          id={id}
                          disabled={blocked}
                          badge={
                            el.ok
                              ? el.pickCost === 2
                                ? '2 picks'
                                : 'Sign'
                              : el.reason
                          }
                          onClick={() =>
                            !blocked && setGame(freeAgencyPick(game, id))
                          }
                        />
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h3>Defense market</h3>
                  <div className="hand">
                    {game.market.defenseFaceUp.map((id, i) => {
                      const side = game.faActive
                      const t = side === 'home' ? game.home : game.away
                      const el = side
                        ? buyEligibility(
                            id,
                            CLUB_BY_ID[t.clubId].roster,
                            t.pitcherId,
                            t.lineup,
                          )
                        : { ok: false as const, reason: '' }
                      const blocked =
                        !side ||
                        !el.ok ||
                        t.picksThisWindow + (el.ok ? el.pickCost : 99) > 2
                      return (
                        <CardTile
                          key={`m-${id}-${i}`}
                          id={id}
                          disabled={blocked}
                          badge={
                            el.ok
                              ? el.pickCost === 2
                                ? '2 picks'
                                : 'Sign'
                              : el.reason
                          }
                          onClick={() =>
                            !blocked && setGame(freeAgencyPick(game, id))
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="fa-actions">
                {game.faActive ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setGame(passFreeAgencyPick(game))}
                  >
                    Pass remaining picks
                  </button>
                ) : null}
                <button
                  type="button"
                  className="cta"
                  onClick={() => setGame(finishFreeAgency(game))}
                >
                  Next inning
                </button>
              </div>
            </>
          )}

          {game.phase === 'game_over' && (
            <>
              <h2>Final</h2>
              <p className="final-line">{game.endReason}</p>
              <p>
                Away {clubName(game.away.clubId)} {game.away.runs} · Home{' '}
                {clubName(game.home.clubId)} {game.home.runs}
              </p>
              <button
                type="button"
                className="cta"
                onClick={() => {
                  setScreen('menu')
                  setGame(null)
                }}
              >
                New game
              </button>
            </>
          )}
        </div>
      </div>

      <aside className="log">
        <h3>Play-by-play</h3>
        <ul>
          {game.log.map((e) => (
            <li key={e.id}>{e.text}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
