// Prices (plan 3.2, decision 31): the breeder types a litter's figures per sex, and
// every number the site shows is worked out from them. A price is one number:
// limited registration shows the base for that sex, full shows base plus the
// surcharge as a total, never "+$300". A puppy whose registration isn't settled
// is priced as limited — the base, not a range to full: nearly every puppy goes
// limited, and a family reading a range can't tell which number is theirs. Where
// she lets families ask about full registration, the puppy says so under its
// price and the surcharge shows as its own line (parts.js fullRegSurchargeRow).
// So the only range left is across the sexes, and ranges are never typed.
//
// Either sex blank means "the same as the other", so a breeder who prices girls
// and boys alike types one number.
const OTHER = { female: 'male', male: 'female' };
const fig = (l, name, sex) => l?.[`${name}_${sex}`] ?? l?.[`${name}_${OTHER[sex]}`] ?? null;

export const basePrice = (l, sex) => fig(l, 'price', sex);
export const surcharge = (l, sex) => fig(l, 'full_reg', sex) ?? 0;
export const deposit = (l, sex) => fig(l, 'deposit', sex);

// { from, to } for one puppy, or null when there's nothing to show. A puppy's own
// price overrides everything and shows exactly as typed.
export function puppyPrice(l, p) {
  if (p.price != null) return { from: p.price, to: p.price };
  const base = basePrice(l, p.sex);
  if (base == null) return null;
  const full = base + surcharge(l, p.sex);
  if (p.registration === 'full') return { from: full, to: full };
  return { from: base, to: base }; // limited, or not settled yet: shown as limited
}

// Across the litter: the sexes it has (both while there are no puppies yet). Its
// base prices, as its puppies show them; the full-registration surcharge is a
// line of its own and never widens this into a range.
export function litterPriceRange(l, puppies = l.puppies ?? []) {
  const sexes = puppies.length ? [...new Set(puppies.map((p) => p.sex))] : ['female', 'male'];
  const bases = [];
  for (const sex of sexes) {
    const base = basePrice(l, sex);
    if (base != null) bases.push(base);
  }
  return bases.length ? { from: Math.min(...bases), to: Math.max(...bases) } : null;
}

export function depositRange(l, puppies = l.puppies ?? []) {
  const sexes = puppies.length ? [...new Set(puppies.map((p) => p.sex))] : ['female', 'male'];
  const v = sexes.map((s) => deposit(l, s)).filter((x) => x != null);
  return v.length ? { from: Math.min(...v), to: Math.max(...v) } : null;
}
