# 06 — The manage app: a breeder on a phone

Commit reviewed: `10cb8b9`  ·  Changed since the target (`8aaf58a`): in this session's files, `manage/index.js`,
`manage/screens.js`, `manage/forms.js`, `manage/wording.js` (session 1's and 2's fixes: Unlink confirm, products
and extras hidden instead of deleted, the sliding cookie). Read first.
Reviewed: `manage/index.js` 424, `screens.js` 979, `screens/` (`pages.js` 360, `picks.js` 138, `dogform.js` 100,
`account.js` 85, `inbox.js` 65, `queue.js` 54, `share.js` 50, `parts.js` 13), `forms.js` 540, `hub.js` 125,
`wording.js` 1092, `version.js` 12, `public/_kp/m/app.js` 125, `photos.js` 328, `sw.js` 66, `zip.js` 71, `app.css` 612,
`push.js` 187, `sites.js` 64; `badgeCode.js` 59 and `mail.js` 87 skimmed. `builder.js` (the owner's) only where her
screens share it.
Contract read: plan §4 (all, with 4.1 and 4.3), §5.2 step 4, the "Online only for edits" and roles paragraphs,
site-builder "The breeder's instructions" and the photo library; `docs/reference/portal-prototype.html` `admWebsite`.
Verified by: `node --test` 455 pass (baseline). A scratch harness (scratchpad, not the repo) that puts the real Worker
and its D1 helper behind a real Chromium at 390px (Playwright routing manage.kennelport.com to `worker.fetch`, with
`app.js`, `photos.js` and, for one check, the real service worker running): screenshots of Home, Publish, Inbox, a
message, Reviews to approve, KennelOS with a match, Recommended products, a litter, Photos, Waitlist; a hostile-string
crawl of 30 screens; editor POSTs; scripts for push, publish/undo, removal and page addresses.

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | public/_kp/m/app.js:111 · sw.js:29 · manage/screens.js:555-563 | A screen opened earlier (another device, or the app's offline copy) saves every field it shows, silently putting back what she changed elsewhere since; the plan says "nothing can conflict" | verified (Chromium) |
| 2 | S2 | public/_kp/m/app.js:111 · manage/screens/picks.js:103-104,126 | A Featured block's ↑ and ↓ do nothing: the save script drops which button was tapped, and she reads "Saved" | verified (Chromium) |
| 3 | S2 | manage/screens.js:807-808 · publish.js:412 | Two taps on **Undo last publish** on a slow connection go back two versions (and two taps on Publish make the next Undo look broken) | verified (Chromium, delayed answer) |
| 4 | S2 | public/_kp/m/photos.js:65-68 | A photo the phone can't re-encode (the canvas hands back nothing) stops the batch with "Preparing … (3 of 5)…" on screen for good and the Upload button greyed out | verified (Chromium, encoder failure simulated) |
| 5 | S2 | manage/screens.js:399 · content/records.js:312-333 · wording.js:316 | **Remove this litter** (or dog) is one tap under Save, deletes its puppies (a dog: its health results and titles) for good, and the line above it says it only comes off "your draft" | verified |
| 6 | S3 | public/_kp/m/photos.js:57-78, 236-243 | Several photos at once: at the first refusal (the limit reached on the 3rd) the batch stops; the two that went up aren't shown, the rest were never tried, and nothing says so | verified (Chromium) |
| 7 | S3 | public/_kp/m/sw.js:26-30 · app.js:11 | One bar: when a screen can't load but the phone still says it's online, the app shows its last copy (an Inbox without the new message) with no word that it's old; no time limit on waiting | verified (Chromium, real service worker) |
| 8 | S3 | manage/screens.js:317-323 · kennelos/match.js:63-64 · kennelos/bundle.js:754 | The match screen's "Tick to keep yours." keeps hers only until the next Update website; a Yes can't be taken back short of Unlink; the list shows stray bullets | verified |
| 9 | S3 | manage/index.js:196-197, 229-230, 236 | Sites without the portal show each KennelOS notice twice on Home; the status line reads "Not published yet · changes not published yet" | verified (Chromium) |
| 10 | S3 | manage/wording.js:808-838 | Today's error lines name the field by its code: "Not saved: products.link_url: not a web address", "Not saved: dogs.call_name: required" | verified |
| 11 | S3 | public/_kp/m/app.css:90 · manage/screens.js:65-67 | Her lists cut the line under each name to one line: session 1's "Not sent by KennelOS · off your website, still in the portal" reads "Not sent by …" on a phone | verified (Chromium 390px) |
| 12 | S3 | manage/screens/parts.js:6 | Every time in her Inbox, Reviews to approve and KennelOS devices is in UTC ("Nov 16, 11:16 PM UTC") | verified |
| 13 | S3 | push.js:170, 186 · sw.js:47-56 | Two pushes that arrive together (phone out of signal) end as one notification saying "Something new on your website." that opens `/`; several portal messages send her to the website Inbox | verified (script) |
| 14 | S4 | public/_kp/m/sw.js:26-29 · manage/index.js:372-378 | Signing out leaves every screen she opened (families' emails, phones, application answers) in the app's cache, shown on that device when offline | verified (reading; caching seen in Chromium) |
| 15 | S4 | public/_kp/m/zip.js:52-54 | **Download a copy** leaves out any photo whose download fails and still says "Done" | verified (reading) |

## 1. A stale screen saves over what she changed elsewhere  (S1, verified)
**Where** `public/_kp/m/app.js:103-121` sends every field of a `data-save` form; the server saves them all
(`screens.js:555-563` Kennel details, `screens.js:458-471` any record, `pages.js:140-147` pages). Nothing on the form
says which version it was drawn from. `sw.js:29` serves the last copy of a screen when the network fails.
**Scenario** (run in Chromium) She opens **Kennel details** on her phone in the morning. Later, on her computer, she
types a new contact phone, `918-555-0199`, and saves. Back on the phone, the old screen is still open (or she opens
the app in the barn and gets its cached copy); she changes the town and taps Save. The phone number is now empty
again (`contact_phone: '918-555-0199'` → `null`), with "Saved to your draft". The same holds for a dog, a litter, a
page card, a payment card. Only KennelOS's own fields are protected (`screens.js:463` restores them).
**Why it matters** Plan §4 says "No offline sync, so nothing can conflict"; the offline copy makes an old form the
normal thing to see after a dead spot, and the loss is silent. On a phone she will not re-read every field before
tapping Save.
**What I'd do** Put the record's `updated_at` (or a hash of what was shown) in each form and refuse a save drawn from an
older version, showing both; at least, have the service worker mark a cached screen so its forms say "this may be
out of date".

## 2. A Featured block's ↑ and ↓ do nothing  (S2, verified)
**Where** `app.js:111` builds `new FormData(form)` without the button that was tapped (`e.submitter`); the Featured
list's moves are `<button name="move" value="<id>:up">` inside the `data-save` form (`picks.js:103-104,126`).
**Scenario** (Chromium) Her Featured dogs list: Willow, Ziva, Peaches, Pearl*, Boone*. She taps **↑** beside Ziva. The
post carries no `move`, so the server saves the ticks as they are and answers `?note=picked`: the screen says "Saved.
Your website shows your choice after you publish." The order stays Willow, Ziva, … and her site keeps featuring
Willow first. The test (`picks.test.js:157`) posts `move` directly, so it passes; only the browser path is broken.
No other `data-save` form has a named button today (checked), but any added later will break the same way.
**What I'd do** Append `e.submitter`'s name and value (or `new FormData(form, e.submitter)`); a test that runs `app.js`.

## 3. A double tap on Undo goes back two versions  (S2, verified)
**Where** `screens.js:808`: Undo is a plain form, no guard; `undoPublish` (`publish.js:412-429`) deletes the live
version and goes one back each time it is called.
**Scenario** (Chromium, the server answering after 1.5 s, as on one bar) Three publishes. She taps **Undo last publish**,
nothing seems to happen, she taps again. Both posts land: the site goes back two versions, and the version in between
is deleted, so she cannot step forward to it again. The note says only "Undone. Visitors see the version before."
The same double tap on **Publish** makes two identical versions; her next Undo then changes nothing visible, and she
reads that as Undo failing and taps again.
**What I'd do** Send which version Undo is undoing (the live snapshot's id) and refuse it if that is no longer live; the
same for Publish. Disable the button on submit, as `data-save` forms already do.

## 4. A photo that fails to re-encode freezes the upload  (S2, verified)
**Where** `photos.js:65-68`: `encode()` can return `null` (`canvas.toBlob` gives `null` when the browser can't make the
image, the known case being iOS Safari over its canvas memory limit with many large photos); `body.append('full',
null, …)` throws, and only `createImageBitmap` and `fetch` are inside `try` (`photos.js:63,74`).
**Scenario** (Chromium, `toBlob` made to fail from the third photo) She picks five photos on the Photos screen. Two go
up; the status stays "Preparing IMG_0003.jpg (3 of 5)…" and the Upload button stays disabled until she leaves the
screen. The two that went up aren't shown (no reload). The same happens in the library window and a photo picker.
Each photo also leaves its full-size bitmap open (`bitmap.close()` is never called), which is what pushes a phone
towards that failure on a long batch.
**What I'd do** Treat a `null` blob like an unreadable photo ("couldn't be prepared"), close each bitmap, and always
re-enable the input in a `finally`.

## 5. Remove this litter: one tap, its puppies with it, for good  (S2, verified)
**Where** `screens.js:399` puts **Remove this litter / dog / …** in its own card right under the form's Save; no
confirm. `removeRecord` (`records.js:312-333`) deletes a litter's puppies, a dog's health results and titles, the
parents on every litter and offspring, their videos. The line above the button (`lists.removing_takes_it_off`):
"Removing takes it off your draft; it stays on the live site until you publish."
**Scenario** The Gem litter, 3 puppies. One tap (meant for Save, a thumb's width above): the litter and its 3 puppies
are gone from her tables. "Removed from your draft." Publishing and then **Undo last publish** brings the litter back on
the live site but not into her draft: the next publish removes it again, and no screen can restore it. Compare the
leaving card's **Remove now**, which says "Removing can't be undone" (`screens.js:192`).
**What I'd do** A confirm screen that says what goes with it ("and its 3 puppies"), and wording that doesn't suggest the
draft can be got back.

## 6. A batch stops at the first refusal and doesn't say what happened  (S3, verified)
**Where** `photos.js:77` returns at the first error; the Photos screen reloads only when every photo went up (`:242`).
**Scenario** (Chromium) Site limit set two photos above what she has; she picks five. Status: "IMG_0003.jpg: This site has
reached its limit of 2 photos." Photos 1 and 2 are uploaded but not on screen; 4 and 5 were never tried. If she makes
room and picks the five again, 1 and 2 are uploaded twice. The same for an unreadable HEIC on Android ("couldn't be
read") in the middle of a batch. The limit line also has no next step ("remove photos you no longer use", which the
storage line on the same screen does say).
**What I'd do** Carry on past a bad photo, then say "3 of 5 added; IMG_0003 …" and reload or show the ones added.

## 7. One bar: an old screen with no warning  (S3, verified)
**Where** `sw.js:26-30` (network first, no time limit, then the cached copy); the offline note follows only
`navigator.onLine` (`app.js:11`).
**Scenario** (Chromium with the real service worker) Her Inbox is cached; a new message arrives; her connection drops out
while the phone still reports a network. Opening Inbox shows the old list, without the new message, and no note
(`navigator.onLine` is `true`). On a slow connection the request is never timed out, so she waits on a blank screen
first. Related: a `data-save` form whose answer is lost after the server saved says "Nothing was saved"
(`app.js:119`); tapping Save again on **Add puppy** then adds a second puppy.
**What I'd do** Mark responses served from the cache (a header or a banner the worker inserts) and time the network out
after a few seconds; word the failure "may not have been saved" for a new record.

## 8. "Tick to keep yours" keeps it once  (S3, verified)
**Where** `screens.js:317` ("Tick to keep yours." under each field); `match.js:63-64` keeps her value "this once";
the next bundle calls `updateDog(cur, bd)` with no keep (`bundle.js:754`), so KennelOS's value replaces hers.
**Scenario** She matches Willow and ticks registered name to keep "AK's Wild at Heart". The next Update website writes
KennelOS's "AK's Wild Thing" over it, with nothing on Publish saying it was her choice. A Yes can't be undone except by
Unlink (every record, every device). On a phone the list also shows bullets and an indent: `ul.plain` has no style
in `app.css`. Session 3 #8 covered which fields the screen leaves out; this is the wording of the ones it shows.
**What I'd do** Say it plainly ("Keep yours for now: KennelOS's next Update replaces it; change it in KennelOS to keep
it"), or make the keep stick.

## 9. Each notice twice on Home  (S3, verified)
**Where** `index.js:196-197` puts the matches card and the notices in `notesHtml`; for a site without the portal,
`:229` prints `notesHtml` and `:230` prints the notices again.
**Scenario** (Chromium, 390px) One KennelOS notice: two identical cards, each with **Review and publish** and **Done**.
Below them, before her first publish: "Not published yet · changes not published yet" (`home.status.draft` +
`home.unpublished`), where the prototype's `admWebsite` reads "Live · 3 changes not published yet".
**What I'd do** Drop line 230; give the draft state its own line.

## 10. Errors that name the field by its code  (S3, verified)
**Where** `wording.js:808-838`: today's default for every check error is `'{path}: …'`; `{field}` (her label) is
offered but no default uses it.
**Scenario** A product link typed as "chewy dot com": "Not saved: products.link_url: not a web address". A dog with no
name: "Not saved: dogs.call_name: required". The page address errors already read well ("Another of your pages is at
/faq. Choose another address.").
**What I'd do** The owner's call, being her list: a default using `{field}` ("Web address: not a web address") would
fix every form at once.

## 11. List lines cut to "Not sent by …" on a phone  (S3, verified)
**Where** `app.css:90` (`.item > a span`: one line, ellipsis); `screens.js:65-67` builds products' and extras' lines.
**Scenario** (Chromium 390px) Recommended products: "Embark DNA test  Not sent by …", "Puppy starter kit  Off your web…".
Session 1's new line (`lists.sub.not_sent_portal`) can't be read at all on a phone, and a longer product name leaves
no room for it. The prototype (`admWebsite`'s Your site list) puts the line under the name, where it wraps.
**What I'd do** Let the line wrap under the name, as the prototype does.

## 12. Times in UTC  (S3, verified)
**Where** `screens/parts.js:6` `when()`: `timeZone: 'UTC'`, " UTC" appended; used by the Inbox, a message, Reviews to
approve, KennelOS devices and the link code's expiry.
**Scenario** A family writes at 8 pm in Oklahoma; her Inbox says "Nov 16, 2:00 AM UTC". The portal already keeps her time
zone (`getSettings().time_zone`, used on Today).
**What I'd do** Use the site's time zone where one is set.

## 13. Two pushes, one vague notification  (S3, verified)
**Where** `pendingPush` hands every unshown item to the first push (`push.js:146-166`); the next finds none and gets
`pushText([])` = "Something new on your website.", path `/` (`:170`); the service worker shows it with the same tag
and `renotify` (`sw.js:47-56`), replacing the first.
**Scenario** (script) Phone without signal; Jenna and Dana write. Both pushes arrive when she's back: the first shows "2 new
messages" (opens Inbox), the second immediately replaces it with "Something new on your website." (opens `/`). Also:
with several items, portal messages count as "new messages" and the path is the website Inbox (`:186`), where portal
messages aren't. The messages themselves are still findable (Home's counts, Today), so S3.
**What I'd do** When nothing is new, have the push re-show the last text instead of the generic one; send portal-only
messages to Families.

## 14. Sign out leaves her screens readable on the device  (S4, verified by reading)
**Where** `sw.js:26-29` caches every page she opens; sign out (`index.js:372-378`) clears the cookies only. Nothing
clears the cache (`grep caches.delete`: only the version change).
**Scenario** She signs in on a family computer or a phone she later hands on, opens a few applications, signs out.
Offline, `/s/<sub>/inbox/<id>` still opens: name, email, phone and every answer. The plan's sign-out section doesn't
mention it.
**What I'd do** `Clear-Site-Data: "cache"` on the sign-out answer (or the service worker emptying its pages on it).

## 15. Download a copy skips photos silently  (S4, verified by reading)
**Where** `zip.js:52-54`: `if (res.ok) files.push(…)`; anything else is left out, and the end says "Done: … Check your
downloads." The account screen offers this copy before **Delete my site**.
**Scenario** One photo's file missing in R2, or one 5xx on a long download: the zip has fewer photos than
`photos.json` lists, with no word.
**What I'd do** Count the misses and say "3 photos couldn't be fetched: try again".

## Notes, not findings
- **Owner vs editor, every POST.** Checked with an editor's session: Stop this device, Unlink and Delete my site
  are refused (404 / "only the owner"), and their buttons aren't shown. An editor can make a link code (the plan
  allows it, §5.2), switch KennelOS prices, publish, undo, delete messages, approve or decline reviews, and **Remove
  now** a leaving litter (the cleanup's `deleteLitter`, irreversible). Remove now is reachable only for a litter on
  the leaving list (`screens.js:946-948` checks it), and its card says it can't be undone. Whether a helper should
  delete litters is the owner's call.
- **CSRF.** Every POST under the manage host is refused without a matching `Origin` or `Sec-Fetch-Site: same-origin`
  (`index.js:346`), before any route; `/push/pending` (before the check) proves itself with the subscription
  secret. `MANAGE_CSP` has `form-action 'self'`, `frame-ancestors 'none'`. Fine.
- **Escaping.** A crawl of 30 screens (portal on and off) with `Bo's "<img src=x onerror=alert(1)>" & <b>` in the
  kennel name, dogs, litters, puppies, messages (name, topic, message, answers), a review and its answers, products,
  a notice, a device label, a waitlist entry and a page's menu name: no raw tag anywhere. Long answers and a 200-character
  URL wrap at 390px. An old message with no answers shows the message alone.
- **Page Address field.** Saving each of a page's cards in turn (`_part`) keeps her address (checked on five pages);
  the errors read in her words; "Our Story!" becomes `/our-story`. The suggestion from the menu name is text she has
  to retype.
- Undo publish shows no date or what it goes back to; after an undo, Publish lists the same changes again, which is
  right but unexplained.
- `publishScreen`'s catch shows any error's raw text (a D1 error would read as-is).
- Reviews to approve shows the month as `2026-09`.
- `app.js`'s push lines, `photos.js`'s progress lines, `zip.js`'s, the leaving card's help, the match question,
  "Your role: owner." and `hub.js` (step 2.4) are still in code. The build log has no "not moved yet" list I could
  find (`grep -i "not moved"` finds nothing in `docs/log/`); the ones in the cached app (`public/_kp/m/`) also need
  a version bump to change, so they may want a data attribute from the page, as the library window already does.
- The Inbox shows the newest 200 with nothing saying there are more.
- A session that expired mid-upload: the upload's redirect to sign-in parses as `{}`, so the picker adds an image
  with `src="undefined"` and a `_new_photos=undefined` field. Rare at 90-day sliding sessions.

## Coverage gaps I found (tests that should exist)
- Nothing runs `app.js`: a test that submits a `data-save` form with a named button (finding 2) would have caught
  it; the harness I used (Playwright routing to `worker.fetch`) is about 50 lines.
- Double submit of Publish and Undo (finding 3).
- `photos.js` with an encoder that fails, and a batch with a refusal in the middle (findings 4, 6).
- A form drawn from an older version saved after a newer one (finding 1).
- `pendingPush` called twice for one batch (finding 13).
- Home with a notice and no portal: count the notice cards (finding 9).

## What I did not get to
- Real iPhone and Android uploads (HEIC, 12MP, orientation): only Chromium with 12MP JPEGs; the iOS canvas limit in
  finding 4 is the known failure, not one I reproduced.
- `share.js` (QR codes) and `badgeCode.js` beyond a read; `mail.js` only as used by sign-in.
- The hub's Families and Portal tabs (session 11's files) beyond the escaping crawl.
- iOS standalone push (needs a device).
