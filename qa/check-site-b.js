/* Structural QA for the Oak Street demo (oakstreet.departmentofone.co).
   Run: node qa/check-site-b.js   (from the repo root) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'oakstreet');
const MAIN = path.join(__dirname, '..');

let fails = 0, warns = 0;
const fail = (p, m) => { console.log(`  FAIL  [${p}] ${m}`); fails++; };
const warn = (p, m) => { console.log(`  WARN  [${p}] ${m}`); warns++; };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const index = read('index.html');
const chat = read('chat.html');
const fn = read('netlify/functions/chat.mjs');
const css = read('assets/styles.css');
const pages = { 'index.html': index, 'chat.html': chat };

console.log('\n=== 1. Rename pass: no trace of the old brand ===');
for (const [name, html] of Object.entries(pages)) {
  const hits = html.match(/pawsitive/gi);
  if (hits) fail(name, `${hits.length} remaining "Pawsitive" reference(s)`);
}
for (const [name, html] of Object.entries(pages)) {
  if (/pawsitiveresults\.com/i.test(html)) fail(name, 'old email domain still present');
  if (!/Oak Street/.test(html)) fail(name, 'no "Oak Street" branding found');
}
if (!/Jamie/.test(index)) fail('index.html', 'trainer name Jamie was lost');
if (!/Jamie/.test(fn)) fail('chat.mjs', 'trainer name Jamie missing from system prompt');

console.log('\n=== 2. Gap 1 — production Tailwind, no CDN ===');
for (const [name, html] of Object.entries(pages)) {
  if (/cdn\.tailwindcss\.com/.test(html)) fail(name, 'still loads Tailwind from the CDN');
  if (/tailwind\.config\s*=/.test(html)) fail(name, 'inline tailwind.config left in the page');
  if (!/href="\/assets\/styles\.css"/.test(html)) fail(name, 'does not link the compiled stylesheet');
}
if (!exists('assets/styles.css')) fail('assets', 'compiled styles.css is missing');
// The numeric weight classes the markup uses must actually exist in the build.
for (const cls of ['font-500', 'font-600', 'font-700']) {
  if (!css.includes(`.${cls}{`) && !css.includes(`.${cls} {`)) {
    fail('styles.css', `.${cls} missing — headings would render at normal weight`);
  }
}
// Every themed class used in the markup should have produced a rule.
// Tailwind escapes special characters in selectors (".bg-cta\/20"), so compare
// against a copy with those backslashes removed rather than trying to reproduce
// the escaping — that mismatch is what makes this check report false positives.
{
  const cssPlain = css.replace(/\\/g, '');
  for (const [name, html] of Object.entries(pages)) {
    const used = new Set((html.match(/class="([^"]*)"/g) || [])
      .flatMap((m) => m.slice(7, -1).split(/\s+/))
      .filter((c) => /^(bg|text|font|border)-(cta|primary|secondary|surface|muted|heading|body|\d{3})/.test(c)));
    for (const c of used) {
      const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\.${esc}[{ ,:]`).test(cssPlain)) warn(name, `class "${c}" produced no CSS`);
    }
  }
}

console.log('\n=== 3. Gap 2 — hero image ===');
{
  if (/viewBox="0 0 24 24"[^>]*>\s*<path d="M15\.182/.test(index)) fail('index.html', 'gray placeholder SVG still in the hero');
  if (!/<picture>/.test(index)) fail('index.html', 'no <picture> element in the hero');
  const srcs = [...index.matchAll(/(?:src|srcset)="([^"]+)"/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0]))
    .filter((s) => s.startsWith('/assets/'));
  for (const s of new Set(srcs)) {
    if (!exists(s.replace(/^\//, ''))) fail('index.html', `missing image asset ${s}`);
  }
  const img = index.match(/<img[^>]*hero-dog[^>]*>/);
  if (!img) fail('index.html', 'no hero <img>');
  else {
    if (!/\salt="[^"]{10,}"/.test(img[0])) fail('index.html', 'hero image has no meaningful alt text');
    if (!/width="\d+"/.test(img[0]) || !/height="\d+"/.test(img[0])) {
      fail('index.html', 'hero image lacks width/height (causes layout shift)');
    }
  }
  // The whole point of reprocessing was payload size. Originals are multi-MB.
  for (const f of [
    'assets/hero-dog-1080.webp', 'assets/hero-dog-1080.jpg',
    'assets/trainer-jamie-1080.webp', 'assets/trainer-jamie-1080.jpg',
  ]) {
    if (!exists(f)) { fail('assets', `${f} missing`); continue; }
    const kb = fs.statSync(path.join(ROOT, f)).size / 1024;
    if (kb > 250) fail('assets', `${f} is ${kb.toFixed(0)} KB — too heavy for the web`);
  }

  // The About section must show the real trainer, not the person-icon placeholder.
  if (/<path fill-rule="evenodd" d="M7\.5 6a4\.5 4\.5 0 1 1 9 0/.test(index)) {
    fail('index.html', 'person-icon placeholder still in the About section');
  }
  const trainer = index.match(/<img[^>]*trainer-jamie[^>]*>/);
  if (!trainer) fail('index.html', 'no trainer photo in the About section');
  else {
    if (!/\salt="[^"]{10,}"/.test(trainer[0])) fail('index.html', 'trainer photo has no meaningful alt text');
    if (!/width="\d+"/.test(trainer[0]) || !/height="\d+"/.test(trainer[0])) {
      fail('index.html', 'trainer photo lacks width/height (causes layout shift)');
    }
  }
}

console.log('\n=== 4. Gap 3 — form wiring ===');
{
  const form = index.match(/<form[^>]*id="consult-form"[\s\S]*?<\/form>/);
  if (!form) fail('index.html', 'consult form not found');
  else {
    if (/action="#"/.test(form[0])) fail('index.html', 'form still has action="#"');
    if (/novalidate/.test(form[0])) fail('index.html', 'novalidate would suppress required-field checks');
    const opts = [...form[0].matchAll(/<option value="([^"]*)">([^<]+)<\/option>/g)];
    const real = opts.filter((o) => o[1] !== '');
    if (real.length !== 7) fail('index.html', `expected 7 program options, found ${real.length}`);
    for (const [, value, label] of real) {
      const want = label.replace(/&amp;/g, '&').trim();
      const got = value.replace(/&amp;/g, '&').trim();
      if (got !== want) fail('index.html', `option value "${got}" != label "${want}" (would not match a Notion select)`);
    }
  }
  if (!/id="consult-thanks"/.test(index)) fail('index.html', 'no client-side thank-you state');
  if (!exists('assets/site.js')) fail('assets', 'site.js missing');
  if (!/src="\/assets\/site\.js"/.test(index)) fail('index.html', 'site.js not loaded');
}

console.log('\n=== 5. Chatbot page + function ===');
{
  if (!/id="chat-log"/.test(chat) || !/id="chat-form"/.test(chat)) fail('chat.html', 'chat scaffolding missing');
  if (!/aria-live/.test(chat)) fail('chat.html', 'chat log is not announced to screen readers');
  if (!/<label[^>]*for="chat-input"/.test(chat)) fail('chat.html', 'chat input has no label');
  if (!/src="\/assets\/chat\.js"/.test(chat)) fail('chat.html', 'chat.js not loaded');
  if (!exists('assets/chat.js')) fail('assets', 'chat.js missing');

  // The demo site must link to the chatbot.
  if (!/href="\/chat"/.test(index)) fail('index.html', 'demo site does not link to the chatbot');

  // Secrets and model.
  if (/sk-ant-[A-Za-z0-9]/.test(fn)) fail('chat.mjs', 'looks like a hardcoded API key');
  if (!/process\.env\.ANTHROPIC_API_KEY/.test(fn)) fail('chat.mjs', 'key is not read from an env var');
  const model = fn.match(/const MODEL = '([^']+)'/);
  if (!model) fail('chat.mjs', 'no model constant');
  else if (model[1] !== 'claude-haiku-4-5') fail('chat.mjs', `unexpected model "${model[1]}"`);
  if (!/path: '\/api\/chat'/.test(fn)) fail('chat.mjs', 'function is not routed at /api/chat');

  // The client must never carry the key or call Anthropic directly.
  const clientJs = read('assets/chat.js');
  if (/api\.anthropic\.com/.test(clientJs)) fail('chat.js', 'browser calls the Anthropic API directly');
  if (/sk-ant-/.test(clientJs)) fail('chat.js', 'possible key in client code');
  if (!/fetch\('\/api\/chat'/.test(clientJs)) fail('chat.js', 'does not call the /api/chat function');

  // Model output must never be injected as HTML.
  if (/\.innerHTML\s*=\s*[^'"]*(reply|text|content)/.test(clientJs)) {
    fail('chat.js', 'model output assigned via innerHTML');
  }
}

console.log('\n=== 6. System prompt is verbatim from the brief ===');
{
  const briefPath = path.join(MAIN, '..', 'departmentofone-build-brief.md');
  if (!fs.existsSync(briefPath)) warn('brief', 'build brief not found beside the repo — skipping verbatim check');
  else {
    const lines = fs.readFileSync(briefPath, 'utf8').split(/\r?\n/);
    const start = lines.findIndex((l) => l.startsWith('You are the assistant for Oak Street Dog Training'));
    const end = lines.findIndex((l, i) => i > start && l.trim() === '```');
    const want = lines.slice(start, end).join('\n');
    const got = (fn.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/) || [])[1];
    if (got !== want) fail('chat.mjs', 'system prompt has drifted from the brief');
  }
}

console.log('\n=== 7. Site prices match the chatbot brain ===');
{
  // The chatbot quotes prices from its system prompt. If the site says one
  // number and the bot says another, a visitor can catch the business
  // contradicting itself. Services the prompt deliberately gives no price for
  // are exempt — the bot is told to decline rather than guess on those.
  const prompt = (fn.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/) || [])[1] || '';
  const known = prompt.slice(prompt.indexOf('Oak Street Dog Training offers:'));

  const botPrices = new Map();
  for (const item of known.split(/\n- /).slice(1)) {
    const flat = item.replace(/\s+/g, ' ').trim();
    const name = flat.split('—')[0].trim();
    const price = flat.match(/From \$([\d,]+) per session/);
    if (name && price) botPrices.set(name, price[1]);
  }

  if (botPrices.size === 0) fail('chat.mjs', 'could not parse any prices out of the system prompt');

  const sitePrices = new Map();
  for (const m of index.matchAll(/<h3[^>]*>([^<]+)<\/h3>([\s\S]{0,400}?)From \$([\d,]+) \/ session/g)) {
    sitePrices.set(m[1].replace(/&amp;/g, '&').trim(), m[3]);
  }

  for (const [service, botPrice] of botPrices) {
    const sitePrice = sitePrices.get(service);
    if (sitePrice === undefined) {
      warn('index.html', `chatbot quotes $${botPrice} for "${service}" but no matching site card was found`);
    } else if (sitePrice !== botPrice) {
      fail('index.html', `"${service}": site says $${sitePrice}, chatbot says $${botPrice}`);
    }
  }
}

console.log('\n=== 8. Accessibility baseline ===');
for (const [name, html] of Object.entries(pages)) {
  if (!/<html lang="en">/.test(html)) fail(name, 'no lang attribute');
  if (!/Skip to main content/.test(html)) fail(name, 'no skip link');
  if (!/<main id="main"/.test(html)) fail(name, 'no <main id="main">');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(name, `expected exactly 1 <h1>, found ${h1s}`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const dupes = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) !== i);
  if (dupes.length) fail(name, `duplicate id(s): ${[...new Set(dupes)].join(', ')}`);
  for (const m of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) {
    if (!ids.has(m[1])) fail(name, `<label for="${m[1]}"> has no matching control`);
  }
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) fail(name, `<img> without alt: ${m[0].slice(0, 60)}`);
  }
  // Decorative inline SVGs must be hidden from assistive tech.
  for (const s of html.match(/<svg[^>]*>/g) || []) {
    if (!/aria-hidden="true"/.test(s)) warn(name, `svg without aria-hidden: ${s.slice(0, 55)}`);
  }
}
if (!/@media \(prefers-reduced-motion/.test(css)) fail('styles.css', 'no prefers-reduced-motion guard');
if (!/:focus-visible/.test(css)) fail('styles.css', 'no focus-visible styling');

console.log('\n=== 9. The 3 social graphics ===');
{
  for (const n of [1, 2, 3]) {
    const p = `assets/graphics/tip-${n}.png`;
    if (!exists(p)) { fail('graphics', `${p} missing`); continue; }
    const buf = fs.readFileSync(path.join(ROOT, p));
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (w !== 1080 || h !== 1080) fail('graphics', `tip-${n}.png is ${w}x${h}, expected 1080x1080`);
    // A NaN in the path data silently truncates text, so guard the SVG source.
    const svg = fs.readFileSync(path.join(ROOT, `assets/graphics/tip-${n}.svg`), 'utf8');
    if (/NaN|Infinity|undefined/.test(svg)) fail('graphics', `tip-${n}.svg contains malformed path data`);

    // Two treatments, two palettes. A photo post uses the navy scrim with white
    // type; a type post uses the surface background with the accent rule.
    // Either way every colour must come from the Oak Street tokens.
    const onPhoto = svg.includes('fill-opacity="0.78"');
    const required = onPhoto ? ['#0F172A', '#FFFFFF'] : ['#F8FAFC', '#0369A1', '#0F172A'];
    for (const c of required) {
      if (!svg.includes(c)) fail('graphics', `tip-${n}.svg (${onPhoto ? 'photo' : 'type'}) missing ${c}`);
    }
    // Nothing outside the token palette should appear.
    const stray = (svg.match(/#[0-9A-Fa-f]{6}/g) || [])
      .filter((c) => !['#0F172A', '#FFFFFF', '#F8FAFC', '#0369A1'].includes(c.toUpperCase()));
    if (stray.length) fail('graphics', `tip-${n}.svg uses off-palette colour(s): ${[...new Set(stray)].join(', ')}`);
  }
  // The Work page on the main site must show them.
  const work = fs.readFileSync(path.join(MAIN, 'work.html'), 'utf8');
  // The main site shows 640 WebP thumbnails; the full 1080 PNGs stay on the
  // demo site as the actual social deliverable.
  for (const n of [1, 2, 3]) {
    if (!work.includes(`/assets/graphics/tip-${n}.webp`)) fail('work.html', `does not show tip-${n}.webp`);
    const web = path.join(MAIN, `assets/graphics/tip-${n}.webp`);
    if (!fs.existsSync(web)) { fail('work.html', `tip-${n}.webp missing from the main site`); continue; }
    const kb = fs.statSync(web).size / 1024;
    if (kb > 120) fail('work.html', `tip-${n}.webp is ${kb.toFixed(0)} KB — too heavy for a thumbnail`);
  }
  // Two of the three should be photo-backed, so the set shows range rather
  // than three variations on one layout.
  const photoBacked = [1, 2, 3].filter((n) =>
    fs.readFileSync(path.join(ROOT, `assets/graphics/tip-${n}.svg`), 'utf8').includes('fill-opacity="0.78"')
  ).length;
  if (photoBacked !== 2) warn('graphics', `${photoBacked} of 3 graphics are photo-backed — expected 2`);
}

console.log('\n=== 10. Work page links resolve ===');
{
  const work = fs.readFileSync(path.join(MAIN, 'work.html'), 'utf8');
  if (!work.includes('https://oakstreet.departmentofone.co"')) fail('work.html', 'no link to the demo site');
  if (!work.includes('https://oakstreet.departmentofone.co/chat')) fail('work.html', 'no link to the chatbot');
  if (/PASS TWO:/.test(work)) fail('work.html', 'pass-two placeholder comments left behind');

  // All five cards now carry real proof: two live links, three graphics, two
  // recordings. Nothing should still be showing a "coming shortly" chip.
  const pending = (work.match(/component__status/g) || []).length;
  if (pending !== 0) fail('work.html', `${pending} card(s) still show a pending chip`);

  for (const v of ['booking-automation', 'client-tracker']) {
    const file = `assets/video/${v}.mp4`;
    if (!fs.existsSync(path.join(MAIN, file))) { fail('work.html', `${file} missing`); continue; }
    if (!work.includes(`/${file}`)) fail('work.html', `${file} not referenced`);
    const mb = fs.statSync(path.join(MAIN, file)).size / 1048576;
    if (mb > 12) fail('work.html', `${file} is ${mb.toFixed(1)} MB — too heavy to autoload`);
  }
  // preload="metadata" keeps the page from pulling both videos on load.
  for (const tag of work.match(/<video[^>]*>/g) || []) {
    if (!/preload="metadata"/.test(tag)) fail('work.html', 'a <video> is missing preload="metadata"');
    if (!/controls/.test(tag)) fail('work.html', 'a <video> has no controls');
    if (!/width="\d+"[^>]*height="\d+"/.test(tag)) fail('work.html', 'a <video> lacks width/height');
  }
}

console.log('\n=== 11. No secrets committed ===');
for (const [name, src] of [...Object.entries(pages), ['chat.mjs', fn], ['chat.js', read('assets/chat.js')]]) {
  if (/sk-ant-[A-Za-z0-9_-]{10,}/.test(src)) fail(name, 'possible Anthropic key in source');
}

console.log(`\n${fails === 0 ? 'PASS' : 'FAIL'} — ${fails} failure(s), ${warns} warning(s)\n`);
process.exit(fails ? 1 : 0);
