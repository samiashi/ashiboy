# Hot Take — Flow & Build Spec

What the Hot Take experience should be at a real game night, locked in
before building. Companion to `ideal-party-flow.md` (the site-wide
principles — zero friction, host plays, never stall, secrets stay secret,
recover from chaos, readable at a glance, fast rematch, celebrate moments —
all apply here unchanged).

This is the comedy game in the lineup: Mafia, Codenames, and Mystery are all
serious deduction. Hot Take is prompts, punchlines, and votes — every phone
is a buzzer. All prompts and copy are originals written for this game.

## The night, stage by stage

### 0–1. Discovery & identity — reuse everything

Same hub entry (`#/hottake`), same invite links, same site-wide profile:
name + avatar are remembered from the other games, never asked twice.

### 2. Lobby — writers' room

- Room code, QR, live roster — same components/patterns as the other games.
- Host config: **prompts per game** (1–5, default 3), **answer timer**
  (Off / 0:30 / 1:00 / 2:00 / 5:00, default 1:00), **vote timer** (Off / 0:15 /
  0:30 / 1:00, default 0:30). Host can remove wrong seats. Minimum 3
  players, maximum 12 (vote rounds get long past that).
- No prompt-pack picker in v1 — one original pack ships with the game.

### 3. Answering — everyone writes

- Each prompt goes to the **whole table at once** (no pairing logic, scales
  to any table size). Everyone writes one answer on their own phone; a live
  "waiting on…" count shows stragglers without naming shame beyond the roster.
- Answers are **sealed** until voting — your phone never shows anyone else's
  text early (same `viewFor` privacy pattern as the other secrets).
- When everyone connected has answered, voting opens by itself; the host may
  also close early (missing answers become blanks — the night never stalls).
- Timers are pressure only, like Mystery's search clock: expiry never
  punishes, the host closes.

### 4. Voting — anonymous ballot

- Every non-blank answer appears on an **anonymous ballot** (shuffled order,
  no names). Everyone — including the authors — votes for the funniest.
  You cannot vote for yourself; the engine ignores self-votes.
- The ballot shows who has voted, never for what. When everyone connected
  has voted (or the host closes), the scoreboard lands with a sting.
- Missing voters go uncounted; disconnected players never block.

### 5. Scoreboard & winner — full reveal

- Authorship is revealed with the votes: each answer shows its author and
  its vote count. **100 points per vote**, Jackbox-style big numbers.
- After the last prompt the podium lands: winner (ties share the crown),
  full prompt-by-prompt history for the table's victory lap.
- One-tap **rematch**: fresh prompts, zeroed scores, same room. Back to the
  lobby to change the setup.

## Roles & views (privacy contracts)

- There are **no secret roles** — the secrets are _texts and authorship_.
- **Answering view:** the prompt, your own submitted text, who has submitted
  (ids only). Never: anyone else's text.
- **Voting view:** the prompt, the anonymous ballot (texts only), your own
  vote, who has voted. Never: who wrote what, who voted for what.
- **Scoreboard / game-over view:** everything — prompt, answers with
  authors, votes, scores, history. Same reveal-on-resolution pattern as the
  other games.
- Rejoin tokens never appear in any view, any phase.

## Decisions locked in

- **Architecture:** same self-contained shape — `src/games/hottake/` with
  `engine/` (pure state machine + views + tests), later `net/` (same
  host-authoritative PeerJS session + token rejoin shape), `ui/` (one screen
  per phase), own CSS + sounds. New session key
  (`ashiboy-hottake-session`). No shared game-logic kit.
- **v1 scope is engine + spec only**: reducer, `viewFor`, prompt pack, and
  tests land first; net/UI/registry/tile art follow as a second change so
  the hub never points at an unplayable game.
- **One prompt per round for the whole table** (no Quiplash-style pairing).
  Deliberate: zero assignment logic, works from 3 to 12 players unchanged.
- **100 points per vote**, overwrite votes (last tap wins), blanks excluded
  from the ballot but blank authors may still vote.
- **Auto-advance** when everyone connected has answered/voted, plus host
  close-early on both phases (anti-stall, mirrors Mafia's overrides).
- **Sounds:** reuse the synth approach (pencil scratch, ballot drop, reveal
  sting, winner fanfare) + mute toggle.

## Edge cases (must all be covered in tests)

- Empty answer submit → treated as unsubmit (no blank stored).
- Host closes answering with zero non-blank answers → empty result recorded,
  scoreboard shows "no answers", game continues.
- Self-vote → ignored, vote unchanged.
- Vote for an out-of-range ballot seat → ignored.
- Vote overwrite → last tap wins.
- Disconnect mid-answer → seat kept, answer (if any) stays in play, rejoin
  restores it; connected-only quorums never wait on the missing.
- Removed seat's answers → excluded from the ballot.
- Last prompt's scoreboard advances to gameOver, not another answering round.
- Score tie → all top scorers crowned.
- Rematch → fresh prompts, cleared answers/votes/scores, same players.
- Determinism: same seed + same actions = same state (prompt order and
  ballot order are rng-shuffled at deal time).

## Limitations inventory

**Inherent (same as the other games, accepted):** host tab _is_ the room;
internet required for signaling; answers live in host memory until revealed
(peekable via devtools, fine for a comedy game).

**Accepted scope for v1:**

- One prompt pack (~48 prompts); no pack picker, no custom prompts.
- English-only, fully original prompts.
- No audience tier (everyone in the room plays).
- No in-app chat — reading answers aloud _is_ the game.
