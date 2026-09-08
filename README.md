# departmentofone.co

Static site. Plain HTML + one stylesheet + 30 lines of JavaScript. No build step,
no framework, no dependencies. Open any `.html` file and it works.

Built to the spec in `departmentofone-build-brief.md`. Both passes are done.

**This repo deploys as two Netlify sites:**

| Netlify project | Base directory | Domain | Build |
|---|---|---|---|
| `departmentofone` | `/` | `departmentofone.co` | none |
| `oakstreet-demo` | `oakstreet` | `oakstreet.departmentofone.co` | none (deps installed to bundle the chat function) |

## Status — live

Both sites are deployed with valid certificates and verified end to end.

| | |
|---|---|
| `departmentofone.co` + `www` redirect | live |
| `oakstreet.departmentofone.co` + `/chat` | live |
| Chatbot answering, guardrails verified | live |
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
work.html             Work — the five component cards
contact.html          Contact + the live Netlify form
thanks.html           Post-submit thank-you (noindex)
404.html              Not found (Netlify serves this automatically)
assets/styles.css     Everything. Design tokens live at the top.
assets/main.js        Mobile nav toggle. That is the entire script.
assets/graphics/      The three Oak Street social graphics, shown on Work
assets/og/            Open Graph share cards, one per page (1200x630)
assets/pin/           Pinterest pins, one per page (1000x1500)
assets/video/         The two screen-recordings embedded on Work
netlify.toml          Publish dir, pretty-URL redirects, security headers
qa/                   Structural checks — see Testing below

oakstreet/                          The demo site (its own Netlify site)
  index.html                        The demo, renamed from the uploaded file
  chat.html                         The chatbot page
  assets/styles.css                 Compiled Tailwind — committed, no build on deploy
  assets/site.js                    Demo contact form (client-side only)
  assets/chat.js                    Chat client; talks only to /api/chat
  assets/hero-dog-*.{webp,jpg}      Hero image, 1080 and 640
  assets/graphics/tip-{1,2,3}.png   1080x1080 social graphics
  netlify/functions/chat.mjs        Serverless chatbot — holds the API key
  src/input.css                     Tailwind entry
  src/graphics.mjs                  Regenerates the social graphics
  src/images.mjs                    Regenerates the hero and trainer photos
  src/og-images.mjs                 Regenerates the Open Graph share cards
  src/pin-images.mjs                Regenerates the Pinterest pins
  notion-seed/                      CSVs + validator for the client tracker
  n8n/                              Booking workflow + setup notes
  tailwind.config.js                Theme (colors, fonts, numeric weights)
  netlify.toml                      Publish dir, /chat route, function dir, headers
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

Matches the Oak Street reference file: skip link, visible focus rings
(`:focus-visible`, 3px, offset), `prefers-reduced-motion` guard, semantic
landmarks, `aria-current="page"` on the active nav item, `aria-expanded` on the
mobile toggle with Escape-to-close, 44px+ touch targets throughout, real `<label>`
elements bound to every form control, and text contrast at AA or better.

---

## Deploy runbook

### 1. Push to GitHub

The repo is `https://github.com/carlgriffin57/departmentofone.git`, branch `main`.

```bash
git push -u origin main
```

### 2. Connect Netlify

1. Netlify → **Add new site** → **Import an existing project** → GitHub →
   `carlgriffin57/departmentofone`.
2. Build command: **leave empty**. Publish directory: **`.`**
   (`netlify.toml` already sets this — Netlify should prefill it.)
3. Deploy.

### 3. The contact form — three steps, and the middle one is the trap

Netlify no longer enables form detection by default, and the two Forms screens
live in different places. Symptom of getting it wrong: submitting the form
returns **404**, and the markup looks perfectly correct because it is.

**3a. Turn form detection on.**

`departmentofone` project → **Project configuration** → **Build & deploy** →
**Post processing** → enable form detection.

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

Configured addresses:

| Address | Why |
|---|---|
| `departmentofone@yahoo.com` | The business account — keeps the record where it belongs |
| Carl's personal inbox | The one actually watched day to day |

Netlify allows several notifications per form; keep both. The email contains the
**full submission** (name, email, business, project type, message) — it is the
lead itself, not a prompt to go read it somewhere else.

> **Reply from `departmentofone@yahoo.com`, not the personal address.** Hitting
> reply in a personal inbox shows the prospect a personal email address, on a site
> whose pitch is "one name on the work." The Cloudflare catch-all also forwards
> anything `@departmentofone.co` (including the `hello@` in the site footer) to the
> same business account, so the same discipline applies there.

Without 3c, submissions pile up silently in the Netlify dashboard — which is
worse than the 404, because it looks like it is working.

**Verify it end to end.** Submit the real form and confirm the email arrives. A
form that silently fails is indistinguishable from nobody getting in touch.

### 4. Domain + DNS (Cloudflare)

> **Netlify renamed "Sites" to "Projects".** Where the Netlify docs or older
> notes say *Site configuration*, the menu now reads **Project configuration**.
> Same screen.

#### The two projects, and how to tell them apart

One repo, two Netlify projects. They look nearly identical in the dashboard, and
mixing them up puts the dog-training demo on the business domain. The **only**
reliable way to tell which is which:

Project configuration → **Build & deploy → Continuous deployment → Base directory**

| Base directory | Project | Netlify address |
|---|---|---|
| `/` | `departmentofone` — the real site | `departmentofone.netlify.app` |
| `oakstreet` | `oakstreet-demo` — the demo | `oakstreet-demo.netlify.app` |

A project's `.netlify.app` address is always just its project name. There is no
separate field to hunt for.

#### Do NOT use Netlify DNS

Netlify will repeatedly offer to manage DNS for you ("Set up Netlify DNS",
"Use Netlify DNS"). **Decline every time.** It moves the nameservers off
Cloudflare, which kills the Cloudflare Email Routing catch-all
(`anything@departmentofone.co` → `departmentofone@yahoo.com`). Email Routing only
works while Cloudflare is authoritative for the zone — the MX records cannot
simply be copied to another provider.

Always choose the option to keep your existing DNS provider.

#### Attach each domain to the right project

1. `departmentofone` → **Domain management** → add `departmentofone.co` and
   `www.departmentofone.co`. Set the **apex** as primary domain.
2. `oakstreet-demo` → **Domain management** → add `oakstreet.departmentofone.co`.

If a domain is already attached to the wrong project, remove it there first —
Netlify refuses to attach the same domain twice.

Netlify will warn that an apex primary domain misses "the full advantages of a
CDN" and suggest `www` instead. **Ignore it.** The site is built canonical to the
apex — every `<link rel="canonical">`, `sitemap.xml`, `robots.txt`, and the
`www → apex` redirect in `netlify.toml`. Switching would mean rewriting all of it
for a difference that does not matter at this traffic level.

#### Add three records in Cloudflare DNS

All three **DNS only (grey cloud)**:

| Type | Name | Target |
|---|---|---|
| CNAME | `@` | `apex-loadbalancer.netlify.com` |
| CNAME | `www` | `departmentofone.netlify.app` |
| CNAME | `oakstreet` | `oakstreet-demo.netlify.app` |

Cloudflare flattens the apex CNAME automatically, so Netlify's `75.2.60.5`
fallback A record is not needed.

**Grey cloud on all three.** Orange-cloud proxying on top of Netlify blocks
certificate issuance and causes redirect loops. This is the most common way this
step fails.

Leave the MX and SPF/DMARC TXT records alone — Email Routing is unaffected.

#### Make both sites publicly viewable

Project configuration → **Visitor access**, on **both** projects. A restricted
project answers every request with a login page (HTTP 401), no matter how
correct the DNS is.

Then wait for the Let's Encrypt certificates — usually minutes.

#### Checking it from outside

DNS propagation is easier to verify than to guess at. In PowerShell:

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
- [ ] It shows **"Your entire digital department. One person."** — not the dog
      training site. If you see a golden retriever, the domain is attached to
      `oakstreet-demo` instead of `departmentofone` (see step 4).
- [ ] No login prompt (that is Visitor access, not DNS — see step 4)
- [ ] `https://www.departmentofone.co` redirects to the apex
- [ ] All five pages reachable from the nav, on desktop and mobile
- [ ] `/services`, `/about`, `/work`, `/contact` resolve without `.html`
- [ ] Submit the contact form → lands on `/thanks`
- [ ] **The submission actually arrives at `departmentofone@yahoo.com`** (this is
      the step that proves step 3 worked)
- [ ] Mobile menu opens, closes, and closes on Escape
- [ ] Tab through the contact form — focus ring visible on every control
- [ ] A bad URL shows the 404 page

---

## Deploying the Oak Street demo (second Netlify site)

### 1. Create the site

Netlify → **Add new site** → **Import an existing project** → same repo
(`carlgriffin57/departmentofone`), then in the build settings set:

- **Base directory:** `oakstreet`
- **Build command:** leave empty
- **Publish directory:** `oakstreet` (Netlify shows this as `.` relative to the base)

The base directory is what makes Netlify read `oakstreet/netlify.toml` instead of
the root one. Get this wrong and you deploy a second copy of the main site.

### 2. Add the Anthropic API key

Site configuration → **Environment variables** → add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic key |

Add it to the **Oak Street site only** — the main site has no function and no use
for it. The key is read server-side in `netlify/functions/chat.mjs` and is never
sent to the browser. It must never be committed.

Without it the chat page loads and answers every question with "The assistant is
not available right now" — a 503 from the function, logged in the Netlify
function log.

### 3. Point the subdomain

Covered in **step 4** of the main runbook above, along with the other two
records: `oakstreet` → `oakstreet-demo.netlify.app`, DNS only (grey cloud).

### 4. Verify

- [ ] `https://oakstreet.departmentofone.co` loads, padlock present
- [ ] Headings and buttons are **bold** (this proves the compiled CSS is live —
      the CDN build silently rendered them at normal weight)
- [ ] Hero shows the golden retriever, not a gray placeholder
- [ ] The demo contact form shows the thank-you panel and sends nothing
- [ ] `/chat` answers a real question
- [ ] Ask it something off-topic — it should decline and steer back to dogs
- [ ] Ask it a medical question ("my dog is limping") — it must send you to a vet
- [ ] `departmentofone.co/work` links resolve to the demo and the chatbot
- [ ] `departmentofone.co/oakstreet/` returns 404 (the demo has one address)

---

## Testing

```bash
node qa/check-site-a.js
```

```bash
node qa/check-site-b.js
```

```bash
node qa/chat-function.test.mjs
```

`check-site-a.js` covers link integrity, ARIA wiring, the Netlify form contract,
and that the locked copy is present verbatim. `check-site-b.js` additionally
checks the rename pass, that no Tailwind CDN reference survives, that the numeric
font-weight classes actually compiled, the hero image budget, the form option
values, that the system prompt still matches the brief word for word, and that no
key can reach the browser. `chat-function.test.mjs` exercises the function's
request handling — method and payload validation, rate limiting, and that errors
never leak upstream detail. It needs no API key.

## Regenerating build outputs

Both outputs are committed so deploys stay build-free. Re-run these locally after
changing the relevant source:

```bash
cd oakstreet && npm install && npm run build:css
```

```bash
cd oakstreet && node src/graphics.mjs
```

```bash
cd oakstreet && node src/images.mjs
```

```bash
cd oakstreet && node src/og-images.mjs
```

```bash
cd oakstreet && node src/pin-images.mjs
```

`graphics.mjs` makes the three Oak Street social graphics, `images.mjs` the hero
and trainer photos, `og-images.mjs` the share cards and `pin-images.mjs` the Pinterest pins — see
[Share images](#share-images-open-graph) and [Pinterest pins](#pinterest-pins).

**If you edit any class in `oakstreet/*.html`, you must re-run `build:css`** —
Tailwind only emits CSS for classes it can see, so a new class silently does
nothing until you rebuild. This is the one manual step in the whole project.

## Share images (Open Graph)

Every page carries a 1200×630 card that social platforms show when the link is
shared. Built from the site's own tokens and fonts — paper ground, the gold dot
and wordmark, the page's own headline in Fraunces, a gold rule and the URL — so a
preview looks like the page it points at, and the phrase "Department of One"
appears wherever the link travels.

| Page | Card | Line (verbatim from the page) |
|---|---|---|
| `/` | `og/home.png` | Your entire digital department. One person. |
| `/services` | `og/services.png` | Fixed prices. No surprises. |
| `/about` | `og/about.png` | One person, the whole job, a fair price. |
| `/work` | `og/work.png` | One build, start to finish. |
| `/contact` | `og/contact.png` | Tell me what you're working on. |

Each page sets `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`
and `twitter:image`.

```bash
cd oakstreet && node src/og-images.mjs
```

Edit the `PAGES` array in `src/og-images.mjs` to change a line, then re-run and
commit the output.

### Three things that make these fail quietly

**`og:image` must be an absolute `https://` URL.** Scrapers do not resolve
relative paths — a card that works locally shows nothing when shared.

**A page must not promise a card it does not have.** `twitter:card =
summary_large_image` with no `og:image` renders as a bare link. These pages are
almost entirely type, so there is no inline image to fall back on either. That
combination shipped on day one and went unnoticed until someone asked about
branding. `qa/check-site-a.js` now fails on it.

**Keep them small.** Some scrapers skip large images; QA caps these at 300 KB.
Current cards are 10–15 KB.

**Facebook and LinkedIn cache aggressively.** After changing a card, use their
sharing debuggers to force a re-scrape, or the old preview persists for days.

> The generator lives in `oakstreet/src/` rather than the repo root because that
> is where the toolchain (`sharp`, `opentype.js`) is installed — same reason
> `graphics.mjs` writes the main site's thumbnails from there.
>
> It draws glyph by glyph via `charToGlyph` instead of opentype.js's string API,
> which throws on a Fraunces lookup table
> (`substitutionType : 62 lookupType: 6 - substFormat: 2 is not yet supported`).
> The cost is kerning, invisible at display size. Both generators also serialize
> path data by hand: opentype.js's own `toPathData()` emits literal `NaN` for
> some glyphs at some positions, and the renderer then drops the rest of the line
> without an error.

## Pinterest pins

**Pinterest will not take the Open Graph card.** It only accepts portrait or
square — between 2:3 and 1:1 — and rejects the 1200×630 card with *"This image
has an unsupported aspect ratio."* Everywhere else wants roughly 1.91:1, so
there are two sets rather than one compromise shape.

| | Open Graph | Pinterest |
|---|---|---|
| Size | 1200×630 (1.91:1) | 1000×1500 (2:3) |
| Folder | `assets/og/` | `assets/pin/` |
| Used by | Facebook, LinkedIn, X, Slack, iMessage | Pinterest |
| How | automatic, via meta tags | uploaded by hand |

```bash
cd oakstreet && node src/pin-images.mjs
```

Five pins, one per page, carrying the same verbatim lines as the OG cards plus a
kicker in the extra vertical space — "Websites from $300", "30+ years in software
QA", "Reply within one business day". Edit the `PINS` array in
`src/pin-images.mjs` to change either.

### Pin by upload, not by URL

**Create Pin → upload the image → set the destination link** to the matching
page. Pinning by URL hands Pinterest whatever its scraper finds and gives no
control over the title or description, which is what actually drives saves.

| Pin | Link to |
|---|---|
| `pin/home.png` | `https://departmentofone.co/` |
| `pin/services.png` | `https://departmentofone.co/services` |
| `pin/about.png` | `https://departmentofone.co/about` |
| `pin/work.png` | `https://departmentofone.co/work` |
| `pin/contact.png` | `https://departmentofone.co/contact` |

They are hosted as well as committed, so they can be pulled from a phone:
`https://departmentofone.co/assets/pin/home.png`.

### Two things the generator has to get right

**Type has to be much larger than on the OG card.** A 2:3 frame is far taller
than 1.91:1, and type scaled for the wide card leaves the middle of a pin empty —
which reads as unfinished in a scrolling feed. The fit routine starts at 156px
and steps down, rather than the 86px ceiling the OG cards use.

**A single word can be wider than the measure.** Wrapping only breaks between
words, so an oversized word runs off the edge instead of wrapping — `department.`
did exactly that at 156px. `fitType` now rejects any size where the longest word
does not fit, before it considers line count.

## Email

The domain **receives but never sends**. Cloudflare Email Routing forwards any
address `@departmentofone.co` to `departmentofone@yahoo.com`; replies go out from
that Yahoo address, so outbound mail is `From: yahoo.com`. Netlify's form
notifications come from Netlify's own domain. Nothing legitimate ever sends as
this domain — which is what makes the strict DMARC policy below safe.

| Record | Value | Managed by |
|---|---|---|
| MX | `route1/2/3.mx.cloudflare.net` | Cloudflare Email Routing |
| SPF (root TXT) | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Cloudflare Email Routing |
| DKIM | `cf2024-1._domainkey` | Cloudflare Email Routing |
| DMARC (`_dmarc` TXT) | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@departmentofone.co` | added by hand |

`p=reject` tells receivers to reject anything forging the domain; `sp=reject`
extends that to subdomains so `oakstreet.departmentofone.co` cannot be spoofed
either. There is deliberately **no** `_dmarc` record on the subdomain — it
inherits, and adding one would be redundant.

> The `rua` address must be on this domain. Pointing it at the Yahoo address
> directly would require Yahoo to publish an authorization record for
> `departmentofone.co`, which is not possible — reports would silently never
> arrive. `dmarc@departmentofone.co` works because the catch-all forwards it.
> Reports are daily XML; filter them in Yahoo.

**If you ever set up sending from this domain** — a newsletter, a transactional
provider, a real mailbox — `p=reject` will block it until that sender is
authorized in SPF and DKIM. Configure the sender first, confirm it passes, then
leave DMARC as it is. The SPF `~all` softfail is Cloudflare's; leave it alone,
since DMARC is doing the enforcement.

## Secrets

Nothing sensitive belongs in this repo. `ANTHROPIC_API_KEY` lives in Netlify
environment variables on the Oak Street site only. `.gitignore` covers `.env` and
key files, and `qa/check-site-b.js` fails if anything resembling a key appears in
committed source.

## Local preview

Clean URLs (`/services` rather than `/services.html`) need a server that resolves
extensions. `npx serve` does:

```bash
npx serve@14 -l 4321 .
```

The chat function does not run under `npx serve`. To exercise it locally, use the
Netlify CLI from the `oakstreet` directory with the key set in your environment:

```bash
cd oakstreet && npx netlify-cli dev
```# DepartmentofOneCo
Public repo for my Department of One website
