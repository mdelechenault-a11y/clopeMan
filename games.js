// Mini-jeux du mode « Envie de fumer ? ».
// Chaque jeu est une fonction (stage, api) qui dessine dans `stage` et renvoie { stop() }.
// api.score(n) met à jour le score affiché, api.end(n) signale la fin de partie.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const INK = '#1d1d1f', YEL = '#ffd23f', PINK = '#ff4d6d', BLUE = '#3a86ff',
    WATER = '#4cc9f0', FILTER = '#f4a259', EMBER = '#ff5400', SKIN = '#ffd6a5';
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- Outils canvas ----------
  function makeCanvas(stage) {
    const cv = document.createElement('canvas');
    cv.className = 'game-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const view = { cv, ctx, W: 300, H: 300 };
    view.fit = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      view.W = Math.max(200, r.width);
      view.H = Math.max(200, r.height);
      cv.width = Math.round(view.W * dpr);
      cv.height = Math.round(view.H * dpr);
      cv.style.width = view.W + 'px';
      cv.style.height = view.H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    view.fit();
    return view;
  }

  function loop(update) {
    let last = performance.now(), id = 0, running = true;
    const step = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => { running = false; cancelAnimationFrame(id); };
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r, fill, stroke, lw = 3) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function comicText(ctx, txt, x, y, size, fill = '#fff') {
    ctx.font = `${size}px Bangers, Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = INK;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(txt, x, y);
  }
  function smallText(ctx, txt, x, y, size = 14, fill = '#fff') {
    ctx.font = `800 ${size}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill;
    ctx.fillText(txt, x, y);
  }
  function emoji(ctx, e, x, y, size) {
    ctx.font = `${size}px system-ui, "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y);
  }

  // Une cigarette, centrée en (x, y), filtre côté gauche avant rotation.
  function drawCig(ctx, x, y, len, th, ang, flash = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const L = len / 2;
    ctx.fillStyle = flash ? '#fff' : FILTER;
    ctx.fillRect(-L, -th / 2, len * 0.3, th);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-L + len * 0.3, -th / 2, len * 0.7, th);
    ctx.fillStyle = flash ? '#fff' : EMBER;
    ctx.fillRect(L - 5, -th / 2, 5, th);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(-L, -th / 2, len, th);
    ctx.restore();
  }

  // Un paquet « FUMER TUE », centré en (x, y).
  function drawPack(ctx, x, y, w, h, ang = 0, flash = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    rr(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.fillStyle = flash ? '#fff' : '#e63946';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w / 2 + 3, -h * 0.12, w - 6, h * 0.34);
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(w / 4.2)}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUMER', 0, -h * 0.12 + h * 0.09);
    ctx.fillText('TUE', 0, -h * 0.12 + h * 0.25);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.26);
    ctx.lineTo(w / 2, -h * 0.26);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Notre héros masqué qui court (pieds en (x, y)).
  function drawHero(ctx, x, y, phase, air, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    // cape
    const w = Math.sin(t * 16) * 5;
    ctx.beginPath();
    ctx.moveTo(-4, -50);
    ctx.lineTo(-32, -42 + w);
    ctx.lineTo(-28, -22 - w);
    ctx.lineTo(-6, -26);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.stroke();
    // jambes
    const a = air ? 0.9 : Math.sin(phase) * 0.8;
    for (const ang of [a, -a]) {
      ctx.save();
      ctx.translate(0, -24);
      ctx.rotate(ang);
      rr(ctx, -4, 0, 8, 22, 3);
      ctx.fillStyle = BLUE;
      ctx.fill();
      ctx.stroke();
      rr(ctx, -4, 16, 11, 7, 3);
      ctx.fillStyle = PINK;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // corps
    rr(ctx, -11, -52, 22, 30, 7);
    ctx.fillStyle = BLUE;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = YEL;
    ctx.fillRect(-9, -28, 18, 4);
    circle(ctx, 1, -41, 5.5, YEL, INK, 2);
    // bras tendu vers l'avant
    ctx.save();
    ctx.translate(4, -46);
    ctx.rotate(air ? -0.9 : -0.2 + Math.sin(phase) * 0.4);
    rr(ctx, 0, -3.5, 18, 7, 3.5);
    ctx.fillStyle = BLUE;
    ctx.fill();
    ctx.stroke();
    circle(ctx, 19, 0, 4.5, SKIN, INK, 2);
    ctx.restore();
    // tête + masque
    circle(ctx, 2, -62, 11, SKIN, INK);
    rr(ctx, -8, -67, 22, 7, 3);
    ctx.fillStyle = INK;
    ctx.fill();
    circle(ctx, 5, -63.5, 1.8, '#fff');
    circle(ctx, 10.5, -63.5, 1.8, '#fff');
    // mèche
    ctx.beginPath();
    ctx.moveTo(-6, -70);
    ctx.quadraticCurveTo(2, -82, 10, -71);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
  }

  // Particules communes (fumée, étincelles, textes BD)
  function makeParticles() {
    let list = [];
    return {
      add(p) { list.push({ life: 0.8, max: 0.8, vx: 0, vy: 0, r: 6, ...p }); },
      update(dt) {
        for (const p of list) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.kind === 'smoke') p.r += dt * 10;
          if (p.kind === 'spark') p.vy += 500 * dt;
        }
        list = list.filter((p) => p.life > 0);
      },
      draw(ctx) {
        for (const p of list) {
          const k = clamp(p.life / p.max, 0, 1);
          ctx.globalAlpha = k;
          if (p.kind === 'smoke') circle(ctx, p.x, p.y, p.r, p.color || 'rgba(180,180,190,.8)');
          else if (p.kind === 'spark') circle(ctx, p.x, p.y, p.r * k + 1, p.color || YEL);
          else if (p.kind === 'text') comicText(ctx, p.text, p.x, p.y, p.size || 26, p.color || YEL);
          ctx.globalAlpha = 1;
        }
      },
    };
  }

  // =====================================================================
  // 1. CLOPE RUN : le héros court et saute par-dessus les clopes
  // =====================================================================
  function runner(stage, api) {
    const v = makeCanvas(stage);
    const { ctx } = v;
    const G = 2300, JUMP = 780, JUMP2 = 680;
    const parts = makeParticles();
    const s = {
      t: 0, speed: 280, dist: 0, score: 0, coins: 0,
      y: 0, vy: 0, jumps: 0,
      obs: [], coinRows: [], nextObs: 500, nextCoin: 800,
      started: false, over: false, shake: 0,
      clouds: Array.from({ length: 4 }, () => ({ x: rand(0, v.W), y: rand(30, v.H * 0.4), k: rand(0.7, 1.2) })),
    };
    let endTimer = 0;
    const ground = () => v.H - Math.max(64, v.H * 0.25);
    const heroX = () => Math.max(60, v.W * 0.2);

    function jump() {
      if (s.over) return;
      s.started = true;
      if (s.jumps < 2) {
        s.vy = s.jumps ? JUMP2 : JUMP;
        s.jumps++;
        for (let i = 0; i < 5; i++) {
          parts.add({ kind: 'smoke', x: heroX() + rand(-10, 10), y: ground() - s.y, vx: rand(-60, 0), vy: rand(-20, 10), r: 4, life: 0.4, max: 0.4, color: 'rgba(255,255,255,.9)' });
        }
      }
    }
    const onDown = (e) => { e.preventDefault(); jump(); };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    v.cv.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', v.fit);

    function spawnObstacle(x) {
      const r = Math.random();
      if (s.t > 18 && r < 0.2) return s.obs.push({ type: 'cloud', x, w: 58, h: 32, alt: 80 });
      if (r < 0.5) return s.obs.push({ type: 'cig', x, w: 14, h: 46, alt: 0 });
      if (r < 0.68) return s.obs.push({ type: 'tray', x, w: 58, h: 20, alt: 0 });
      if (r < 0.86) return s.obs.push({ type: 'pack', x, w: 32, h: 44, alt: 0 });
      s.obs.push({ type: 'cig2', x, w: 40, h: 46, alt: 0 });
    }

    function gameOver() {
      s.over = true;
      s.shake = 0.4;
      const hx = heroX(), gy = ground();
      for (let i = 0; i < 18; i++) {
        parts.add({ kind: 'spark', x: hx, y: gy - s.y - 35, vx: rand(-250, 250), vy: rand(-400, -50), r: rand(3, 6), life: 0.9, max: 0.9, color: pick([YEL, PINK, '#fff']) });
      }
      endTimer = setTimeout(() => { s.ended = true; api.end(s.score); }, 900);
    }

    function update(dt) {
      const W = v.W, gy = ground(), hx = heroX();
      s.shake = Math.max(0, s.shake - dt);
      for (const c of s.clouds) {
        c.x -= (s.started && !s.over ? s.speed : 40) * 0.08 * c.k * dt;
        if (c.x < -80) { c.x = W + 60; c.y = rand(30, v.H * 0.4); }
      }
      if (s.started && !s.over) {
        s.t += dt;
        s.speed = Math.min(640, 280 + s.t * 6.5);
        const dx = s.speed * dt;
        s.dist += dx;
        s.vy -= G * dt;
        s.y += s.vy * dt;
        if (s.y <= 0) { s.y = 0; s.vy = 0; s.jumps = 0; }

        for (const o of s.obs) o.x -= dx;
        for (const c of s.coinRows) c.x -= dx;
        s.obs = s.obs.filter((o) => o.x + o.w > -30);
        s.coinRows = s.coinRows.filter((c) => c.x > -20 && !c.got);

        s.nextObs -= dx;
        if (s.nextObs <= 0) {
          spawnObstacle(W + 20);
          const gap = s.speed * 0.8 + 90;
          s.nextObs = rand(gap, gap * 2.1);
        }
        s.nextCoin -= dx;
        if (s.nextCoin <= 0) {
          const alt = rand(25, 125);
          for (let i = 0; i < 3; i++) s.coinRows.push({ x: W + 20 + i * 30, alt });
          s.nextCoin = rand(500, 1100);
        }

        // fumée des clopes allumées
        for (const o of s.obs) {
          if ((o.type === 'cig' || o.type === 'cig2') && Math.random() < dt * 8) {
            parts.add({ kind: 'smoke', x: o.x + 7, y: gy - o.h - 4, vx: rand(-20, 10), vy: rand(-50, -30), r: 3, life: 0.9, max: 0.9 });
          }
        }

        const hb = { x: hx - 10, y: gy - s.y - 60, w: 20, h: 58 };
        for (const o of s.obs) {
          const ob = { x: o.x + 4, y: gy - o.alt - o.h + 4, w: o.w - 8, h: o.h - 8 };
          if (overlap(hb, ob)) { gameOver(); break; }
        }
        for (const c of s.coinRows) {
          const cy = gy - c.alt;
          if (Math.abs(c.x - hx) < 22 && Math.abs(cy - (gy - s.y - 32)) < 38) {
            c.got = true;
            s.coins++;
            parts.add({ kind: 'text', text: '+5 €', x: c.x, y: cy - 10, vy: -60, life: 0.6, max: 0.6, size: 20 });
          }
        }
        const score = Math.floor(s.dist / 25) + s.coins * 5;
        if (score !== s.score) { s.score = score; api.score(score); }
      }
      parts.update(dt);
      draw();
    }

    function draw() {
      const W = v.W, H = v.H, gy = ground(), hx = heroX();
      ctx.save();
      if (s.shake > 0) ctx.translate(rand(-8, 8) * s.shake, rand(-8, 8) * s.shake);
      // ciel
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#8ecae6');
      g.addColorStop(1, '#e0f6ff');
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, gy + 10);
      circle(ctx, W - 60, 64, 26, YEL, INK);
      for (const c of s.clouds) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.k, c.k);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-20, 6, 16, 0, TAU);
        ctx.arc(0, -4, 22, 0, TAU);
        ctx.arc(24, 6, 16, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // collines
      const off = (s.dist * 0.25) % 260;
      ctx.fillStyle = '#95d5b2';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      for (let x = -off - 130; x < W + 260; x += 260) {
        ctx.beginPath();
        ctx.ellipse(x, gy, 150, 70, 0, Math.PI, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // sol
      ctx.fillStyle = '#f4d58d';
      ctx.fillRect(-10, gy, W + 20, H - gy + 10);
      ctx.beginPath();
      ctx.moveTo(-10, gy);
      ctx.lineTo(W + 10, gy);
      ctx.lineWidth = 3;
      ctx.stroke();
      const doff = s.dist % 40;
      ctx.lineWidth = 2;
      for (let x = -doff; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 16);
        ctx.lineTo(x + 12, gy + 16);
        ctx.moveTo(x + 20, gy + 34);
        ctx.lineTo(x + 28, gy + 34);
        ctx.stroke();
      }
      // pièces
      for (const c of s.coinRows) {
        const cy = gy - c.alt;
        circle(ctx, c.x, cy, 10, YEL, INK, 2.5);
        smallText(ctx, '€', c.x, cy + 1, 13, INK);
      }
      // obstacles
      for (const o of s.obs) {
        const top = gy - o.alt - o.h;
        if (o.type === 'cig') drawCig(ctx, o.x + 7, gy - 23, 46, 14, -Math.PI / 2);
        else if (o.type === 'cig2') {
          drawCig(ctx, o.x + 7, gy - 23, 46, 14, -Math.PI / 2);
          drawCig(ctx, o.x + 33, gy - 23, 46, 14, -Math.PI / 2);
        } else if (o.type === 'pack') drawPack(ctx, o.x + o.w / 2, top + o.h / 2, o.w, o.h);
        else if (o.type === 'tray') {
          drawCig(ctx, o.x + 18, gy - 22, 24, 7, -0.6);
          drawCig(ctx, o.x + 38, gy - 20, 22, 7, 0.5);
          rr(ctx, o.x, gy - 14, o.w, 14, 6);
          ctx.fillStyle = '#adb5bd';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = INK;
          ctx.stroke();
        } else if (o.type === 'cloud') {
          const cx = o.x + o.w / 2, cy = top + o.h / 2;
          ctx.fillStyle = '#6c757d';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx - 16, cy + 3, 13, 0, TAU);
          ctx.arc(cx, cy - 4, 17, 0, TAU);
          ctx.arc(cx + 16, cy + 3, 13, 0, TAU);
          ctx.stroke();
          ctx.fill();
          // yeux méchants
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx - 10, cy - 6); ctx.lineTo(cx - 3, cy - 2);
          ctx.moveTo(cx + 10, cy - 6); ctx.lineTo(cx + 3, cy - 2);
          ctx.stroke();
        }
      }
      drawHero(ctx, hx, gy - s.y, s.dist / 16, s.y > 0, s.t);
      parts.draw(ctx);

      if (!s.started) {
        comicText(ctx, 'TOUCHE POUR SAUTER !', W / 2, H * 0.3, 32, YEL);
        smallText(ctx, 'Double saut autorisé 😉', W / 2, H * 0.3 + 34, 14, INK);
        smallText(ctx, 'Passe SOUS les nuages de fumée !', W / 2, H * 0.3 + 54, 14, INK);
      }
      if (s.over && !s.ended) comicText(ctx, 'BOUM !', W / 2, H * 0.32, 64, PINK);
      ctx.restore();
    }

    const stopLoop = loop(update);
    return {
      stop() {
        stopLoop();
        clearTimeout(endTimer);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', v.fit);
      },
    };
  }

  // =====================================================================
  // 2. PSHHT ! : une goutte d'eau éteint les clopes qui tombent
  // =====================================================================
  function shooter(stage, api) {
    const v = makeCanvas(stage);
    const { ctx } = v;
    const parts = makeParticles();
    const s = {
      t: 0, score: 0, lives: 3, px: v.W / 2, tx: v.W / 2,
      fireT: 0, spawnT: 0.6, triple: 0,
      bullets: [], foes: [], items: [],
      started: false, over: false, shake: 0, hurt: 0,
      stars: Array.from({ length: 45 }, () => ({ x: rand(0, v.W), y: rand(0, v.H), sp: rand(15, 70), r: rand(0.6, 1.8) })),
    };
    let endTimer = 0;
    const py = () => v.H - 70;

    const setTarget = (e) => {
      const r = v.cv.getBoundingClientRect();
      s.tx = clamp(e.clientX - r.left, 22, v.W - 22);
    };
    const onDown = (e) => {
      e.preventDefault();
      s.started = true;
      setTarget(e);
      try { v.cv.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    };
    const onMove = (e) => { if (s.started) setTarget(e); };
    v.cv.addEventListener('pointerdown', onDown);
    v.cv.addEventListener('pointermove', onMove);
    window.addEventListener('resize', v.fit);

    function spawn() {
      const x = rand(26, v.W - 26);
      const r = Math.random();
      if (r < 0.05 && s.lives < 3) return s.items.push({ x, y: -20, kind: '❤️' });
      if (r < 0.1) return s.items.push({ x, y: -20, kind: '🫁' });
      if (r < 0.1 + Math.min(0.25, s.t * 0.006)) {
        return s.foes.push({ type: 'pack', x, y: -30, r: 24, hp: 3, vy: rand(55, 80) + s.t * 0.8, vx: rand(-25, 25), rot: rand(-0.3, 0.3), vr: rand(-0.8, 0.8), flash: 0 });
      }
      s.foes.push({ type: 'cig', x, y: -30, r: 18, len: 44, hp: 1, vy: rand(90, 140) + s.t * 1.6, vx: rand(-50, 50), rot: rand(0, TAU), vr: rand(-3, 3), flash: 0 });
    }

    function steam(x, y, n) {
      for (let i = 0; i < n; i++) {
        parts.add({ kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-60, 60), vy: rand(-90, -20), r: rand(3, 6), life: 0.6, max: 0.6, color: 'rgba(220,235,245,.9)' });
      }
    }

    function kill(f) {
      f.dead = true;
      s.score += f.type === 'pack' ? 30 : 10;
      api.score(s.score);
      steam(f.x, f.y, f.type === 'pack' ? 14 : 7);
      if (Math.random() < 0.3 || f.type === 'pack') {
        parts.add({ kind: 'text', text: pick(['PSHHT !', 'SPLASH !', 'FSSS !', 'ÉTEINTE !']), x: f.x, y: f.y, vy: -40, life: 0.7, max: 0.7, size: 24, color: '#fff' });
      }
      if (f.type === 'pack') {
        for (const dir of [-1, 1]) {
          s.foes.push({ type: 'cig', x: f.x, y: f.y, r: 14, len: 32, hp: 1, vy: 130 + s.t, vx: dir * 90, rot: rand(0, TAU), vr: rand(-4, 4), flash: 0 });
        }
      }
    }

    function hurt() {
      s.lives--;
      s.hurt = 0.35;
      s.shake = 0.3;
      if (s.lives <= 0 && !s.over) {
        s.over = true;
        for (let i = 0; i < 20; i++) {
          parts.add({ kind: 'spark', x: s.px, y: py(), vx: rand(-260, 260), vy: rand(-420, -60), r: rand(3, 6), life: 1, max: 1, color: pick([WATER, '#fff', PINK]) });
        }
        endTimer = setTimeout(() => { s.ended = true; api.end(s.score); }, 900);
      }
    }

    function update(dt) {
      const W = v.W, H = v.H, Y = py();
      s.shake = Math.max(0, s.shake - dt);
      s.hurt = Math.max(0, s.hurt - dt);
      for (const st of s.stars) {
        st.y += st.sp * dt * (s.started ? 1.6 : 0.6);
        if (st.y > H) { st.y = 0; st.x = rand(0, W); }
      }
      if (s.started && !s.over) {
        s.t += dt;
        s.px += (s.tx - s.px) * Math.min(1, dt * 12);
        s.triple = Math.max(0, s.triple - dt);

        s.fireT -= dt;
        if (s.fireT <= 0) {
          s.fireT = 0.17;
          s.bullets.push({ x: s.px, y: Y - 34, vx: 0 });
          if (s.triple > 0) {
            s.bullets.push({ x: s.px - 8, y: Y - 28, vx: -150 });
            s.bullets.push({ x: s.px + 8, y: Y - 28, vx: 150 });
          }
        }
        s.spawnT -= dt;
        if (s.spawnT <= 0) {
          spawn();
          s.spawnT = Math.max(0.3, 1.0 - s.t * 0.012) * rand(0.7, 1.3);
        }

        for (const b of s.bullets) { b.y -= 640 * dt; b.x += b.vx * dt; }
        for (const f of s.foes) {
          f.y += f.vy * dt;
          f.x += f.vx * dt;
          if (f.x < 16 || f.x > W - 16) { f.vx *= -1; f.x = clamp(f.x, 16, W - 16); }
          f.rot += f.vr * dt;
          f.flash = Math.max(0, f.flash - dt);
          if (f.type === 'cig' && Math.random() < dt * 6) {
            parts.add({ kind: 'smoke', x: f.x, y: f.y, vx: rand(-15, 15), vy: rand(-40, -10), r: 3, life: 0.7, max: 0.7, color: 'rgba(150,150,160,.6)' });
          }
        }
        for (const it of s.items) it.y += 120 * dt;

        for (const b of s.bullets) {
          for (const f of s.foes) {
            if (f.dead || b.dead) continue;
            if (Math.hypot(b.x - f.x, b.y - f.y) < f.r + 6) {
              b.dead = true;
              f.hp--;
              f.flash = 0.08;
              if (f.hp <= 0) kill(f);
            }
          }
        }
        for (const f of s.foes) {
          if (f.dead) continue;
          if (Math.hypot(f.x - s.px, f.y - (Y - 8)) < f.r + 16) {
            f.dead = true;
            steam(f.x, f.y, 6);
            hurt();
          } else if (f.y > H + 30) {
            f.dead = true;
            parts.add({ kind: 'text', text: 'RATÉE !', x: f.x, y: H - 20, vy: -50, life: 0.7, max: 0.7, size: 22, color: PINK });
            hurt();
          }
        }
        for (const it of s.items) {
          if (Math.hypot(it.x - s.px, it.y - (Y - 8)) < 36) {
            it.dead = true;
            if (it.kind === '❤️') { s.lives = Math.min(3, s.lives + 1); parts.add({ kind: 'text', text: '+1 VIE', x: it.x, y: it.y, vy: -50, life: 0.8, max: 0.8, size: 24, color: PINK }); }
            else { s.triple = 7; parts.add({ kind: 'text', text: 'TRIPLE JET !', x: it.x, y: it.y, vy: -50, life: 0.8, max: 0.8, size: 24, color: WATER }); }
          } else if (it.y > H + 30) it.dead = true;
        }
        s.bullets = s.bullets.filter((b) => !b.dead && b.y > -20);
        s.foes = s.foes.filter((f) => !f.dead);
        s.items = s.items.filter((it) => !it.dead);
      }
      parts.update(dt);
      draw();
    }

    function drawDrop(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      const w = Math.sin(s.t * 18) * 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-18 + w, 28);
      ctx.lineTo(18 - w, 28);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fillStyle = PINK;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.bezierCurveTo(8, -20, 20, -8, 20, 4);
      ctx.arc(0, 4, 20, 0, Math.PI);
      ctx.bezierCurveTo(-20, -8, -8, -20, 0, -36);
      ctx.fillStyle = WATER;
      ctx.fill();
      ctx.stroke();
      rr(ctx, -15, -5, 30, 9, 4);
      ctx.fillStyle = INK;
      ctx.fill();
      circle(ctx, -6, -0.5, 2.4, '#fff');
      circle(ctx, 6, -0.5, 2.4, '#fff');
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(-9, -14, 3, 6, 0.4, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function draw() {
      const W = v.W, H = v.H;
      ctx.save();
      if (s.shake > 0) ctx.translate(rand(-8, 8) * s.shake, rand(-8, 8) * s.shake);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b132b');
      g.addColorStop(1, '#1c2541');
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, H + 20);
      for (const st of s.stars) circle(ctx, st.x, st.y, st.r, 'rgba(255,255,255,.8)');

      for (const it of s.items) {
        circle(ctx, it.x, it.y, 19, '#fff', INK, 3);
        emoji(ctx, it.kind, it.x, it.y + 1, 22);
      }
      for (const f of s.foes) {
        if (f.type === 'pack') drawPack(ctx, f.x, f.y, 34, 46, f.rot, f.flash > 0);
        else drawCig(ctx, f.x, f.y, f.len, f.len / 4.2, f.rot, f.flash > 0);
      }
      for (const b of s.bullets) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 9);
        ctx.quadraticCurveTo(b.x + 6, b.y, b.x, b.y + 5);
        ctx.quadraticCurveTo(b.x - 6, b.y, b.x, b.y - 9);
        ctx.fillStyle = WATER;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      if (!(s.over && s.lives <= 0)) drawDrop(s.px, py());
      parts.draw(ctx);

      // vies et bonus
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = i < s.lives ? 1 : 0.25;
        emoji(ctx, '❤️', W - 22 - i * 28, 22, 20);
      }
      ctx.globalAlpha = 1;
      if (s.triple > 0) smallText(ctx, `💦 Triple jet ${Math.ceil(s.triple)} s`, 70, 22, 13, WATER);

      if (s.hurt > 0) {
        ctx.fillStyle = `rgba(255,77,109,${s.hurt})`;
        ctx.fillRect(-10, -10, W + 20, H + 20);
      }
      if (!s.started) {
        comicText(ctx, 'GLISSE TON DOIGT !', W / 2, H * 0.36, 34, YEL);
        smallText(ctx, 'Ta goutte tire toute seule.', W / 2, H * 0.36 + 36, 14);
        smallText(ctx, 'Éteins les clopes avant qu\'elles touchent le sol.', W / 2, H * 0.36 + 56, 14);
        smallText(ctx, '🫁 = triple jet   ❤️ = une vie en plus', W / 2, H * 0.36 + 84, 14, WATER);
      }
      if (s.over && !s.ended) comicText(ctx, 'K.O. !', W / 2, H * 0.36, 64, PINK);
      ctx.restore();
    }

    const stopLoop = loop(update);
    return {
      stop() {
        stopLoop();
        clearTimeout(endTimer);
        window.removeEventListener('resize', v.fit);
      },
    };
  }

  // =====================================================================
  // 3. ÉCRASE-CLOPES : tape les clopes qui sortent des cendriers (40 s)
  // =====================================================================
  function whack(stage, api) {
    const DURATION = 40;
    const GOOD = ['🍎', '🥕', '💧', '🐶', '🌸'];
    stage.innerHTML = `
      <div class="whack">
        <div class="whack-bar"><i></i></div>
        <div class="whack-grid">${'<button class="hole" type="button"><span class="item"></span></button>'.repeat(9)}</div>
        <p class="whack-hint">Écrase 🚬 (+1) et 🔥 (+2), attrape 💰 (+5)…<br>mais pas touche à 🍎 🥕 💧 🐶 🌸 (−3) !</p>
        <div class="game-start"><button class="btn" type="button">C'est parti ! 👊</button></div>
      </div>`;
    const grid = stage.querySelector('.whack-grid');
    const holes = [...stage.querySelectorAll('.hole')];
    const bar = stage.querySelector('.whack-bar i');
    const startBox = stage.querySelector('.game-start');
    let score = 0, t0 = 0, running = false, spawnTimer = 0, raf = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

    function floatText(h, txt, good) {
      const el = document.createElement('div');
      el.className = 'float-txt' + (good ? '' : ' bad');
      el.textContent = txt;
      el.style.left = h.offsetLeft + h.offsetWidth / 2 + 'px';
      el.style.top = h.offsetTop + 'px';
      grid.appendChild(el);
      later(() => el.remove(), 700);
    }
    function hide(h) {
      clearTimeout(h._t);
      h.classList.remove('up');
      delete h.dataset.pts;
      h._busy = true;
      later(() => { h._busy = false; h.classList.remove('hit', 'miss'); }, 220);
    }
    function spawn() {
      if (!running) return;
      const el = (performance.now() - t0) / 1000;
      const free = holes.filter((h) => !h.dataset.pts && !h._busy);
      if (free.length) {
        const h = pick(free);
        const r = Math.random();
        let e, pts;
        if (r < 0.6) [e, pts] = ['🚬', 1];
        else if (r < 0.72) [e, pts] = ['🔥', 2];
        else if (r < 0.78) [e, pts] = ['💰', 5];
        else [e, pts] = [pick(GOOD), -3];
        h.querySelector('.item').textContent = e;
        h.dataset.pts = pts;
        h.classList.add('up');
        h._t = later(() => { if (h.dataset.pts) hide(h); }, Math.max(560, 1200 - el * 16));
      }
      spawnTimer = later(spawn, Math.max(300, 760 - el * 12) * rand(0.7, 1.2));
    }
    holes.forEach((h) => h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!running || !h.dataset.pts) return;
      const pts = +h.dataset.pts;
      score = Math.max(0, score + pts);
      api.score(score);
      floatText(h, pts > 0 ? `+${pts}` : 'AÏE ! −3', pts > 0);
      h.classList.add(pts > 0 ? 'hit' : 'miss');
      clearTimeout(h._t);
      delete h.dataset.pts;
      h._busy = true;
      later(() => hide(h), 160);
    }));
    function frame() {
      const el = (performance.now() - t0) / 1000;
      bar.style.width = Math.max(0, 100 - (el / DURATION) * 100) + '%';
      if (el >= DURATION) {
        running = false;
        holes.forEach(hide);
        later(() => api.end(score), 500);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    startBox.querySelector('button').addEventListener('click', () => {
      startBox.remove();
      running = true;
      t0 = performance.now();
      spawn();
      raf = requestAnimationFrame(frame);
    });

    return {
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        clearTimeout(spawnTimer);
        timers.forEach(clearTimeout);
        timers.clear();
      },
    };
  }

  // =====================================================================
  // 4. ZEN : respiration guidée (inspire 4 s, expire 6 s)
  // =====================================================================
  const TIPS = [
    'Bois un grand verre d\'eau, lentement.',
    'Va marcher 5 minutes, même juste dans le couloir.',
    'Mâche un chewing-gum ou croque une pomme.',
    'Envoie un message à quelqu\'un que tu aimes.',
    'L\'envie monte, culmine… et redescend. Toujours.',
    'Pense au resto en amoureux qui se rapproche 🍷',
    'Brosse-toi les dents : la clope aurait un goût horrible.',
    'Fais 10 squats. Oui, maintenant. Allez !',
  ];
  function zen(stage) {
    stage.innerHTML = `
      <div class="zen">
        <div class="breath-wrap"><div class="breath">Prêt ?</div></div>
        <p class="tip"></p>
      </div>`;
    const b = stage.querySelector('.breath');
    const tip = stage.querySelector('.tip');
    let inhale = true, cycleT = 0, tipI = Math.floor(Math.random() * TIPS.length);
    const cycle = () => {
      b.className = 'breath ' + (inhale ? 'in' : 'out');
      b.textContent = inhale ? 'Inspire' : 'Expire';
      cycleT = setTimeout(cycle, inhale ? 4000 : 6000);
      inhale = !inhale;
    };
    const showTip = () => { tip.textContent = TIPS[tipI]; tipI = (tipI + 1) % TIPS.length; };
    showTip();
    const tipT = setInterval(showTip, 15000);
    cycleT = setTimeout(cycle, 600);
    return { stop() { clearTimeout(cycleT); clearInterval(tipT); } };
  }

  window.ClopeGames = { runner, shooter, whack, zen };
})();
