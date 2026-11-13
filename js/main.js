/* ==========================================================================
   Birthday — interactions & effects (no libraries)
   ========================================================================== */
(() => {
  'use strict';

  const C = Object.assign({
    name: 'You', birthdate: '', from: 'Me', heroLine: '', unlockAt: '', music: '',
    coverPhoto: '', photos: [], candles: 5, reasons: [], letter: '', signoff: 'With love,',
  }, window.BIRTHDAY || {});

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE = ['#ff5fa2', '#ffd27a', '#9b6bff', '#7ee0ff', '#ff8fc7', '#ffffff', '#7dffb2'];
  const pad = (n) => String(n).padStart(2, '0');

  document.title = `Happy Birthday, ${C.name} 🎂`;

  // Load an image, trying other common extensions if the given one doesn't exist.
  function loadImg(img, src, onFail) {
    const base = src.replace(/\.(jpe?g|png|webp)$/i, '');
    const tries = [src, ...['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'].map((e) => base + e).filter((s) => s !== src)];
    let i = 0;
    img.onerror = () => { if (++i < tries.length) img.src = tries[i]; else if (onFail) onFail(); };
    img.src = tries[0];
  }

  /* ======================================================================
     Starry sky (background canvas)
     ====================================================================== */
  (function sky() {
    const c = $('#sky'), ctx = c.getContext('2d');
    let W = 0, H = 0, stars = [], shoot = null, nextShoot = 2500;
    function resize() {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      const widthChanged = innerWidth !== W;
      W = innerWidth; H = innerHeight;
      c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      if (widthChanged) {
        const n = Math.min(260, Math.round((W * H) / 4500));
        stars = Array.from({ length: n }, () => ({
          x: Math.random() * W, y: Math.random() * H * 1.2, r: Math.random() * 1.3 + .25,
          p: Math.random() * 6.28, s: rand(.4, 1.8), hue: Math.random() < .2 ? '#ffd6ea' : '#ffffff',
        }));
      }
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = .25 + .75 * Math.abs(Math.sin(s.p + t * .0012 * s.s));
        ctx.fillStyle = s.hue;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce && !shoot && t > nextShoot) {
        shoot = { x: rand(W * .3, W * 1.1), y: rand(-20, H * .35), vx: -rand(7, 11), vy: rand(2.5, 4.5), life: 1 };
      }
      if (shoot) {
        const { x, y, vx, vy } = shoot;
        const g = ctx.createLinearGradient(x, y, x - vx * 14, y - vy * 14);
        g.addColorStop(0, `rgba(255,255,255,${shoot.life})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * 14, y - vy * 14); ctx.stroke();
        shoot.x += vx; shoot.y += vy; shoot.life -= .014;
        if (shoot.life <= 0 || shoot.x < -200 || shoot.y > H + 200) { shoot = null; nextShoot = t + rand(3500, 9000); }
      }
      requestAnimationFrame(frame);
    }
    resize(); addEventListener('resize', resize); requestAnimationFrame(frame);
  })();

  /* ======================================================================
     FX engine — confetti, fireworks, hearts (single overlay canvas)
     ====================================================================== */
  const FX = (() => {
    const c = $('#fx'), ctx = c.getContext('2d');
    let W = 0, H = 0, parts = [], running = false, last = 0;
    const small = innerWidth < 700;
    const MAX = reduce ? 160 : small ? 750 : 1300;
    const K = reduce ? .3 : small ? .75 : 1;

    function resize() {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize(); addEventListener('resize', resize);

    function add(p) {
      if (parts.length >= MAX) return;
      parts.push(p);
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }

    function heart(s) {
      ctx.beginPath();
      ctx.moveTo(0, s * .3);
      ctx.bezierCurveTo(0, 0, -s * .5, 0, -s * .5, s * .3);
      ctx.bezierCurveTo(-s * .5, s * .6, 0, s * .78, 0, s);
      ctx.bezierCurveTo(0, s * .78, s * .5, s * .6, s * .5, s * .3);
      ctx.bezierCurveTo(s * .5, 0, 0, 0, 0, s * .3);
      ctx.fill();
    }

    function step(p, dt) {
      switch (p.t) {
        case 'c': { // confetti
          const dr = Math.pow(.97, dt);
          p.vx = p.vx * dr + Math.sin(p.tilt) * .06; p.vy = p.vy * dr + .25 * dt;
          if (p.vy > 3.2) p.vy = 3.2;
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.tilt += p.vt * dt;
          p.life -= p.decay * dt;
          return p.life > 0 && p.y < H + 30;
        }
        case 's': { // spark
          const dr = Math.pow(p.drag || .955, dt);
          p.px = p.x; p.py = p.y;
          p.vx *= dr; p.vy = p.vy * dr + (p.g ?? .045) * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.decay * dt;
          return p.life > 0;
        }
        case 'r': { // rocket
          p.px = p.x; p.py = p.y;
          p.vy += .12 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          add({ t: 's', x: p.x, y: p.y, px: p.x, py: p.y, vx: rand(-.4, .4), vy: rand(.4, 1.4), color: '#ffe6b0', size: 1.6, life: .7, decay: .05, g: .02 });
          if (p.vy >= -1.2 || p.y <= p.ty) { explode(p.x, p.y, p.color); return false; }
          return true;
        }
        case 'h': { // heart
          const dr = Math.pow(.97, dt);
          p.vx *= dr; p.vy = p.vy * dr - .02 * dt;
          p.x += p.vx * dt + Math.sin(p.life * 8) * .3; p.y += p.vy * dt; p.life -= p.decay * dt;
          return p.life > 0;
        }
        case 'f': p.life -= .07 * dt; return p.life > 0; // flash
        case 'g': // glitter sparkle
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .015 * dt; p.life -= p.decay * dt;
          return p.life > 0;
      }
      return false;
    }

    function draw(p) {
      switch (p.t) {
        case 'c':
          ctx.globalCompositeOperation = 'source-over';
          ctx.save();
          ctx.globalAlpha = Math.min(1, p.life * 2.5);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.tilt));
          ctx.fillStyle = p.color;
          if (p.shape) { ctx.beginPath(); ctx.arc(0, 0, p.w * .45, 0, 6.283); ctx.fill(); }
          else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          break;
        case 's':
        case 'r':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, p.t === 'r' ? 1 : (p.life < .35 && Math.random() < .3 ? p.life * .4 : p.life));
          ctx.strokeStyle = p.t === 'r' ? '#fff3d0' : p.color;
          ctx.lineWidth = p.t === 'r' ? 2.6 : p.size;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
          break;
        case 'h':
          ctx.globalCompositeOperation = 'source-over';
          ctx.save();
          ctx.globalAlpha = Math.min(1, p.life * 1.6);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.translate(0, -p.size / 2);
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
          heart(p.size);
          ctx.restore();
          break;
        case 'g': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          const s = p.size * (.5 + p.life * .7), x = p.x, y = p.y;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s * .45, y - s * .45); ctx.lineTo(x + s * 2, y);
          ctx.lineTo(x + s * .45, y + s * .45); ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s * .45, y + s * .45);
          ctx.lineTo(x - s * 2, y); ctx.lineTo(x - s * .45, y - s * .45); ctx.closePath(); ctx.fill();
          break;
        }
        case 'f': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = p.life * .55;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
          g.addColorStop(0, '#fff'); g.addColorStop(.3, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 90, 0, 6.283); ctx.fill();
          break;
        }
      }
    }

    function loop(now) {
      const dt = Math.min((now - last) / 16.667, 3); last = now;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!step(p, dt)) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
        draw(p);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(loop);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }

    function explode(x, y, color) {
      const type = pick(['peony', 'peony', 'ring', 'heart', 'willow']);
      const c2 = Math.random() < .5 ? color : pick(PALETTE);
      const n = Math.round((type === 'heart' ? 64 : 80) * K);
      add({ t: 'f', x, y, color, life: 1 });
      for (let i = 0; i < n; i++) {
        let vx, vy, decay = rand(.012, .02), drag = .955, g = .045;
        if (type === 'heart') {
          const a = (i / n) * Math.PI * 2;
          vx = 16 * Math.pow(Math.sin(a), 3) * .3;
          vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .3;
          g = .02;
        } else if (type === 'ring') {
          const a = (i / n) * Math.PI * 2; vx = Math.cos(a) * 5.2; vy = Math.sin(a) * 5.2;
        } else if (type === 'willow') {
          const a = rand(0, Math.PI * 2), v = rand(1, 4.5); vx = Math.cos(a) * v; vy = Math.sin(a) * v;
          decay = rand(.007, .011); drag = .965; g = .03;
        } else {
          const a = rand(0, Math.PI * 2), v = rand(1, 6.5); vx = Math.cos(a) * v; vy = Math.sin(a) * v;
        }
        add({ t: 's', x, y, px: x, py: y, vx, vy, color: i % 2 ? color : c2, size: type === 'willow' ? 1.4 : 2.2, life: 1, decay, drag, g });
      }
    }

    const api = {
      confetti(x, y, o = {}) {
        const n = Math.round((o.count || 80) * K);
        const spread = ((o.spread ?? 70) * Math.PI) / 180;
        const ang = ((o.angle ?? -90) * Math.PI) / 180;
        const power = o.power || 12;
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - .5) * spread, v = power * rand(.45, 1.1);
          add({ t: 'c', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rand(6, 10), h: rand(9, 15),
            rot: rand(0, 6.28), vr: rand(-.25, .25), tilt: rand(0, 6.28), vt: rand(.05, .22),
            color: pick(PALETTE), shape: Math.random() < .25, life: 1, decay: rand(.0035, .006) });
        }
      },
      cannons() {
        const p = 18 + H / 50;
        api.confetti(-10, H + 10, { angle: -62, spread: 34, power: p, count: 110 });
        api.confetti(W + 10, H + 10, { angle: -118, spread: 34, power: p, count: 110 });
      },
      rain(count = 140) {
        const n = Math.round(count * K);
        for (let i = 0; i < n; i++) {
          add({ t: 'c', x: rand(0, W), y: rand(-H * .5, -10), vx: rand(-1, 1), vy: rand(1, 3), w: rand(6, 10), h: rand(9, 15),
            rot: rand(0, 6.28), vr: rand(-.2, .2), tilt: rand(0, 6.28), vt: rand(.05, .2),
            color: pick(PALETTE), shape: Math.random() < .25, life: 1, decay: .002 });
        }
      },
      firework(x, ty) {
        x = x ?? rand(W * .15, W * .85);
        ty = ty ?? rand(H * .12, H * .42);
        const vy = -Math.sqrt(2 * .12 * (H - ty)) * 1.02;
        add({ t: 'r', x, y: H + 10, px: x, py: H + 10, vx: rand(-.6, .6), vy, ty, color: pick(PALETTE.filter((c) => c !== '#ffffff')) });
      },
      show(n = 5, gap = 420) { for (let i = 0; i < n; i++) setTimeout(() => api.firework(), i * gap + rand(0, 150)); },
      hearts(x, y, n = 8) {
        n = Math.max(2, Math.round(n * K));
        for (let i = 0; i < n; i++) {
          add({ t: 'h', x, y, vx: rand(-2.6, 2.6), vy: rand(-4.2, -1.4), size: rand(10, 20), rot: rand(-.4, .4),
            color: pick(['#ff5fa2', '#ff8fc7', '#ffd27a', '#ffffff', '#c59bff']), life: 1, decay: rand(.012, .02) });
        }
      },
      sparkle(x, y, n = 2, power = .8) {
        for (let i = 0; i < n; i++) {
          add({ t: 'g', x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-power, power), vy: rand(-power, power * .6),
            size: rand(1.6, 3.4), color: pick(['#ffffff', '#ffd27a', '#ff8fc7', '#c59bff', '#7ee0ff']), life: 1, decay: rand(.022, .04) });
        }
      },
      celebrate() { api.cannons(); setTimeout(() => api.rain(), 300); api.show(reduce ? 1 : 5); },
      get size() { return { W, H }; },
    };
    return api;
  })();

  /* ======================================================================
     Dates
     ====================================================================== */
  const parseDay = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
  const birth = parseDay(C.birthdate);
  const unlock = C.unlockAt ? new Date(C.unlockAt) : null;
  const preview = /[?&]preview\b/.test(location.search);

  const isToday = (now) => birth && now.getMonth() === birth.getMonth() && now.getDate() === birth.getDate();
  function nextBirthday(now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let d = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (d < today) d = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
    return d;
  }
  function split(ms) {
    ms = Math.max(0, ms);
    return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
  }
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  function setNum(el, v) {
    const str = String(v);
    if (el.textContent === str) return;
    el.textContent = str;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  /* ======================================================================
     Gate
     ====================================================================== */
  const gate = $('#gate'), gift = $('#gift');
  let opened = false;
  const isLocked = () => unlock && !isNaN(unlock) && !preview && Date.now() < unlock.getTime();

  $('#gateEyebrow').textContent = `Psst… ${C.name}`;

  const audio = C.music ? new Audio(C.music) : null;
  const musicBtn = $('#musicBtn');
  if (audio) {
    audio.loop = true; audio.preload = 'auto';
    audio.addEventListener('error', () => { musicBtn.hidden = true; });
    audio.addEventListener('play', () => musicBtn.classList.add('playing'));
    audio.addEventListener('pause', () => musicBtn.classList.remove('playing'));
    musicBtn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  }

  function tickGate() {
    const locked = isLocked();
    $('#gateCountdown').hidden = !locked;
    gift.classList.toggle('ready', !locked);
    if (locked) {
      const t = split(unlock.getTime() - Date.now());
      $$('[data-g]').forEach((el) => setNum(el, el.dataset.g === 'd' ? t.d : pad(t[el.dataset.g])));
      $('#gateHint').textContent = 'Not yet… come back when the timer ends 🤫';
    } else {
      $('#gateHint').textContent = 'Tap the gift to open ✨';
    }
  }

  gift.addEventListener('click', () => {
    if (opened) return;
    if (isLocked()) { gift.classList.remove('nope'); void gift.offsetWidth; gift.classList.add('nope'); return; }
    opened = true;
    gift.classList.add('open');
    if (audio) { musicBtn.hidden = false; audio.play().catch(() => {}); }
    const r = gift.getBoundingClientRect();
    setTimeout(() => {
      FX.confetti(r.left + r.width / 2, r.top + r.height / 2, { count: 170, spread: 360, power: 15 });
      FX.show(3, 350);
    }, 380);
    setTimeout(() => {
      gate.classList.add('gone');
      document.body.classList.remove('is-locked');
      document.body.classList.add('is-open');
      scrollTo(0, 0);
    }, 1100);
    setTimeout(() => { gate.remove(); FX.cannons(); }, 2300);
  });

  /* ======================================================================
     Hero
     ====================================================================== */
  (function hero() {
    const h = $('#heroName');
    h.setAttribute('aria-label', C.name);
    let i = 0;
    C.name.split(/\s+/).forEach((word, wi) => {
      if (wi) h.append(' ');
      const w = document.createElement('span'); w.className = 'word'; w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++);
        w.append(s);
      }
      h.append(w);
    });
    $('#heroLine').textContent = C.heroLine;

    const av = $('#avatar'), img = $('#avatarImg');
    av.classList.add('is-empty');
    img.onload = () => av.classList.remove('is-empty');
    const first = C.photos[0] && C.photos[0].src;
    if (C.coverPhoto) loadImg(img, C.coverPhoto, () => first && loadImg(img, first));
    else if (first) loadImg(img, first);

    // Balloons — tap to pop
    const wrap = $('#balloons');
    const colors = ['#ff5fa2', '#ffd27a', '#9b6bff', '#7ee0ff', '#ff8fc7', '#ff7a7a', '#7dffb2'];
    const n = reduce ? 0 : innerWidth < 600 ? 9 : 14;
    for (let k = 0; k < n; k++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'balloon'; b.setAttribute('aria-label', 'Pop balloon');
      const vars = () => `--x:${rand(2, 88)}%;--s:${rand(42, 66)}px;--c:${pick(colors)};--dur:${rand(10, 17)}s;--sway:${rand(14, 40)}px;`;
      b.style.cssText = vars() + `--delay:${(k * rand(.5, 1.1)).toFixed(2)}s`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = b.getBoundingClientRect();
        const m = getComputedStyle(b).transform;
        b.style.animation = 'none'; b.style.transform = m === 'none' ? '' : m;
        void b.offsetWidth;
        b.style.transition = 'transform .18s ease-out, opacity .18s ease-out';
        b.style.transform = (m === 'none' ? '' : m) + ' scale(1.6)'; b.style.opacity = '0';
        FX.confetti(r.left + r.width / 2, r.top + r.height / 2, { count: 36, spread: 360, power: 7 });
        FX.hearts(r.left + r.width / 2, r.top + r.height / 2, 3);
        if (navigator.vibrate) navigator.vibrate(18);
        setTimeout(() => { b.style.cssText = vars() + '--delay:.2s'; }, 400);
      });
      wrap.append(b);
    }
  })();

  /* ======================================================================
     Counters
     ====================================================================== */
  const cdEls = $$('[data-c]'), lifeEls = $$('[data-l]'), beatsEl = $('#beats');
  if (!birth) $('#time').hidden = true;

  function tickTime() {
    if (!birth) return;
    const now = new Date();
    if (isToday(now)) {
      $('#cdWrap').hidden = true; $('#cdToday').hidden = false;
      const age = now.getFullYear() - birth.getFullYear();
      $('#todaySub').textContent = age > 0 ? `Happy ${ordinal(age)} birthday, ${C.name}!` : `Happy birthday, ${C.name}!`;
    } else {
      const nb = nextBirthday(now);
      const age = nb.getFullYear() - birth.getFullYear();
      $('#cdLabel').textContent = age > 0 ? `Counting down to your ${ordinal(age)} birthday` : 'Your birthday is in';
      const t = split(nb - now);
      cdEls.forEach((el) => setNum(el, el.dataset.c === 'd' ? t.d : pad(t[el.dataset.c])));
    }
    // Life since birth
    let years = now.getFullYear() - birth.getFullYear();
    let lastB = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (lastB > now) { years--; lastB = new Date(now.getFullYear() - 1, birth.getMonth(), birth.getDate()); }
    const t = split(now - lastB);
    const vals = { y: Math.max(0, years), d: t.d, h: pad(t.h), m: pad(t.m), s: pad(t.s) };
    lifeEls.forEach((el) => setNum(el, vals[el.dataset.l]));
    const mins = (now - birth) / 6e4;
    beatsEl.textContent = Math.max(0, Math.round(mins * 80)).toLocaleString();
  }

  function tick() { if (!opened) tickGate(); tickTime(); }
  tick(); setInterval(tick, 1000);

  /* ======================================================================
     Scroll reveal + progress
     ====================================================================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  const observeReveals = () => $$('.reveal:not(.in)').forEach((el) => io.observe(el));

  const bar = $('#progress');
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      ticking = false;
    });
  }, { passive: true });

  /* ======================================================================
     Cake
     ====================================================================== */
  (function cake() {
    const n = Math.max(1, Math.min(9, C.candles | 0 || 5));
    const wrap = $('#candles'), cakeEl = $('#cake');
    const relight = $('#relightBtn'), msg = $('#wishMsg');
    const colors = ['#ff5fa2', '#9b6bff', '#7ee0ff', '#ffb347', '#7dffb2'];
    const candles = [];
    let lit = n;

    for (let i = 0; i < n; i++) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'candle'; c.setAttribute('aria-label', `Blow out candle ${i + 1}`);
      const t = n === 1 ? .5 : i / (n - 1);
      c.style.left = `${14 + t * 72}%`;
      c.style.setProperty('--b', i % 2 ? '12px' : '3px');
      c.style.zIndex = i % 2 ? 1 : 2;
      c.style.setProperty('--c', colors[i % colors.length]);
      c.style.setProperty('--fd', `${-rand(0, 1)}s`);
      c.style.animationDelay = `${i * .08}s`;
      c.innerHTML = '<span class="flame"></span>';
      c.addEventListener('click', () => blow(c));
      wrap.append(c); candles.push(c);
    }

    function blow(c) {
      if (c.classList.contains('out')) return;
      c.classList.add('out');
      for (let k = 0; k < 3; k++) {
        const s = document.createElement('span'); s.className = 'smoke';
        s.style.setProperty('--sx', `${rand(-18, 18)}px`); s.style.animationDelay = `${k * .15}s`;
        c.append(s); setTimeout(() => s.remove(), 2200);
      }
      if (--lit === 0) done();
    }

    function done() {
      cakeEl.classList.add('all-out');
      setTimeout(() => {
        FX.celebrate();
        msg.classList.add('show');
        relight.hidden = false;
        if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
      }, 600);
    }

    relight.addEventListener('click', () => {
      candles.forEach((c) => c.classList.remove('out'));
      lit = n; cakeEl.classList.remove('all-out');
      msg.classList.remove('show'); relight.hidden = true;
    });
  })();

  /* ======================================================================
     Gallery — swipeable polaroid stack
     ====================================================================== */
  (function gallery() {
    const stack = $('#stack'), count = $('#stackCount');
    const photos = C.photos.length ? C.photos : [{ src: 'photos/1.jpg', caption: 'Add your photos ✨' }];
    const cards = photos.map((p, i) => {
      const fig = document.createElement('figure');
      fig.className = 'polaroid';
      fig.style.setProperty('--r', `${rand(-7, 7).toFixed(1)}deg`);
      const box = document.createElement('div'); box.className = 'polaroid__img';
      const img = document.createElement('img'); img.alt = p.caption || ''; img.draggable = false; img.decoding = 'async';
      loadImg(img, p.src, () => { box.classList.add('ph'); box.dataset.file = p.src; box.style.setProperty('--h', (i * 47 + 320) % 360); img.remove(); });
      box.append(img);
      const cap = document.createElement('figcaption'); cap.textContent = p.caption || '';
      fig.append(box, cap);
      stack.append(fig);
      return fig;
    });
    let order = cards.map((_, i) => i);

    function layout() {
      order.forEach((ci, k) => {
        const el = cards[ci];
        el.style.zIndex = cards.length - k;
        el.style.opacity = k < 4 ? 1 : 0;
        el.style.transform = k === 0 ? 'none'
          : `translate(${k % 2 ? 10 : -10}px, ${k * 12}px) scale(${1 - k * .05}) rotate(var(--r))`;
        el.classList.toggle('top', k === 0);
      });
      count.textContent = `${order[0] + 1} / ${cards.length}`;
    }
    layout();

    function next(dir = 1, dy = 0) {
      if (cards.length < 2) return;
      const el = cards[order[0]];
      el.style.transform = `translate(${dir * innerWidth * .9}px, ${dy}px) rotate(${dir * 26}deg)`;
      setTimeout(() => { order.push(order.shift()); layout(); }, 260);
      FX.hearts(innerWidth / 2 + dir * 80, stack.getBoundingClientRect().top + 120, 3);
    }
    function prev() {
      if (cards.length < 2) return;
      order.unshift(order.pop());
      const el = cards[order[0]];
      el.style.transition = 'none';
      el.style.transform = `translate(${-innerWidth * .9}px, 0) rotate(-26deg)`;
      el.style.zIndex = cards.length + 1;
      void el.offsetWidth;
      el.style.transition = '';
      layout();
    }
    $('#nextBtn').addEventListener('click', () => next(1));
    $('#prevBtn').addEventListener('click', prev);

    let drag = null;
    stack.addEventListener('pointerdown', (e) => {
      const top = cards[order[0]];
      if (!top.contains(e.target)) return;
      drag = { el: top, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), id: e.pointerId };
      top.setPointerCapture(e.pointerId);
      top.classList.add('dragging');
      stack.classList.remove('hint');
    });
    stack.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
      drag.el.style.transform = `translate(${drag.dx}px, ${drag.dy * .35}px) rotate(${drag.dx / 14}deg)`;
    });
    const end = () => {
      if (!drag) return;
      const { el, dx, dy, t } = drag; drag = null;
      el.classList.remove('dragging');
      const v = Math.abs(dx) / (performance.now() - t);
      if (Math.abs(dx) > 80 || (Math.abs(dx) > 30 && v > .5)) next(dx > 0 ? 1 : -1, dy * .35);
      else layout();
    };
    stack.addEventListener('pointerup', end);
    stack.addEventListener('pointercancel', end);

    // One-time swipe hint when the stack comes into view
    new IntersectionObserver((en, obs) => {
      if (en[0].isIntersecting) { setTimeout(() => stack.classList.add('hint'), 900); obs.disconnect(); }
    }, { threshold: .5 }).observe(stack);
  })();

  /* ======================================================================
     Reasons — flip cards
     ====================================================================== */
  (function reasons() {
    const grid = $('#reasons');
    C.reasons.forEach((r, i) => {
      const item = typeof r === 'string' ? { emoji: '💖', text: r } : r;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'flip reveal';
      b.style.setProperty('--d', `${(i % 4) * .08}s`);
      b.style.setProperty('--sd', `${-i * .5}s`);
      b.innerHTML = `<span class="flip__inner">
          <span class="flip__face flip__front"><span class="flip__emoji"></span><span class="flip__num">#${i + 1}</span><span class="flip__tap">tap me</span></span>
          <span class="flip__face flip__back"></span>
        </span>`;
      $('.flip__emoji', b).textContent = item.emoji || '💖';
      $('.flip__back', b).textContent = item.text || '';
      b.setAttribute('aria-label', `Reason ${i + 1}`);
      b.addEventListener('click', () => {
        const was = b.classList.toggle('flipped');
        if (was) {
          const r2 = b.getBoundingClientRect();
          FX.hearts(r2.left + r2.width / 2, r2.top + r2.height / 2, 7);
        }
      });
      grid.append(b);
    });
    if (!C.reasons.length) $('#reasons-section').hidden = true;
  })();

  /* ======================================================================
     Letter — envelope + typewriter
     ====================================================================== */
  (function letter() {
    const env = $('#envelope'), wrap = $('#envWrap'), card = $('#letter'), body = $('#letterBody'), sign = $('#letterSign');
    sign.textContent = `${C.signoff}\n— ${C.from}`;
    let typing = null;

    env.addEventListener('click', () => {
      if (env.classList.contains('open')) return;
      env.classList.add('open');
      const r = env.getBoundingClientRect();
      setTimeout(() => FX.hearts(r.left + r.width / 2, r.top + r.height * .3, 12), 500);
      setTimeout(() => wrap.classList.add('done'), 1500);
      setTimeout(() => {
        wrap.hidden = true;
        card.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('show')));
        setTimeout(type, 700);
      }, 2000);
    });

    function type() {
      const text = C.letter || '';
      const caret = document.createElement('span'); caret.className = 'caret';
      const node = document.createTextNode('');
      body.append(node, caret);
      let i = 0;
      const finish = () => { clearTimeout(typing); node.data = text; caret.remove(); sign.classList.add('show'); card.removeEventListener('click', finish); };
      card.addEventListener('click', finish);
      const stepType = () => {
        if (i >= text.length) return finish();
        node.data = text.slice(0, ++i);
        const ch = text[i - 1];
        const delay = reduce ? 0 : ch === '\n' ? 260 : /[.!?—]/.test(ch) ? 280 : /[,;]/.test(ch) ? 140 : rand(22, 48);
        typing = setTimeout(stepType, delay);
      };
      stepType();
    }
  })();

  /* ======================================================================
     Finale
     ====================================================================== */
  (function finale() {
    $('#finaleName').textContent = C.name;
    $('#fromName').textContent = C.from;
    $('#celebrateBtn').addEventListener('click', () => FX.celebrate());

    let timer = null;
    new IntersectionObserver((en) => {
      const on = en[0].isIntersecting;
      if (on && !timer && !reduce) {
        FX.show(3, 300);
        timer = setInterval(() => FX.firework(), 900);
      } else if (!on && timer) { clearInterval(timer); timer = null; }
    }, { threshold: .45 }).observe($('#finale'));
  })();

  /* ======================================================================
     Tap anywhere → little hearts
     ====================================================================== */
  document.addEventListener('pointerdown', (e) => {
    if (!opened) return;
    if (e.target.closest('button, a, .stack, .letter')) return;
    FX.hearts(e.clientX, e.clientY, 6);
  }, { passive: true });

  /* ======================================================================
     Ambient floating hearts
     ====================================================================== */
  (function floaters() {
    if (reduce) return;
    const wrap = $('#floaters');
    const glyphs = ['♥', '♥', '✦', '❀', '♥', '✧'];
    const cols = ['#ff5fa2', '#ff8fc7', '#ffd27a', '#c59bff'];
    const n = innerWidth < 600 ? 12 : 20;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'floater'; s.textContent = pick(glyphs);
      s.style.cssText = `--x:${rand(0, 96)}%;--s:${rand(12, 30)}px;--c:${pick(cols)};--b:${Math.random() < .4 ? rand(1, 3) : 0}px;`
        + `--o:${rand(.25, .6)};--dur:${rand(16, 30)}s;--delay:${-rand(0, 30)}s;--sway:${rand(-60, 60)}px`;
      wrap.append(s);
    }
  })();

  /* ======================================================================
     Section titles — split into words that rise in one by one
     ====================================================================== */
  $$('.title').forEach((t) => {
    let i = 0;
    [...t.childNodes].forEach((node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const s = document.createElement('span');
          s.className = 'w'; s.textContent = part; s.style.setProperty('--i', i++);
          frag.append(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        node.classList.add('w'); node.style.setProperty('--i', i++);
      }
    });
  });

  /* ======================================================================
     Ribbon marquee
     ====================================================================== */
  (function marquee() {
    const fill = (el, txt) => {
      for (let k = 0; k < 12; k++) { const s = document.createElement('span'); s.textContent = txt; el.append(s); }
    };
    fill($('#mqA'), `Happy Birthday ✦ ${C.name} ✦`);
    fill($('#mqB'), `make a wish · you deserve the world ·`);
  })();

  /* ======================================================================
     Age orb — counts up when it comes into view
     ====================================================================== */
  (function age() {
    const sec = $('#age');
    if (!birth) { sec.hidden = true; return; }
    const now = new Date();
    const today = isToday(now);
    const nb = nextBirthday(now);
    const ageN = nb.getFullYear() - birth.getFullYear();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((nb - startToday) / 864e5);
    $('#ageKicker').textContent = today ? "Today you're turning" : "You're about to turn";
    $('#ageLine').textContent = today
      ? `${ageN} looks amazing on you ✨`
      : `${nb.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} · ${days} day${days === 1 ? '' : 's'} to go ⏳`;

    const el = $('#ageNum');
    new IntersectionObserver((en, obs) => {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      setTimeout(() => {
        const t0 = performance.now(), D = 1900;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / D);
          el.textContent = Math.round((1 - Math.pow(1 - k, 3)) * ageN);
          if (k < 1) return requestAnimationFrame(step);
          el.classList.add('pop');
          const r = el.getBoundingClientRect();
          FX.confetti(r.left + r.width / 2, r.top + r.height / 2, { count: 90, spread: 360, power: 11 });
          FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 24, 4);
        };
        requestAnimationFrame(step);
      }, 500);
    }, { threshold: .5 }).observe($('.age__orb'));
  })();

  /* ======================================================================
     Wish lanterns
     ====================================================================== */
  (function lanterns() {
    const btn = $('#lanternBtn'), countEl = $('#wishCount'), dock = $('.lantern-dock');
    const wishes = ['More laughter', 'Big dreams', 'Good health', 'Endless adventures', 'Pure happiness',
      'Lots of love', 'New beginnings', 'Sweet surprises', 'Peace of mind', 'Every wish come true'];
    let sent = 0;

    function release() {
      const r = dock.getBoundingClientRect();
      const l = document.createElement('span');
      l.className = 'lantern lantern--fly';
      l.innerHTML = '<span class="lantern__body"></span><span class="lantern__label"></span>';
      l.lastChild.textContent = wishes[sent % wishes.length];
      l.style.cssText = `--x0:${r.left + r.width / 2 + rand(-70, 70)}px;--y0:${r.top}px;--dx:${rand(-130, 130)}px;--dur:${rand(9, 13)}s`;
      l.addEventListener('animationend', (e) => { if (e.target === l) l.remove(); });
      document.body.append(l);
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 14, 2.5);
      sent++;
      countEl.textContent = `${sent} wish${sent > 1 ? 'es' : ''} sent to the sky ✨`;
      countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
    }
    btn.addEventListener('click', release);

    new IntersectionObserver((en, obs) => {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      [0, 700, 1400].forEach((d) => setTimeout(release, d + 600));
    }, { threshold: .6 }).observe(dock);
  })();

  /* ======================================================================
     Button ripple + sparkle trail that follows finger / mouse
     ====================================================================== */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .round-btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = `${e.clientX - r.left}px`; s.style.top = `${e.clientY - r.top}px`;
    b.append(s); setTimeout(() => s.remove(), 700);
  }, { passive: true });

  let lx = 0, ly = 0;
  const trail = (x, y) => {
    if (!opened || reduce || Math.hypot(x - lx, y - ly) < 14) return;
    lx = x; ly = y;
    FX.sparkle(x, y, 2);
  };
  addEventListener('mousemove', (e) => trail(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) trail(t.clientX, t.clientY); }, { passive: true });

  observeReveals();
  if (preview && !isLocked()) gift.focus();
})();
