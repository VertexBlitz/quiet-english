(() => {
  'use strict';

  const canvas = document.getElementById('hero-hands');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const sheet = new Image();
  sheet.crossOrigin = 'anonymous';
  sheet.src = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85';

  const sourceRects = {
    LA: [0, .06, .47, .40], RA: [.53, .06, .47, .40],
    LB: [0, .55, .47, .40], RB: [.53, .55, .47, .40]
  };
  const fields = { a: document.createElement('canvas'), b: document.createElement('canvas') };
  const fctx = {
    a: fields.a.getContext('2d', { willReadFrequently: true }),
    b: fields.b.getContext('2d', { willReadFrequently: true })
  };
  let width = 0, height = 0, dpr = 1, step = 7, rowStep = 14.35, cols = 0, rows = 0;
  let tiles = null, frame = 0, start = 0, isVisible = !document.hidden;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fract = n => n - Math.floor(n);
  const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mixAt = (t, on, off, dur) => smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));

  function makeTile(rect) {
    const [x, y, w, h] = rect;
    const tile = document.createElement('canvas');
    tile.width = 420;
    tile.height = Math.round(420 * h / w);
    const tctx = tile.getContext('2d');
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(sheet, x * sheet.naturalWidth, y * sheet.naturalHeight,
      w * sheet.naturalWidth, h * sheet.naturalHeight, 0, 0, tile.width, tile.height);
    return tile;
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    step = Math.max(5, width / (width < 760 ? 150 : 205));
    rowStep = step * 2.05;
    cols = Math.ceil(width / step);
    rows = Math.ceil(height / rowStep);
    for (const key of ['a', 'b']) {
      fields[key].width = cols;
      fields[key].height = rows;
    }
  }

  function drawPair(target, leftTile, rightTile, t, pose) {
    const f = fctx[target];
    f.fillStyle = '#fff';
    f.fillRect(0, 0, cols, rows);
    const portrait = height > width;
    const hw = width * (portrait ? .66 : .53);
    const hh = hw * (.40 * 1520) / (.47 * 2688);
    const cy = height * (portrait ? .66 : .54);
    const a = Math.PI * 2 * t / 20;
    [leftTile, rightTile].forEach((tile, index) => {
      const left = index === 0;
      const ph = left ? 0 : Math.PI;
      const reach = (.035 * Math.sin(a + ph) + .012 * Math.sin(2 * a + 1.3 + ph)) * width;
      const scale = 1 + .07 * Math.sin(a + .9 + ph);
      const rot = (left ? 1 : -1) * .045 * Math.sin(a + 2.1 + ph);
      const x = left ? reach - width * .045 : width - hw + width * .045 - reach;
      const pivotX = left ? 0 : width;
      f.save();
      f.translate(cols / width * pivotX, rows / height * cy);
      f.rotate(rot);
      f.scale(cols / width * scale, rows / height * scale);
      f.translate(-pivotX, -cy);
      f.drawImage(tile, x, cy - hh / 2, hw, hh);
      f.restore();
    });
  }

  function render(now) {
    if (!tiles || !ctx) return;
    const t = ((now - start) / 1000) % 20;
    drawPair('a', tiles.LA, tiles.RA, t, 'a');
    drawPair('b', tiles.LB, tiles.RB, t, 'b');
    const pa = fctx.a.getImageData(0, 0, cols, rows).data;
    const pb = fctx.b.getImageData(0, 0, cols, rows).data;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d0d0d';
    const tick = Math.floor(t * 7);
    const mL = reducedMotion.matches ? 0 : mixAt(t, 6.2, 14.6, 1.6);
    const mR = reducedMotion.matches ? 0 : mixAt(t, 2.4, 10.4, 1.6);
    const portrait = height > width;
    for (let j = 0; j < rows; j++) {
      const rowGlitch = !reducedMotion.matches && hash(j, tick) > .965
        ? Math.round((hash(tick, j) - .5) * 8) : 0;
      for (let i = 0; i < cols; i++) {
        const sampleI = clamp(i - rowGlitch, 0, cols - 1);
        const seed = .55 * hash(sampleI, j) + .45 * hash(j * 3.1, 7.7);
        const m = i < cols / 2 ? mL : mR;
        const useB = seed < m;
        const data = useB ? pb : pa;
        const lum = data[(j * cols + sampleI) * 4] / 255;
        let v = clamp((1 - lum - .16) / .42, 0, 1);
        if (!reducedMotion.matches) v *= .86 + .14 * Math.sin(t * 3.2 + seed * 40);
        const cx = Math.abs((i + .5) / cols - .5);
        v *= smooth(.035, .11, cx);
        const ex = cx / (portrait ? .44 : .2);
        const ey = ((j + .5) * rowStep / height - (portrait ? .33 : .385)) / .085;
        v *= smooth(.85, 1.25, Math.hypot(ex, ey));
        if (m > .001 && m < .999 && Math.abs(seed - m) < .12) {
          v *= Math.abs(seed - m) / .12;
          if (hash(sampleI + tick, j) <= .4) v *= .3;
        }
        const levels = [.26, .52, .78, 1];
        let level = 0;
        for (const candidate of levels) if (v >= candidate - .13) level = candidate;
        if (!level) continue;
        const radius = step * .46 * level;
        ctx.beginPath();
        ctx.arc((i + .5) * step, (j + .5) * rowStep, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function animate(now) {
    if (!isVisible) return;
    render(now);
    if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
  }
  function startAnimation() {
    cancelAnimationFrame(frame);
    start = performance.now();
    if (isVisible) frame = requestAnimationFrame(animate);
  }

  sheet.onload = () => {
    tiles = Object.fromEntries(Object.entries(sourceRects).map(([key, rect]) => [key, makeTile(rect)]));
    resize();
    startAnimation();
  };
  sheet.onerror = () => canvas.classList.add('hands-unavailable');
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible) startAnimation();
    else cancelAnimationFrame(frame);
  });
  reducedMotion.addEventListener?.('change', startAnimation);
  window.addEventListener('resize', resize, { passive: true });
})();
