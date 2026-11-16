(() => {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const enabled = (value, fallback) => value == null ? fallback : value === 'true';

  document.querySelectorAll('[data-tech-text]').forEach(root => {
    if (root.dataset.techTextReady === 'true') return;

    const fallback = root.querySelector('.tech-text-fallback');
    const text = String(root.dataset.techText || fallback?.textContent || root.textContent || '').trim();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!text || !ctx) return;

    canvas.className = 'tech-text-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    root.appendChild(canvas);
    root.dataset.techTextReady = 'true';

    const settings = {
      fontWeight: root.dataset.fontWeight || getComputedStyle(root).fontWeight || '600',
      fontSize: number(root.dataset.fontSize, parseFloat(getComputedStyle(root).fontSize) || 12),
      fontFamily: root.dataset.fontFamily || getComputedStyle(root).fontFamily || 'Arial, sans-serif',
      letterSpacing: number(root.dataset.letterSpacing, 0.13),
      color: root.dataset.color || getComputedStyle(root).color || '#111111',
      accentColor: root.dataset.accentColor || getComputedStyle(root).color || '#111111',
      reveal: root.dataset.reveal || 'letter',
      reach: number(root.dataset.reach, 46),
      dashLength: number(root.dataset.dashLength, 3),
      dashGap: number(root.dataset.dashGap, 2),
      strokeWidth: number(root.dataset.strokeWidth, 1),
      specks: number(root.dataset.specks, 5),
      selection: enabled(root.dataset.selection, true),
      labels: enabled(root.dataset.labels, false),
      draggable: enabled(root.dataset.draggable, false),
      clickKick: enabled(root.dataset.clickKick, false),
      sweep: enabled(root.dataset.sweep, false),
      guides: enabled(root.dataset.guides, false),
      intro: root.dataset.intro || 'none',
      introDuration: number(root.dataset.introDuration, 700),
      align: root.dataset.align || 'left'
    };

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const glyphs = [];
    const pointer = { x: -1000, y: -1000, inside: false, down: false, index: -1, grabX: 0, grabY: 0 };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let baseline = 0;
    let fontSize = settings.fontSize;
    let raf = 0;
    let introStart = performance.now();
    let lastFrame = introStart;
    let alive = true;

    function layout() {
      const rect = root.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      fontSize = Math.min(settings.fontSize, Math.max(8, height * 0.78));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = settings.fontWeight + ' ' + fontSize + 'px ' + settings.fontFamily;
      ctx.textBaseline = 'alphabetic';
      const spacing = settings.letterSpacing * fontSize;
      const widths = Array.from(text, char => ctx.measureText(char).width);
      const totalWidth = widths.reduce((sum, value) => sum + value, 0) + Math.max(0, widths.length - 1) * spacing;
      const fit = Math.min(1, (width * 0.96) / Math.max(1, totalWidth));
      if (fit < 1) {
        fontSize *= fit;
        ctx.font = settings.fontWeight + ' ' + fontSize + 'px ' + settings.fontFamily;
      }
      const measured = ctx.measureText(text);
      const glyphWidths = Array.from(text, char => ctx.measureText(char).width);
      const finalWidth = glyphWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, glyphWidths.length - 1) * spacing;
      const startX = settings.align === 'right'
        ? Math.max(0, width - finalWidth)
        : settings.align === 'center' ? Math.max(0, (width - finalWidth) / 2) : 0;
      const ascent = measured.actualBoundingBoxAscent || fontSize * 0.72;
      const descent = measured.actualBoundingBoxDescent || fontSize * 0.18;
      baseline = (height - (ascent + descent)) / 2 + ascent;

      glyphs.length = 0;
      let x = startX;
      Array.from(text).forEach((char, index) => {
        const metrics = ctx.measureText(char);
        const glyphWidth = glyphWidths[index];
        glyphs.push({
          char,
          index,
          x,
          y: baseline,
          box: {
            x: x - (metrics.actualBoundingBoxLeft || 0) - 3,
            y: baseline - (metrics.actualBoundingBoxAscent || fontSize * 0.72) - 3,
            width: Math.max(2, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || glyphWidth) + 6),
            height: Math.max(2, (metrics.actualBoundingBoxAscent || fontSize * 0.72) + (metrics.actualBoundingBoxDescent || fontSize * 0.18) + 6)
          },
          offsetX: 0,
          offsetY: 0,
          velocityX: 0,
          velocityY: 0
        });
        x += glyphWidth + spacing;
      });
      draw(performance.now());
    }

    function hitTest(x, y) {
      let best = -1;
      let distance = Infinity;
      glyphs.forEach((glyph, index) => {
        const cx = glyph.x + glyph.offsetX;
        const cy = glyph.y + glyph.offsetY - fontSize * 0.35;
        const next = Math.hypot(x - cx, y - cy);
        if (next < distance) {
          distance = next;
          best = index;
        }
      });
      return distance <= settings.reach ? best : -1;
    }

    function draw(now) {
      if (!alive || !width || !height) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = settings.fontWeight + ' ' + fontSize + 'px ' + settings.fontFamily;
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';

      const introProgress = settings.intro === 'type' && !reducedMotion
        ? clamp((now - introStart) / Math.max(100, settings.introDuration), 0, 1)
        : 1;
      const visibleCount = Math.ceil(glyphs.length * introProgress);
      const sweepIndex = settings.sweep && !pointer.inside && !reducedMotion
        ? Math.floor((now / 1000) * 0.8) % Math.max(1, glyphs.length)
        : -1;
      const activeIndex = pointer.inside ? pointer.index : sweepIndex;

      glyphs.forEach((glyph, index) => {
        if (index >= visibleCount) return;
        const x = glyph.x + glyph.offsetX;
        const y = glyph.y + glyph.offsetY;
        const isActive = settings.reveal !== 'off' && (
          settings.reveal === 'area'
            ? Math.hypot(pointer.x - x, pointer.y - (y - fontSize * 0.35)) < settings.reach
            : index === activeIndex
        );

        if (isActive) {
          ctx.save();
          ctx.strokeStyle = settings.accentColor;
          ctx.lineWidth = settings.strokeWidth;
          ctx.setLineDash([Math.max(1, settings.dashLength), Math.max(1, settings.dashGap)]);
          ctx.strokeText(glyph.char, x, y);
          ctx.setLineDash([]);
          ctx.restore();
        } else {
          ctx.fillStyle = settings.color;
          ctx.fillText(glyph.char, x, y);
        }

        if (isActive && settings.selection) {
          const box = glyph.box;
          const bx = box.x + glyph.offsetX;
          const by = box.y + glyph.offsetY;
          ctx.save();
          ctx.strokeStyle = settings.accentColor;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bx, by, box.width, box.height);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = settings.accentColor;
          const corner = 2.5;
          [[bx, by], [bx + box.width, by], [bx + box.width, by + box.height], [bx, by + box.height]]
            .forEach(point => ctx.fillRect(point[0] - corner / 2, point[1] - corner / 2, corner, corner));
          ctx.restore();

          for (let i = 0; i < settings.specks; i++) {
            const seed = (index + 1) * (i + 7);
            const sx = bx + ((seed * 17) % Math.max(1, Math.floor(box.width)));
            const sy = by + ((seed * 29) % Math.max(1, Math.floor(box.height)));
            ctx.fillStyle = settings.accentColor;
            ctx.globalAlpha = 0.22 + ((seed % 5) * 0.11);
            ctx.fillRect(sx, sy, 1.5 + (i % 2), 1.5 + (i % 2));
          }
          ctx.globalAlpha = 1;

          if (settings.labels) {
            ctx.fillStyle = settings.accentColor;
            ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
            ctx.textBaseline = 'bottom';
            ctx.fillText(glyph.char, bx, by - 4);
            ctx.textBaseline = 'alphabetic';
          }
        }
      });

      if (settings.guides) {
        ctx.save();
        ctx.strokeStyle = settings.accentColor;
        ctx.globalAlpha = 0.18;
        ctx.setLineDash([3, 4]);
        [baseline, baseline - fontSize * 0.5, baseline - fontSize * 0.74].forEach(y => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        });
        ctx.restore();
      }
    }

    function animate(now) {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      let moving = false;
      glyphs.forEach(glyph => {
        if (pointer.down && glyph.index === pointer.index && settings.draggable) return;
        if (Math.abs(glyph.offsetX) + Math.abs(glyph.offsetY) + Math.abs(glyph.velocityX) + Math.abs(glyph.velocityY) < 0.03) {
          glyph.offsetX = glyph.offsetY = glyph.velocityX = glyph.velocityY = 0;
          return;
        }
        glyph.velocityX += (-300 * glyph.offsetX - 23 * glyph.velocityX) * dt;
        glyph.velocityY += (-300 * glyph.offsetY - 23 * glyph.velocityY) * dt;
        glyph.offsetX += glyph.velocityX * dt;
        glyph.offsetY += glyph.velocityY * dt;
        moving = true;
      });
      draw(now);
      if (moving || (settings.sweep && !pointer.inside) || (settings.intro === 'type' && now - introStart < settings.introDuration)) {
        raf = requestAnimationFrame(animate);
      }
    }

    function wake() {
      if (!raf && alive) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(animate);
      }
    }

    function locate(event) {
      const rect = root.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    }

    function onPointerMove(event) {
      locate(event);
      pointer.inside = true;
      pointer.index = hitTest(pointer.x, pointer.y);
      if (pointer.down && settings.draggable && pointer.index >= 0) {
        const glyph = glyphs[pointer.index];
        glyph.offsetX = pointer.x - pointer.grabX - glyph.x;
        glyph.offsetY = pointer.y - pointer.grabY - glyph.y;
      }
      draw(performance.now());
      wake();
    }

    function onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      locate(event);
      pointer.index = hitTest(pointer.x, pointer.y);
      if (pointer.index < 0) return;
      pointer.down = settings.draggable;
      const glyph = glyphs[pointer.index];
      pointer.grabX = pointer.x - glyph.offsetX - glyph.x;
      pointer.grabY = pointer.y - glyph.offsetY - glyph.y;
      root.setPointerCapture?.(event.pointerId);
    }

    function onPointerUp(event) {
      const wasDragging = pointer.down;
      pointer.down = false;
      if (!wasDragging && settings.clickKick && pointer.index >= 0 && !reducedMotion) {
        const glyph = glyphs[pointer.index];
        glyph.velocityY = -Math.max(2, fontSize * 0.13);
      }
      if (root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
      wake();
    }

    function onPointerLeave() {
      if (pointer.down) return;
      pointer.inside = false;
      pointer.index = -1;
      draw(performance.now());
      wake();
    }

    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerenter', onPointerMove, { passive: true });
    root.addEventListener('pointerdown', onPointerDown, { passive: true });
    root.addEventListener('pointerup', onPointerUp, { passive: true });
    root.addEventListener('pointercancel', onPointerUp, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave, { passive: true });

    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(root);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    intersectionObserver.observe(root);

    layout();
    if (settings.sweep || settings.intro === 'type') wake();

    window.addEventListener('pagehide', () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    }, { once: true });
  });
})();