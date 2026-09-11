import type { Role } from '@/games/mafia/engine/types';

export const ROLE_INFO: Record<Role, { label: string; cssClass: string; blurb: string }> = {
  mafia: {
    label: 'Mafia',
    cssClass: 'role-mafia',
    blurb: 'Blend in with the town. Each night, secretly choose a victim with your fellow mafia.',
  },
  detective: {
    label: 'Detective',
    cssClass: 'role-detective',
    blurb: 'Each night, secretly investigate one player and learn whether they are mafia.',
  },
  doctor: {
    label: 'Doctor',
    cssClass: 'role-doctor',
    blurb: 'Each night, secretly protect one player from the mafia. You may protect yourself.',
  },
  villager: {
    label: 'Villager',
    cssClass: 'role-villager',
    blurb: 'No night powers. By day, find the mafia and vote them out before they take over.',
  },
};
