# Ideal Party-Game Flow

What the Mafia experience _should_ feel like at a real game night, and the
limitations that constrain it. New features and every future game on this
site should be judged against this doc.

## Design principles

These come from the setting, not from taste: a room full of people, phones
of varying quality, dim light, mixed tech literacy, zero patience.

1. **Zero-friction entry.** No accounts, no installs, no tutorial. Link →
   name → playing. Every extra tap loses a player.
2. **The host plays, not administrates.** Hosting = tapping "create". Any
   host-only power must be usable one-handed, mid-conversation.
3. **Never stall.** The game must always be able to move forward. Any state
   that waits on one specific person needs a fallback (skip, timeout, or
   majority). A stalled party game dies on the spot.
4. **Secrets stay secret.** Role privacy is the core promise of the product.
   No leaks in UI, no shoulder-surfing traps, and reconnection must restore
   _your_ secrets without exposing anyone else's.
5. **Recover from chaos.** Tabs close, phones die, people go to the bar.
   Players must be able to rejoin, and the game must continue short-handed.
6. **Readable at a glance.** Big targets, high contrast, and one obvious
   answer to "what do I do right now?" on every screen.
7. **Fast rounds, instant rematch.** Setup → playing in under a minute.
   Rematch in one tap, with the group intact.
8. **Celebrate the moments.** Kills, saves, reveals, and wins need punch —
   the app is the showman of the table.

## The flow, stage by stage

### 0. Discovery — "we should play something"

Someone shares a link in the group chat or reads it off their screen.
Ideal: the link opens the game directly with the room code prefilled, on any
phone, no install. At the table, a scannable QR code beats a dictated code.

### 1. Identity — name + avatar

One screen. Name field, avatar picker with a random default so picking is
optional, remembered next visit. No validation beyond non-empty.

### 2. Lobby — gathering the table

- The room code is huge and readable from across the room, plus one-tap copy
  and a QR code for the table.
- The roster updates live as people join, with connection state visible.
- The host configures the setup with guardrails (invalid setups impossible,
  sensible suggestions per headcount) and everyone sees the same setup.
- Starting requires the minimum headcount with a clear message otherwise.
- Anyone can join until the game starts; after that the room locks.
- The host can remove a seat that shouldn't be there (wrong room, duplicate).

### 3. Role reveal — dealing secrets

- Private by default: roles are never on screen until the owner asks to see
  them (tap-to-reveal), with an explicit "hide your phone" cue.
- Everyone confirms before the game proceeds; the waiting count reflects
  players who can actually act.
- Nothing about anyone's role leaks to any other device (verified by test,
  not by trust).

### 4. Night — secret actions

- Each role sees only what it needs: mafia see each other's picks live,
  detective/doctor see their own prompt, everyone else gets an unambiguous
  "sleep" state that still confirms their own role.
- Picks are changeable until the night resolves; resolution needs no
  moderator (majority of mafia, random tiebreak, doctor save wins ties).
- Progress is shown without naming names ("2 still acting").
- **Anti-stall (critical):** if someone puts their phone down mid-night, the
  table must be able to move on — host skip/timeout that resolves the night
  without the missing actor.

### 5. Day reveal — the show

- One dramatic, unambiguous outcome: who died, or that nobody did.
- The detective's result is delivered privately and stays available for
  reference through the day (memory beats re-reading).
- The whole table advances together; nobody is left on yesterday's screen.

### 6. Discussion — the humans talk

- Free-form (out loud — the app stays out of the way), with the alive roster
  visible and one obvious way to proceed. A timer is a nice-to-have, never
  a blocker.

### 7. Voting — the elimination

- One tap per candidate, changeable until the vote closes; abstain allowed.
- Votes are public and the tally is live — tension is the point.
- Can't vote for the dead or yourself; the dead can't vote.
- Resolution is automatic when everyone who can vote has voted; ties are
  communicated, never ambiguous.
- **Anti-stall (critical):** same as night — one missing voter must not freeze
  the table (host skip/timeout counting them as abstain).

### 8. Elimination + win — the payoff

- The eliminated player's role is revealed with fanfare.
- Win detection is immediate and correct, including edge cases (parity
  reached by a night kill ends the game that night, not the next day).
- Full role reveal, rematch in one tap with group and setup kept.

### 9. Leaving — the exit

- Leaving is clean: your seat frees up, the game continues without you.
- If the room itself is gone (host left), you're told plainly — never parked
  on a dead "rejoin" promise.
- If _you_ drop and come back, you land in your seat with your secrets
  intact, mid-phase, with no host intervention.

## Limitations inventory

**Inherent to the architecture (accepted trade-offs):**

- The host's tab _is_ the room. If the host leaves, the game ends. There is
  no host migration.
- Internet is required even on the same WiFi (room setup uses a public
  signaling service; game traffic itself is peer-to-peer).
- All secrets live in the host's browser memory. A curious host with
  devtools could peek. Acceptable for a serverless party game, never for
  stakes higher than bragging rights.
- No native app. The site works in any mobile browser; installability
  (PWA) is future work.

**Accepted scope (deliberate for now):**

- Fixed role set, one detective and one doctor max.
- No in-app chat — discussion happens out loud; it's a room game.
- No spectators and no joining after the game starts.
- English only. Emoji avatars (render varies by OS — fine at this fidelity).
- Sounds require one prior tap (browser autoplay policy); the join flow
  guarantees it.
