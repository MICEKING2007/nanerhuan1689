/* ================= 引擎：视觉小说核心（单线恋爱 / 心动值） ================= */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const LS_META = 'bl1689_meta_v2';
  const LS_SAVE = 'bl1689_saves_v2';
  const LS_AUTO = 'bl1689_auto_v2';
  const LS_SET = 'bl1689_settings_v2';

  // 他：真人抠图立绘（不同表情/姿势）
  const HIM = {
    smile: 'assets/hero/p2_full.webp',
    face: 'assets/hero/p2_face.webp',
    turn: 'assets/hero/p4_upper.webp',
    back: 'assets/hero/p3_upper.webp',
    shy: 'assets/hero/p1_upper.webp',
    fold: 'assets/hero/p1_full.webp',
    walk: 'assets/hero/p3_full.webp',
  };

  const DECALS = {
    heart: '<svg width="64" height="64" viewBox="0 0 24 24" class="decal-heart" style="right:-6%;top:6%"><path d="M12 21s-8-5.3-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.7-8 11-8 11z" fill="#ef6d8a"/></svg>',
    sweat: '<svg width="42" height="52" viewBox="0 0 24 30" class="decal-sweat" style="left:2%;top:4%"><path d="M12 1c4 7 8 10.5 8 15.5A8 8 0 0 1 4 16.5C4 11.5 8 8 12 1z" fill="#8fd3f4" stroke="#3f8fb8" stroke-width="1.2"/></svg>',
    exclaim: '<svg width="34" height="46" viewBox="0 0 20 28" class="decal-shake" style="right:-4%;top:-2%"><path d="M10 2l2.6 16H7.4L10 2z" fill="#f0a13a"/><circle cx="10" cy="23" r="2.8" fill="#f0a13a"/></svg>',
    dots: '<svg width="58" height="24" viewBox="0 0 60 24" class="decal-dots" style="right:-2%;top:2%"><circle cx="10" cy="12" r="4" fill="#f6efe3"/><circle cx="30" cy="12" r="4" fill="#f6efe3"/><circle cx="50" cy="12" r="4" fill="#f6efe3"/></svg>',
    blush: '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="opacity:.6"><defs><radialGradient id="bg1"><stop offset="0" stop-color="#ff8fa8" stop-opacity=".9"/><stop offset="1" stop-color="#ff8fa8" stop-opacity="0"/></radialGradient></defs><ellipse cx="31" cy="54" rx="11" ry="7" fill="url(#bg1)"/><ellipse cx="69" cy="54" rx="11" ry="7" fill="url(#bg1)"/></svg>',
    spark: '<svg width="70" height="70" viewBox="0 0 24 24" class="decal-heart" style="left:-8%;top:10%"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="#ffe08a"/></svg>',
    anger: '<svg width="44" height="44" viewBox="0 0 24 24" class="decal-shake" style="right:-6%;top:0"><path d="M9 4c1.6 1.1 2.4 2.4 2.4 4.1M15 4c-1.6 1.1-2.4 2.4-2.4 4.1M4 9c1.4 1.4 3 2 4.8 2M20 9c-1.4 1.4-3 2-4.8 2" stroke="#e05a5a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    star: '<svg width="54" height="54" viewBox="0 0 24 24" class="decal-heart" style="right:-8%;top:8%"><circle cx="12" cy="12" r="9" fill="#ffe9a8" opacity=".9"/><path d="M12 6l1.6 4.4L18 12l-4.4 1.6L12 18l-1.6-4.4L6 12l4.4-1.6z" fill="#e08b2f"/></svg>',
  };

  const S = {
    flat: [], labels: {}, i: 0, love: 0, flags: {},
    himOn: false, pose: 'smile', bg: null, mood: null, place: '',
    typing: false, timer: null, typeTimer: null, auto: false, skip: false,
    history: [], chapter: { no: '', title: '' }, started: false, cgOpen: false, busy: false,
    choicesOpen: false,
  };

  let meta = { endings: [], gallery: [], chars: [], cleared: 0, youName: '你', himName: '王子豪' };
  let settings = { speed: 65, auto: 1600, bgm: 55, sfx: 60, weather: 100, font: 100 };
  let saves = {};

  /* ---------------- 存储 ---------------- */
  function loadStore() {
    try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(LS_META) || '{}')); } catch (e) {}
    try { settings = Object.assign(settings, JSON.parse(localStorage.getItem(LS_SET) || '{}')); } catch (e) {}
    try { saves = JSON.parse(localStorage.getItem(LS_SAVE) || '{}'); } catch (e) {}
    if (window.STORY) { STORY.youName = meta.youName || '你'; STORY.himName = meta.himName || '王子豪'; }
  }
  const saveMeta = () => { try { localStorage.setItem(LS_META, JSON.stringify(meta)); } catch (e) {} };
  const saveSettings = () => { try { localStorage.setItem(LS_SET, JSON.stringify(settings)); } catch (e) {} };
  const saveSaves = () => { try { localStorage.setItem(LS_SAVE, JSON.stringify(saves)); } catch (e) {} };

  /* ---------------- 天气 ---------------- */
  const weather = {
    type: null, items: [], canvas: null, ctx: null, raf: 0, enabled: true,
    init(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.resize(); window.addEventListener('resize', () => this.resize()); },
    resize() {
      if (!this.canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = this.canvas.clientWidth * dpr; this.canvas.height = this.canvas.clientHeight * dpr;
      if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.spawn();
    },
    set(type) { this.type = type; this.spawn(); },
    spawn() {
      if (!this.canvas) return;
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      const n = this.type === 'rain' ? Math.min(230, Math.round(w / 5))
        : this.type === 'snow' ? Math.min(170, Math.round(w / 9))
        : this.type === 'petal' ? Math.min(80, Math.round(w / 16)) : this.type === 'fire' ? 46 : 0;
      this.items = Array.from({ length: n }, () => this.mk(w, h, true));
      if (!this.raf) this.loop();
    },
    mk(w, h, init) {
      const t = this.type;
      if (t === 'rain') return { x: Math.random() * w, y: init ? Math.random() * h : -20, v: 12 + Math.random() * 10, l: 12 + Math.random() * 22, o: .18 + Math.random() * .32 };
      if (t === 'snow') return { x: Math.random() * w, y: init ? Math.random() * h : -10, v: .4 + Math.random() * 1.1, r: 1 + Math.random() * 2.4, p: Math.random() * 6.28, o: .3 + Math.random() * .5 };
      if (t === 'petal') return { x: Math.random() * w, y: init ? Math.random() * h : -10, v: .7 + Math.random() * 1.2, r: 3 + Math.random() * 4, p: Math.random() * 6.28, s: Math.random() * .04 + .01, o: .4 + Math.random() * .4 };
      return { x: Math.random() * w, y: Math.random() * h, v: .2 + Math.random() * .5, r: 1 + Math.random() * 2.4, p: Math.random() * 6.28, o: .2 + Math.random() * .5 };
    },
    loop() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      const step = () => {
        const c = this.ctx;
        if (!c) return;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        c.clearRect(0, 0, w, h);
        if (this.type && weather.enabled) {
          const t = this.type;
          for (const it of this.items) {
            if (t === 'rain') {
              c.strokeStyle = `rgba(190,215,235,${it.o})`; c.lineWidth = 1.1;
              c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(it.x - it.l * .22, it.y + it.l); c.stroke();
              it.y += it.v; it.x -= it.v * .22;
              if (it.y > h + 24) { it.y = -30; it.x = Math.random() * w; }
            } else if (t === 'snow') {
              it.p += .01; it.y += it.v; it.x += Math.sin(it.p) * .5;
              c.fillStyle = `rgba(255,255,255,${it.o})`;
              c.beginPath(); c.arc(it.x, it.y, it.r, 0, 6.283); c.fill();
              if (it.y > h + 12) { it.y = -12; it.x = Math.random() * w; }
            } else if (t === 'petal') {
              it.p += it.s; it.y += it.v; it.x += Math.sin(it.p) * 1.1;
              c.save(); c.translate(it.x, it.y); c.rotate(it.p);
              c.fillStyle = `rgba(246,196,206,${it.o})`;
              c.beginPath(); c.ellipse(0, 0, it.r, it.r * .55, 0, 0, 6.283); c.fill(); c.restore();
              if (it.y > h + 14) { it.y = -14; it.x = Math.random() * w; }
            } else if (t === 'fire') {
              it.p += .02; it.y -= it.v; it.x += Math.sin(it.p) * .4;
              c.fillStyle = `rgba(255,214,120,${it.o * (.6 + .4 * Math.sin(it.p * 2))})`;
              c.beginPath(); c.arc(it.x, it.y, it.r, 0, 6.283); c.fill();
              if (it.y < -10) { it.y = h + 10; it.x = Math.random() * w; }
            }
          }
        }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
  };

  /* ---------------- 背景 ---------------- */
  const bgState = { cur: 0 };
  function setBg(name) {
    if (!name || S.bg === name) return;
    const a = $('#bg-a'), b = $('#bg-b');
    const front = bgState.cur === 0 ? b : a;
    const back = bgState.cur === 0 ? a : b;
    const url = `assets/bg/${name}.webp`;
    const img = new Image();
    img.onload = () => {
      front.style.backgroundImage = `url("${url}")`;
      front.classList.add('kb');
      front.style.opacity = '0';
      void front.offsetWidth;
      front.style.opacity = '1';
      back.style.opacity = '0';
      bgState.cur = 1 - bgState.cur;
      S.bg = name;
    };
    img.onerror = () => { S.bg = name; };
    img.src = url;
  }

  /* ---------------- 立绘 ---------------- */
  function setHim(pose, decal, hide, zoom) {
    const h = $('#him');
    if (hide) { h.classList.remove('on'); S.himOn = false; return; }
    h.classList.add('on'); S.himOn = true;
    if (pose) h.classList.toggle('zoom', pose === 'face' || !!zoom);
    const p = pose || S.pose;
    if (p && HIM[p]) {
      const img = $('#him-img');
      if (p !== S.pose || !img.src) {
        img.classList.add('swap');
        const nImg = new Image();
        nImg.onload = () => { img.src = HIM[p]; setTimeout(() => img.classList.remove('swap'), 30); };
        nImg.onerror = () => img.classList.remove('swap');
        nImg.src = HIM[p];
        S.pose = p;
      }
    }
    const dq = $('#him-decal');
    if (decal === 'none') dq.innerHTML = '';
    else if (decal && DECALS[decal]) dq.innerHTML = DECALS[decal];
  }
  function setSpeaker(id) { $('#him').classList.toggle('speaking', id === 'him'); }

  /* ---------------- 文本 ---------------- */
  function fmt(txt) {
    return String(txt).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[\[(.+?)\]\]/g, '<span class="em">$1</span>').replace(/\n/g, '<br>');
  }
  function typeOut(el, text, done) {
    clearTimeout(S.typeTimer);
    const speed = Math.max(0, 100 - settings.speed);
    const per = S.skip ? 0 : 4 + speed * 1.5;
    if (per <= 4) { el.innerHTML = fmt(text); S.typing = false; done && done(); return; }
    let i = 0; S.typing = true;
    const step = () => {
      if (!S.typing) return;
      if (i >= text.length) { S.typing = false; el.innerHTML = fmt(text); done && done(); return; }
      i = Math.min(text.length, i + 1);
      el.innerHTML = fmt(text.slice(0, i)) + '<span style="opacity:.3">|</span>';
      S.typeTimer = setTimeout(step, per * (text[i - 1] === '\n' ? 4 : 1));
    };
    step();
  }
  function finishTyping() {
    if (!S.typing) return false;
    S.typing = false; clearTimeout(S.typeTimer);
    const last = S.history[S.history.length - 1];
    $('#dlg-text').innerHTML = fmt(last ? last.text : '');
    $('#dlg-next').classList.add('on');
    return true;
  }

  /* ---------------- 剧情 ---------------- */
  function indexStory(story) {
    const flat = [], labels = {};
    (story.chapters || []).forEach(ch => {
      flat.push({ k: 'chapter', data: ch });
      (ch.nodes || []).forEach(n => {
        if (n.label) labels[n.label] = flat.length;
        flat.push(n);
      });
    });
    S.flat = flat; S.labels = labels;
  }

  function evalCond(expr) {
    try {
      const fn = new Function('love', 'flags', 'aff', `return (${expr});`);
      return fn(S.love, S.flags, { love: S.love });
    } catch (e) { return true; }
  }

  function run(i) {
    S.i = Math.max(0, Math.min(S.flat.length - 1, i));
    const n = S.flat[S.i];
    if (!n) return;
    if (n.bg) setBg(n.bg);
    if (n.place) { S.place = n.place; $('#place-chip').textContent = n.place; }
    if (n.mood && window.Music) { Music.play(n.mood); S.mood = n.mood; }
    if (n.weather !== undefined) weather.set(n.weather);
    if (n.sfx && window.Sfx && Sfx[n.sfx]) Sfx[n.sfx]();
    if (n.h) setHim(n.h, n.decal);
    else if (n.decal) setHim(null, n.decal);
    if (n.hh) setHim(null, null, true);
    if (n.shake) shake();
    if (n.dim !== undefined) $('#stage').classList.toggle('dim', !!n.dim);
    if (n.k === 'chapter') { showChapter(n.data, i); return; }
    if (n.if !== undefined && !evalCond(n.if)) {
      run(n.else && S.labels[n.else] !== undefined ? S.labels[n.else] : i + 1);
      return;
    }
    if (n.go) { run(S.labels[n.go] !== undefined ? S.labels[n.go] : i + 1); return; }
    if (n.set) Object.assign(S.flags, n.set);
    if (n.love) addLove(n.love);
    if (n.c) { showChoices(n); return; }
    if (n.cg) { showCG(n); return; }
    if (n.end) { doEnding(n.end); return; }
    if (n.wait) { S.busy = true; setTimeout(() => { S.busy = false; advance(); }, n.wait); return; }
    if (n.t !== undefined || n.n !== undefined || n.w !== undefined) { speak(n); return; }
    run(i + 1);
  }

  function speak(n) {
    const who = n.w;
    const isNar = !who;
    const text = n.t !== undefined ? n.t : n.n;
    let name = '';
    if (who === 'him') name = STORY.himName;
    else if (who === 'you') name = STORY.youName;
    else if (who && STORY.chars[who]) name = STORY.chars[who].name;

    const nameEl = $('#dlg-name');
    if (isNar) { nameEl.classList.remove('on'); nameEl.textContent = ''; }
    else {
      nameEl.textContent = name; nameEl.classList.add('on');
      nameEl.style.background = who === 'you'
        ? 'linear-gradient(180deg,#4a7bbd,#2c5488)'
        : (STORY.chars[who] ? STORY.chars[who].color : '#b4432f');
    }
    setSpeaker(who === 'him' ? 'him' : null);
    if (who && who !== 'you' && meta.chars.indexOf(who) < 0) { meta.chars.push(who); saveMeta(); }

    $('#dialogue').classList.add('on');
    $('#dlg-next').classList.remove('on');
    const body = $('#dlg-text');
    body.classList.toggle('nar', isNar);
    S.history.push({ name, text, who });
    if (S.history.length > 500) S.history.shift();
    typeOut(body, text, () => {
      $('#dlg-next').classList.add('on');
      if (S.auto && !S.busy && !S.choicesOpen) {
        clearTimeout(S.timer);
        S.timer = setTimeout(() => { if (S.auto && !S.choicesOpen) advance(); }, settings.auto + text.length * 12);
      }
      if (S.skip && !S.choicesOpen) {
        clearTimeout(S.timer);
        S.timer = setTimeout(() => { if (S.skip) advance(); }, 40);
      }
    });
  }

  function advance() {
    if (S.choicesOpen || S.cgOpen || S.busy) return;
    if (finishTyping()) return;
    if (window.Sfx) Sfx.click();
    run(S.i + 1);
  }

  function shake() {
    $('#stage').animate(
      [{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,4px)' }, { transform: 'translate(7px,-5px)' }, { transform: 'translate(0,0)' }],
      { duration: 320, easing: 'ease-in-out' });
  }

  function showChapter(ch, i) {
    $('#cc-no').textContent = ch.no || '';
    $('#cc-title').textContent = ch.title || '';
    $('#cc-sub').textContent = ch.sub || '';
    $('#chapter-chip').textContent = `${ch.no || ''} · ${ch.title || ''}`;
    S.chapter = { no: ch.no, title: ch.title };
    const card = $('#chapter-card');
    card.classList.add('on');
    if (window.Sfx) Sfx.bell();
    setTimeout(() => { card.classList.remove('on'); run(i + 1); }, 1900);
  }

  function showChoices(n) {
    S.choicesOpen = true;
    const box = $('#choices');
    box.innerHTML = '';
    if (typeof n.c === 'string') {
      const p = document.createElement('div'); p.className = 'prompt'; p.innerHTML = fmt(n.c); box.appendChild(p);
    }
    n.o.forEach((opt, k) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="cnum">${k + 1}</span>${fmt(opt.t)}${opt.h ? `<small>${fmt(opt.h)}</small>` : ''}`;
      b.onclick = (ev) => {
        ev.stopPropagation();
        if (window.Sfx) Sfx.page();
        box.classList.remove('on');
        S.choicesOpen = false;
        S.history.push({ name: '选择', text: '→ ' + opt.t.replace(/\[\[|\]\]/g, ''), who: 'you' });
        if (opt.l) addLove(opt.l);
        if (opt.set) Object.assign(S.flags, opt.set);
        if (opt.go && S.labels[opt.go] !== undefined) run(S.labels[opt.go]);
        else run(S.i + 1);
      };
      box.appendChild(b);
    });
    box.classList.add('on');
  }

  function addLove(v) {
    S.love = Math.max(0, Math.min(120, S.love + v));
    const chip = $('#love-chip');
    $('#love-num').textContent = S.love;
    chip.classList.add('pop'); setTimeout(() => chip.classList.remove('pop'), 260);
    const t = $('#aff-toast');
    t.textContent = `心动 ${v > 0 ? '+' : ''}${v}`;
    t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1400);
    if (window.Sfx) Sfx.heart();
  }

  function showCG(n) {
    const v = $('#cg-view');
    $('#cg-img').src = n.cg;
    $('#cg-cap').textContent = n.cap || '';
    v.classList.add('on'); S.cgOpen = true;
    unlockGallery(n.gal || n.cg);
    if (window.Sfx) Sfx.whoosh();
    const close = () => { v.classList.remove('on'); S.cgOpen = false; v.onclick = null; run(S.i + 1); };
    v.onclick = close;
    const old = v.querySelector('.cg-close'); if (old) old.remove();
    const btn = document.createElement('button');
    btn.className = 'cg-close'; btn.textContent = '×';
    btn.onclick = (e) => { e.stopPropagation(); close(); };
    v.querySelector('.cg-paper').appendChild(btn);
  }

  function unlockGallery(key) {
    if (!key) return;
    if (meta.gallery.indexOf(key) < 0) { meta.gallery.push(key); saveMeta(); }
  }

  function doEnding(id) {
    const e = (STORY.endings || {})[id] || { title: id, text: '' };
    if (meta.endings.indexOf(id) < 0) meta.endings.push(id);
    meta.cleared = (meta.cleared || 0) + 1; saveMeta();
    try { localStorage.removeItem(LS_AUTO); } catch (e) {}
    if (window.Music) Music.play(e.mood || 'ending');
    $('#end-title').textContent = e.title;
    $('#end-text').innerHTML = fmt(e.text || '');
    $('#end-kicker').textContent = e.kicker || 'ENDING';
    $('#end-stats').innerHTML = `心动值 ${S.love} &nbsp;|&nbsp; 已解锁结局 ${meta.endings.length}/${Object.keys(STORY.endings).length}`
      + (e.tag ? ` &nbsp;|&nbsp; ${e.tag}` : '');
    $('#end-bg').style.backgroundImage = `url("assets/bg/${e.bg || "gate"}.webp")`;
    weather.set(null);
    showScreen('ending');
  }

  function showScreen(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }

  /* ---------------- 存读档 ---------------- */
  function snapshot() {
    return {
      i: S.i, love: S.love, flags: Object.assign({}, S.flags), pose: S.pose, bg: S.bg,
      mood: S.mood, place: S.place, chapter: S.chapter, history: S.history.slice(-40), t: Date.now(),
      preview: { title: S.chapter.title || '', text: (S.history[S.history.length - 1] || {}).text || '' }
    };
  }
  function restore(s) {
    S.started = true;
    S.love = s.love || 0; S.flags = Object.assign({}, s.flags || {});
    S.history = (s.history || []).slice(); S.pose = s.pose || 'smile'; S.bg = null;
    $('#love-num').textContent = S.love;
    setHim('smile', 'none');
    showScreen('game');
    if (s.mood && window.Music) Music.play(s.mood);
    if (s.bg) setBg(s.bg);
    $('#chapter-chip').textContent = (s.chapter.no || '') + ' · ' + (s.chapter.title || '');
    $('#place-chip').textContent = s.place || '';
    if (s.pose) setHim(s.pose, 'none');
    run(s.i);
  }

  /* ---------------- 标题 / 面板 ---------------- */
  function initTitle() {
    const bgs = ['campus_aerial', 'path', 'library_steps'];
    const layers = [$('#tbA'), $('#tbB'), $('#tbC')];
    layers.forEach((l, i) => { l.style.backgroundImage = `url("assets/bg/${bgs[i]}.webp")`; });
    let k = 0; layers[0].classList.add('on');
    setInterval(() => { layers[k % 3].classList.remove('on'); k++; layers[k % 3].classList.add('on'); }, 6400);

    const c = $('#title-snow');
    if (!c) return;
    const ctx = c.getContext('2d');
    let pts = [];
    const rs = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: 70 }, () => ({ x: Math.random() * c.clientWidth, y: Math.random() * c.clientHeight, r: .6 + Math.random() * 2, v: .25 + Math.random() * .8, p: Math.random() * 6.28 }));
    };
    rs(); window.addEventListener('resize', rs);
    const tick = () => {
      if (document.getElementById('title').classList.contains('active')) {
        ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
        pts.forEach(p => {
          p.y += p.v; p.p += .01; p.x += Math.sin(p.p) * .35;
          if (p.y > c.clientHeight) { p.y = -6; p.x = Math.random() * c.clientWidth; }
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        });
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  function openPanel(name) {
    const ov = $('#overlay');
    ov.classList.add('on');
    $$('.panel', ov).forEach(p => p.classList.toggle('on', p.id === 'panel-' + name));
    if (name === 'log') renderLog();
    if (name === 'save') renderSaves();
    if (name === 'gallery') renderGallery('cg');
    if (name === 'chars') renderChars();
    if (name === 'settings') syncSettings();
  }
  function closeOverlay() { $('#overlay').classList.remove('on'); }

  function renderLog() {
    const box = $('#log-list');
    box.innerHTML = S.history.map(h =>
      `<div class="log-row ${h.name ? '' : 'nar'}"><span class="ln">${h.name || ''}</span><span class="lt">${fmt(h.text)}</span></div>`
    ).join('') || '<p style="color:#7b6a5c">还没有记录。</p>';
    box.scrollTop = box.scrollHeight;
  }

  function renderSaves() {
    const box = $('#save-grid');
    box.innerHTML = ['1', '2', '3', '4'].map(k => {
      const s = saves[k]; const d = s ? new Date(s.t) : null;
      return `<div class="save-slot ${s ? '' : 'empty'}">
        <div><div class="ss-t">存档 ${k} ${s ? '· ' + (s.preview.title || '') : '· 空'}</div>
        <div class="ss-d">${s ? d.toLocaleString('zh-CN') : '—'}</div></div>
        <div class="ss-b"><button data-save="${k}">保存</button>
        <button class="ghost" data-load="${k}" ${s ? '' : 'disabled'}>读取</button></div></div>`;
    }).join('');
    box.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
      saves[b.dataset.save] = snapshot(); saveSaves(); renderSaves(); toast('已保存到存档 ' + b.dataset.save);
    });
    box.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
      const s = saves[b.dataset.load]; if (!s) return;
      closeOverlay(); restore(s); toast('读取成功');
    });
  }

  function renderGallery(tab) {
    $$('#gal-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const list = (STORY.gallery || {})[tab] || [];
    const box = $('#gallery-grid');
    box.innerHTML = list.map(g => {
      const un = g.free || meta.gallery.indexOf(g.key) >= 0;
      return `<div class="g-item ${un ? '' : 'locked'}" data-img="${g.img}" data-cap="${(g.cap || '').replace(/"/g, '&quot;')}">
        <img src="${g.img}" alt="${g.cap || ''}" loading="lazy"><span>${g.cap || ''}</span></div>`;
    }).join('');
    box.querySelectorAll('.g-item').forEach(el => el.onclick = () => {
      if (el.classList.contains('locked')) { toast('还没解锁这张。'); return; }
      $('#cgbig-img').src = el.dataset.img;
      $('#cgbig-cap').textContent = el.dataset.cap;
      $$('.panel', $('#overlay')).forEach(p => p.classList.toggle('on', p.id === 'panel-cgview'));
    });
  }

  function renderChars() {
    const box = $('#chars-grid');
    const v = Math.max(0, Math.min(100, Math.round(S.love)));
    let html = `<div class="ch-card"><img src="assets/hero/p2_face.webp" alt="${STORY.himName}" style="object-position:center top">
      <div class="ch-in"><h4>${STORY.himName}</h4><div class="ch-role">会计学院 · 2024级 · 会计2412</div>
      <div class="ch-desc">${esc(STORY.himDesc || '')}</div>
      <div class="aff-bar"><i style="width:${v}%"></i></div></div></div>`;
    html += `<div class="ch-card"><img src="assets/ui/you.webp" alt="${STORY.youName}" style="object-position:center">
      <div class="ch-in"><h4>${esc(STORY.youName)}</h4><div class="ch-role">会计2412 · 玩家</div>
      <div class="ch-desc">${esc(STORY.youDesc || '')}</div></div></div>`;
    const others = Object.keys(STORY.chars || {}).filter(k => k !== 'him');
    html += others.map(k => {
      const c = STORY.chars[k];
      const seen = meta.chars.indexOf(k) >= 0;
      return `<div class="ch-card"><img src="${c.face || 'assets/ui/you.webp'}" alt="${c.name}" style="object-position:center top">
        <div class="ch-in"><h4>${c.name}</h4><div class="ch-role">${c.role}</div>
        <div class="ch-desc">${seen ? esc(c.desc) : '还没说过话。'}</div></div></div>`;
    }).join('');
    box.innerHTML = html;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function syncSettings() {
    const m = {
      'set-speed': ['speed', v => v], 'set-auto': ['auto', v => (v / 1000).toFixed(1) + 's'],
      'set-bgm': ['bgm', v => v], 'set-sfx': ['sfx', v => v], 'set-weather': ['weather', v => v],
      'set-font': ['font', v => v + '%']
    };
    Object.keys(m).forEach(id => {
      const el = $('#' + id); if (!el) return;
      el.value = settings[m[id][0]];
      $('#' + id + '-v').textContent = m[id][1](el.value);
      el.oninput = () => {
        settings[m[id][0]] = Number(el.value);
        $('#' + id + '-v').textContent = m[id][1](el.value);
        applySettings(); saveSettings();
      };
    });
  }
  function applySettings() {
    if (window.Music) { Music.setBgm(settings.bgm / 100); Music.setSfx(settings.sfx / 100); }
    weather.enabled = settings.weather > 0;
    const base = 24 * settings.font / 100;
    document.documentElement.style.setProperty('--dlg', `clamp(15px, 1.55vmin + 9px, ${base.toFixed(1)}px)`);
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1700);
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    loadStore();
    indexStory(window.STORY);
    weather.init($('#fx'));
    applySettings();
    initTitle();
    $('#him-name').textContent = STORY.himName;

    $('#btn-start').onclick = () => {
      if (window.Music) { Music.unlock(); Music.play('daily'); }
      $('#in-you').value = STORY.youName === '你' ? '' : STORY.youName;
      $('#in-him').value = STORY.himName || '王子豪';
      showScreen('naming');
    };
    $('#btn-name-ok').onclick = () => {
      const you = ($('#in-you').value || '').trim() || '你';
      const him = ($('#in-him').value || '').trim() || '王子豪';
      STORY.youName = you; STORY.himName = him;
      meta.youName = you; meta.himName = him; saveMeta();
      $('#him-name').textContent = him;
      startNew();
    };
    $('#in-him').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-name-ok').click(); });
    $('#in-you').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-name-ok').click(); });

    $('#btn-continue').onclick = () => {
      const auto = JSON.parse(localStorage.getItem(LS_AUTO) || 'null');
      let target = auto;
      if (!target) {
        const ks = Object.keys(saves);
        if (ks.length) target = saves[ks.sort((a, b) => saves[b].t - saves[a].t)[0]];
      }
      if (!target) { toast('还没有存档，先开始新的学期吧。'); return; }
      if (window.Music) Music.unlock();
      showScreen('game'); restore(target);
    };
    $('#btn-gallery').onclick = () => openPanel('gallery');
    $('#btn-chars').onclick = () => openPanel('chars');
    $('#btn-settings').onclick = () => openPanel('settings');

    $('#hud-log').onclick = () => openPanel('log');
    $('#hud-auto').onclick = toggleAuto;
    $('#hud-skip').onclick = toggleSkip;
    $('#hud-save').onclick = () => openPanel('save');
    $('#hud-menu').onclick = () => openPanel('menu');
    $('#tool-auto').onclick = toggleAuto;
    $('#tool-log').onclick = () => openPanel('log');
    $('#tool-skip').onclick = toggleSkip;

    function toggleAuto() {
      S.auto = !S.auto;
      $('#hud-auto').classList.toggle('on', S.auto);
      $('#tool-auto').classList.toggle('on', S.auto);
      if (S.auto) { S.skip = false; $('#hud-skip').classList.remove('on'); advance(); }
      else clearTimeout(S.timer);
    }
    function toggleSkip() {
      S.skip = !S.skip;
      $('#hud-skip').classList.toggle('on', S.skip);
      $('#tool-skip').classList.toggle('on', S.skip);
      if (S.skip) { S.auto = false; $('#hud-auto').classList.remove('on'); advance(); }
      else clearTimeout(S.timer);
    }

    $$('.close-btn').forEach(b => b.onclick = closeOverlay);
    $('#overlay').addEventListener('click', e => { if (e.target === $('#overlay')) closeOverlay(); });
    $$('.mbtn[data-open]').forEach(b => b.onclick = () => {
      const k = b.dataset.open;
      if (k === 'title') { closeOverlay(); if (window.Music) Music.play('daily'); showScreen('title'); return; }
      openPanel(k);
    });
    $$('#gal-tabs .tab').forEach(t => t.onclick = () => renderGallery(t.dataset.tab));
    $('#btn-fullscreen').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    };
    $('#end-title-btn').onclick = () => { showScreen('title'); if (window.Music) Music.play('daily'); };
    $('#end-gallery-btn').onclick = () => openPanel('gallery');

    $('#dialogue').onclick = (e) => { if (e.target.closest('.mini')) return; advance(); };
    $('#stage').addEventListener('click', (e) => {
      if (e.target.closest('.hud') || e.target.closest('.dialogue') || e.target.closest('.choices') ||
        e.target.closest('.cg-view') || e.target.closest('.love-chip')) return;
      if ($('#game').classList.contains('active')) advance();
    });
    document.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if ($('#overlay').classList.contains('on') || $('#naming').classList.contains('active')) return;
        advance();
      }
      if (e.key === 'Escape') closeOverlay();
      if (/^[1-4]$/.test(e.key) && S.choicesOpen) {
        const b = $$('#choices .choice')[Number(e.key) - 1]; if (b) b.click();
      }
      if (e.key.toLowerCase() === 'h') openPanel('log');
    });
    setInterval(() => {
      if (!S.started) return;
      try { localStorage.setItem(LS_AUTO, JSON.stringify(snapshot())); } catch (e) {}
    }, 8000);

    const unlock = () => { if (window.Music) Music.unlock(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);

    window.__G = { S, run, restore, meta, settings, weather, STORY };
  }

  function startNew() {
    S.love = 0; S.flags = {}; S.history = []; S.pose = 'smile'; S.started = true;
    S.bg = null; S.mood = null; S.i = 0;
    $('#love-num').textContent = '0';
    setHim('smile', 'none');
    showScreen('game');
    if (window.Music) Music.play('daily');
    run(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
