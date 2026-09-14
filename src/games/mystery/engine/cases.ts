import { MysteryCase } from '@/games/mystery/engine/types';

/**
 * Starter case — fully original: invented victim, suspects, clues, and
 * solution, written for this game. New cases add one entry here; the
 * engine never changes per case.
 */
const MASQUERADE: MysteryCase = {
  id: 'masquerade',
  title: 'Murder at the Masquerade',
  victim: 'Lady Evangeline Hart',
  brief:
    'The midnight unmasking never happened. Lady Evangeline Hart was found ' +
    'lifeless in her own conservatory while the masked ball danced on ' +
    'without her. Four guests had reason to wish her quiet — and one of ' +
    'them slipped away from the music. Search the rooms, press the ' +
    'suspects, and name the killer before the trail goes cold.',
  suspects: [
    {
      id: 'silas',
      name: 'Silas Vane',
      role: 'The Investor',
      bio: 'Funded the Hart shipping line and lost a fortune when Evangeline sold it.',
      alibi: 'Claims he was on the terrace arguing business on the telephone at midnight.',
    },
    {
      id: 'odette',
      name: 'Odette Laroux',
      role: 'The Soprano',
      bio: 'The evening’s headliner. Evangeline threatened to cancel her contract.',
      alibi: 'Claims she was rehearsing scales alone in the music room at midnight.',
    },
    {
      id: 'wren',
      name: 'Wren Halloway',
      role: 'The Niece',
      bio: 'Evangeline’s heir — provided the will read the way the family expects.',
      alibi: 'Claims she was dancing every dance and never left the ballroom floor.',
    },
    {
      id: 'tomas',
      name: 'Tomas Beck',
      role: 'The Gardener',
      bio: 'Tended the conservatory for twenty years; a dismissal letter arrived that week.',
      alibi: 'Claims he was locking the potting shed and never came up to the house.',
    },
  ],
  locations: [
    {
      id: 'conservatory',
      name: 'The Conservatory',
      description: 'Glass walls, damp orchids, and the table where she was found.',
    },
    {
      id: 'ballroom',
      name: 'The Ballroom',
      description: 'A hundred masks, a string quartet, and everyone watching everyone.',
    },
    {
      id: 'library',
      name: 'The Library',
      description: 'Evangeline’s private study. She kept her letters under lock and key.',
    },
    {
      id: 'cellar',
      name: 'The Wine Cellar',
      description: 'Stone steps down to the racks — and the house poisons cabinet.',
      lockedByClueId: 'key-brass',
    },
  ],
  weapons: [
    { id: 'laudanum', name: 'A vial of laudanum' },
    { id: 'shears', name: 'Pruning shears' },
    { id: 'opener', name: 'A silver letter opener' },
    { id: 'bust', name: 'A marble bust' },
  ],
  clues: [
    {
      id: 'glass',
      locationId: 'conservatory',
      title: 'Shattered cordial glass',
      detail: 'A cordial glass smashed under the table. The dregs smell of bitter almonds.',
    },
    {
      id: 'dancecard',
      locationId: 'ballroom',
      title: 'A dropped dance card',
      detail: 'A dance card for every dance — signed with a flourish that is not Wren’s hand.',
    },
    {
      id: 'guestlist',
      locationId: 'ballroom',
      title: 'Torn guest list',
      detail: 'The door tally is torn in half. Four names are missing from the count.',
    },
    {
      id: 'ledger',
      locationId: 'library',
      title: 'A ledger page',
      detail: 'Silas owed the Hart line more than the house is worth. A red herring of debt.',
    },
    {
      id: 'key-brass',
      locationId: 'library',
      title: 'A small brass key',
      detail: 'Taped under the desk drawer. Its tag reads “cellar — poisons”.',
    },
    {
      id: 'vial',
      locationId: 'cellar',
      title: 'An empty laudanum vial',
      detail: 'One vial missing from the poisons cabinet, dust undisturbed around its slot.',
    },
    {
      id: 'handkerchief',
      locationId: 'cellar',
      title: 'A monogrammed handkerchief',
      detail: 'Dropped behind the rack. The initials stitched in green are W. H.',
    },
  ],
  secrets: [
    {
      suspectId: 'silas',
      text: 'Pressed, Silas admits the terrace telephone has been disconnected for a month.',
    },
    {
      suspectId: 'odette',
      text: 'Pressed, Odette admits the music room was locked all evening — she never went in.',
    },
    {
      suspectId: 'wren',
      text: 'Pressed, Wren admits she slipped down to the cellar at midnight “for air”.',
    },
    {
      suspectId: 'tomas',
      text: 'Pressed, Tomas admits he burned the dismissal letter — and kept a copy of the key.',
    },
  ],
  solution: { suspectId: 'wren', weaponId: 'laudanum', locationId: 'conservatory' },
};

const CURTAIN: MysteryCase = {
  id: 'curtain',
  title: 'The Final Curtain',
  victim: 'Vivienne Kale',
  brief:
    'The interval bell rang twice and the star never returned to the stage. ' +
    'Vivienne Kale was found lifeless among the painted flats while the ' +
    'audience murmured for the second act. Four people wanted her final bow ' +
    'to come early — and one of them never left the theatre. Search the ' +
    'rooms, press the suspects, and name the killer before the trail goes cold.',
  suspects: [
    {
      id: 'marcus',
      name: 'Marcus Thorne',
      role: 'The Understudy',
      bio: 'Waited six years in Vivienne’s shadow, one sprained ankle from the lead.',
      alibi: 'Claims he was running lines in the alley behind the theatre at the interval.',
    },
    {
      id: 'petra',
      name: 'Petra Ilves',
      role: 'The Director',
      bio: 'Staked her reputation — and her savings — on this production.',
      alibi: 'Claims she was shouting at the producer in the box office all interval.',
    },
    {
      id: 'gus',
      name: 'Gus Polder',
      role: 'The Stagehand',
      bio: 'Thirty years on the ropes and rigging; Vivienne had him demoted twice.',
      alibi: 'Claims he was coiling rope alone in the fly tower when the bell rang.',
    },
    {
      id: 'imogen',
      name: 'Imogen Fenn',
      role: 'The Critic',
      bio: 'Her pen closed two shows this season; Vivienne called her a vulture in print.',
      alibi: 'Claims she never left her third-row seat, drafting her review.',
    },
  ],
  locations: [
    {
      id: 'stage',
      name: 'The Stage',
      description: 'Painted flats, a fallen backdrop, and chalk where she lay.',
    },
    {
      id: 'dressing',
      name: 'The Dressing Rooms',
      description: 'Mirrors ringed with bulbs, and everybody’s grudges in the drawers.',
    },
    {
      id: 'gallery',
      name: 'The Lighting Gallery',
      description: 'A cramped perch above the house with a view of every door.',
    },
    {
      id: 'props',
      name: 'The Prop Room',
      description: 'Racks of daggers, bottles, and poisons for the second act.',
      lockedByClueId: 'key-iron',
    },
  ],
  weapons: [
    { id: 'tonic', name: 'A bottle of sleeping tonic' },
    { id: 'dagger', name: 'A prop dagger' },
    { id: 'sandbag', name: 'A rigging sandbag' },
    { id: 'weight', name: 'A painted stage weight' },
  ],
  clues: [
    {
      id: 'goblet',
      locationId: 'stage',
      title: 'A lipsticked goblet',
      detail: 'Vivienne’s interval cordial, half-drunk. It smells faintly of bitter herbs.',
    },
    {
      id: 'chalkline',
      locationId: 'stage',
      title: 'A scuffed chalk mark',
      detail: 'The spike mark for her entrance — she never reached it.',
    },
    {
      id: 'key-iron',
      locationId: 'dressing',
      title: 'A heavy iron key',
      detail: 'Taped inside Vivienne’s powder drawer. Its tag reads “props”.',
    },
    {
      id: 'letter',
      locationId: 'dressing',
      title: 'An unsent letter',
      detail: 'Marcus drafted a resignation dripping with fury — then never sent it.',
    },
    {
      id: 'fibers',
      locationId: 'gallery',
      title: 'Pale rope fibers',
      detail: 'Snagged on the gallery rail. Gus’s rigging — or anybody’s hands.',
    },
    {
      id: 'draft',
      locationId: 'gallery',
      title: 'A critic’s draft',
      detail: 'Imogen’s interval notes: “Kale shrieks where she should sing.” Vicious and public.',
    },
    {
      id: 'bottle',
      locationId: 'props',
      title: 'An empty tonic bottle',
      detail: 'One bottle missing from the apothecary tray, the dust ring fresh around its place.',
    },
    {
      id: 'shawl',
      locationId: 'props',
      title: 'A monogrammed shawl',
      detail: 'Folded behind the poison bottles. The initials stitched in silver are P. I.',
    },
  ],
  secrets: [
    {
      suspectId: 'marcus',
      text: 'Pressed, Marcus admits the alley door was bolted from the inside all evening.',
    },
    {
      suspectId: 'petra',
      text: 'Pressed, Petra admits she slipped into the prop room at the interval “to be alone”.',
    },
    {
      suspectId: 'gus',
      text: 'Pressed, Gus admits he cut no ropes — but the gallery stairs stood empty at the bell.',
    },
    {
      suspectId: 'imogen',
      text: 'Pressed, Imogen admits she left her seat to powder her nose and missed the interval.',
    },
  ],
  solution: { suspectId: 'petra', weaponId: 'tonic', locationId: 'stage' },
};

const LIGHTHOUSE: MysteryCase = {
  id: 'lighthouse',
  title: 'Light Out at Gull Rock',
  victim: 'Elias Crowe',
  brief:
    'The light went dark in the middle of a gale and nobody on the rock will ' +
    'say why. Elias Crowe, keeper of Gull Rock for thirty years, was found at ' +
    'the foot of his own tower while the lamp room stood empty above him. ' +
    'Four souls weathered that night on the rock — and one of them climbed ' +
    'those ninety steps with murder in mind. Search the rooms, press the ' +
    'suspects, and name the killer before the trail goes cold.',
  suspects: [
    {
      id: 'nora',
      name: 'Nora Pell',
      role: 'The Relief Keeper',
      bio: 'Sent to replace Elias after thirty years; he refused to leave.',
      alibi: 'Claims she was mending lamp wicks in the oil room all night.',
    },
    {
      id: 'dutch',
      name: 'Dutch Marlow',
      role: 'The Boatman',
      bio: 'Ferried supplies — and, they whisper, contraband — to the rock for a decade.',
      alibi: 'Claims his boat never left the mainland jetty in the storm.',
    },
    {
      id: 'agnes',
      name: 'Agnes Crowe',
      role: 'The Widow',
      bio: 'Married to the light longer than to Elias, the rock likes to say.',
      alibi: 'Claims she slept in the cottage and heard nothing over the gale.',
    },
    {
      id: 'fenwick',
      name: 'Fenwick Hale',
      role: 'The Inspector',
      bio: 'Came to audit the light accounts and found them short.',
      alibi: 'Claims he wrote his report by lantern in the spare room all night.',
    },
  ],
  locations: [
    {
      id: 'tower',
      name: 'The Light Tower',
      description: 'Ninety steps of salt-worn stone, and Elias at the bottom.',
    },
    {
      id: 'cottage',
      name: 'The Keeper’s Cottage',
      description: 'A warm room with a cold hearth and everybody’s letters.',
    },
    {
      id: 'cliff',
      name: 'The Cliff Path',
      description: 'A slick track between the landing and the light.',
    },
    {
      id: 'boathouse',
      name: 'The Boathouse',
      description: 'Oars, nets, and the stores for the winter.',
      lockedByClueId: 'key-hook',
    },
  ],
  weapons: [
    { id: 'lamp', name: 'A brass oil lamp' },
    { id: 'rope', name: 'A coil of mooring rope' },
    { id: 'knife', name: 'A gutting knife' },
    { id: 'hammer', name: 'A rock hammer' },
  ],
  clues: [
    {
      id: 'shade',
      locationId: 'tower',
      title: 'A shattered lamp shade',
      detail: 'Glass from the lamp room — carried down the steps, never fallen.',
    },
    {
      id: 'watch',
      locationId: 'tower',
      title: 'A stopped pocket watch',
      detail: 'Elias’s watch, smashed at half past eleven.',
    },
    {
      id: 'key-hook',
      locationId: 'cottage',
      title: 'A hook-shaped key',
      detail: 'Hung behind the flour bin. Its tag reads “boathouse”.',
    },
    {
      id: 'accounts',
      locationId: 'cottage',
      title: 'A short accounts book',
      detail: 'Fenwick’s audit marks: three winters of stores unaccounted for.',
    },
    {
      id: 'prints',
      locationId: 'cliff',
      title: 'Bootprints in the mud',
      detail: 'Two sets climbing toward the light — only one set coming down.',
    },
    {
      id: 'lantern',
      locationId: 'cliff',
      title: 'A guttered lantern',
      detail: 'Left burning at the cliff’s edge. Someone waited here.',
    },
    {
      id: 'flask',
      locationId: 'boathouse',
      title: 'An empty oil flask',
      detail: 'One flask short on the shelf, the ring in the dust still wet.',
    },
    {
      id: 'button',
      locationId: 'boathouse',
      title: 'A brass uniform button',
      detail: 'Torn off at the cuff — and Fenwick’s greatcoat is missing one.',
    },
  ],
  secrets: [
    {
      suspectId: 'nora',
      text: 'Pressed, Nora admits she mended no wicks — she spent the night packing Elias’s trunk.',
    },
    {
      suspectId: 'dutch',
      text: 'Pressed, Dutch admits his boat did cross — to land a crate he will not name.',
    },
    {
      suspectId: 'agnes',
      text: 'Pressed, Agnes admits the hearth was cold because she never lit it — she never went home.',
    },
    {
      suspectId: 'fenwick',
      text: 'Pressed, Fenwick admits he climbed to the lamp room at eleven “to see the light”.',
    },
  ],
  solution: { suspectId: 'fenwick', weaponId: 'lamp', locationId: 'tower' },
};

export const CASES: MysteryCase[] = [MASQUERADE, CURTAIN, LIGHTHOUSE];

export function getCase(caseId: string): MysteryCase | undefined {
  return CASES.find((c) => c.id === caseId);
}
