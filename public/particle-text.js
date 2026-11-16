(() => {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  document.querySelectorAll('[data-particle-text]').forEach(root => {
    if (root.dataset.particleTextReady === 'true') return;

    const fallback = root.querySelector('.particle-text-fallback');
    if (!fallback) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const probe = document.createElement('canvas');
    const probeCtx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx || !probeCtx) return;

    canvas.className = 'particle-text-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    root.appendChild(canvas);
    root.dataset.particleTextReady = 'true';

    const settings = {
      particleSize: number(root.dataset.particleSize, 1.6),
      density: Math.max(2, number(root.dataset.density, 4)),
      color: root.dataset.color || getComputedStyle(root).color || '#111111',
      highlightColor: root.dataset.highlightColor || '#858585',
      highlightMode: root.dataset.highlightMode || 'motion',
      shape: root.dataset.shape || 'circle',
      intro: root.dataset.intro || 'gather',
      scatter: number(root.dataset.scatter, 90),
      gatherDuration: number(root.dataset.gatherDuration, 1400),
      stagger: number(root.dataset.stagger, 300),
      clickBurst: root.dataset.clickBurst !== 'false',
      burstStrength: number(root.dataset.burstStrength, 0.8),
      pointerRepel: number(root.dataset.pointerRepel, 18),
      repelRadius: number(root.dataset.repelRadius, 110),
      idleDrift: number(root.dataset.idleDrift, 0.12),
      trigger: root.dataset.trigger || 'mount',
      fontWeight: root.dataset.fontWeight || getComputedStyle(root).fontWeight || '300',
      fontFamily: root.dataset.fontFamily || getComputedStyle(root).fontFamily || 'Inter, Arial, sans-serif',
      glow: root.dataset.glow === 'true'
    };

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reducedMotion = !!motionQuery?.matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let gatherStart = 0;
    let lastFrame = 0;
    let gathering = false;
    let bursting = false;
    let visible = true;
    let alive = true;
    let text = '';
    let baseRgb = [17, 17, 17];
    let highlightRgb = [133, 133, 133];
    const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };

    function rgb(value) {
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = '#000000';
      probeCtx.fillStyle = value;
      probeCtx.fillRect(0, 0, 1, 1);
      const pixel = probeCtx.getImageData(0, 0, 1, 1).data;
      return [pixel[0], pixel[1], pixel[2]];
    }

    function updatePalette() {
      baseRgb = rgb(settings.color === 'currentColor' ? getComputedStyle(root).color : settings.color);
      highlightRgb = rgb(settings.highlightColor === 'currentColor' ? getComputedStyle(root).color : settings.highlightColor);
    }

    function setText(value) {
      text = String(value || ' ');
      fallback.textContent = text;
      root.setAttribute('aria-label', text);
      sample(true);
    }

    function sample(animateIntro) {
      if (!alive) return;
      const rect = root.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      if (width < 8 || height < 8) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const computed = getComputedStyle(root);
      let size = Math.min(number(root.dataset.fontSize, parseFloat(computed.fontSize) || 64), height * 0.92);
      const font = () => settings.fontWeight + ' ' + size + 'px ' + settings.fontFamily;
      probeCtx.font = font();
      let measure = probeCtx.measureText(text).width;
      if (measure > width * 0.98) {
        size *= (width * 0.98) / Math.max(1, measure);
        probeCtx.font = font();
      }

      const metrics = probeCtx.measureText(text);
      const ascent = metrics.actualBoundingBoxAscent || size * 0.75;
      const descent = metrics.actualBoundingBoxDescent || size * 0.2;
      const x = Math.max(0, (width - metrics.width) / 2);
      const baseline = (height - (ascent + descent)) / 2 + ascent;

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.font = font();
      offCtx.textBaseline = 'alphabetic';
      offCtx.fillStyle = '#ffffff';
      offCtx.fillText(text, x, baseline);

      const image = offCtx.getImageData(0, 0, width, height).data;
      const sampleStep = Math.max(settings.density, Math.ceil(Math.sqrt((width * height) / 1800)));
      const next = [];
      for (let y = 0; y < height; y += sampleStep) {
        for (let px = 0; px < width; px += sampleStep) {
          const alpha = image[(y * width + px) * 4 + 3];
          if (alpha < 90) continue;
          const seed = ((px * 73856093) ^ (y * 19349663)) >>> 0;
          next.push({
            targetX: px,
            targetY: y,
            x: px,
            y: y,
            startX: px,
            startY: y,
            seed: (seed % 10000) / 10000,
            depth: 0.35 + ((seed >>> 8) % 6500) / 10000,
            delay: 0,
            ox: 0,
            oy: 0,
            vx: 0,
            vy: 0,
            heat: 0,
            normalizedX: px / Math.max(1, width)
          });
        }
      }

      particles = next;
      updatePalette();
      pointer.x = pointer.smoothX = width / 2;
      pointer.y = pointer.smoothY = height / 2;
      if (animateIntro && !reducedMotion) startIntro(true);
      else {
        gathering = false;
        bursting = false;
        particles.forEach(particle => {
          particle.x = particle.targetX;
          particle.y = particle.targetY;
          particle.ox = particle.oy = particle.vx = particle.vy = 0;
        });
        render(performance.now());
      }
      wake();
    }

    function startIntro(initial) {
      if (!particles.length) return;
      gatherStart = performance.now();
      gathering = !reducedMotion;
      particles.forEach(particle => {
        const angle = particle.seed * Math.PI * 2;
        const distance = reducedMotion ? 0 : settings.scatter * (0.35 + particle.depth * 0.75);
        if (settings.intro === 'rain') {
          particle.startX = particle.targetX + Math.cos(angle) * distance * 0.18;
          particle.startY = -height * (0.2 + particle.seed * 0.8);
        } else if (settings.intro === 'spiral') {
          const radius = distance + Math.hypot(particle.targetX - width / 2, particle.targetY - height / 2) * 0.08;
          particle.startX = width / 2 + Math.cos(angle + 2.6) * radius;
          particle.startY = height / 2 + Math.sin(angle + 2.6) * radius;
        } else if (settings.intro === 'scan') {
          particle.startX = particle.targetX + 12 + distance * 0.1;
          particle.startY = (particle.seed * height);
        } else {
          particle.startX = particle.targetX + Math.cos(angle) * distance;
          particle.startY = particle.targetY + Math.sin(angle) * distance;
        }
        particle.delay = particle.seed * settings.stagger;
        if (initial) {
          particle.x = particle.startX;
          particle.y = particle.startY;
        }
        particle.ox = particle.oy = particle.vx = particle.vy = 0;
      });
      bursting = false;
      wake();
    }

    function burst(x, y) {
      const radius = 95 + settings.repelRadius * 0.5;
      particles.forEach(particle => {
        const dx = particle.x - x;
        const dy = particle.y - y;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius || distance < 0.001) return;
        const force = settings.burstStrength * (180 + 520 * Math.pow(1 - distance / radius, 2));
        particle.vx += dx / distance * force;
        particle.vy += dy / distance * force;
      });
      bursting = true;
      wake();
    }

    function drawParticle(particle, color, moving) {
      const size = Math.max(0.6, settings.particleSize * (0.75 + particle.depth * 0.4));
      if (settings.glow && moving) {
        ctx.shadowColor = settings.highlightColor;
        ctx.shadowBlur = 4;
      }
      ctx.fillStyle = color;
      if (settings.shape === 'square') {
        ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
      } else if (settings.shape === 'line') {
        const angle = Math.atan2(particle.vy, particle.vx);
        const length = Math.max(2, size * 2.4);
        ctx.beginPath();
        ctx.moveTo(particle.x - Math.cos(angle) * length / 2, particle.y - Math.sin(angle) * length / 2);
        ctx.lineTo(particle.x + Math.cos(angle) * length / 2, particle.y + Math.sin(angle) * length / 2);
        ctx.lineWidth = Math.max(1, size * 0.65);
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    function render(now) {
      if (!alive || !width || !height) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const time = now / 1000;
      const dt = lastFrame ? Math.min(0.04, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.22;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.22;

      let gatheringDone = true;
      let moving = false;
      let settling = false;
      particles.forEach(particle => {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;
        if (gathering) {
          progress = clamp((now - gatherStart - particle.delay) / Math.max(1, settings.gatherDuration), 0, 1);
          const eased = easeOut(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) gatheringDone = false;
        } else if (!reducedMotion && settings.idleDrift > 0) {
          baseX += Math.sin(time * 0.8 + particle.seed * 12) * settings.idleDrift * particle.depth;
          baseY += Math.cos(time * 0.7 + particle.depth * 10) * settings.idleDrift * particle.depth;
        }

        if (bursting) {
          particle.vx += (-18 * particle.ox - 7.5 * particle.vx) * dt;
          particle.vy += (-18 * particle.oy - 7.5 * particle.vy) * dt;
          particle.ox += particle.vx * dt;
          particle.oy += particle.vy * dt;
          if (Math.abs(particle.ox) + Math.abs(particle.oy) > 0.05 || Math.abs(particle.vx) + Math.abs(particle.vy) > 0.5) settling = true;
          else particle.ox = particle.oy = particle.vx = particle.vy = 0;
          baseX += particle.ox;
          baseY += particle.oy;
        }

        if (pointer.active && !reducedMotion && settings.pointerRepel > 0) {
          const dx = baseX - pointer.smoothX;
          const dy = baseY - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < settings.repelRadius) {
            const force = Math.pow(1 - distance / settings.repelRadius, 2) * settings.pointerRepel;
            baseX += dx / distance * force;
            baseY += dy / distance * force;
          }
        }

        const follow = reducedMotion ? 1 : 0.2;
        const moveX = (baseX - particle.x) * follow;
        const moveY = (baseY - particle.y) * follow;
        particle.x += moveX;
        particle.y += moveY;
        if (Math.abs(moveX) + Math.abs(moveY) > 0.02) moving = true;

        const displacement = Math.hypot(particle.x - particle.targetX, particle.y - particle.targetY);
        const heat = settings.highlightMode === 'gradient'
          ? particle.normalizedX
          : clamp((displacement - 2) / 42, 0, 1);
        const r = lerp(baseRgb[0], highlightRgb[0], heat);
        const g = lerp(baseRgb[1], highlightRgb[1], heat);
        const b = lerp(baseRgb[2], highlightRgb[2], heat);
        drawParticle(particle, 'rgb(' + r + ', ' + g + ', ' + b + ')', heat > 0.18);
      });

      if (gathering && gatheringDone) gathering = false;
      if (bursting && !settling) bursting = false;
      return gathering || moving || (pointer.active && settings.pointerRepel > 0) ||
        (!reducedMotion && settings.idleDrift > 0) || bursting;
    }

    function frame(now) {
      raf = 0;
      if (!alive || !visible) return;
      const busy = render(now);
      if (busy) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (!alive || !visible || raf) return;
      raf = requestAnimationFrame(frame);
    }

    function locate(event) {
      const rect = root.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    }

    function onPointerMove(event) {
      locate(event);
      if (!pointer.active) {
        pointer.smoothX = pointer.x;
        pointer.smoothY = pointer.y;
      }
      pointer.active = true;
      wake();
    }

    function onPointerEnter(event) {
      onPointerMove(event);
      if (settings.trigger === 'hover') startIntro(false);
    }

    function onPointerLeave() {
      pointer.active = false;
      wake();
    }

    function onPointerDown(event) {
      locate(event);
      if (settings.trigger !== 'click' && settings.clickBurst && !reducedMotion) {
        burst(pointer.x, pointer.y);
      }
    }

    function onClick() {
      if (settings.trigger === 'click') startIntro(false);
    }

    function onMotionChange(event) {
      reducedMotion = event.matches;
      if (reducedMotion) {
        gathering = false;
        bursting = false;
        particles.forEach(particle => {
          particle.x = particle.targetX;
          particle.y = particle.targetY;
          particle.ox = particle.oy = particle.vx = particle.vy = 0;
        });
      }
      wake();
    }

    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', fallback.textContent || '');
    fallback.setAttribute('aria-hidden', 'true');
    root.addEventListener('pointerenter', onPointerEnter, { passive: true });
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave, { passive: true });
    root.addEventListener('pointerdown', onPointerDown, { passive: true });
    root.addEventListener('click', onClick);
    motionQuery?.addEventListener?.('change', onMotionChange);

    const resizeObserver = new ResizeObserver(() => sample(false));
    resizeObserver.observe(root);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    intersectionObserver.observe(root);
    const themeObserver = new MutationObserver(() => {
      updatePalette();
      wake();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    window.addEventListener('quietenglish:languagechange', event => {
      const language = event.detail?.language === 'en' ? 'en' : 'ru';
      const nextText = root.getAttribute('data-particle-' + language);
      if (nextText && nextText !== text) setText(nextText);
    });

    window.addEventListener('pagehide', () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      motionQuery?.removeEventListener?.('change', onMotionChange);
    }, { once: true });

    text = fallback.textContent.trim();
    const initialLanguage = document.documentElement.lang === 'en' ? 'en' : 'ru';
    const initialText = root.getAttribute('data-particle-' + initialLanguage);
    if (initialText) {
      text = initialText;
      fallback.textContent = initialText;
      root.setAttribute('aria-label', initialText);
    }
    sample(true);
  });
})();