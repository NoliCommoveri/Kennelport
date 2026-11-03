// Prices (plan 3.2, decision 31): the breeder types a litter's figures per sex, and
// every number the site shows is worked out from them. A price is one number:
// limited registration shows the base for that sex, full shows base plus the
// surcharge as a total, never "+$300". Where registration isn't settled, the
// puppy shows the range from one to the other; ranges are never typed.
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
  if (p.registration === 'limited') return { from: base, to: base };
  if (p.registration === 'full') return { from: full, to: full };
  return { from: base, to: full };
}

// Across the litter: the sexes it has (both while there are no puppies yet).
export function litterPriceRange(l, puppies = l.puppies ?? []) {
  const sexes = puppies.length ? [...new Set(puppies.map((p) => p.sex))] : ['female', 'male'];
  const lows = []; const highs = [];
  for (const sex of sexes) {
    const base = basePrice(l, sex);
    if (base == null) continue;
    lows.push(base);
    highs.push(base + surcharge(l, sex));
  }
  return lows.length ? { from: Math.min(...lows), to: Math.max(...highs) } : null;
}

export function depositRange(l, puppies = l.puppies ?? []) {
  const sexes = puppies.length ? [...new Set(puppies.map((p) => p.sex))] : ['female', 'male'];
  const v = sexes.map((s) => deposit(l, s)).filter((x) => x != null);
  return v.length ? { from: Math.min(...v), to: Math.max(...v) } : null;
}
