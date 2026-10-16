# Baseball Deck

A Dominion-style baseball deck-building game. Build a roster, string together at-bats, and put runs on the board.

## Play

2-player **hotseat** (pass one device). Each turn:

1. **At-Bat** — Play Swing cards (default 1) and Hits for Contact
2. **Signing** — Spend Contact to draft from the shared supply
3. **Cleanup** — Discard, draw 5, hand off

First to empty the **Championship** pile — or any **3 supply piles** — ends the game after the current turn. Most **Runs** wins.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Scope (v1 prototype)

- Basics + fixed starter 10 kingdom
- Full turn loop, end conditions, Run scoring
- Dive Catch vs Beanball
- Singles cost **0** Contact to Sign (locked table default)

Deferred: solo AI, random kingdoms, full ~28-card set, networked multiplayer.
