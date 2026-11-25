// The families' Training page (/family/training, a Quick link; drawn in portal/family.js):
// the AKC's age-based puppy timeline, the puppy's own stage first, and its S.T.A.R. Puppy
// checklist, from training-content.js (copied from KennelOS Furever). Read-only: nothing
// a family does here is stored. The breeder switches it off for her site on her Resources
// screen (portal_settings.training_off, migration 0046).
import { PROGRAMS, STAGES, CATEGORIES, SKILLS } from './training-content.js';

export const TRACKS = ['akc_timeline', 'akc_star_puppy'];
export const trackOf = (id) => (TRACKS.includes(id) ? id : TRACKS[0]);
export const programOf = (id) => PROGRAMS.find((p) => p.id === id);

// The Quick link shows until a year old; the page stays under Records.
export const TRAINING_QUICK_WEEKS = 52;

// Our own line under a stage (the content's developmental notes cite the research; families
// get what it means for them). "the puppy" becomes the puppy's name on the page.
const STAGE_NOTES = {
  akc_stage_8_16w: 'These weeks are when the puppy learns most easily what\'s safe. Meet new people, sounds and places gently, a little every day, even before the last shots.',
};

// [{ id, label, note, open, skills }]: the timeline by stage (the puppy's stage open, and
// first), or the checklist by category.
export function sections(track, weeks) {
  if (track === 'akc_timeline') {
    const stages = STAGES.filter((s) => s.program_id === track).sort((a, b) => a.order - b.order);
    const at = weeks === null ? stages[0] : stages.find((s) => weeks <= s.max_weeks) ?? stages.at(-1);
    return stages.map((s) => ({
      id: s.id, label: s.label, note: STAGE_NOTES[s.id] ?? null, open: s === at,
      skills: SKILLS.filter((x) => x.stage_id === s.id).sort((a, b) => a.order - b.order),
    })).sort((a, b) => (b.open - a.open) || 0);
  }
  const mine = SKILLS.filter((x) => x.program_id === track).sort((a, b) => a.order - b.order);
  return CATEGORIES.filter((c) => mine.some((x) => x.category_id === c.id))
    .map((c, i) => ({ id: c.id, label: c.label, note: null, open: i === 0, skills: mine.filter((x) => x.category_id === c.id) }));
}
