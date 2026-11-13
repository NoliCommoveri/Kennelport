# Seeing a family's portal as they see it: plan

The breeder asks to see what a puppy family sees in their portal, live and read-only,
so she can answer "where do I find…?" on the phone, and check what a family is shown
before and after she changes something. Written 2026-11-13. Not built.

Builds on the family portal ([`family-portal.md`](family-portal.md), sections 2 and 7):
`portal/family.js` (their pages), `portal/auth.js` (their sign-in), `portal/admin.js`
(her family screen), `portal/feed.js` (the status page's one-tap link, which this copies).

## 1. What she gets

- On each family's screen in the Site Manager (Families › a family), a button: **See
  their portal**. It opens that family's portal, on her website's address, in a new tab.
- She sees their pages exactly as they would right now: the same Home for the puppy's
  stage, the same tabs (the loss tabs after a loss, Stay during an extended stay), the
  same checklist ticks, vet countdown, records, photos, files, messages and unread
  count. "Live" means every page is drawn from the records at the moment she opens or
  reloads it (the portal is already never cached), not a copy or a screenshot.
- A band at the top of every page says whose portal it is and that it's read-only, with
  **Refresh** and **Stop viewing**.
- Nothing she does there changes anything for the family. Buttons look the same as
  theirs (so she sees what they see), but a tap changes nothing: she comes back to the
  same page with a note saying so.
- It works for any active family, including one not invited yet or not signed in yet
  (she sees what they will see). Not for a deleted family.

## 2. How it works

### 2.1 Getting her from the Site Manager to her site's address

The portal lives on her site's host (`<sub>.kennelport.com` or her own domain), under
`/family`, with its own cookie. Her Site Manager sign-in is on `manage.kennelport.com`,
and the two are kept apart on purpose (`portal/auth.js` top comment). So the button
can't just link across; it hands her over once, the same way KennelOS's status page
does (`feed.js` `redeemHandoff`):

1. **See their portal** is a small form on her family screen
   (`POST /s/<sub>/portal/f/<id>/view`). The Site Manager checks she's signed in and
   has this site, then makes a **view link**: the site, the family, her account
   (`site_users` email hash), a random once-only value and an expiry 2 minutes out,
   signed with a key made from `EMAIL_HMAC_KEY` (`family-view:<site id>`). It
   redirects her to `portalBase(env, site)` + `/family/view?t=<link>`.
2. `/family/view` on her site checks the signature and expiry, and that the once-only
   value hasn't been used, recording it in the existing `portal_handoffs` table (it
   holds exactly that: a hash and a site). It then sets a **view cookie**,
   `kp_family_view` (Path=/family, HttpOnly, Secure, SameSite=Lax, 1 hour, not
   renewed), and redirects to `/family`.
3. The view cookie itself is signed, not stored: `<family id>.<her email hash>.<expiry>.<sig>`.
   No new table and no migration.

### 2.2 On every portal page

`servePortal` looks for the view cookie before the family cookie. When it's valid:

- it checks, on every request, that her account still has this site (`site_users`,
  joined) and the family is still active and not deleted; if not, the cookie is
  cleared and she gets the sign-in page;
- it builds the same `fam` object the family's own session gives
  (`familyId`, `name`, `statusUrl`, `loss`, `stay`, `unread`) plus `viewing: true`, so
  every page function draws exactly what the family would see;
- it skips `currentFamily` entirely, so their session and **last activity date (plan
  10.2, which decides when an account is deleted) never move** because she looked.

A family's own session in the same browser is left alone; the view cookie wins while
it lasts, and **Stop viewing** clears only it.

### 2.3 Read-only, enforced on the server

- **Every POST** under a view is refused before it reaches a handler (step ticks,
  "I've done this", vet booking, proof upload, messages, sign-out, account delete). The
  answer is a 303 back to the page it came from (`back`, else `/family`) with
  `?viewing=nochange`, which shows the note. Only `POST /family/view/exit` is allowed.
- **Reads that write** are made quiet under a view:
  - Messages: `markRead` is skipped, so her messages don't turn "read" for the family
    because she opened their Messages page;
  - program links (`family/files.js` `goToProgram`): the click isn't recorded in
    `portal_clicks`, so her Reports (plan 12) don't count her taps;
  - anything else found while building (`grep -n "INSERT\|UPDATE"` over `portal/family*`)
    gets the same treatment, with a test.
- Photos, files and media still go through the same per-family checks (they're served
  to the family id in the cookie), so a view can never show another family's files.

### 2.4 The band

At the top of `<main>`, on every page, using the portal's existing `.note` style (no new
CSS, so **no `PORTAL_VERSION` bump** is needed):

> You're seeing the Smith family's portal as they see it. Read-only: nothing you tap
> changes anything for them. Refresh · Stop viewing

After a refused tap: "Nothing was changed. This is their portal, read-only." The
`<title>` gets "(viewing)" so her tabs are easy to tell apart. All of this wording is
hers to read, so it goes in `manage/wording.js` (a new **Family portal, viewing** group),
read with `say()`, along with the button and its hint on her family screen.

No prototype screen shows this: the band is the prototype's note, and the button is the
family screen's existing small line button (`btn line small`), so nothing new is styled.
Check it at 390px and on a computer beside the prototype's family Home.

## 3. What changes, file by file

| File | Change |
|---|---|
| `portal/view.js` (new) | Make and check view links and the view cookie; the access check per request |
| `portal/family.js` | `servePortal`: the view cookie first; `/family/view` and `/family/view/exit`; refuse POSTs; the band in `frame`; skip `markRead` when viewing |
| `portal/family/files.js` | `goToProgram`: no click recorded when viewing |
| `portal/admin.js` | The **See their portal** button on the family screen, and its route |
| `manage/wording.js` | The button, its hint, the band, the refused-tap note |
| `tests/portal-view.test.js` (new) | Below |
| `docs/CODE_MAP.md` | `portal/view.js` |

No migration. No change to `public/_kp/f/`, `public/_kp/m/` or `public/_kp/t/`, so no
version bump of any kind. If the band ends up wanting its own look (a stronger colour
than `.note`), that's a `portal.css` change and a `PORTAL_VERSION` bump: ask first.

## 4. Tests (`tests/portal-view.test.js`)

- The button's link opens the family's Home with the band; the page matches the family's
  own Home apart from the band (same stage, tabs, checklist, unread count).
- The link works once; a second use, an expired link, a changed signature or another
  site's link all land on the sign-in page.
- A view cookie for a family on another site, or one whose signature is changed, shows
  nothing.
- Every POST route under a view changes no row (compare the tables before and after)
  and redirects with the note; `/family/view/exit` clears the cookie.
- Opening Messages under a view leaves her messages unread for the family; a program
  link adds no `portal_clicks` row; `last_activity_at` and the family's sessions don't
  move.
- Removed from the site (`site_users` row gone), or the family deleted: the next page
  clears the view.
- Photos and files: the viewed family's open; another family's are refused.
- A site on its own domain: the link goes to that domain.

## 5. Decisions to confirm with the owner

1. **Who may use it**: everyone with the site in the Site Manager (owner and editor), as
   planned here, or only the site's owner role?
2. **Does the family know?** Planned: nothing shown to them, since she already sees all
   of it on her own screens. Alternatively, a line in their Account page's history, or
   in her family screen's history ("You viewed their portal, 13 Nov").
3. **"Live" as reload** (planned, with a Refresh link in the band) or the page refreshing
   itself every minute or so? Refreshing itself needs a change to `portal.js`, and so a
   `PORTAL_VERSION` bump.
4. **An hour** before the view ends by itself: long enough?

## 6. Later, not in this plan

- The family's portal in a phone-sized frame beside her family screen, in the Site
  Manager itself (like the builder's phone preview). Needs the portal to allow being
  framed by `manage.` for views only (today it sends `frame-ancestors 'none'`).
- "See it on a given day": the portal as it will look at go-home or on the vet deadline.
