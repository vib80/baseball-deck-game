import { useState } from 'react'
import {
  BASIC_SUPPLY,
  CARDS,
  STARTER_KINGDOM,
  isHit,
  isSwing,
} from './cards'
import type { CardId } from './cards'
import {
  confirmPass,
  countRuns,
  createGame,
  endSigning,
  goToSigning,
  playCard,
  resolveBoxScore,
  resolveBullpenPhone,
  signCard,
  skipBullpenTrash,
} from './game'
import type { GameState } from './game'
import './App.css'

function typeClass(id: CardId): string {
  const t = CARDS[id].types
  if (t.includes('brushback')) return 'card brushback'
  if (t.includes('leather')) return 'card leather'
  if (t.includes('scoreboard')) return 'card scoreboard'
  if (t.includes('swing') && t.includes('hit')) return 'card hybrid'
  if (t.includes('swing')) return 'card swing'
  if (t.includes('hit')) return 'card hit'
  if (t.includes('junk')) return 'card junk'
  return 'card'
}

function CardView({
  id,
  onClick,
  disabled,
  badge,
}: {
  id: CardId
  onClick?: () => void
  disabled?: boolean
  badge?: string
}) {
  const def = CARDS[id]
  return (
    <button
      type="button"
      className={typeClass(id)}
      onClick={onClick}
      disabled={disabled}
      title={def.text}
    >
      <span className="card-cost">{def.cost}</span>
      <span className="card-name">{def.name}</span>
      <span className="card-types">{def.types.join(' · ')}</span>
      <span className="card-text">{def.text}</span>
      {badge ? <span className="card-badge">{badge}</span> : null}
    </button>
  )
}

function canPlay(state: GameState, id: CardId): boolean {
  if (state.phase !== 'at-bat') return false
  if (isSwing(id)) return state.swings > 0
  if (isHit(id)) return true
  return false
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createGame())

  const me = game.players[game.current]
  const them = game.players[game.current === 0 ? 1 : 0]

  const supplyIds = [...BASIC_SUPPLY, ...STARTER_KINGDOM]

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Hotseat · 2 players</p>
          <h1>Baseball Deck</h1>
        </div>
        <div className="scorebug">
          <div>
            <strong>{game.players[0].name}</strong>
            <span>{countRuns(game.players[0])} R</span>
            <small>
              {game.players[0].deck.length}d / {game.players[0].hand.length}h /{' '}
              {game.players[0].dugout.length} dug
            </small>
          </div>
          <div>
            <strong>{game.players[1].name}</strong>
            <span>{countRuns(game.players[1])} R</span>
            <small>
              {game.players[1].deck.length}d / {game.players[1].hand.length}h /{' '}
              {game.players[1].dugout.length} dug
            </small>
          </div>
        </div>
        <button type="button" className="ghost" onClick={() => setGame(createGame())}>
          New game
        </button>
      </header>

      {game.phase === 'game-over' && game.scores && (
        <section className="banner win">
          <h2>
            {game.winner === 'Tie' ? 'Extra innings — Tie!' : `${game.winner} wins!`}
          </h2>
          <p>
            {game.players[0].name} {game.scores[0]} – {game.scores[1]}{' '}
            {game.players[1].name}
          </p>
          <button type="button" onClick={() => setGame(createGame())}>
            Play again
          </button>
        </section>
      )}

      {game.phase === 'pass' && (
        <section className="banner pass">
          <h2>Hand off the device</h2>
          <p>
            {me.name} is done. {them.name} is up next.
          </p>
          <button type="button" onClick={() => setGame(confirmPass(game))}>
            {them.name} — start at-bat
          </button>
        </section>
      )}

      {game.phase === 'box-score' && (
        <section className="modal">
          <h2>Box Score</h2>
          <p>Pick one card for your hand. The rest go back on your deck.</p>
          <div className="row">
            {game.boxScoreReveal.map((id, i) => (
              <CardView
                key={`${id}-${i}`}
                id={id}
                onClick={() => setGame(resolveBoxScore(game, i, []))}
              />
            ))}
          </div>
        </section>
      )}

      {game.phase === 'bullpen-phone' && (
        <section className="modal">
          <h2>Bullpen Phone</h2>
          <p>Trash a card from hand (+2 Contact already banked).</p>
          <div className="row">
            {me.hand.map((id, i) => (
              <CardView
                key={`${id}-${i}`}
                id={id}
                onClick={() => setGame(resolveBullpenPhone(game, i))}
              />
            ))}
          </div>
          {me.hand.length === 0 && (
            <button type="button" onClick={() => setGame(skipBullpenTrash(game))}>
              Continue
            </button>
          )}
        </section>
      )}

      {game.phase !== 'pass' && game.phase !== 'game-over' && (
        <>
          <section className="resources">
            <div>
              <span className="label">Up</span>
              <strong>{me.name}</strong>
            </div>
            <div>
              <span className="label">Phase</span>
              <strong>{game.phase === 'at-bat' ? 'At-Bat' : 'Signing'}</strong>
            </div>
            <div>
              <span className="label">Swing</span>
              <strong>{game.swings}</strong>
            </div>
            <div>
              <span className="label">Contact</span>
              <strong>{game.contact}</strong>
            </div>
            <div>
              <span className="label">Signings</span>
              <strong>{game.signings}</strong>
            </div>
            {game.gameEnding && (
              <div className="ending">Season ending after this turn</div>
            )}
          </section>

          <section className="hand-zone">
            <div className="hand-head">
              <h2>{me.name}&apos;s lineup</h2>
              <div className="actions">
                {game.phase === 'at-bat' && (
                  <button type="button" onClick={() => setGame(goToSigning(game))}>
                    Go to Signing
                  </button>
                )}
                {game.phase === 'signing' && (
                  <button type="button" onClick={() => setGame(endSigning(game))}>
                    End turn
                  </button>
                )}
              </div>
            </div>
            <p className="hint">
              {game.phase === 'at-bat'
                ? 'Click a bright card in your lineup to play it.'
                : 'Spend Contact in Today\'s lineup below, then End turn.'}
            </p>
            <div className="row">
              {me.hand.map((id, i) => {
                const playable = canPlay(game, id)
                return (
                  <CardView
                    key={`${id}-${i}`}
                    id={id}
                    disabled={!playable}
                    onClick={playable ? () => setGame(playCard(game, i)) : undefined}
                  />
                )
              })}
              {me.hand.length === 0 && <p className="empty">No cards in hand.</p>}
            </div>
            {me.inPlay.length > 0 && (
              <>
                <h3>In play</h3>
                <div className="row dim">
                  {me.inPlay.map((id, i) => (
                    <CardView key={`ip-${id}-${i}`} id={id} disabled />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="supply">
            <h2>Today&apos;s lineup</h2>
            <div className="supply-grid">
              {supplyIds.map((id) => {
                const left = game.supply[id] ?? 0
                const affordable =
                  game.phase === 'signing' &&
                  game.signings > 0 &&
                  game.contact >= CARDS[id].cost &&
                  left > 0 &&
                  id !== 'strike-looking'
                return (
                  <CardView
                    key={id}
                    id={id}
                    badge={`${left} left`}
                    disabled={!affordable}
                    onClick={
                      affordable ? () => setGame(signCard(game, id)) : undefined
                    }
                  />
                )
              })}
            </div>
          </section>
        </>
      )}

      <aside className="log">
        <h2>Play-by-play</h2>
        <ul>
          {game.log.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
