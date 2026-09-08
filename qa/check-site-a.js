/* Structural QA for departmentofone.co — link integrity, ARIA wiring, form contract. */
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/carlg/Digital Marketing/Website services/departmentofone';
const PAGES = ['index', 'services', 'about', 'work', 'contact', 'thanks', '404'];

// Routes netlify.toml maps to files, plus real files.
const ROUTES = new Set(['/', '/services', '/about', '/work', '/contact', '/thanks']);

let fails = 0, warns = 0;
const fail = (p, m) => { console.log(`  FAIL  [${p}] ${m}`); fails++; };
const warn = (p, m) => { console.log(`  WARN  [${p}] ${m}`); warns++; };

const all = {};
for (const p of PAGES) all[p] = fs.readFileSync(path.join(ROOT, p + '.html'), 'utf8');

console.log('\n=== 1. Internal links resolve ===');
for (const [p, html] of Object.entries(all)) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  for (const h of hrefs) {
    if (/^(https?:|mailto:|#)/.test(h)) continue;
    if (h.startsWith('/assets/')) {
      if (!fs.existsSync(path.join(ROOT, h.slice(1)))) fail(p, `missing asset ${h}`);
      continue;
    }
    if (!ROUTES.has(h)) fail(p, `href "${h}" is not a mapped route`);
  }
  const srcs = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  for (const s of srcs) {
    if (/^https?:/.test(s)) continue;
    if (!fs.existsSync(path.join(ROOT, s.replace(/^\//, '')))) fail(p, `missing src ${s}`);
  }
}

console.log('\n=== 2. Duplicate IDs ===');
for (const [p, html] of Object.entries(all)) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupes.length) fail(p, `duplicate id(s): ${[...new Set(dupes)].join(', ')}`);
}

console.log('\n=== 3. ARIA / label references point at real IDs ===');
for (const [p, html] of Object.entries(all)) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const attr of ['aria-labelledby', 'aria-controls', 'aria-describedby']) {
    for (const m of html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))) {
      for (const t of m[1].split(/\s+/)) if (!ids.has(t)) fail(p, `${attr}="${t}" has no matching id`);
    }
  }
  for (const m of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) {
    if (!ids.has(m[1])) fail(p, `<label for="${m[1]}"> has no matching control`);
  }
  // Every skip link target must exist
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(m[1])) fail(p, `in-page link #${m[1]} has no target`);
  }
}

console.log('\n=== 4. Per-page accessibility baseline ===');
for (const [p, html] of Object.entries(all)) {
  if (!/class="skip-link"/.test(html)) fail(p, 'no skip link');
  if (!/<main id="main">/.test(html)) fail(p, 'no <main id="main">');
  if (!/<html lang="en">/.test(html)) fail(p, 'no lang attribute');
  if (!/name="viewport"/.test(html)) fail(p, 'no viewport meta');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(p, `expected exactly 1 <h1>, found ${h1s}`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(p, 'no <title>');
  const desc = html.match(/name="description" content="([^"]*)"/);
  if (!desc && !['thanks', '404'].includes(p)) fail(p, 'no meta description');
  // Decorative inline SVGs must be hidden from AT
  const svgs = [...html.matchAll(/<svg[^>]*>/g)].map(m => m[0]);
  for (const s of svgs) if (!/aria-hidden="true"/.test(s)) warn(p, `svg without aria-hidden: ${s.slice(0, 60)}`);
  // <img> needs alt (none expected in pass one, but check anyway)
  for (const m of html.matchAll(/<img[^>]*>/g)) if (!/\salt=/.test(m[0])) fail(p, `<img> without alt: ${m[0].slice(0, 60)}`);
}

console.log('\n=== 5. Nav consistency (aria-current on exactly the right page) ===');
const NAV_FOR = { services: '/services', about: '/about', work: '/work', contact: '/contact' };
for (const [p, html] of Object.entries(all)) {
  const currents = [...html.matchAll(/href="([^"]+)"\s+aria-current="page"/g)].map(m => m[1]);
  const expected = NAV_FOR[p];
  if (expected) {
    if (currents.length !== 2) fail(p, `expected 2 aria-current links (desktop + mobile), found ${currents.length}`);
    if (currents.some(c => c !== expected)) fail(p, `aria-current on wrong link: ${currents.join(', ')}`);
  } else if (currents.length) {
    fail(p, `unexpected aria-current on ${p}: ${currents.join(', ')}`);
  }
  // Nav must list all four sections twice (desktop list + mobile panel)
  for (const route of Object.values(NAV_FOR)) {
    const n = (html.match(new RegExp(`href="${route}"`, 'g')) || []).length;
    if (n < 2) fail(p, `nav/footer missing link to ${route} (found ${n})`);
  }
}

console.log('\n=== 6. Netlify Forms contract (contact.html) ===');
{
  const h = all.contact;
  const form = h.match(/<form[\s\S]*?<\/form>/)[0];
  if (!/name="contact"/.test(form)) fail('contact', 'form has no name attribute');
  if (!/method="POST"/i.test(form)) fail('contact', 'form is not method=POST');
  if (!/data-netlify="true"/.test(form)) fail('contact', 'missing data-netlify="true"');
  if (!/<input type="hidden" name="form-name" value="contact">/.test(form))
    fail('contact', 'missing hidden form-name input (submissions will 404)');
  if (!/netlify-honeypot="bot-field"/.test(form)) fail('contact', 'no honeypot declared');
  if (!/name="bot-field"/.test(form)) fail('contact', 'honeypot declared but field absent');
  if (!/action="\/thanks"/.test(form)) fail('contact', 'form action is not /thanks');

  // Every control must have a name and a bound label
  const controls = [...form.matchAll(/<(input|select|textarea)\b[^>]*>/g)].map(m => m[0]);
  for (const c of controls) {
    if (/type="hidden"/.test(c)) continue;
    const name = (c.match(/name="([^"]+)"/) || [])[1];
    if (!name) fail('contact', `control without name: ${c.slice(0, 50)}`);
    if (name === 'bot-field') continue;
    const id = (c.match(/id="([^"]+)"/) || [])[1];
    if (!id) fail('contact', `control "${name}" has no id, so no label can bind`);
    else if (!new RegExp(`<label for="${id}"`).test(form)) fail('contact', `control "${name}" has no <label for>`);
  }

  for (const req of ['name', 'email']) {
    const re = new RegExp(`id="${req}"[^>]*required|required[^>]*id="${req}"`);
    if (!re.test(form)) fail('contact', `field "${req}" should be required`);
  }

  const opts = [...form.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)];
  const expected = ['Landing Page', 'Starter Site', 'Full Site Build', 'Site + Automation', 'The Department of One', 'Not sure yet'];
  const got = opts.map(o => o[2]);
  for (const e of expected) if (!got.includes(e)) fail('contact', `dropdown missing option "${e}"`);
  for (const o of opts) if (o[1] !== o[2]) fail('contact', `option value "${o[1]}" != label "${o[2]}"`);
}

console.log('\n=== 7. Locked copy present verbatim ===');
const MUST = {
  index: [
    'Your entire digital department. One person.',
    'Websites, automations, chatbots. Everything a small business needs online,',
    'One person. One price. One name on the work.',
    "I'm Carl. I live in San Antonio with a rescue pug named Lola Belle.",
  ],
  services: [
    "One person builds the whole thing. That's the idea.",
    'Fixed prices. No surprises.',
    '$300', '$750', '$1,500', '$2,500', '$4,500',
    'The Department of One',
  ],
  about: [
    "I'm Carl Griffin. I build websites and digital tools for small businesses",
    'Some of that was at IBM.',
    'a rescue pug who runs the house',
  ],
  work: [
    'One build, start to finish.',
    'Oak Street Dog Training is a dog training business in San Antonio.',
    "That's one business, handled by one person.",
  ],
  contact: [
    'Start a project',
    'I read every message myself.',
    'Send it over',
    "I'll reply within one business day. No newsletter, no list, no follow-up spam.",
  ],
};
const decode = s => s.replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ');
for (const [p, phrases] of Object.entries(MUST)) {
  const text = decode(all[p].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  for (const ph of phrases) if (!text.includes(ph)) fail(p, `locked copy missing: "${ph}"`);
}

console.log('\n=== 8. Open Graph share images ===');
{
  const expect = { index: 'home', services: 'services', about: 'about', work: 'work', contact: 'contact' };
  for (const [page, slug] of Object.entries(expect)) {
    const html = all[page];
    // twitter:card promises a large image; without og:image a share renders as
    // a bare link, and these pages have no inline images to fall back on.
    if (/twitter:card"\s+content="summary_large_image"/.test(html) && !/og:image"/.test(html)) {
      fail(page, 'declares summary_large_image but has no og:image');
    }
    const img = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
    if (!img) { fail(page, 'no og:image'); continue; }
    if (!img.startsWith('https://')) fail(page, 'og:image must be an absolute URL — scrapers do not resolve relative paths');
    if (!img.endsWith(`/og/${slug}.png`)) fail(page, `og:image points at ${img}, expected og/${slug}.png`);

    const file = path.join(ROOT, 'assets', 'og', `${slug}.png`);
    if (!fs.existsSync(file)) { fail(page, `assets/og/${slug}.png missing`); continue; }
    const buf = fs.readFileSync(file);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (w !== 1200 || h !== 630) fail(page, `og/${slug}.png is ${w}x${h}, expected 1200x630`);
    const kb = buf.length / 1024;
    if (kb > 300) fail(page, `og/${slug}.png is ${kb.toFixed(0)} KB — some scrapers skip large images`);

    for (const tag of ['og:image:width', 'og:image:height', 'og:image:alt', 'twitter:image']) {
      if (!html.includes(tag)) fail(page, `missing ${tag}`);
    }
  }
}

console.log('\n=== 9. netlify.toml redirect rules ===');
{
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  // Split into individual [[redirects]] blocks so flags are checked per rule.
  const blocks = toml.split(/\[\[redirects\]\]/).slice(1);
  const oakRules = blocks.filter((b) => /from\s*=\s*"\/oakstreet/.test(b));

  if (oakRules.length === 0) {
    fail('netlify.toml', 'no rule blocking /oakstreet on the main site');
  }
  for (const rule of oakRules) {
    const from = (rule.match(/from\s*=\s*"([^"]+)"/) || [])[1];
    // Netlify serves an existing file in preference to a redirect unless the
    // rule is forced — and oakstreet/index.html does exist in this publish dir.
    if (!/force\s*=\s*true/.test(rule)) {
      fail('netlify.toml', `rule for "${from}" needs force = true or Netlify serves the demo instead`);
    }
    if (!/status\s*=\s*404/.test(rule)) {
      fail('netlify.toml', `rule for "${from}" should return 404`);
    }
  }
  // Both the bare path and the wildcard need covering.
  const froms = oakRules.map((r) => (r.match(/from\s*=\s*"([^"]+)"/) || [])[1]);
  for (const want of ['/oakstreet', '/oakstreet/*']) {
    if (!froms.includes(want)) fail('netlify.toml', `no rule for "${want}"`);
  }
}

console.log('\n=== 9. No secrets committed ===');
for (const [p, html] of Object.entries(all)) {
  if (/sk-ant-|ANTHROPIC_API_KEY\s*=/.test(html)) fail(p, 'possible API key in page source');
}

console.log(`\n${fails === 0 ? 'PASS' : 'FAIL'} — ${fails} failure(s), ${warns} warning(s)\n`);
process.exit(fails ? 1 : 0);
