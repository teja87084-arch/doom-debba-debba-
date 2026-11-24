(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const welcome = $("welcomeScreen");
  const intro = $("introScreen");
  const game = $("gameScreen");

  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const arena = $("arena");

  const hitsEl = $("hits");
  const scoreEl = $("score");
  const levelEl = $("level");

  const loading = $("loading");
  const errorBox = $("error");

  const introAudio = $("introAudio");
  const bgAudio = $("backgroundAudio");
  const thorSound = $("thorAttackSound");
  const missSound = $("doomSound");
  const alayaSound = $("alayaSound");

  let doomImg, thorImg, alayaImg;

  function loadImage(src, name) {
    const img = new Image();

    img.onload = checkImages;

    img.onerror = () => {
      errorBox.textContent = `Could not load ${name}: ${src}`;
      loading.style.display = "none";
    };

    img.src = src;
    return img;
  }

  doomImg = loadImage("./doom.png.png", "Doom");
  thorImg = loadImage("./thor.png.png", "Thor");
  alayaImg = loadImage("./aliy.png.png", "Alaya");

  function checkImages() {
    if (
      [doomImg, thorImg, alayaImg].every(
        img => img.complete && img.naturalWidth
      )
    ) {
      loading.style.display = "none";
      errorBox.textContent = "";
    }
  }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let started = false;
  let lastTime = 0;
  let frameId = 0;

  let hits = 0;
  let score = 0;

  let shots = [];
  let bolts = [];

  const pointer = { x: 0, y: 0 };

  const doom = {
    x: 0,
    y: 0,
    vx: 330,
    vy: 130,
    size: 88,
    visible: true,
    respawn: 0,
    turn: .6,
    shake: 0
  };

  const alaya = {
    x: 0,
    y: 0,
    vx: 0,
    visible: false,
    timer: 0,
    next: 11
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function sound(audio, volume = 1) {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;

      const p = audio.play();

      if (p) p.catch(() => {});
    } catch (_) {}
  }

  function resize() {
    const r = arena.getBoundingClientRect();

    if (!r.width || !r.height) return;

    W = r.width;
    H = r.height;

    dpr = Math.min(devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!doom.x) doom.x = W / 2;
    if (!doom.y) doom.y = H * .25;

    doom.x = clamp(doom.x, doom.size, W - doom.size);
    doom.y = clamp(doom.y, doom.size, H * .52);

    pointer.x = W / 2;
    pointer.y = H * .25;
  }

  function thorPos() {
    return {
      x: W / 2,
      y: H - Math.min(115, H * .15)
    };
  }

  function imageFit(img, x, y, mw, mh) {
    if (!img.complete || !img.naturalWidth) return;

    const s = Math.min(
      mw / img.naturalWidth,
      mh / img.naturalHeight
    );

    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;

    ctx.drawImage(
      img,
      x - w / 2,
      y - h / 2,
      w,
      h
    );
  }

  function drawDoom() {
    if (!doom.visible) return;

    const n = doom.shake > 0
      ? 12 * doom.shake / .28
      : 0;

    ctx.save();

    ctx.translate(
      (Math.random() - .5) * n,
      (Math.random() - .5) * n
    );

    ctx.shadowColor = "rgba(60,240,130,.45)";
    ctx.shadowBlur = 18;

    imageFit(
      doomImg,
      doom.x,
      doom.y,
      doom.size * 1.65,
      doom.size * 1.65
    );

    ctx.restore();
  }

  function drawThor() {
    const p = thorPos();

    // Thor is intentionally stable.
    imageFit(
      thorImg,
      p.x,
      p.y,
      Math.min(W * .22, 155),
      Math.min(H * .25, 190)
    );
  }

  function drawAim() {
    const p = thorPos();

    ctx.save();

    ctx.setLineDash([4, 8]);
    ctx.beginPath();

    ctx.moveTo(p.x, p.y - 58);
    ctx.lineTo(pointer.x, pointer.y);

    ctx.strokeStyle = "rgba(90,235,145,.38)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();

    ctx.arc(
      pointer.x,
      pointer.y,
      8,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle = "#68ffa3";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    drawAim();
    drawDoom();

    if (alaya.visible) {
      imageFit(
        alayaImg,
        alaya.x,
        alaya.y,
        Math.min(W * .24, 145),
        Math.min(H * .2, 145)
      );
    }

    for (const b of bolts) {
      ctx.save();

      ctx.globalAlpha = clamp(b.life / .24, 0, 1);
      ctx.strokeStyle = "#caffdc";
      ctx.shadowColor = "#38e981";
      ctx.shadowBlur = 22;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(b.x - 27, b.y - 42);
      ctx.lineTo(b.x - 8, b.y - 12);
      ctx.lineTo(b.x - 20, b.y + 2);
      ctx.lineTo(b.x + 7, b.y + 12);
      ctx.lineTo(b.x - 1, b.y + 39);
      ctx.stroke();

      ctx.restore();
    }

    drawThor();

    for (const p of shots) {
      ctx.save();

      ctx.shadowColor = "#54ff9b";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#caffdc";

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function shoot() {
    if (!started) return;

    const p = thorPos();
    const oy = p.y - 58;

    let dx = pointer.x - p.x;
    let dy = pointer.y - oy;

    const len = Math.hypot(dx, dy) || 1;

    dx /= len;
    dy /= len;

    shots.push({
      x: p.x,
      y: oy,
      ox: p.x,
      oy,
      vx: dx * 760,
      vy: dy * 760,
      life: 2.1
    });
  }

  function pointerMove(e) {
    const r = canvas.getBoundingClientRect();

    pointer.x = clamp(e.clientX - r.left, 0, W);
    pointer.y = clamp(e.clientY - r.top, 0, H);
  }

  function segmentDistanceSq(
    ax, ay,
    bx, by,
    cx, cy
  ) {
    const dx = bx - ax;
    const dy = by - ay;

    const l = dx * dx + dy * dy;

    const t = l
      ? clamp(
          ((cx - ax) * dx + (cy - ay) * dy) / l,
          0,
          1
        )
      : 0;

    const px = ax + t * dx;
    const py = ay + t * dy;

    return (cx - px) ** 2 + (cy - py) ** 2;
  }

  function doomSpeed() {
    return Math.min(
      330 + Math.floor(hits / 5) * 22,
      520
    );
  }

  function hitDoom() {
    hits++;
    score += 10;

    hitsEl.textContent = hits;
    scoreEl.textContent = score;
    levelEl.textContent = 1 + Math.floor(hits / 5);

    sound(thorSound, .85);

    bolts.push({
      x: doom.x,
      y: doom.y,
      life: .24
    });

    doom.shake = .28;
    doom.visible = false;
    doom.respawn = .38;
  }

  function updateDoom(dt) {
    if (doom.shake > 0) {
      doom.shake = Math.max(0, doom.shake - dt);
    }

    if (!doom.visible) {
      doom.respawn -= dt;

      if (doom.respawn <= 0) {
        const m = doom.size;
        const speed = doomSpeed();

        doom.x = m + Math.random() * Math.max(1, W - m * 2);

        doom.y = m + Math.random() * Math.max(1, H * .42 - m);

        doom.vx = (Math.random() < .5 ? -1 : 1) * speed;

        doom.vy =
          (Math.random() < .5 ? -1 : 1) *
          speed *
          (.28 + Math.random() * .16);

        doom.turn = .45 + Math.random() * .65;
        doom.visible = true;
      }

      return;
    }

    doom.turn -= dt;

    if (doom.turn <= 0) {
      doom.turn = .42 + Math.random() * .7;

      const speed = doomSpeed();

      if (Math.random() < .78) doom.vx *= -1;
      if (Math.random() < .62) doom.vy *= -1;

      doom.vx =
        Math.sign(doom.vx || 1) *
        speed *
        (.88 + Math.random() * .24);

      doom.vy =
        Math.sign(doom.vy || 1) *
        speed *
        (.24 + Math.random() * .18);
    }

    doom.x += doom.vx * dt;
    doom.y += doom.vy * dt;

    const m = doom.size * .72;
    const bottom = Math.max(m + 5, H * .52);

    if (doom.x < m || doom.x > W - m) {
      doom.vx *= -1;
      doom.x = clamp(doom.x, m, W - m);
    }

    if (doom.y < m || doom.y > bottom) {
      doom.vy *= -1;
      doom.y = clamp(doom.y, m, bottom);
    }
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];

      p.ox = p.x;
      p.oy = p.y;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      const radius = doom.size * .58;

      if (
        doom.visible &&
        segmentDistanceSq(
          p.ox, p.oy,
          p.x, p.y,
          doom.x, doom.y
        ) <= radius * radius
      ) {
        hitDoom();
        shots.splice(i, 1);
        continue;
      }

      if (
        p.life <= 0 ||
        p.x < -25 ||
        p.x > W + 25 ||
        p.y < -25 ||
        p.y > H + 25
      ) {
        sound(missSound, .65);
        shots.splice(i, 1);
      }
    }
  }

  function updateAlaya(dt) {
    if (alaya.visible) {
      alaya.x += alaya.vx * dt;
      alaya.timer -= dt;

      if (
        alaya.timer <= 0 ||
        alaya.x < -130 ||
        alaya.x > W + 130
      ) {
        alaya.visible = false;
        alaya.next = 11 + Math.random() * 10;
      }

      return;
    }

    alaya.next -= dt;

    if (alaya.next <= 0) {
      alaya.visible = true;
      alaya.timer = 4.2;

      const left = Math.random() < .5;

      alaya.x = left ? -100 : W + 100;
      alaya.y = H * (.32 + Math.random() * .14);
      alaya.vx = left ? 155 : -155;

      sound(alayaSound, .75);
    }
  }

  function update(dt) {
    updateDoom(dt);
    updateShots(dt);
    updateAlaya(dt);

    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].life -= dt;

      if (bolts[i].life <= 0) {
        bolts.splice(i, 1);
      }
    }
  }

  function loop(t) {
    if (!started) return;

    if (!lastTime) lastTime = t;

    const dt = Math.min(
      (t - lastTime) / 1000,
      .035
    );

    lastTime = t;

    update(dt);
    draw();

    frameId = requestAnimationFrame(loop);
  }

  $("playIntroBtn").addEventListener("click", () => {
    welcome.classList.add("hidden");
    intro.classList.remove("hidden");

    sound(introAudio, .85);
  });

  $("startGameBtn").addEventListener("click", () => {
    if (started) return;

    introAudio.pause();
    introAudio.currentTime = 0;

    intro.classList.add("hidden");
    game.classList.remove("hidden");

    started = true;

    resize();

    bgAudio.volume = .10;
    bgAudio.loop = true;

    const p = bgAudio.play();

    if (p) p.catch(() => {});

    lastTime = 0;

    frameId = requestAnimationFrame(loop);
  });

  canvas.addEventListener("pointermove", pointerMove);

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    pointerMove(e);
    shoot();
  });

  window.addEventListener("keydown", e => {
    if (
      e.code === "Space" &&
      !e.repeat &&
      started
    ) {
      e.preventDefault();
      shoot();
    }
  });

  window.addEventListener("resize", resize);

  document.addEventListener("visibilitychange", () => {
    if (!started) return;

    if (document.hidden) {
      bgAudio.pause();
    } else {
      bgAudio.play().catch(() => {});
    }
  });

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(frameId);
  });

  // No game loop and no audio are started automatically on page load.
})();