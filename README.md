# Baseball Deck (v2)

A 1v1 hotseat baseball card game. Pick two **city clubs**, play **Defense sets** then **Offense sets** through nine innings, and grow your decks in **Free Agency** after each completed inning.

This replaces the Dominion-style v1 prototype. Design: Model B (between-innings free agency), Home Defense first, walk-off / 8.5 rules, DH default ON, no Pass on offense.

## Play

1. Choose **Away** and **Home** from eight city clubs (Boston, New York, Cleveland, Seattle, San Francisco, Chicago, Los Angeles, St. Louis).
2. Each inning: **Home Defense → Away Offense → Away Defense → Home Offense**.
3. Defense: play up to 3 cards into Setup (Mound / Infield / Outfield).
4. Offense: must play an event each at-bat (no Pass). Scoreboard is real baseball.
5. After each full inning: **Free Agency** — market 2 Offense + 2 Defense; trail picks first; 1–2 attr-eligible signs.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

GitHub Pages build uses `PAGES_BASE=/baseball-deck-game/`.

## Scope (v2 prototype)

**In:** 9-inning hotseat, 8 city clubs (prototype 9+SP rosters), starter 6+6 commons, Defense/Offense loop, Delta + Fail Ladder, scoreboard, walk-off / 8.5, Model B Free Agency with attr gates, DH toggle.

**Deferred:** Season Mode / aging, full 26-man UX, Spark economy, unique authored depth for all 8 rosters, bullpen management, networked multiplay.
