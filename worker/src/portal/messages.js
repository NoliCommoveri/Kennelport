// The portal's emails to families, plain text (docs/plans/family-portal.md
// sections 5 and 11). Vet reminders are transactional: no unsubscribe, no
// program links. Her own wording for them comes with a later chunk (plan section 4);
// until then these are the words, with her proof note added where she wrote one.
import { formatAt, formatDay, timeLeft } from './vet.js';

const FOOT = (base) => `\nYour puppy portal: ${base}/family\n`;
const NOT_NOTICE = 'This is a reminder from your puppy portal. Your contract states the vet visit requirement; this email doesn\'t replace it.\n';

export function codeMessage({ kennel, code, minutes }) {
  return {
    subject: `Your sign-in code for ${kennel}: ${code}`,
    text: `Your sign-in code for ${kennel}'s puppy portal is ${code}\n\nType it in within ${minutes} minutes.\n\nIf you didn't ask for this code, you can ignore this email.\n`,
  };
}

export function inviteMessage({ kennel, family, pup, link, base, days }) {
  return {
    subject: `${pup ? `${pup}'s` : 'Your'} puppy portal from ${kennel}`,
    text: `Hello ${family},\n\n${kennel} has opened a puppy portal for you${pup ? ` and ${pup}` : ''}: the countdown to go-home, the 3-day vet visit, ${pup ? `${pup}'s` : 'your puppy\'s'} records and the programs that come with your puppy.\n\n`
      + `Tap to sign in (this link works once, for ${days} days):\n${link}\n\n`
      + `After that, sign in any time at ${base}/family with this email address. We'll send you a 6-digit code; there's no password.\n\n`
      + "If you weren't expecting this, you can ignore it.\n",
  };
}

// The vet reminders. p: the placement; s: her settings; pup: the name to use.
export function vetMessage(kind, { kennel, pup, p, s, base, now = new Date() }) {
  const tz = s.time_zone;
  const deadline = p.vet_deadline_at ? formatAt(p.vet_deadline_at, tz, { zone: true }) : null;
  const proof = s.proof_note ? `\nWhat counts as proof: ${s.proof_note}\n` : '';
  const rule = s.vet_rule === 'days3' ? 'by the end of the third day after the day you take them home' : 'within 72 hours of taking them home';
  switch (kind) {
    case 'vet_book': {
      const day = p.pickup_booked_at ? formatAt(p.pickup_booked_at, tz) : formatDay(p.go_home_on);
      return {
        subject: `Book ${pup}'s vet visit now`,
        text: `${pup} comes home ${day}. Your contract with ${kennel} asks for a vet visit ${rule}, and vets are often booked days ahead, so now is the time to book it.\n\n`
          + `Once it's booked, tap "I've booked it" in your puppy portal and these reminders stop.\n${proof}\n${NOT_NOTICE}${FOOT(base)}`,
      };
    }
    case 'vet_pickup':
      return {
        subject: `${pup}'s vet visit is due by ${deadline}`,
        text: `Welcome home, ${pup}!\n\nThe vet visit is due by ${deadline}. ${p.vet_booked_for ? `You've booked it for ${p.vet_booked_for.replace('T', ' at ')}.` : 'If you haven\'t booked it yet, please book it today.'}\n\n`
          + `After the visit, upload the vet's record in your puppy portal.\n${proof}\n${NOT_NOTICE}${FOOT(base)}`,
      };
    case 'vet_day_before':
    case 'vet_morning':
      return {
        subject: kind === 'vet_morning' ? `Today: ${pup}'s vet visit is due by ${formatAt(p.vet_deadline_at, tz, { weekday: false })}` : `${timeLeft(p.vet_deadline_at, now)} left for ${pup}'s vet visit`,
        text: `${pup}'s vet visit is due by ${deadline}, ${timeLeft(p.vet_deadline_at, now)} from now.\n\n`
          + `${p.vet_booked_for ? `You've booked it for ${p.vet_booked_for.replace('T', ' at ')}. ` : ''}After the visit, upload the vet's record in your puppy portal so ${kennel} has it.\n${proof}\n${NOT_NOTICE}${FOOT(base)}`,
      };
    default:
      throw new Error(`no message for ${kind}`);
  }
}
