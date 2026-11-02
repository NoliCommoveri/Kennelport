# KennelPort: setup (phase 0)

What has to be done once, by hand, in the Cloudflare dashboard, for the Worker in
[`../worker/`](../worker/) to run (plan 2.1, 8.1 phase 0). Nothing here is repeated per
site. The code side is done; these steps are yours.

## Before the domain is bought

Staging needs no domain: it runs on its `workers.dev` address, and `kennelport.com` in
its config is only a name the routing uses (`/__host` stands in for real hostnames). So
until the domain is bought, do only the staging half: skip steps 1 and 2, create just
`kennelport-staging` and `kennelport-files-staging` in step 3, connect just
`kennelport-staging` in step 4, and set its `OPS_TOKEN` in step 5. Don't connect the
production Worker yet: its routes name the `kennelport.com` zone, so its deploys fail
until the zone exists. Everything up to phase 3 can be built and tried on staging.

## 1. The domain

- Register `kennelport.com` (Cloudflare Registrar is at cost; any registrar works).
- If it isn't registered with Cloudflare: **Add a site** in the dashboard (Free plan) and
  change the registrar's nameservers to the two Cloudflare gives you.

## 2. DNS and certificates

In **DNS → Records** for `kennelport.com`, add two records, both **Proxied** (orange
cloud). They point nowhere real; the Worker answers every request:

| Type | Name | Content | Proxy |
|---|---|---|---|
| AAAA | `@` | `100::` | Proxied |
| AAAA | `*` | `100::` | Proxied |

- **SSL/TLS → Edge Certificates:** Universal SSL covers `kennelport.com` and
  `*.kennelport.com` (one level only, which is why sites have no `www.`, plan 3.1). Turn on
  **Always Use HTTPS**, minimum TLS 1.2.
- Leave email (MX) records alone if you add mail later; they don't conflict.

## 3. D1 and R2

- **Storage & Databases → D1 → Create:** `kennelport-staging`, then `kennelport`. Copy each
  database id into [`../worker/wrangler.toml`](../worker/wrangler.toml), replacing
  `REPLACE-WITH-STAGING-D1-ID` and `REPLACE-WITH-PRODUCTION-D1-ID` (or send them to Claude
  to commit).
- **R2:** turn R2 on (Cloudflare asks for a payment method even on the free tier; nothing
  is charged within it). Create buckets `kennelport-files-staging` and `kennelport-files`.
  Leave both **private**: no public access, no `r2.dev` address. Every file is served by
  the Worker after a check (plan 4.2).

## 4. Deploys (Workers Builds)

Two connections to this repository, both with **root directory** `worker` and no build
command:

| Worker name | Branch | Deploy command | Address |
|---|---|---|---|
| `kennelport-staging` | `main` | `npx wrangler deploy --env=""` | `kennelport-staging.kennelport.workers.dev` |
| `kennelport` | `main` | `npx wrangler deploy --env production` | `kennelport.com`, `*.kennelport.com` |

**Workers & Pages → Create → Import a repository** for each; the Worker name must match
`name` in `wrangler.toml` (`kennelport-staging` at the top, `kennelport` under
`[env.production]`). Production's routes come from `wrangler.toml`. Staging's
`--env=""` names the top-level (staging) settings explicitly; plain `npx wrangler deploy`
does the same but warns "Multiple environments are defined".

**If a merge doesn't start a build:** the Worker's Deployments list shows no build for
the new commit, and GitHub's commit page shows no "Workers Builds" check. **Retry build**
won't help: it rebuilds the same older commit (the build page names it, e.g. `main
999f5af`). Check that the Cloudflare Workers and Pages app on GitHub still has access to
this repository (GitHub → Settings → Applications → Installed GitHub Apps → Configure),
then push or merge again, or disconnect and reconnect the repository under the Worker's
Settings → Build, which builds the latest `main`.

## 5. Secrets

On each Worker, **Settings → Variables and Secrets → Add → Secret**: `OPS_TOKEN`, a long
random string, different for staging and production. Keep both in your password
manager. `/ops` stays closed until it's set.

For sign-in (phase 2), also on each Worker:
- `EMAIL_HMAC_KEY`, **Secret**: another long random string, different per Worker. It
  turns every email address into the keyed hash KennelPort keeps instead of the
  address. **Never change it** once anyone has signed in: every invite and session
  would stop matching.
- `RESEND_API_KEY`, **Secret**, when email is set up (below). Until then staging shows
  codes and invites in `/ops` (Staging outbox); production can't sign anyone in.

For the forms and notifications (phase 2), on each Worker:
- `VAPID_PRIVATE_JWK`, **Secret**: the push notification key. In `/ops`, press **Make push
  keys** and paste what it shows. Changing it later means every device turns
  notifications on again.
- **Turnstile** (decision 17): in the Cloudflare dashboard, **Turnstile → Add widget**,
  with the hostnames the sites use (`kennelport.com`, and for staging
  `kennelport-staging.kennelport.workers.dev`), mode **Managed**. Add its site key as the
  variable `TURNSTILE_SITE_KEY` and its secret key as the secret `TURNSTILE_SECRET`.
  Until both are set the forms rely on the hidden honeypot field and rate limits, and
  `/ops` says so.

## 6. Check it works

- **Staging:** open `https://kennelport-staging.kennelport.workers.dev/ops`, sign in with
  the staging token, press **Apply pending**. Every setup check should read OK.
  Staging can't receive real hostnames, so it acts as `manage.kennelport.com` by default;
  `/__host?h=thornfield.kennelport.com` makes your browser see it as that site, and
  `/__host?clear` goes back (staging only).
- **Production:** `https://manage.kennelport.com/ops`, sign in, **Apply pending**, all OK.
  Then `https://kennelport.com` shows the KennelPort placeholder, and
  `https://anything.kennelport.com` shows "No KennelPort site has this address" (404).
  That proves the wildcard DNS, the certificate and the route together.

## Later, not phase 0

- **Resend** (sign-in codes and invites): create an account, verify `kennelport.com`
  as a sending domain (it adds DNS records), make an API key and set it as
  `RESEND_API_KEY`. `MAIL_FROM` in `wrangler.toml` is the sender.
- **Cloudflare for SaaS** (custom domains, plan 2.4): when the first site wants its own
  domain.
- **Turnstile** site key (forms): phase 3.
