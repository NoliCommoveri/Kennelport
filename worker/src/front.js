// KennelPort's own pages at kennelport.com (hosts.js "home"): a short front page, the
// terms of use and the privacy policy. Built from the portal prototype's components (docs/reference/
// portal-prototype.html: the dark header, the tile grid, numbered steps, the band card);
// there is no prototype of this page itself. Static: no data, no script, so the CSP
// allows inline styles and our own fonts only. Not in a cached folder (_kp/m, _kp/t,
// _kp/f), so changing it needs no version bump.
import { SECURITY_HEADERS } from './lib/html.js';

export const FRONT_CSP = "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'; base-uri 'none'";
export const CONTACT = 'admin.kennelos@gmail.com';
export const TERMS_UPDATED = '5 November 2026';
export const PRIVACY_UPDATED = '5 November 2026';

const STYLE = `
@font-face { font-family: "Fraunces"; src: url("/_kp/fonts/fraunces-opsz-normal.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Mulish"; src: url("/_kp/fonts/mulish-400.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Mulish"; src: url("/_kp/fonts/mulish-700.woff2") format("woff2"); font-weight: 700 800; font-display: swap; }
:root { --bg: #F5F2EA; --surface: #FFFDF8; --ink: #1E1D1A; --muted: #625C51; --line: #DED7C8; --band: #ECE6D8;
  --accent: #34523C; --accent-ink: #FFFFFF; --accent-soft: #E3EADF; --brass: #8A6B2C; --head: #1F3A2A; --head-ink: #F5F2EA; --head-muted: #B9C8BC;
  --shadow: 0 1px 2px rgba(30,29,26,.06), 0 6px 18px rgba(30,29,26,.08);
  --f-display: "Fraunces", Georgia, "Times New Roman", serif; --f-body: "Mulish", "Segoe UI", system-ui, -apple-system, sans-serif;
  --r: 8px; --rc: 14px; --gut: 16px; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #141412; --surface: #1D1C19; --ink: #ECE7DC; --muted: #A9A294; --line: #35332D; --band: #24221E;
  --accent: #8FB998; --accent-ink: #0F1A12; --accent-soft: #233127; --brass: #CFAE66; --head: #10201A; --head-ink: #ECE7DC; --head-muted: #8FA596;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 6px 18px rgba(0,0,0,.35); color-scheme: dark; } }
html { font-size: 15px; -webkit-text-size-adjust: 100%; }
@media (min-width: 720px) { html { font-size: 16px; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 1rem/1.55 var(--f-body); }
h1, h2, h3 { font-family: var(--f-display); font-weight: 500; line-height: 1.15; margin: 0; text-wrap: balance; }
p { margin: 0; }
a { color: var(--accent); }
.eyebrow { font-size: .68rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--brass); }
.muted { color: var(--muted); } .small { font-size: .86rem; }
svg.i { width: 1.4rem; height: 1.4rem; flex: none; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.6rem; padding: .5rem 1.1rem; border-radius: var(--r); font: 700 .88rem/1.1 var(--f-body); letter-spacing: .02em; border: 1.5px solid var(--accent); color: var(--accent); text-decoration: none; }
.btn.solid { background: var(--accent); color: var(--accent-ink); }
.btn.onfill { background: var(--head-ink); color: var(--head); border-color: var(--head-ink); }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
header.app { background: var(--head); color: var(--head-ink); }
header.app .in, main, footer .in { max-width: 1080px; margin: 0 auto; padding-left: max(var(--gut), env(safe-area-inset-left, 0px)); padding-right: max(var(--gut), env(safe-area-inset-right, 0px)); }
header.app .in { display: flex; align-items: center; gap: .6rem; padding-top: .6rem; padding-bottom: .6rem; }
header.app .brand { display: flex; align-items: center; gap: .6rem; color: inherit; text-decoration: none; margin-right: auto; min-width: 0; }
header.app .logo { width: 2.7rem; height: 2.7rem; border-radius: 50%; background: #fff; color: #1E1D1A; display: grid; place-items: center; flex: none; }
header.app .logo svg { width: 1.8rem; height: 1.8rem; }
header.app .brand b { font: 500 1.1rem/1.1 var(--f-display); display: block; }
header.app .sub { font-size: .64rem; letter-spacing: .13em; text-transform: uppercase; color: var(--head-muted); font-weight: 700; margin-top: 2px; }
header.app nav a { color: var(--head-ink); font-weight: 700; font-size: .86rem; text-decoration: none; padding: .4rem .2rem; }
header.app nav a:hover { text-decoration: underline; }
main { padding-top: 1rem; padding-bottom: 2rem; }
.bento { --cols: 2; display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: .6rem; }
@media (min-width: 720px) { .bento { --cols: 4; gap: .75rem; } }
.s2 { grid-column: span 2; } .full { grid-column: 1 / -1; }
.tile { min-width: 0; border-radius: var(--rc); padding: 1rem; display: grid; gap: .5rem; align-content: start; background: var(--surface); border: 1px solid var(--line); }
.tile.green { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
.tile.tint { background: var(--accent-soft); border-color: transparent; }
.tile.band { background: var(--band); border-color: transparent; }
.tile.dark { background: var(--head); color: var(--head-ink); border-color: transparent; }
.tile.green .eyebrow, .tile.dark .eyebrow { color: inherit; opacity: .85; }
.tile.green a { color: inherit; }
.tile h2 { font-size: 1.2rem; }
.hero { padding: 1.6rem 1.2rem; gap: .8rem; }
.hero h1 { font-size: 1.9rem; }
@media (min-width: 720px) { .hero { padding: 2.4rem 2rem; } .hero h1 { font-size: 2.5rem; max-width: 22ch; } .hero p.lead { max-width: 52ch; } }
.hero p.lead { color: var(--head-muted); font-size: 1.05rem; }
.ico { width: 2.6rem; height: 2.6rem; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
.tile.tint .ico, .tile.band .ico { background: var(--surface); }
.tile.green .ico { background: rgba(255,255,255,.18); color: inherit; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: .7rem; }
@media (min-width: 720px) { .steps { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.steps li { display: flex; gap: .6rem; align-items: flex-start; }
.steps .n { width: 1.6rem; height: 1.6rem; border-radius: 50%; border: 1.5px solid var(--accent); color: var(--accent); display: grid; place-items: center; font-size: .78rem; font-weight: 800; flex: none; }
.steps b { display: block; }
footer { border-top: 1px solid var(--line); }
footer .in { display: flex; flex-wrap: wrap; gap: .4rem 1.2rem; padding-top: 1rem; padding-bottom: 1.6rem; font-size: .86rem; color: var(--muted); }
footer a { color: var(--muted); }
.legal { max-width: 46rem; display: grid; gap: .8rem; }
.legal h1 { font-size: 1.9rem; }
.legal h2 { font-size: 1.15rem; margin-top: 1rem; scroll-margin-top: 1rem; }
.legal ul { margin: 0; padding-left: 1.2rem; display: grid; gap: .4rem; }
.legal .caps { font-size: .86rem; }
.toc { background: var(--band); border-radius: var(--rc); padding: 1rem 1.2rem; }
.toc ol { margin: .4rem 0 0; padding-left: 1.4rem; columns: 2 14rem; column-gap: 1.5rem; font-size: .9rem; }
`;

const PAW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.6 1.2-.3 2-.6 3-.6s1.8.3 3 .6c1.5.4 3-.1 3-1.6C18 16 15 12 12 12z"/></svg>';
const icon = (d) => `<span class="ico"><svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg></span>`;
const ICONS = {
  build: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-6h4v6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  family: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.6-3.5 3-5.5 5.5-5.5s4.9 2 5.5 5.5"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.5 14.8c2.5-.4 4.6 1.3 5 4.7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
};

function page(title, description, main) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<style>${STYLE}</style></head><body>
<header class="app"><div class="in">
  <a class="brand" href="/"><span class="logo">${PAW}</span><span><b>KennelPort</b><span class="sub">Websites for dog breeders</span></span></a>
  <nav><a href="https://manage.kennelport.com/">Sign in</a></nav>
</div></header>
<main>${main}</main>
<footer><div class="in">
  <span>© 2026 KennelPort, by KennelOS</span>
  <a href="/terms">Terms of use</a>
  <a href="/privacy">Privacy</a>
  <a href="https://kennelos.app/">KennelOS</a>
  <a href="mailto:${CONTACT}">${CONTACT}</a>
</div></footer>
</body></html>`;
}

export function frontPage() {
  return page('KennelPort: websites for dog breeders',
    'KennelPort hosts websites for dog breeders: set up for you, run from your phone, and filled in from KennelOS if you use it.', `
<div class="bento">
  <section class="tile dark hero full">
    <p class="eyebrow">KennelPort</p>
    <h1>A website for your kennel, kept up from your phone.</h1>
    <p class="lead">We build your site with you. Then you run it yourself: new litters, puppy statuses, photos and messages, a few taps at a time.</p>
    <p><a class="btn onfill" href="https://manage.kennelport.com/">Breeder sign-in</a></p>
  </section>
  <section class="tile tint s2">
    ${icon(ICONS.build)}
    <h2>We set it up</h2>
    <p>Your dogs, photos and story, in one of six colour schemes, at yourkennel.kennelport.com or on your own domain.</p>
  </section>
  <section class="tile s2">
    ${icon(ICONS.phone)}
    <h2>You run it from your phone</h2>
    <p>Site Manager installs on your phone like an app. Update a puppy's status, add photos from your camera roll, answer a message, then publish when it looks right.</p>
  </section>
  <section class="tile band s2">
    ${icon(ICONS.family)}
    <h2>Families find what they need</h2>
    <p>Puppies with their statuses, upcoming litters, your waitlist and application, extras, getting your pup home, reviews, and a contact form that lands in your inbox.</p>
  </section>
  <section class="tile green s2">
    ${icon(ICONS.link)}
    <h2>Works with KennelOS</h2>
    <p>Keep your records in <a href="https://kennelos.app/">KennelOS Pro</a>? Link it, and your dogs, litters and health results fill in by themselves. A KennelPort site works fully without it.</p>
  </section>
  <section class="tile full">
    <p class="eyebrow">How to get a site</p>
    <ol class="steps">
      <li><span class="n">1</span><span><b>Ask us</b><span class="muted small">KennelPort is by invitation for now. Email <a href="mailto:${CONTACT}">${CONTACT}</a>.</span></span></li>
      <li><span class="n">2</span><span><b>We build it</b><span class="muted small">We draft your site and send you a private preview.</span></span></li>
      <li><span class="n">3</span><span><b>You publish</b><span class="muted small">Sign in with your email, check it over, and press Publish.</span></span></li>
    </ol>
  </section>
</div>`);
}

export function termsPage() {
  return page('Terms of use · KennelPort', 'The terms of use for KennelPort websites, the Site Manager and the puppy portal.', `
<article class="legal">
<p class="eyebrow">KennelPort</p>
<h1>Terms of use</h1>
<p class="muted">Effective ${TERMS_UPDATED}. Last updated ${TERMS_UPDATED}.</p>
<nav class="toc" aria-label="On this page"><b class="small">On this page</b><ol>
<li><a href="#s1">This agreement</a></li>
<li><a href="#s2">What KennelPort is</a></li>
<li><a href="#s3">Your account (breeders and editors)</a></li>
<li><a href="#s4">Fees</a></li>
<li><a href="#s5">Your content is yours</a></li>
<li><a href="#s6">Your site's address and your own domain</a></li>
<li><a href="#s7">Families' and visitors' information</a></li>
<li><a href="#s8">Closing your site</a></li>
<li><a href="#s9">Linking KennelOS</a></li>
<li><a href="#s10">For families using a puppy portal</a></li>
<li><a href="#s11">Sending a form on a breeder's site</a></li>
<li><a href="#s12">Acceptable use</a></li>
<li><a href="#s13">Limits and changes</a></li>
<li><a href="#s14">Suspending or ending access</a></li>
<li><a href="#s15">Our software and name</a></li>
<li><a href="#s16">Other services</a></li>
<li><a href="#s17">Disclaimers</a></li>
<li><a href="#s18">Limits on liability</a></li>
<li><a href="#s19">Governing law and disputes</a></li>
<li><a href="#s20">General</a></li>
<li><a href="#s21">Changes to these terms</a></li>
<li><a href="#s22">Contact us</a></li>
</ol></nav>
<h2 id="s1">1. This agreement</h2>
<p>These terms are an agreement between you and KennelOS ("KennelOS", "we", "us"), which runs KennelPort. They cover KennelPort: the breeder websites at kennelport.com addresses and on breeders' own domains, the Site Manager (manage.kennelport.com), the link from KennelOS (api.kennelport.com), and the puppy portal. By using any of them you agree to these terms and to KennelPort's <a href="/privacy">privacy policy</a>. If you use KennelPort for a business, you agree on its behalf.</p>
<p>Different parts apply to different people: sections 2 to 9 to breeders and the editors they bring in, section 10 to families using a puppy portal, and section 11 to anyone sending a form on a breeder's site. The rest applies to everyone.</p>
<h2 id="s2">2. What KennelPort is</h2>
<p>KennelPort hosts websites for dog breeders. We set up each site, and the breeder then runs it: the dogs, litters, puppies, photos, pages and messages are theirs. Some sites also have a puppy portal, where the breeder's families follow their puppy from the signed contract to home and beyond. KennelOS is optional: a KennelPort site works fully without it.</p>
<h2 id="s3">3. Your account (breeders and editors)</h2>
<ul><li><strong>By invitation.</strong> There's no sign-up. We invite a site's owner, and an editor to help them if they ask. You sign in with your email and a code we send you; keep access to that email, and keep your devices locked.</li><li><strong>Owners and editors.</strong> An editor can do almost everything an owner can, including linking KennelOS. Only the owner can delete the site, unlink KennelOS or stop a linked device. The owner is responsible for what their editors do on the site.</li><li><strong>We can see your site.</strong> To set it up and support you, we can see and change every site's content. We do that only to run the service, fix problems you report, or as section 14 allows.</li></ul>
<p>You must be at least 18, or the age of majority where you live, and able to make a binding agreement.</p>
<h2 id="s4">4. Fees</h2>
<p>KennelPort doesn't take payment through the service. If a fee applies to your site, we'll agree it with you separately, in writing, before you're charged.</p>
<h2 id="s5">5. Your content is yours</h2>
<p>Everything you or your editors put on your site (text, photos, videos, prices, reviews you approve, messages) stays yours. You give us permission to store it, copy it, resize photos, show it on your site and in link previews, and send it where you ask (for example, a share to Facebook), only as needed to run your site. That permission ends when the content is deleted, apart from the copies section 8 describes.</p>
<p><strong>You're responsible for your content:</strong> that it's accurate (health results, registrations, prices, a puppy's status), that you have the right to every photo and video you post, that reviews you publish are genuine, and that your sales of animals follow the law where you and your buyers are. We don't check what you publish, and we're not a party to anything between you and a buyer.</p>
<h2 id="s6">6. Your site's address and your own domain</h2>
<p>Your site's kennelport.com address is ours to give and stays reserved for you while your site is open. If you use your own domain, you keep it and are responsible for its registration and for pointing it at KennelPort as we ask. We may need to change a setup step if a provider changes how it works; we'll tell you first.</p>
<h2 id="s7">7. Families' and visitors' information</h2>
<p>Your site's forms, inbox, waitlist and puppy portal hold details about other people. You're responsible for using them lawfully, for answering their questions and requests about their information, and, for a portal, for having each family's agreement to what it shows. When a portal carries your referral or affiliate links, or emails families about products, you're responsible for following each program's own rules and the law on disclosing referral links and on promotional email.</p>
<h2 id="s8">8. Closing your site</h2>
<ul><li><strong>You can close it at any time</strong> from the Site Manager (<strong>Delete my site</strong>, owner only, after a fresh sign-in). Download a copy first: the closing screen offers it.</li><li><strong>Closing deletes your site at once:</strong> every page, dog, litter, photo, file, message, sign-in and link key. Our database provider keeps its own recovery copy for up to 30 days, after which it's gone; we can't turn that off or restore from it for you. Emails already sent stay in the inboxes they reached.</li><li><strong>Your address shows a closed notice.</strong> Old links show "This breeder is no longer hosting with KennelPort", and the address is never given to anyone else unless you ask us to release it.</li><li><strong>We may suspend a site</strong> (hide it but keep everything) or close it under section 14.</li></ul>
<h2 id="s9">9. Linking KennelOS</h2>
<p>If you link KennelOS Pro, what it sends lands in your site's draft, and nothing reaches your visitors until you publish it. Each device links with its own one-time code. Unlinking stops every device, and what came from KennelOS stays on your site as ordinary content you can edit. Your use of KennelOS is governed by its own <a href="https://kennelos.app/terms.html">terms</a>.</p>
<h2 id="s10">10. For families using a puppy portal</h2>
<p>The portal belongs to your breeder's site. Your agreement about your puppy, its price, health guarantee and anything you buy is with the breeder, not with KennelPort; questions about them go to the breeder. Use the portal only for your own family, and keep its sign-in to yourself. Photos and stories you add stay yours; if you mark a photo OK for the breeder to use, they may post it. Product links in the portal may earn the breeder a referral fee. Your account and what you added are deleted after a long time without use, with warnings first, or at once if you delete it yourself, as KennelPort's privacy policy explains.</p>
<h2 id="s11">11. Sending a form on a breeder's site</h2>
<p>Inquiries, reviews and applications you send go to that breeder, who decides what to do with them. Send only honest information about yourself. A review appears only if the breeder approves it.</p>
<h2 id="s12">12. Acceptable use</h2>
<p>Please don't:</p>
<ul><li>use KennelPort for anything unlawful, including unlawful sales of animals or fraud;</li><li>publish anything you don't have the right to, or that is false, abusive, deceptive or harmful, or another person's private details without their agreement;</li><li>use your site's forms, inbox or emails to send spam;</li><li>try to get into someone else's site, account, portal or messages;</li><li>probe, overload or disrupt the service, or get around its limits;</li><li>use bots or scripts against the sign-in or the forms.</li></ul>
<p>If you find a security problem, please email us before telling anyone else.</p>
<h2 id="s13">13. Limits and changes</h2>
<p>Each site has limits on storage, photos and albums, which we set to keep the service running for everyone; the Site Manager says so if you reach one. We keep improving KennelPort, so features and templates will change. If we ever stop running KennelPort, we'll tell site owners well ahead of time so you can download a copy of your site.</p>
<h2 id="s14">14. Suspending or ending access</h2>
<p>You can stop using KennelPort at any time by closing your site (section 8). We may suspend or close a site, or an account, if you seriously or repeatedly break these terms, if the law requires it, or to protect visitors, families or the service. Where we reasonably can, we'll tell you first and give you a chance to download a copy. Sections 5, 7 and 15 to 20 continue after this agreement ends.</p>
<h2 id="s15">15. Our software and name</h2>
<p>The KennelPort service, Site Manager, templates, name and logo belong to us. We give you permission to use them as these terms allow, and nothing more. Your content (section 5) is yours, not ours. If you send us ideas or feedback, we may use them freely.</p>
<h2 id="s16">16. Other services</h2>
<p>KennelPort runs on Cloudflare and sends email through Resend. Videos and posts you embed from YouTube, Facebook and other sites, and links you share there, are under those sites' own terms; we're not responsible for their services.</p>
<h2 id="s17">17. Disclaimers</h2>
<p class="caps">KENNELPORT IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE FULLEST EXTENT THE LAW ALLOWS, WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT KENNELPORT WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE, OR THAT CONTENT WILL NEVER BE LOST. Keep your own copy of anything that matters.</p>
<h2 id="s18">18. Limits on liability</h2>
<p class="caps">TO THE FULLEST EXTENT THE LAW ALLOWS, KENNELOS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA OR GOODWILL, ARISING FROM YOUR USE OF KENNELPORT, EVEN IF WE WERE TOLD THEY WERE POSSIBLE. OUR TOTAL LIABILITY FOR ANY CLAIM ABOUT KENNELPORT IS LIMITED TO THE GREATER OF THE AMOUNT YOU PAID US FOR KENNELPORT IN THE 12 MONTHS BEFORE THE CLAIM, AND US $50.</p>
<p>Some places don't allow these limits, so they may not all apply to you. Nothing in these terms limits a right you have as a consumer that can't be waived by contract, or liability that can't legally be limited.</p>
<h2 id="s19">19. Governing law and disputes</h2>
<p>If something goes wrong, email us first. These terms are governed by the laws of the United States, without regard to conflict-of-law rules, and disputes will be heard by courts in the United States, unless the law where you live as a consumer gives you the right to bring a claim in your local courts or under your local law.</p>
<h2 id="s20">20. General</h2>
<p>These terms and KennelPort's privacy policy are the whole agreement between us about KennelPort, apart from any fee agreed under section 4. If any part is found unenforceable, the rest still applies. If we don't enforce a term straight away, we haven't given up the right to. You can't transfer this agreement without our agreement; we may transfer it to anyone who takes over KennelPort, and these terms would still protect you.</p>
<h2 id="s21">21. Changes to these terms</h2>
<p>We may update these terms. We'll change the dates at the top, and if a change matters to you, we'll tell site owners in the Site Manager (and families in the portal) before it takes effect. If you keep using KennelPort after that, you accept the new terms.</p>
<h2 id="s22">22. Contact us</h2>
<p>Email admin.kennelos@gmail.com.</p>
</article>`);
}

export function privacyPage() {
  return page('Privacy policy · KennelPort', 'What KennelPort holds about breeders, site visitors and puppy families, and how to delete it.', `
<article class="legal">
<p class="eyebrow">KennelPort</p>
<h1>Privacy policy</h1>
<p class="muted">Effective ${PRIVACY_UPDATED}. Last updated ${PRIVACY_UPDATED}.</p>
<nav class="toc" aria-label="On this page"><b class="small">On this page</b><ol>
<li><a href="#p1">Who we are, and what this covers</a></li>
<li><a href="#p2">The short version</a></li>
<li><a href="#p3">Breeders and editors</a></li>
<li><a href="#p4">Visitors to a breeder's site</a></li>
<li><a href="#p5">Families in a puppy portal</a></li>
<li><a href="#p6">Emails we send</a></li>
<li><a href="#p7">Who else is involved</a></li>
<li><a href="#p8">How long we keep things</a></li>
<li><a href="#p9">Closing a site</a></li>
<li><a href="#p10">Security</a></li>
<li><a href="#p11">Your choices and rights</a></li>
<li><a href="#p12">Where your data is processed</a></li>
<li><a href="#p13">Children</a></li>
<li><a href="#p14">Changes to this policy</a></li>
<li><a href="#p15">Contact us</a></li>
</ol></nav>
<h2 id="p1">1. Who we are, and what this covers</h2>
<p>KennelOS ("KennelOS", "we", "us") runs KennelPort. This policy covers what KennelPort itself holds: the Site Manager (manage.kennelport.com) and the breeders and editors who sign in to it, the breeder websites we host, the link from KennelOS (api.kennelport.com), and the puppy portal. Each breeder's site also has its own privacy page for its visitors. KennelOS's apps have their <a href="https://kennelos.app/privacy.html">own privacy policy</a>.</p>
<p>A breeder decides what goes on their site, and what they keep about the families and visitors who contact them. For those details the breeder is responsible (in data-protection terms, the controller); we store and send them only to run the breeder's site, and never use them for anything of our own. For breeders' and editors' own accounts, and for this website, we are responsible.</p>

<h2 id="p2">2. The short version</h2>
<ul>
<li>Breeders and editors sign in with an email code. We keep a scrambled (keyed-hash) form of your address, not the address.</li>
<li>Reading a breeder's site collects nothing about you: no accounts, no advertising, no tracking cookies.</li>
<li>What you send through a breeder's site (a message, an application, a review) goes to that breeder's inbox, and messages are deleted after 90 days.</li>
<li>In a puppy portal, family email addresses are the one readable personal detail we keep, encrypted, because the portal emails families months later. A family can erase their account from Account at any time.</li>
<li>We never sell anything about anyone, never use it for advertising, and never use it to train AI models.</li>
</ul>

<h2 id="p3">3. Breeders and editors</h2>
<ul>
<li><strong>Your sign-in:</strong> a keyed hash of your email (never the address), which sites you manage and your role, and for each signed-in browser or installed Site Manager a session, kept as a hash of its token. Sign-in codes are kept hashed and expire. When we invite you, the invitation email is sent once and the address isn't kept.</li>
<li><strong>Your site:</strong> everything you put on it (pages, dogs, litters, puppies, prices, albums, photos, videos and posts you embed, your contact details) and the published versions Undo publish can go back to. A removed photo's files are deleted a day after nothing kept uses them.</li>
<li><strong>Notifications</strong>, if you turn them on: the push address your browser gives us for that device, tied to its sign-in so signing out silences it. Each notification carries no text; your device asks us what to show. We keep a line per event (what kind, and the sender's first name, never what they wrote) for 8 days.</li>
<li><strong>Usage:</strong> how many emails we sent each day by kind, and how much storage your site uses. Counts only.</li>
<li><strong>The KennelOS link</strong>, if you use it: link codes (kept as a keyed hash, a quarter of an hour, used once), each linked device's label and key (kept as a hash), when it last sent, and what it sent, which becomes your site's content, as section 9a of <a href="https://kennelos.app/privacy.html#website-link">KennelOS's privacy policy</a> describes. For a portal, KennelOS also sends each family with a signed contract (section 5).</li>
</ul>

<h2 id="p4">4. Visitors to a breeder's site</h2>
<ul>
<li><strong>Reading the site:</strong> no accounts, advertising or tracking cookies. Cloudflare, which delivers every page, sees your device's internet address, used only to deliver the page and keep the site safe.</li>
<li><strong>Embedded videos and posts, and some product logos,</strong> load from the company that hosts them (YouTube's privacy-enhanced player, Vimeo, TikTok, Instagram or Facebook, or a brand's own site), under that company's policy.</li>
<li><strong>The contact and application forms:</strong> your name, email, phone if you give it, and what you write go to the breeder's inbox. Never emailed anywhere. Deleted after 90 days. Cloudflare Turnstile may check that you're not a bot.</li>
<li><strong>Reviews:</strong> your name, your words and any photo, held privately until the breeder approves them, and shown only with the consent you tick.</li>
<li><strong>A waitlist the breeder keeps by hand:</strong> your name, email and phone if you gave them, and what you're hoping for. The site shows only your first name and last initial, what you want and when you were added. Removed 90 days after the breeder marks you done.</li>
</ul>

<h2 id="p5">5. Families in a puppy portal</h2>
<p>A portal is switched on for a breeder's site by us. It holds:</p>
<ul>
<li><strong>Your account:</strong> your family name; your email addresses, each stored encrypted beside a keyed hash used to find it, never logged; sign-in codes and sessions (hashed); when you last used the portal.</li>
<li><strong>Your puppy's records, as the breeder keeps them:</strong> the puppy's name, go-home and pickup times, microchip and registration number, vaccinations, preventatives and vet visits, your contract and vet-visit proof, the extras you bought, and an extended stay's weekly updates and photos.</li>
<li><strong>What you do there:</strong> your checklist and timeline ticks, your messages with the breeder, the photos and notes you add, and clicks on the breeder's recommended products and your status in each (so they know who to remind). A history of changes to these records, with when and by whom.</li>
<li><strong>Emails:</strong> a log of each one sent to you and whether it was delivered, as the breeder's evidence (for example, of vet-visit reminders). Resend tells us delivered or bounced; we don't keep the address it reports.</li>
</ul>
<p><strong>Erasing your account</strong> (Account, in the portal): your addresses, sign-in, messages, ticks and what you added are deleted at once. The breeder keeps their sale records (placement, health records, contract, vet proof and the reminder log) with your name only, because they may need them for a health guarantee. A breeder can also delete a family, undoable for 30 days.</p>

<h2 id="p6">6. Emails we send</h2>
<p>Sign-in codes, invitations, and the portal's emails to families (sign-in links, reminders, a stay's updates). Plain text, with no tracking pixels. We never send marketing email.</p>

<h2 id="p7">7. Who else is involved</h2>
<ul>
<li><strong>Cloudflare:</strong> runs KennelPort, stores its database and files (encrypted at rest), and Turnstile on forms.</li>
<li><strong>Resend:</strong> sends our emails; it handles each recipient's address and the email.</li>
<li><strong>Apple, Google and Mozilla:</strong> deliver notifications to breeders' devices that turn them on; each carries no text.</li>
<li><strong>The companies whose content a breeder embeds</strong> (section 4).</li>
</ul>
<p>We'd disclose information only if the law required us to, and we'd tell the person concerned unless we were forbidden to.</p>

<h2 id="p8">8. How long we keep things</h2>
<ul>
<li>Site messages and applications: 90 days. A hand-kept waitlist's finished families: 90 days after.</li>
<li>Notification lines: 8 days. Sign-in codes: until they expire. Request counts used against abuse (per hashed address and hashed internet address): a week.</li>
<li>Litters that left a site: 30 days, unless the breeder keeps them.</li>
<li>Portal accounts: until the family erases theirs, or the breeder deletes the family (final 30 days later). The breeder's sale records: until the breeder deletes them.</li>
<li>Everything on a site: until the site is closed (section 9).</li>
<li>Our database provider keeps its own recovery copy for up to 30 days, so anything deleted is fully gone within 30 days.</li>
</ul>

<h2 id="p9">9. Closing a site</h2>
<p>A breeder can close their site from the Site Manager. Everything on it is deleted at once: pages, dogs, litters, photos, files, messages, sign-ins, link keys and portal records. The address keeps only a closed notice, and is never given to anyone else unless the breeder asks. Emails already sent stay in the inboxes they reached.</p>

<h2 id="p10">10. Security</h2>
<p>Everything travels over HTTPS and is stored encrypted at rest. Email addresses are kept as keyed hashes, apart from portal families' addresses, which are encrypted. We never log an email address, a code, a token or a message. No system is perfectly secure; if a breach affected your information, we'd tell you and the authorities as the law requires.</p>

<h2 id="p11">11. Your choices and rights</h2>
<ul>
<li><strong>Breeders:</strong> change anything in the Site Manager, download a copy of your site, or close it.</li>
<li><strong>Families:</strong> erase your portal account from Account, or ask the breeder.</li>
<li><strong>Anyone who contacted a breeder:</strong> ask the breeder first; they decide what they keep.</li>
<li>Anyone can email us to see, correct or delete what we hold about them, or to complain; we answer within 30 days, and you can also complain to your local data-protection authority. Where a law asks for a legal basis, ours is running the service the breeder asked for, and keeping it secure and free of abuse.</li>
</ul>

<h2 id="p12">12. Where your data is processed</h2>
<p>Our providers run worldwide networks, so information may be processed in the United States and other countries with different data-protection laws from yours. We rely on each provider's own data-protection commitments for those transfers.</p>

<h2 id="p13">13. Children</h2>
<p>KennelPort is for adults. We don't knowingly collect information from anyone under 16; if you think a child has sent us something, email us and we'll delete it.</p>

<h2 id="p14">14. Changes to this policy</h2>
<p>If what we hold or how we use it changes, we update this page first and change the dates at the top, and tell breeders in the Site Manager (and families in the portal) when it matters to them.</p>

<h2 id="p15">15. Contact us</h2>
<p>Email <a href="mailto:admin.kennelos@gmail.com">admin.kennelos@gmail.com</a>.</p>

</article>`);
}

const headers = (status = 200) => ({ status, headers: {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600',
  ...SECURITY_HEADERS, 'content-security-policy': FRONT_CSP,
} });

// kennelport.com: /, /terms and /privacy; anything else is a 404 with a way home.
export function handleFront(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return new Response(frontPage(), headers());
  if (path === '/terms') return new Response(termsPage(), headers());
  if (path === '/privacy') return new Response(privacyPage(), headers());
  return new Response(page('Not found · KennelPort', 'Page not found.', '<div class="legal"><h1>Not found</h1><p>There’s nothing at this address. <a href="/">Go to KennelPort</a>.</p></div>'), headers(404));
}
