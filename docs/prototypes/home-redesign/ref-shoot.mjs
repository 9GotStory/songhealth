import { chromium } from '@playwright/test';
const out = '.tmp/prototypes/home-redesign/ref/';
const b = await chromium.launch();
for (const [n, w, h] of [['d', 1440, 900], ['p', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('https://spss.up.ac.th/default', { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message));
  await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log(n, 'height', H, await p.title());
  // scroll through to trigger lazy/reveal
  for (let y = 0; y < H; y += 600) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(250); }
  const step = n === 'd' ? 1100 : 1500;
  let i = 0;
  for (let y = 0; y < H && i < 9; y += step, i++) {
    await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}${n}-s${i}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(step, h) } });
  }
  if (n === 'd') {
    const info = await p.evaluate(() => {
      const cs = e => getComputedStyle(e);
      const fonts = new Set(), bgs = {}, rad = {};
      for (const e of document.querySelectorAll('body *')) {
        const s = cs(e); fonts.add(s.fontFamily.split(',')[0]);
        if (s.backgroundImage !== 'none') bgs[s.backgroundImage.slice(0, 90)] = (bgs[s.backgroundImage.slice(0, 90)] || 0) + 1;
        else if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs[s.backgroundColor] = (bgs[s.backgroundColor] || 0) + 1;
        if (s.borderRadius !== '0px') rad[s.borderRadius] = (rad[s.borderRadius] || 0) + 1;
      }
      const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 14);
      return { fonts: [...fonts], bgs: top(bgs), rad: top(rad), heads: [...document.querySelectorAll('h1,h2,h3')].slice(0, 30).map(h => h.tagName + ' ' + cs(h).fontSize + '/' + cs(h).fontWeight + ' ' + h.textContent.trim().slice(0, 50)) };
    });
    console.log(JSON.stringify(info, null, 1));
  }
  await p.close();
}
await b.close();
