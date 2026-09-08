# departmentofone.co

Live site for [departmentofone.co](https://departmentofone.co) — built end-to-end
in Claude Code.

Static site. Plain HTML + one stylesheet + 30 lines of JavaScript. No build step,
no framework, no dependencies. Open any `.html` file and it works.

## Status — live

Deployed with a valid certificate, verified end to end.

| | |
|---|---|
| `departmentofone.co` + `www` redirect | live |
| Contact form → email | verified with a real submission |
| Work page — all five cards proven | live |
| SPF + DKIM + DMARC | in place |
| Share cards + Pinterest pins | generated |

Nothing outstanding.

---

## Files

```
index.html            Home
services.html         Services + the five packages
about.html            About
work.html              Work — the five component cards
contact.html           Contact + the live Netlify form
thanks.html            Post-submit thank-you (noindex)
404.html               Not found (Netlify serves this automatically)
assets/styles.css      Everything. Design tokens live at the top.
assets/main.js         Mobile nav toggle. That is the entire script.
assets/og/             Open Graph share cards, one per page (1200x630)
assets/pin/            Pinterest pins, one per page (1000x1500)
assets/video/          Screen-recordings embedded on Work
netlify.toml           Publish dir, pretty-URL redirects, security headers
qa/                     Structural checks — see Testing below
```

## Design tokens

All color, type, and spacing values are CSS custom properties in the `:root`
block at the top of `assets/styles.css`. Change a value there and it propagates
site-wide. Nothing is hardcoded further down except a couple of one-off inline
styles on the Work and Services grids.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#14171c` | Headings, primary buttons |
| `--ink-2` | `#3a4149` | Body text |
| `--ink-3` | `#6b7280` | Captions, muted |
| `--paper` | `#fbfaf7` | Page background |
| `--surface` | `#ffffff` | Cards, alternating sections |
| `--accent` | `#b07d2b` | Rules, marks, dots — **never small text** (3.5:1) |
| `--accent-ink` | `#7a5312` | Accent text, focus rings (6.5:1 — AA) |

The gold accent is deliberately restricted to non-text decoration. `--accent-ink`
is the darkened variant that passes AA for small text.

Fonts: **Fraunces** (display) and **Inter** (body), loaded from Google Fonts with
`preconnect`. Swap both in the `--font-display` / `--font-body` tokens plus the
`<link>` tag in each page's `<head>`.

## Accessibility baseline

Skip link, visible focus rings (`:focus-visible`, 3px, offset),
`prefers-reduced-motion` guard, semantic landmarks, `aria-current="page"` on the
active nav item, `aria-expanded` on the mobile toggle with Escape-to-close, 44px+
touch targets throughout, real `<label>` elements bound to every form control,
and text contrast at AA or better.

---

## Deploy runbook

### 1. Push to GitHub

```bash
git push -u origin main
```

### 2. Connect Netlify

1. Netlify → **Add new site** → **Import an existing project** → GitHub → this
   repo.
2. Build command: **leave empty**. Publish directory: **`.`**
   (`netlify.toml` already sets this — Netlify should prefill it.)
3. Deploy.

### 3. The contact form — three steps, and the middle one is the trap

Netlify no longer enables form detection by default, and the two Forms screens
live in different places. Symptom of getting it wrong: submitting the form
returns **404**, and the markup looks perfectly correct because it is.

**3a. Turn form detection on.**

Project → **Project configuration** → **Build & deploy** → **Post processing**
→ enable form detection.

Not under a "Forms" heading in Project configuration — there isn't one.

**3b. Redeploy. This is mandatory, not housekeeping.**

**Deploys** → **Trigger deploy** → *Clear cache and deploy site*

Detection runs at deploy time by scanning the deployed HTML, so enabling it does
nothing to the build already live. Skip this and you get the same 404 and
reasonably conclude 3a failed.

**3c. Add the email notification(s).**

**Forms** — a **top-level item in the project's left sidebar**, alongside Deploys
and Domain management, *not* inside Project configuration. The `contact` form
appears here once 3a and 3b are done.

→ **Add notification** → **Email notification** → form: `contact`

Netlify allows several notifications per form. The email contains the **full
submission** (name, email, business, project type, message) — it is the lead
itself, not a prompt to go read it somewhere else.

Without 3c, submissions pile up silently in the Netlify dashboard — which is
worse than the 404, because it looks like it is working.

**Verify it end to end.** Submit the real form and confirm the email arrives. A
form that silently fails is indistinguishable from nobody getting in touch.

### 4. Domain + DNS (Cloudflare)

> **Netlify renamed "Sites" to "Projects".** Where the Netlify docs or older
> notes say *Site configuration*, the menu now reads **Project configuration**.
> Same screen.

#### Do NOT use Netlify DNS

Netlify will repeatedly offer to manage DNS for you ("Set up Netlify DNS",
"Use Netlify DNS"). **Decline every time.** It moves the nameservers off
Cloudflare, which kills Cloudflare Email Routing. Email Routing only works while
Cloudflare is authoritative for the zone — the MX records cannot simply be
copied to another provider.

Always choose the option to keep your existing DNS provider.

#### Attach the domain

Project → **Domain management** → add `departmentofone.co` and
`www.departmentofone.co`. Set the **apex** as primary domain.

Netlify will warn that an apex primary domain misses "the full advantages of a
CDN" and suggest `www` instead. **Ignore it.** The site is built canonical to the
apex — every `<link rel="canonical">`, `sitemap.xml`, `robots.txt`, and the
`www → apex` redirect in `netlify.toml`. Switching would mean rewriting all of it
for a difference that does not matter at this traffic level.

#### Add two records in Cloudflare DNS

Both **DNS only (grey cloud)**:

| Type | Name | Target |
|---|---|---|
| CNAME | `@` | `apex-loadbalancer.netlify.com` |
| CNAME | `www` | `<your-site>.netlify.app` |

Cloudflare flattens the apex CNAME automatically, so Netlify's `75.2.60.5`
fallback A record is not needed.

**Grey cloud on both.** Orange-cloud proxying on top of Netlify blocks
certificate issuance and causes redirect loops. This is the most common way this
step fails.

Leave the MX and SPF/DMARC TXT records alone — Email Routing is unaffected.

#### Make the site publicly viewable

Project configuration → **Visitor access**. A restricted project answers every
request with a login page (HTTP 401), no matter how correct the DNS is.

Then wait for the Let's Encrypt certificate — usually minutes.

#### Checking it from outside

```powershell
Resolve-DnsName departmentofone.co
```

```powershell
try { (Invoke-WebRequest https://departmentofone.co -Method Head).StatusCode } catch { $_.Exception.Message }
```

`200` means live. A resolution failure means the records have not propagated yet
(allow up to a few hours). A `401` means Visitor access is still restricted.

### 5. Verify before calling it done

- [ ] `https://departmentofone.co` loads, padlock present
- [ ] It shows **"Your entire digital department. One person."**
- [ ] No login prompt (that is Visitor access, not DNS — see step 4)
- [ ] `https://www.departmentofone.co` redirects to the apex
- [ ] All five pages reachable from the nav, on desktop and mobile
- [ ] `/services`, `/about`, `/work`, `/contact` resolve without `.html`
- [ ] Submit the contact form → lands on `/thanks`
- [ ] The submission actually arrives (proves step 3 worked)
- [ ] Mobile menu opens, closes, and closes on Escape
- [ ] Tab through the contact form — focus ring visible on every control
- [ ] A bad URL shows the 404 page

---

## Testing

```bash
node qa/check-site-a.js
```

Covers link integrity, ARIA wiring, the Netlify form contract, and that the
locked copy is present verbatim.

## Share images

Every page carries a 1200×630 Open Graph card and a 1000×1500 Pinterest pin,
built from the site's own tokens and fonts — paper ground, the gold dot and
wordmark, the page's own headline in Fraunces, a gold rule and the URL — so a
preview looks like the page it points at.

| Page | OG card | Pin |
|---|---|---|
| `/` | `og/home.png` | `pin/home.png` |
| `/services` | `og/services.png` | `pin/services.png` |
| `/about` | `og/about.png` | `pin/about.png` |
| `/work` | `og/work.png` | `pin/work.png` |
| `/contact` | `og/contact.png` | `pin/contact.png` |

Both sets are pre-generated and committed — no build step required to serve
them. `og:image` must be an absolute `https://` URL (scrapers do not resolve
relative paths), and each page sets `og:image`, `og:image:width`,
`og:image:height`, `og:image:alt`, and `twitter:image`.

Pinterest pins are uploaded by hand rather than pinned by URL — **Create Pin →
upload the image → set the destination link** to the matching page. Pinning by
URL hands Pinterest whatever its scraper finds and gives no control over the
title or description, which is what actually drives saves.

They're also hosted, not just committed, so they can be pulled from a phone:
`https://departmentofone.co/assets/pin/home.png`.

## Email

The domain **receives but never sends**. Cloudflare Email Routing forwards
`@departmentofone.co` mail to a business inbox hosted elsewhere; replies go out
from that address, so outbound mail never claims to be `From:` this domain.
Netlify's form notifications come from Netlify's own domain. Nothing legitimate
ever sends as this domain — which is what makes the strict DMARC policy below
safe.

| Record | Value | Managed by |
|---|---|---|
| MX | Cloudflare Email Routing | Cloudflare |
| SPF (root TXT) | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Cloudflare Email Routing |
| DKIM | `cf2024-1._domainkey` | Cloudflare Email Routing |
| DMARC (`_dmarc` TXT) | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@departmentofone.co` | added by hand |

`p=reject` tells receivers to reject anything forging the domain; `sp=reject`
extends that to subdomains.

**If you ever set up sending from this domain** — a newsletter, a transactional
provider, a real mailbox — `p=reject` will block it until that sender is
authorized in SPF and DKIM. Configure the sender first, confirm it passes, then
leave DMARC as it is.

## Secrets

Nothing sensitive belongs in this repo. `.gitignore` covers `.env` and key
files, and `qa/check-site-a.js` checks for structural issues before each
deploy.

## Local preview

Clean URLs (`/services` rather than `/services.html`) need a server that
resolves extensions. `npx serve` does:

```bash
npx serve@14 -l 4321 .
```
