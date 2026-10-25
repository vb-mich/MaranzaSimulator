// Plays the UI in a 390px phone viewport with Playwright and saves screenshots of every screen it meets.
// A bot taps through a week (or more) like a cautious player; any console error fails the run.
//
//   npm run build && npx vite preview --port 4173 &
//   node tools/ui-playtest.mjs [--url http://localhost:4173/] [--seme 42] [--giorni 7] [--classe Italiano]
//                              [--out docs/screenshots] [--rischio] [--scala 2] [--jpg]
//
// Playwright must be installed (it isn't a project dependency); in the cloud container it is global.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const arg = (nome, def) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i < 0 ? def : (process.argv[i + 1] ?? true);
};
const URL = arg('url', 'http://localhost:4173/');
const SEME = Number(arg('seme', 42));
const GIORNI = Number(arg('giorni', 7));
const CLASSE = arg('classe', 'Italiano');
const OUT = arg('out', 'docs/screenshots');
const SCALA = Number(arg('scala', 2));
const RISCHIO = process.argv.includes('--rischio');
const JPG = process.argv.includes('--jpg');
mkdirSync(OUT, { recursive: true });

let r = SEME >>> 0;
const caso = () => ((r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 2 ** 32);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SCALA, isMobile: true, hasTouch: true, locale: 'it-IT', reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errori = [];
page.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
page.on('pageerror', (e) => errori.push(String(e)));
// the game seed comes from crypto.getRandomValues: pin it so the run is reproducible
await page.addInitScript((seme) => {
  const orig = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (a) => {
    if (a instanceof Uint32Array && a.length === 1) {
      a[0] = seme;
      return a;
    }
    return orig(a);
  };
}, SEME);

const fatti = new Set();
const foto = async (nome, sempre = false) => {
  if (fatti.has(nome) && !sempre) return;
  fatti.add(nome);
  await page.waitForTimeout(350);
  await page.screenshot(JPG ? { path: join(OUT, `${nome}.jpg`), type: 'jpeg', quality: 80 } : { path: join(OUT, `${nome}.png`) });
  console.log('📸', nome);
};
const schermo = () => page.locator('[data-schermo]').first().getAttribute('data-schermo');
const clicca = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
};

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await foto('01-inizio');
await clicca(page.getByRole('button', { name: 'Nuova partita' }));
await page.getByRole('button', { name: CLASSE, exact: true }).click();
await foto('02-crea');
await clicca(page.getByRole('button', { name: 'In piazza!' }));

let passi = 0;
let giorno = 0;
/** Day of the saved game (the autosave runs after every command). */
const giornoSalvato = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('maranza-simulator:partita') ?? 'null')?.stato?.giorno ?? 0);
while (passi++ < 800) {
  const sc = await schermo();
  giorno = await giornoSalvato();
  if (sc === 'carta') {
    const testo = (await page.locator('[data-schermo=carta]').textContent()) ?? '';
    const tipo = /Beccato!/.test(testo)
      ? 'arresto'
      : /Finita male/.test(testo)
        ? 'ospedale'
        : /messaggio dal Boss/.test(testo)
          ? 'boss'
          : /Assolto|Messa alla prova|Pena ridotta|Condannato|Pena aggravata|Patteggiato/.test(testo)
            ? 'verdetto'
            : /Guaio/.test(testo)
              ? 'guaio'
              : 'esito';
    await foto(`carta-${tipo}`);
    await clicca(page.getByRole('button', { name: 'Avanti' }));
    continue;
  }
  if (sc === 'fine') {
    await foto('fine', true);
    break;
  }
  if (sc === 'tribunale') {
    await foto('tribunale');
    const quartiere = page.getByRole('button', { name: /cuggino avvocato/ });
    await clicca((await quartiere.isEnabled()) ? quartiere : page.getByRole('button', { name: /Avvocato d'ufficio/ }));
    continue;
  }
  if (sc === 'evento') {
    await foto('evento');
    await clicca(page.locator('[data-schermo=evento] button:enabled').last());
    continue;
  }
  if (sc === 'cella') {
    await foto('cella');
    await clicca(page.getByRole('button', { name: /Giorno dopo/ }));
    continue;
  }
  if (sc !== 'principale') throw new Error(`schermo inatteso: ${sc}`);
  if (giorno >= GIORNI) break;

  // night: the food choice is on the page
  const notte = page.getByText('È notte fonda. Si dorme.');
  if (await notte.isVisible().catch(() => false)) {
    if (await page.getByText(/^Domani/).first().isVisible().catch(() => false)) await foto('notte-teaser');
    await foto('notte');
    await clicca(page.locator('main button:enabled', { hasText: /mensa|kebabbaro|discount|Carità/i }).first());
    continue;
  }
  if (giorno === 0) await foto('03-principale');

  const righe = page.locator('[data-azione]');
  const n = await righe.count();
  const candidati = [];
  for (let i = 0; i < n; i++) {
    const testo = (await righe.nth(i).textContent()) ?? '';
    const ok = RISCHIO ? !/Follia/.test(testo) : /Tranquillo|Occhio/.test(testo);
    if (ok) candidati.push(i);
  }
  const energiaBassa = await page.evaluate(() => {
    const m = document.querySelector('[role=meter][aria-label=Energia]');
    return m ? Number(m.getAttribute('aria-valuenow')) < 25 : false;
  });
  const dormi = page.getByRole('button', { name: /Dormi/ }).last();
  if (candidati.length && !(energiaBassa && (await dormi.isEnabled()))) {
    const i = candidati[Math.floor(caso() * candidati.length)];
    const riga = righe.nth(i);
    await clicca(riga.locator('button').first());
    if (!fatti.has('04-azione-aperta') && (await riga.getByRole('radio').count())) await foto('04-azione-aperta');
    if (!fatti.has('05-info')) {
      await riga.getByRole('button', { name: /Spiegami/ }).first().click();
      await foto('05-info');
      await page.mouse.click(5, 300);
    }
    const fallo = riga.getByRole('button', { name: /Fallo/ });
    if (await fallo.isEnabled()) {
      await clicca(fallo);
      continue;
    }
  }
  if (await dormi.isEnabled()) {
    await clicca(dormi);
    await foto('06-dormi');
    await clicca(page.locator('[role=dialog] button:enabled', { hasText: /mensa|kebabbaro|discount|Carità/i }).first());
    continue;
  }
  const aspetta = page.getByRole('button', { name: /Lascia passare/ });
  if (await aspetta.isVisible().catch(() => false)) {
    await clicca(aspetta);
    continue;
  }
  throw new Error('nessuna mossa possibile');
}

// panels
if ((await schermo()) === 'principale') {
  await clicca(page.getByRole('button', { name: /Negozio/ }).last());
  await foto('07-negozio', true);
  await page.keyboard.press('Escape');
  await clicca(page.getByRole('button', { name: /^👑/ }));
  await foto('08-chat', true);
  await page.keyboard.press('Escape');
  await foto('09-dopo-una-settimana', true);
}

await browser.close();
console.log(`giorni giocati: ${giorno}, passi: ${passi}`);
if (errori.length) {
  console.error('ERRORI in console:\n' + errori.join('\n'));
  process.exit(1);
}
