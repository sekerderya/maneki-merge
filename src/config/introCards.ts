/**
 * The cards that bring a hazard or a rule in as a stage opens (GAME_DESIGN §15.5): the clip popup
 * with a title, the mechanic's clip, one line and Got it. Each shows once per profile (a first-run
 * hint of the same id, config/app.ts).
 */
import { CLIP_CAPTIONS, pickClip } from './clips';
import type { ClipId } from './clips';
import { PICKS } from './picks';
import type { HazardCardId, RuleId } from './picks';

export type IntroCardId = HazardCardId | RuleId;

export interface IntroCard {
  readonly id: IntroCardId;
  readonly title: string;
  readonly line: string;
  readonly clip: ClipId;
}

/**
 * The hazards' cards. Boulders come from stage 2 whatever the picks; the others only once their
 * trial is taken, so their line says a trial can bring them.
 */
const HAZARD_CARDS: Readonly<Record<HazardCardId, Omit<IntroCard, 'id'>>> = {
  boulders: { title: 'Boulders', line: CLIP_CAPTIONS.boulderIntro, clip: 'boulderIntro' },
  cursedBell: {
    title: 'Cursed Bell',
    line: 'A trial can curse a cat: merge it before its bell runs out, or it turns to stone.',
    clip: 'curse',
  },
  wind: {
    title: 'Wind',
    line: 'A trial can bring wind: it blows falling cats sideways. Aim against it.',
    clip: 'windRight',
  },
  porcelain: {
    title: 'Porcelain',
    line: 'A trial can make cats porcelain: merges crack the cats beside them; cracked twice, a cat breaks in two.',
    clip: 'porcelain',
  },
};

export function isHazardCard(id: IntroCardId): id is HazardCardId {
  return id in HAZARD_CARDS;
}

/**
 * The card for `id`: a hazard's, or a rule's with its name, its line (GAME_DESIGN §15.11) and its
 * clip. The wind's clip blows the run's way (`windLeft`).
 */
export function introCard(id: IntroCardId, windLeft = false): IntroCard {
  if (isHazardCard(id)) {
    const card = HAZARD_CARDS[id];
    return { id, ...card, clip: id === 'wind' && windLeft ? 'windLeft' : card.clip };
  }
  const rule = PICKS[id];
  const clip = pickClip(id);
  if (!clip) throw new Error(`The ${id} rule has no clip`);
  return { id, title: rule.name, line: `${rule.description}.`, clip };
}
