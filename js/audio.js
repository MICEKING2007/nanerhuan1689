/* ================= 音频：程序化 BGM + 音效 =================
   不依赖任何音频文件，纯 WebAudio 合成，离线可用、无版权问题。
   moods: daily | romantic | tense | night | ending | sad
   ========================================================= */
(function () {
  const A = {
    ctx: null, master: null, bgmGain: null, sfxGain: null, verb: null,
    mood: null, timer: null, step: 0, nextTime: 0,
    bgmVol: 0.55, sfxVol: 0.6, started: false,
  };

  const MOODS = {
    // 和弦进行（MIDI 音高），每小节一个和弦
    daily:    { bpm: 84, prog: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], wave: 'triangle', mel: [72, 74, 76, 79, 76, 74], density: .8 },
    romantic: { bpm: 72, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64]], wave: 'sine', mel: [67, 69, 72, 76, 74, 72], density: .68 },
    night:    { bpm: 64, prog: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 55]], wave: 'sine', mel: [72, 74, 71, 67, 69, 64], density: .5 },
    tense:    { bpm: 96, prog: [[50, 53, 57, 62], [50, 53, 58, 62], [48, 52, 55, 60], [47, 50, 55, 59]], wave: 'square', mel: [62, 63, 62, 59], density: 1.0 },
    ending:   { bpm: 76, prog: [[53, 57, 60, 65], [55, 59, 62, 67], [57, 60, 64, 69], [52, 55, 59, 64]], wave: 'sine', mel: [65, 69, 72, 77, 76, 72], density: .78 },
    sad:      { bpm: 60, prog: [[45, 48, 52, 57], [43, 46, 50, 55], [41, 44, 48, 53], [40, 43, 47, 52]], wave: 'sine', mel: [64, 62, 60, 57], density: .45 },
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function impulse(seconds, decay) {
    const ctx = A.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const n = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        d[i] = n * (1 - Math.floor(i / 900) / 40);
      }
    }
    return buf;
  }

  function init() {
    if (A.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    A.ctx = new Ctx();
    A.master = A.ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(A.ctx.destination);
    A.verb = A.ctx.createConvolver(); A.verb.buffer = impulse(2.6, 2.4);
    const vg = A.ctx.createGain(); vg.gain.value = 0.34; A.verb.connect(vg); vg.connect(A.master);
    A.bgmGain = A.ctx.createGain(); A.bgmGain.gain.value = A.bgmVol * 0.5;
    A.bgmGain.connect(A.master); A.bgmGain.connect(A.verb);
    A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = A.sfxVol;
    A.sfxGain.connect(A.master); A.sfxGain.connect(A.verb);
  }

  function tone(freq, t, dur, vol, type, dest, detune) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), f = A.ctx.createBiquadFilter();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    f.type = 'lowpass'; f.frequency.value = Math.min(5200, freq * 7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.16, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest || A.bgmGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noiseBurst(t, dur, vol, freq, q) {
    const len = Math.floor(A.ctx.sampleRate * dur);
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = A.ctx.createBufferSource(); src.buffer = buf;
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1600; f.Q.value = q || 0.9;
    const g = A.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(A.sfxGain);
    src.start(t);
  }

  function scheduleBar(mood, bar, t0) {
    const M = MOODS[mood] || MOODS.daily;
    const chord = M.prog[bar % M.prog.length];
    const beat = 60 / M.bpm;
    // pad
    chord.forEach((n, i) => {
      tone(mtof(n - 12), t0, beat * 3.6, 0.10, M.wave, A.bgmGain, (i - 1.5) * 4);
    });
    // 低音
    tone(mtof(chord[0] - 24), t0, beat * 2.2, 0.16, 'sine', A.bgmGain);
    // 分解和弦（八分音符）
    const pattern = [0, 2, 1, 3, 2, 1, 3, 0];
    for (let s = 0; s < 8; s++) {
      if (Math.random() > M.density) continue;
      const n = chord[pattern[s] % chord.length] + (s >= 4 ? 12 : 0);
      tone(mtof(n), t0 + s * beat * 0.5, beat * 0.9, 0.055, 'triangle', A.bgmGain);
    }
    // 旋律（每两小节）
    if (bar % 2 === 0) {
      const m = M.mel[(bar / 2 + Math.floor(Math.random() * 2)) % M.mel.length];
      tone(mtof(m), t0 + beat * 0.5, beat * 1.6, 0.07, 'sine', A.bgmGain);
      tone(mtof(m + 7), t0 + beat * 1.75, beat * 1.2, 0.045, 'sine', A.bgmGain);
    }
  }

  function tick() {
    if (!A.ctx || !A.mood) return;
    const M = MOODS[A.mood];
    const beat = 60 / M.bpm, barDur = beat * 4;
    while (A.nextTime < A.ctx.currentTime + 0.7) {
      scheduleBar(A.mood, A.step, A.nextTime);
      A.step++;
      A.nextTime += barDur;
    }
  }

  const Music = {
    unlock() { init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); },
    play(mood) {
      init(); if (!A.ctx) return;
      if (A.mood === mood) return;
      A.mood = mood; A.step = 0; A.nextTime = A.ctx.currentTime + 0.08;
      if (!A.timer) A.timer = setInterval(tick, 120);
      tick();
    },
    stop() { A.mood = null; if (A.timer) { clearInterval(A.timer); A.timer = null; } },
    setBgm(v) { A.bgmVol = v; if (A.bgmGain) A.bgmGain.gain.value = v * 0.5; },
    setSfx(v) { A.sfxVol = v; if (A.sfxGain) A.sfxGain.gain.value = v; },
    duck(on) { if (A.bgmGain) A.bgmGain.gain.value = (on ? 0.14 : A.bgmVol * 0.5); },
  };

  const Sfx = {
    click() { init(); if (!A.ctx) return; tone(1180, A.ctx.currentTime, 0.07, 0.10, 'triangle', A.sfxGain); },
    page() { init(); if (!A.ctx) return; noiseBurst(A.ctx.currentTime, 0.20, 0.20, 2400, 0.7); },
    heart() { init(); if (!A.ctx) return; const t = A.ctx.currentTime; tone(880, t, 0.16, 0.12, 'sine', A.sfxGain); tone(1320, t + 0.11, 0.22, 0.10, 'sine', A.sfxGain); },
    whoosh() { init(); if (!A.ctx) return; noiseBurst(A.ctx.currentTime, 0.34, 0.16, 900, 0.6); },
    bell() { init(); if (!A.ctx) return; const t = A.ctx.currentTime; [1046, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.04, 1.4, 0.07, 'sine', A.sfxGain)); },
    thud() { init(); if (!A.ctx) return; const t = A.ctx.currentTime; tone(90, t, 0.24, 0.22, 'sine', A.sfxGain); noiseBurst(t, 0.12, 0.12, 320, 0.6); },
    rain() { init(); if (!A.ctx) return; noiseBurst(A.ctx.currentTime, 1.6, 0.10, 3400, 0.4); },
    chirp() { init(); if (!A.ctx) return; const t = A.ctx.currentTime; [1800, 2200, 2000].forEach((f, i) => tone(f, t + i * 0.09, 0.1, 0.05, 'sine', A.sfxGain)); },
  };

  window.Music = Music;
  window.Sfx = Sfx;
})();
