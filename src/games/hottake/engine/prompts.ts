import { Prompt } from '@/games/hottake/engine/types';

/**
 * Starter prompt pack — fully original, family-friendly, written for this
 * game. Never licensed trivia or cloned party-game content: prompts only
 * ever need a punchline, so there are no answers to lift.
 */
const PROMPTS: Prompt[] = [
  { id: 'p01', text: 'The worst thing to hear from your dentist:' },
  { id: 'p02', text: 'A terrible name for a pet rock:' },
  { id: 'p03', text: 'What the moon is really made of:' },
  { id: 'p04', text: 'The first rule of the secret pigeon society:' },
  { id: 'p05', text: 'Something you should never say at a wedding:' },
  { id: 'p06', text: 'A rejected Olympic sport:' },
  { id: 'p07', text: 'What your fridge thinks about you:' },
  { id: 'p08', text: 'The real reason dinosaurs went extinct:' },
  { id: 'p09', text: 'A bad time-travel destination:' },
  { id: 'p10', text: 'What aliens will find most confusing about us:' },
  { id: 'p11', text: 'The worst superpower to have:' },
  { id: 'p12', text: 'A slogan for a haunted laundromat:' },
  { id: 'p13', text: 'What the dog did while you were at work:' },
  { id: 'p14', text: 'An unusual pizza topping that should stay unusual:' },
  { id: 'p15', text: 'The title of the mayor’s embarrassing memoir:' },
  { id: 'p16', text: 'Something pirates are afraid of:' },
  { id: 'p17', text: 'A warning label that should exist but doesn’t:' },
  { id: 'p18', text: 'What ghosts complain about:' },
  { id: 'p19', text: 'The worst thing to find in your pocket:' },
  { id: 'p20', text: 'A job nobody wants but somebody has:' },
  { id: 'p21', text: 'What squirrels are secretly planning:' },
  { id: 'p22', text: 'The least relaxing spa treatment:' },
  { id: 'p23', text: 'A terrible fortune-cookie fortune:' },
  { id: 'p24', text: 'What robots dream about:' },
  { id: 'p25', text: 'The world’s most boring magic trick:' },
  { id: 'p26', text: 'Something you don’t want your smart speaker to repeat:' },
  { id: 'p27', text: 'A rejected ice-cream flavor:' },
  { id: 'p28', text: 'What the office plant witnessed:' },
  { id: 'p29', text: 'The worst possible halftime show:' },
  { id: 'p30', text: 'A pickup line that never works:' },
  { id: 'p31', text: 'What vampires order at restaurants:' },
  { id: 'p32', text: 'The most suspicious thing to bring to a picnic:' },
  { id: 'p33', text: 'A headline from the year 2125:' },
  { id: 'p34', text: 'What your car would say if it could talk:' },
  { id: 'p35', text: 'The worst app idea ever pitched:' },
  { id: 'p36', text: 'Something a dragon would put on its résumé:' },
  { id: 'p37', text: 'A bad name for a rock band made of accountants:' },
  { id: 'p38', text: 'What the Tooth Fairy does with all those teeth:' },
  { id: 'p39', text: 'The least impressive world record:' },
  { id: 'p40', text: 'Something you should never whisper in a library… loudly:' },
  { id: 'p41', text: 'A terrible theme for a grown-up birthday party:' },
  { id: 'p42', text: 'What mermaids gossip about:' },
  { id: 'p43', text: 'The worst thing to yell on a quiet train:' },
  { id: 'p44', text: 'A museum exhibit nobody visits:' },
  { id: 'p45', text: 'What clouds are actually thinking:' },
  { id: 'p46', text: 'The most dramatic way to eat a sandwich:' },
  { id: 'p47', text: 'Something a haunted GPS would say:' },
  { id: 'p48', text: 'The title of a cookbook nobody asked for:' },
];

export function getPrompt(id: string): Prompt | undefined {
  return PROMPTS.find((p) => p.id === id);
}

export function allPromptIds(): string[] {
  return PROMPTS.map((p) => p.id);
}
