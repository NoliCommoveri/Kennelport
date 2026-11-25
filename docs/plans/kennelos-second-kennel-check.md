# Prompt: check KennelOS's side of the family portal for a second kennel

For a session in the **KennelOS** repository. Paste everything below the line. It asks
for a read and a written answer, not changes. Background: `portal-multi-breeder.md` 2.6.

---

I'm about to offer KennelPort's family puppy portal to a **second breeder (kennel)**. The
portal was built for one kennel first, and some KennelOS work for it may have been
written for that kennel alone. Please **read the code and answer, don't change anything
yet.** Start from this repository's CLAUDE.md and its own docs on what to read first.

## What KennelPort expects (its side is built and per site)

When KennelOS links a kennel to a KennelPort site, KennelPort's link facts (the response
that fills in the website, from `siteFacts` on KennelPort) include:

- `portal_feed: 1` when that site has the portal switched on, `null` when it doesn't;
- `portal_takes`: the placement and health fields that site's Worker accepts in the feed.

Each `POST /v1/portal` (the family feed, format 1) reply carries
`portal: { url, handoff_url, handoff_key, handoff_minutes }`. The `handoff_key` is
**per site and per kennel** (derived from the site and the linked kennel's id). KennelOS
signs the status page's "Open your puppy portal" link with it, and checks KennelPort's
"Open your status page" tokens with it (`handleFromPortal` in `cloud/src/familyActions.js`,
signed over `to-status:` plus the body).

For the first kennel, KennelOS was changed to:

1. send the feed's rows **on their own** (a signed contract, a booked pickup, an approved
   extra, a voided sale or a lost puppy, a pickup, the go-home bag's items), from her
   device whenever a record changes and whenever KennelOS opens, not only on Update website;
2. read the facts that come back in the feed's reply (picked up, health records she
   removed, what went home in the bag, and so on);
3. show **Open your puppy portal** on the status page (signed one-tap link), then only
   **Your puppy portal** once the puppy is picked up, or once the pickup date has passed
   or the sale is Delivered;
4. accept the portal's **Open your status page** link (signed in, no code, 90 days);
5. **Start puppy portal now** on a sale, before the contract is signed;
6. turn **Companion and Furever off** for that kennel's families (no Companion link
   request on the status page, no Send to Furever for its pups);
7. send `bag_items` in the bundle, and expenses back for what went home.

## What I need to know

For **each of the seven items above**, tell me what turns it on:

- **the link's `portal_feed` fact** (or another per-link flag), so any kennel linked to
  a portal site gets it: good;
- **a hard-coded kennel id, account, email, environment variable or feature flag naming
  the first kennel**: needs a change;
- **something else**, such as a per-kennel setting someone has to switch on by hand. Say
  where it's set and who can set it.

Give the file and line for each. Also check:

- **Two kennels at once.** Is any key, cache, queue, timer or "last sent" marker
  global rather than per kennel or per link? Could one kennel's feed, handoff key or
  facts leak into or overwrite the other's?
- **Turning the portal off.** If the second site's portal is switched off later
  (`portal_feed` becomes null), does KennelOS stop sending the feed and put Companion,
  Furever and the plain status page back for that kennel?
- **Kennels without the portal.** Confirm nothing changed for them.
- **Tests.** Does any test cover a second portal kennel? If not, which test file would
  hold one?

## Answer as

A short table: item, what turns it on, file and line, OK or needs a change. Then, for
anything that needs a change, a plan in plain steps, smallest first, with any migration
or release it needs. Don't build it until I say so.
