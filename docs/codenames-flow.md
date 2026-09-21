# Codenames — Flow & Build Spec

What the Codenames experience should be at a real game night, locked in
before building. Companion to `ideal-party-flow.md` (the site-wide
principles — zero friction, host plays, never stall, secrets stay secret,
recover from chaos, readable at a glance, fast rematch, celebrate moments —
all apply here unchanged).

Researched from the official Czech Games Edition rulebooks (base game, XXL,
and Pictures editions all share these core rules).

## Official rules (verified)

- **Board:** 25 word cards in a 5×5 grid, dealt fresh every game.
- **Key:** starting team gets **9** words, the other team **8**, plus **7**
  innocent bystanders and **1 assassin**. The starting team gives the first
  clue. (25 = 9 + 8 + 7 + 1.)
- **Teams:** two teams, each with exactly one spymaster; everyone else is a
  field operative. Only spymasters may see the key.
- **Clue:** exactly **one word + one number** (e.g. `tree: 2`). The number
  says how many of your words relate. Clues for 2+ words are the whole game;
  4 with one clue is a triumph.
- **Clue validity (spirit of the game):** about _meaning_ only — no spelling
  games, no table positions, no visible codename or form of it, no part of a
  compound on the table, no extra hints, no reactions, English. If unsure,
  the _opposing spymaster_ judges quietly. Penalty for an invalid clue: the
  turn ends with no guesses and the opposing spymaster may cover one of their
  own words (or allow the clue; unnoticed = valid).
- **Guessing:** operatives discuss, then touch **one card at a time**, each
  revealed immediately. Own color → may continue. Bystander or opponent's
  word → turn ends (opponent's word helps them!). Assassin → **instant loss**.
- **Must guess at least once** per turn; may voluntarily stop anytime after.
- **Plus-one rule:** while staying on your own color you may guess **one more
  than the clue number** (e.g. `cold: 3` → up to 4 guesses) — this is how
  teams catch up on words missed from earlier clues.
- **`0` clue** (`feathers: 0` = "none of ours relate"): **unlimited** guesses,
  still at least one. **`unlimited` instead of a number:** unlimited guesses
  while correct, but operatives don't know the intended count.
- **Winning:** cover all your words first — even on the _opponent's_ turn if
  they gift you your last word. Touch the assassin and you lose on the spot.
- **Timer** is an official variant (their companion app ships timers).

## App flow, stage by stage

### 0–1. Discovery & identity — reuse everything

Same hub entry (`#/codenames`), same invite links, same site-wide profile:
name + avatar are remembered from Mafia, never asked twice.

### 2. Lobby — teams, spymasters, config

- Room code, QR, live roster — same components/patterns as Mafia.
- **Two team columns (Red / Blue).** Players tap to join a side; anyone can
  switch freely until start. A **randomize** button splits evenly.
- **Spymaster = a star toggle on your own seat**, one per team. Starring a
  second player on a team automatically unseats the old spymaster, so rotating
  the role (including after a game) is a single tap. Start is blocked until
  every seat has a team and each team has exactly one spymaster and at least
  one operative (minimum 4 players total — enforced in both the engine and the
  lobby).
- Host config: **turn timer** (Off / 1 / 2 / 3 / 5 min, default 3:00 — same
  component pattern as Mafia's discussion timer). Nothing else to configure.
- Host can remove wrong seats (same as Mafia). No one joins after the deal.

### 3. Board deal — the key

- App samples **25 words** from the built-in list and assigns the key per the
  official counts, with a **random starting team** each game.
- Spymasters see the colored key; operatives see neutral word cards. The key
  is a deliberate privacy boundary (same `viewFor` pattern as Mafia — raw
  key never leaves the host).

### 4. Turns — clue, then guesses

- **Clue phase (their spymaster only):** word field + number stepper
  (0–9) + **∞ toggle**. Clue-legality rules shown as guidance text under the
  field. Submit broadcasts `WORD: N` to every screen with a sting. Spymaster
  cannot tap board cards. (No auto-void for illegal clues in v1 — social
  rule, judged by the opposing spymaster per the rulebook.)
- **Guess phase (their operatives):** discuss out loud, then **any operative
  taps a card = a guess**, revealed to all instantly with a flip. Correct →
  keep going (up to number + 1, unlimited on 0/∞). Wrong → turn passes.
  **Unused guesses do not carry over** — the +1 is the catch-up mechanism, so
  the UI says so under the board and the clue banner spells out
  `clue N + 1 bonus`. Minimum one guess before the **End turn** button (any
  operative) enables.
- Turn passes automatically on: wrong guess, guess limit reached, either win
  condition, timer expiry, or End turn. A small "Their turn…" state shows on
  the waiting team's phones (with the current clue visible for spectatorship).
- **Anti-stall (required, mirrors Mafia):** host **Pass turn** override for a
  missing spymaster/operatives; disconnected players never block (any
  operative may guess; a missing spymaster's team can be passed).

### 5. Win — instant, then rematch

- Checked **after every single guess**: all your words covered → you win
  immediately (even mid-opponent-turn); assassin → guesser's team loses
  immediately. Winner banner + full key reveal + fanfare.
- **Rematch in one tap:** same teams and spymasters, fresh board and fresh
  starting team. A second host action, **Change spymasters**, reopens the
  lobby with teams intact so anyone can take the star; the host then deals a
  fresh board. Back-to-lobby also happens automatically from rematch when the
  teams no longer satisfy start rules.
- Ejected seats have their token revoked and can't silently reclaim themselves;
  full rooms get an explicit "Room is full." error instead of a stuck join.

## Roles & views (privacy contracts)

- **Spymaster view:** full key (every card's affiliation), clue composer on
  their turn, read-only board otherwise. Never sees anything about the
  _other_ team's private state (there is none — the key is shared by both
  spymasters, exactly like the table).
- **Operative view:** neutral board, clue history (all past `WORD: N` clues),
  remaining counts per side (public info), guess/End-turn controls only on
  their team's guess phase.
- Both spymasters see the _same_ key — no leak issue by construction.

## Decisions locked in

- **Architecture:** clone the Mafia pattern per game — `src/games/codenames/`
  with `engine/` (pure state machine + views + tests), `net/` (same
  host-authoritative PeerJS session + token rejoin shape), `ui/` (one screen
  per phase), own CSS + sounds. Shared across games: hub shell, `anim`
  presets, profile storage (`ashiboy-profile`); new session key
  (`ashiboy-codenames-session`). No shared game-logic kit yet.
- **Word list:** a generated list of ~950 easy, fun, mostly concrete nouns
  (`src/games/codenames/engine/words.ts`). Built by
  `scripts/generate-words.mjs` from `friendly-words` (Glitch, MIT) filtered by
  the frequency ranking in `popular-english-words` (ISC) and a hand-kept
  blocklist of proper nouns, jargon, and dull/abstract words — never CGE's
  list. Regenerate with `npm run words`; tests guard format, size, and
  singular/plural collisions.
- ** tap = commit** for guesses (fast, party-friendly); mis-tap risk accepted
  and stated in How to Play.
- **No auto-enforcement of clue legality** in v1 (guidance text + social
  judgment, per the rulebook's own dispute process).
- **Sounds:** reuse the synth approach (new set: card flip, correct chime,
  wrong thud, assassin sting, win fanfare, turn-pass whoosh) + mute toggle.
- **Min 4 players** (spymaster + operative per side). No upper cap beyond
  room sanity (~20, same as Mafia).

## Edge cases (must all be covered in tests)

- Guess limit exactly reached with all-correct streak → turn passes, no win yet.
- Plus-one catch-up guess from a _previous_ clue still counts.
- Win on opponent's turn (they touch your last word).
- Assassin touched → immediate loss regardless of board state.
- 0/∞ clues → unlimited loop terminates only on wrong guess, End turn, or win.
- Operative taps an already-covered card → ignored.
- Spymaster submits empty clue word → rejected client-side.
- Disconnect mid-turn → team continues / host passes; rejoin restores seat + key.
- Rematch → new board, cleared guesses, same teams (disconnected seats kept
  so a late rejoin still finds its chair), round reset.
- Change spymasters → back to the lobby from game over with teams and config
  intact; starring a new player swaps out the old spymaster in one tap;
  dealing again starts clean.

## Limitations inventory

**Inherent (same as Mafia, accepted):** host tab _is_ the room; internet
required for signaling; secrets live in host memory (both spymasters'
screens derive from it — peekable via devtools, fine for bragging rights).

**Accepted scope for v1:**

- No Duet/co-op mode, no Pictures variant, fixed 5×5.
- No automatic invalid-clue detection or voiding (social rule).
- English-only, generated easy word list (no official CGE content).
- No in-app chat — table talk is the game.
