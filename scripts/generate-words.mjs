/**
 * Regenerates `src/games/codenames/engine/words.ts`.
 *
 * Run with `npm run words`. The board words come from `friendly-words`
 * (Glitch's hand-curated, MIT-licensed "friendly words" list), gated by the
 * frequency ranking in `popular-english-words` (ISC) so only words people
 * actually know survive. A hand-kept blocklist removes proper nouns,
 * jargon, and dull/abstract leftovers.
 *
 * The generated file is committed, so the game never ships the libraries.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { words as popularWords } from 'popular-english-words';

const require = createRequire(import.meta.url);
// friendly-words is CJS.
const { objects } = require('friendly-words');

/** Keep only words ranked inside the N most common in the corpus. */
const MAX_RANK = 25_000;
/** Single lowercase word, 3–10 letters — long or compound words slow the board. */
const WORD = /^[a-z]{3,10}$/;

/**
 * Words that survive the source + frequency filters but don't belong on a
 * party board: proper nouns, units/brands/jargon, and hard-to-clue
 * abstractions. Add to this list when a dud slips through.
 */
const DROP = new Set(
  `abstract account acoustic acrylic act action activity adapter addition address adjustment advantage
   afternoon aftermath age agenda agreement airbus alder algebra alloy almanac alto aluminum amp amount
   amusement ancient anger answer antique apology apparatus apparel appeal appendix appliance approach
   approval aragon archduke area argument arithmetic art article asp asphalt asterisk asteroid
   astronomy atmosphere atom attack attempt attention attraction august aura authority avatar avenue awe
   backbone background balance bard baritone baron baroness basin beat beaufort beauty beech beginner
   behavior belief bestseller bill biology bit bladder board booklet border botany bottom bounce
   bowler brace bracket brand brazil break breath brochure broker browser budget buffer bumper burn
   burst calcium calculator capacity caption carbon care carp carver case cast catcher cause caution
   cell cellar celsius cement cemetery cent century ceramic challenge chance change channel character
   check chemistry cheshire chill chip chips chord christmas citizen class click client climb clipper
   close clutch coaster cobalt coil colby cold college collision colony column columnist comfort comma
   comte concrete condition confidence congress consonant copy cord cosmos cost cough count countess
   course court cover creator credit crest crime crop crowd crowley cry curiosity currency curve cut
   cycle cylinder
   danger daphne darkness dash data dataset date day dead deal debt decade decimal decision dedication
   degree delivery department deposit derby detail device diagnostic diagram digit diploma direction
   discovery distance ditto dive dollar domain doom double drain draw dream drill drink drive drop
   dry duchess duke dust dye earl ease echo edge editor editorial education effect element empress end
   enemy energy english enquiry enthusiasm entrance epoch equipment era error estimate ethernet evening
   event exception exhaust existence expansion experience expert face fact failing fall fanatic fear
   feeling feels fender fiber fibre fiction fifth fight figure file find fine firewall fisher flare
   flat foe fold force forecast forgery form fortnight foundation fragment fragrance frame freedom
   freeze freighter friction friday frigate front fuel function gambler garment gateway gauge gemini
   general
   generation geography geology geometry glasses glow governor grade gram gravity grease grey grip
   ground group
   growth guan guarantee guilty handle hardcover hardware harmony hawthorn haze headline health hearing
   heat heath height helium help helper hemisphere henley hickory hide honesty hope hour hub humidity
   humor hydrogen hyphen icon idea impulse income increase index individual industry infinity innocent
   innovation interest jargon jasper jersey join jump jumper juniper jupiter jury justice keeper kick
   kicker kilometer lan language laser latency laugh launch law layer lead leader learning legal lens
   leo letter level license lift limit line link liquid list literature litter loan lobe logic look
   lumber lyric magnesium mahogany maize makeup mammal manager manner manuscript manx march margin
   marquess
   marquis mars mass math matrix may measure medallion medicine meeting memory mercury message meteorite
   meter methane mice middle mile millennium mind minute mistake mixer mixture modem molecule monarch
   monday monitor month mood moral morocco motion move mum muse myrtle name nation navy nebula need
   neon neptune nerve network neutral nickel nitrogen node noise note notify noun nova november number
   numeric objective occupation octave october offer open operation opinion option orbit order origin
   outfit output owner oxygen package page pair pamphlet panama paperback papyrus paradox parallel
   parcel part particle partner passive paste patch patient payment peace pedestrian pegasus penalty
   pendulum pentagon people period periodical peripheral petroleum philosophy phosphorus phrase
   physician pick pickup pigment pike ping place plain plank plaster plastic platinum play pleasure plot
   plume pluto plutonium poetry point polish polka porter position postage potassium potential poultry
   power practice preface prepared pressure price principal principle print process produce product
   production profit promise promotion proof property prose protest protocol psychology pull punch
   punishment purchase purpose push quality quarter quartz question quiet quit quotation radar radiator
   radius rail raja random range ray reaction reader reading reason receipt recess record recorder
   reference region relation relative reminder repair replace reply report request research resistance
   resolution resonance respect rest result revolve reward rhythm rise risk roadway roar roll romano
   rotate router rover rule run saga salary sale salesman salute saturday saturn save scale scene scent
   schooner science screen scribe script search season second secretary secure seeker sense september
   server session shade shake shaker shame shape share shear sheet shift shock shoemaker show shrine
   side sight sign silence silicon sing single situation slash slayer sleep slice slip smartphone snap
   socks
   society sociology sodium soil sole soprano sort soul sound source sovereign soy speak speaker
   specialist spectrum speech spell sphere spirit splash split spring sprint stage stallion station
   statistic stay steam step sting stitch stock stop strand stranger stretch structure study style
   subject substance success suggestion suit sulfur sunday supernova supply surf surprise swift swim
   switch sync system talk tang tanker target tax team technician teller temper tempo tendency tenor
   territory text textbook texture theory thing thought thrill thursday tick tie tile time timer tip
   titanium title today ton track tracker trade trader traffic transport travel traveler treatment
   trick trouble trust tuck tuesday tune turn turner turnover turret twilight twin twist uniform
   universe uranium vacation vacuum value variety vegetarian vein venom verdict verse vessel vinyl
   viscount vision voice voyage wake walk walker wander war wash waste wavelength way wealth weather
   wedge wednesday week weight wildcat william wish witness word work workshop writing year zenith zinc
   zone`
    .split(/\s+/)
    .filter(Boolean),
);

function buildWordList() {
  const rank = new Map(popularWords.getAll().map((word, i) => [word, i]));
  const words = objects.filter(
    (word) => WORD.test(word) && (rank.get(word) ?? Infinity) < MAX_RANK && !DROP.has(word),
  );
  return [...new Set(words)].sort();
}

const HEADER = `/**
 * Board words for Codenames — generated by scripts/generate-words.mjs.
 * Do not edit by hand: change the script's filters/blocklist instead and
 * re-run \`npm run words\`.
 *
 * Sourced from \`friendly-words\` (Glitch, MIT) and filtered to words ranked
 * inside the 25,000 most common in \`popular-english-words\` (ISC), then
 * hand-vetted against a blocklist of proper nouns, jargon, and dull words.
 * No Czech Games Edition content is used.
 */
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'src/games/codenames/engine/words.ts');
const words = buildWordList();

const body = `export const WORDS: string[] = [\n${words
  .map((word) => `  '${word}',`)
  .join('\n')}\n];\n`;

writeFileSync(outPath, HEADER + body);
console.log(`Wrote ${words.length} words to ${outPath}`);
