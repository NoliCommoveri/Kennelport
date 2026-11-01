# KennelPort build log

History of the plan and, later, the build. Newest last. The plan itself
([`KennelPort_Plan.md`](KennelPort_Plan.md)) describes only the current intent.

## 2026-10-09: first draft and decisions

- High-level plan written: one Worker for every site, subdomains of `kennelport.com`
  (briefly `kennelport.app`), structured content, KennelOS pushes an allow-listed bundle.
- Decided: domain `kennelport.com`; in-app **Request a website** is KennelOS Pro only,
  with a public form for everyone else; KennelPort has its own sign-in; KennelOS
  publishes only on **Update website**; KennelOS never sends prices; embeds from an
  approved provider list; not for sale yet (first site is for family); closing a site
  deletes everything and leaves a "no longer hosting" notice.

## 2026-11-01: checked against KennelOS

KennelOS features built since the draft, and where the plan took them in:

| KennelOS feature | Plan |
|---|---|
| Litter prices (per sex, deposit, full-registration surcharge) shown on families' turns | 3.2; decision 6 reopened |
| Extras price list; families request extras on their status page; `extras_info_url` | 3.4 |
| Pickup places and transport settings (fee per mile, free miles, own-meetup distance, "be in touch" distance) | 3.5 |
| Puppy plan (`disposition`) and waitlist picks holding a pup | 3.6 |
| Parents' health tests on family pages (`parent_tests`, Normal / Abnormal), certificates in the vault | 3.7 |
| Show titles from logged results | 3 (Our dogs), 3.7 |
| Coming up switches (planned heats, pairings, early litters) | 3.7 |
| Waitlist form and public list embeddable on the breeder's own site | 3.8 |
| Application FAQ | 3 (Optional pages) |
| Several own kennels | 5.5 |
| Live sync across devices | 5.5; decision 11 |
| Kels guided tasks | 5.5 |

Also added: the parity rule (every feature works without KennelOS first), sections 3.4–3.8
rewritten as "on its own" then "with KennelOS", sections 3.9–3.10 (standard breeder-site
features and the inquiry form), and custom domains with guided, self-checking DNS steps.

## 2026-11-01: review fixes

- **Scope:** version 1 is now the first family site only (section 8.1): renderer and ops,
  breeder login, and the pages in decision 14. Requests, guided custom domains, the
  KennelOS link, albums and embeds and the rest of section 3.9 moved to a backlog.
  Custom domains for version 1 are connected by hand. Per-plan limits became per-site
  limits set in ops; the cost table shows the first site and 15 breeders.
- **Publish model:** replaced per-row `draft_json` / `published_json` with snapshots: the
  tables are the draft, Publish writes one snapshot of the whole site, the renderer reads
  only that, the last 10 are kept for **Undo publish**, and redirects are worked out at
  publish time (section 4.1, new `snapshots` table).
- **KennelOS bundles:** rules written down for matching, updating, new and missing
  records, and first-link matching by name with confirmation (section 5.3, decision 16).
- **Scripts vs the Content Security Policy:** Turnstile needs an outside script, so the
  form starts with a honeypot, timing check and rate limits, with Turnstile only on form
  pages if needed (decision 17). Visitor stats are counted by the Worker instead of
  Cloudflare Web Analytics' script.
- **Embed previews:** thumbnails fetched once at save time and stored in R2 for YouTube,
  Vimeo and TikTok; placeholders for Facebook, Instagram, maps and forms (their oEmbed
  needs an app token).
- **Closing a site:** the "no copy kept" promise now names D1 Time Travel's 30-day window
  and emails already sent.
- **Photos and files:** the server re-checks uploads (WebP only, size limits, no `EXIF`
  or `XMP` chunks); the renderer serves only files the published snapshot lists as public,
  so certificates stay private whatever their R2 key (section 4.2).
- **Waitlist embed:** corrected: KennelOS's `embed_origins` is optional (empty allows any
  site); **Connect website** adds the site only when the breeder has listed sites.
- **Decision 6** stays open; sections 3.2, 5.1 and 5.3 now say the same thing about it.
- Decisions grouped as Decided / Open without dates; history moved here from the plan's
  old section 11. The breeder is "they" throughout instead of "she".

## 2026-11-01: site directory from a survey of breeder websites

- Read the menus of 28 breeder websites and six inner pages directly, plus about 25 more
  sites through search results. Wrote `KennelPort_Site_Directory.md`: how common each page
  type is, and a page-by-page directory of what real sites show, what KennelOS can fill
  and what only the breeder can write.
- Proposed, not yet in the plan: How it works, Programs (guardian homes), How we raise
  puppies, Retired, In memory, Older puppies, Show results, Litter diary, Reviews and How to
  pay safely pages; planned litters from KennelOS pairings with their status; picks taken
  and open per sex as counts; a Family login link to KennelOS's status page.
