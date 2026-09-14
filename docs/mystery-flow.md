# Mystery — Flow & Build Spec

What the Mystery experience should be at a real game night, locked in
before building. Companion to `ideal-party-flow.md` (the site-wide
principles — zero friction, host plays, never stall, secrets stay secret,
recover from chaos, readable at a glance, fast rematch, celebrate moments —
all apply here unchanged).

Unlike Mafia (hidden killer among the players) this is a **co-op whodunit**:
everyone at the table is an investigator. One case file, three mini-games
inside it, one shared verdict. All cases, suspects, clues, and copy are
originals written for this game — never lifted from publishers' content.

## The night, stage by stage

### 0–1. Discovery & identity — reuse everything

Same hub entry (`#/mystery`), same invite links, same site-wide profile:
name + avatar are remembered from the other games, never asked twice.

### 2. Lobby — team briefing setup

- Room code, QR, live roster — same components/patterns as Mafia.
- Host config: **search tokens** (how many locations the team may search,
  default 6), **pressure tokens** (how many suspects may be pressed, default
  3), **accusations** (team verdict attempts, default 2), **search timer**
  (Off / 1 / 2 / 3 / 5 min, default 3:00 — same component pattern as the
  other timers). Host can remove wrong seats. Solo included: one detective
  alone can work a whole case start to finish (every action is any-player,
  1–20 players).
- Host picks the **case file** (v1 ships three: _Murder at the Masquerade_,
  _The Final Curtain_, and _Light Out at Gull Rock_; the engine is
  case-agnostic so new cases are data, not code).

### 3. Mini-game 1 — Crime-Scene Search

- The case opens with the victim, the scene, and four locations. The team
  spends one shared **search token** per location searched; searching
  reveals that location's clues to every phone at once.
- One location is **locked** until its key clue is found elsewhere, so the
  order of searching matters and the table must prioritize out loud.
- When the tokens run out the game moves on by itself; the host may also
  advance early (anti-stall, mirrors Mafia's resolve/close overrides).
- An optional search timer keeps the phase moving; expiry never punishes,
  anyone may keep acting and the host advances.

### 4. Mini-game 2 — Alibis (press the suspects)

- Every suspect shows a public alibi. The team spends shared **pressure
  tokens** to force one suspect each to reveal their **secret** — a
  contradiction-flavored detail that reframes their alibi.
- There are more suspects than pressure, so the table must choose who to
  press. When pressure runs out the game moves to the verdict; the host may
  advance early.

### 5. Mini-game 3 — The Verdict (accusation)

- The team discusses out loud, then **any investigator may submit the
  team's verdict**: suspect + weapon + scene. Submissions are public the
  moment they're made (like Mafia's public ballots).
- A correct verdict solves the case immediately with a star rating (fewer
  verdicts + unspent tokens = more stars). A wrong verdict burns one
  attempt and the reasoning continues. No attempts left → case goes cold
  and the full solution is revealed so the table learns something.
- One-tap **rematch**: same case, fresh tokens, back to the briefing. Back
  to the lobby to switch cases.

## Roles & views (privacy contracts)

- There are **no secret roles** — every investigator sees the same public
  board. The one secret is the **solution triple**, held only in host
  memory until the game ends.
- **Investigator view:** case brief, suspect bios + alibis, location list
  (locked/searched flags), found clues with full detail, revealed secrets,
  token counts, public verdict attempts. Never: the solution, unfound clue
  details, unrevealed secret texts, anyone's rejoin token.
- **Game-over view:** everything above plus the full solution and the star
  rating. Same data-dump-on-reveal pattern as Mafia's `allRoles`.

## Decisions locked in

- **Architecture:** same self-contained shape — `src/games/mystery/` with
  `engine/` (pure state machine + views + tests), `net/` (same
  host-authoritative PeerJS session + token rejoin shape — no host-side
  timer, since the search clock is display-only pressure), `ui/` (one screen
  per phase), own CSS + sounds. Shared across games: hub shell, `anim`
  presets, profile storage (`ashiboy-profile`); new session key
  (`ashiboy-mystery-session`). No shared game-logic kit.
- **Case schema:** suspects (bio + public alibi), locations (one optionally
  locked by a key clue), clues (bound to locations), secrets (one per
  suspect), weapons lineup, solution triple. New cases add one entry to the
  case list — no engine changes.
- **Co-op, not traitor:** no hidden killer among players in v1. (A traitor
  variant is a possible later case flag, not a v1 promise.)
- **Sounds:** reuse the synth approach (paper unfold, clue pin, press sting,
  verdict gavel, solve fanfare) + mute toggle.

## Edge cases (must all be covered in tests)

- Searching a locked location before its key clue → ignored, token kept.
- Searching an already-searched location → ignored, token kept.
- Last search token spent → auto-advance to alibis.
- Pressing an already-pressed suspect → ignored, pressure kept.
- Last pressure spent → auto-advance to the verdict.
- Verdict with unknown suspect/weapon/location ids → ignored, attempt kept.
- Correct verdict on the last attempt → solved, full stars logic still runs.
- Wrong verdict with no attempts left → case cold, solution revealed.
- Disconnect mid-case → seat kept, rejoin restores it; host advancing never
  waits on missing players.
- Rematch → fresh tokens, cleared searches/presses/verdicts, same players.
- Determinism: same seed + same actions = same state (suspect/location
  display order is rng-shuffled at deal time).

## Limitations inventory

**Inherent (same as the other games, accepted):** host tab _is_ the room;
internet required for signaling; the solution lives in host memory
(peekable via devtools, fine for a co-op party game).

**Accepted scope for v1:**

- Three case files (the lobby picker takes new entries with no code changes).
- English-only, fully original content.
- No in-app chat — the deliberation out loud _is_ the game.
- No traitor-among-players mode.
