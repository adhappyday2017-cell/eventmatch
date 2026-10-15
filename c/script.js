/* EventMatch — главная, вариант C. Без библиотек. */
(() => {
  'use strict';

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ONB = 'https://adhappyday2017-cell.github.io/eventmatch-prototype/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // 4:5 frames: sharp copies by width, heavy blur (soft-to-sharp), light blur (hero focus pull)
  const S = (id, w) => `img/t/f-${id}-${w}.webp`;
  const BL = id => `img/blur/f-${id}.webp`;
  const SOFT = id => `img/blur/f-${id}-s.webp`;
  const AUTHOR = 'Анастасия Агапова';
  const PROF = {
    photo: 'фотограф', video: 'видеограф', reels: 'reels-мейкер', host: 'ведущий', makeup: 'визажист',
    hair: 'стилист по волосам', model: 'модель', organizer: 'организатор', decor: 'декоратор'
  };
  const profOf = id => (id.startsWith('ag-') ? 'photo' : id.replace(/^r-/, '').replace(/2?(-c2?)?(-bw)?$/, ''));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const img = (src, cls, alt = '') => {
    const i = new Image();
    i.decoding = 'async';
    i.alt = alt;
    if (cls) i.className = cls;
    i.src = src;
    return i;
  };

  /* ── shared ticker: runs only while some component is active ─────────── */
  const ticks = new Set();
  let rafId = 0, last = 0;
  const frame = t => {
    const dt = Math.min(64, t - last);
    last = t;
    ticks.forEach(f => f(dt));
    rafId = ticks.size ? requestAnimationFrame(frame) : 0;
  };
  const addTick = f => {
    ticks.add(f);
    if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); }
  };
  const delTick = f => ticks.delete(f);

  /* Autoplay: on only while on screen, tab visible, not hovered and not blocked */
  function autoplay(root, tick, opts = {}) {
    let inView = false, hovered = false, on = false;
    const sync = () => {
      const should = inView && !document.hidden && !hovered && !opts.blocked?.();
      if (should === on) return;
      on = should;
      if (on) { addTick(tick); opts.onStart?.(); } else { delTick(tick); opts.onStop?.(); }
    };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: opts.threshold ?? .2 }).observe(root);
    document.addEventListener('visibilitychange', sync);
    (opts.hoverEls || []).forEach(h => {
      h.addEventListener('pointerenter', () => { hovered = true; sync(); });
      h.addEventListener('pointerleave', () => { hovered = false; sync(); });
    });
    return { sync };
  }

  const once = (target, cb, threshold = .25) => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); cb(); }
    }, { threshold });
    io.observe(target);
  };

  /* Scroll-linked effects (rAF, only while the element is near the viewport) */
  const scrollFx = [];
  let scrollQueued = false;
  const always = [];
  const runScroll = () => {
    scrollQueued = false;
    const vh = innerHeight;
    always.forEach(f => f());
    scrollFx.forEach(fx => { if (fx.near) fx.fn(fx.el.getBoundingClientRect(), vh); });
  };
  const queueScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(runScroll); } };
  const onScroll = (target, fn) => {
    const fx = { el: target, fn, near: false };
    scrollFx.push(fx);
    new IntersectionObserver(([e]) => { fx.near = e.isIntersecting; if (fx.near) queueScroll(); }, { rootMargin: '200px 0px' }).observe(target);
  };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);

  /* ── reveal ────────────────────────────────────────────────────────── */
  if (!RM) {
    const rio = new IntersectionObserver(entries => {
      let i = 0;
      entries.filter(e => e.isIntersecting).forEach(e => {
        const t = e.target;
        if (!t.style.getPropertyValue('--d')) t.style.setProperty('--d', `${i++ * 80}ms`);
        t.classList.add('is-rv');
        rio.unobserve(t);
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    $$('[data-rv]').forEach(n => rio.observe(n));
  }

  /* ── header: pills after the first 40 px, dark glass over dark sections ─ */
  const hdr = $('#hdr');
  const hero = $('#hero');
  {
    let pills = false, timer = 0;
    const nav = $('.hdr__nav');
    const thumb = $('.hdr__thumb');
    const links = $$('a', nav);
    let active = null;
    const placeThumb = () => {
      links.forEach(a => a.classList.toggle('is-on', a === active));
      thumb.classList.toggle('is-on', !!active);
      if (!active) return;
      thumb.style.setProperty('--tx', `${active.offsetLeft}px`);
      thumb.style.setProperty('--tw', `${active.offsetWidth}px`);
    };
    const setPills = v => {
      if (v === pills) return;
      pills = v;
      clearTimeout(timer);
      if (RM) { hdr.classList.toggle('is-pills', v); placeThumb(); return; }
      hdr.classList.add('is-out');
      timer = setTimeout(() => {
        hdr.classList.toggle('is-pills', v);
        placeThumb();
        requestAnimationFrame(() => hdr.classList.remove('is-out'));
      }, 220);
    };
    const darks = $$('[data-dark]');
    const check = () => {
      setPills(scrollY > 40);
      const dark = darks.some(s => { const r = s.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; });
      hdr.classList.toggle('is-dark', dark);
    };
    always.push(check);
    check();

    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const sio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) active = map.get(e.target.id) || null;
        else if (active === map.get(e.target.id)) active = null;
      });
      placeThumb();
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) sio.observe(s); });
    document.fonts?.ready.then(placeThumb);
  }

  /* ── variant badge: on the local preview servers B lives on its own port ── */
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const a = $('[data-variant="a"]'), b = $('[data-variant="b"]');
    if (a) a.href = 'https://adhappyday2017-cell.github.io/eventmatch/';
    if (b) b.href = `${location.protocol}//${location.hostname}:3300/`;
  }

  /* ── nick fields ───────────────────────────────────────────────────── */
  {
    const TR = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
      н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
      ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
    };
    // latin, digits and single separators; no separator at the start (the end is trimmed on output)
    const clean = v => v.toLowerCase().split('').map(c => (c in TR ? TR[c] : c)).join('')
      .replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '').replace(/[._-]{2,}/g, m => m[0])
      .replace(/^[._-]+/, '').slice(0, 30);
    const tidy = c => c.replace(/[._-]+$/, '');
    $$('[data-nick]').forEach(form => {
      const input = $('input', form);
      const out = form.nextElementSibling;
      const b = $('b', out);
      let t = 0;
      input.addEventListener('input', () => {
        const pos = input.selectionStart ?? input.value.length;
        const c = clean(input.value);
        if (c !== input.value) {
          const np = Math.min(c.length, clean(input.value.slice(0, pos)).length);
          input.value = c;
          input.setSelectionRange(np, np);
        }
        clearTimeout(t);
        t = setTimeout(() => {
          const v = tidy(c);
          const has = /[a-z0-9]/.test(v);
          b.textContent = has ? v : '';
          out.classList.toggle('is-on', has);
          out.setAttribute('aria-hidden', String(!has));
        }, 120);
      });
      form.addEventListener('submit', e => {
        e.preventDefault();
        const c = tidy(clean(input.value));
        location.href = `${ONB}${/[a-z0-9]/.test(c) ? `?nick=${encodeURIComponent(c)}` : ''}#onboarding`;
      });
    });
  }

  /* ── 1. hero: contact sheet, the word pulls focus onto its frames ────── */
  {
    const slot = $('#slot');
    const rowT = $('#row-t'), rowB = $('#row-b');
    const pauseBtn = $('#hero-pause');
    // two rows × two film strips × three groups of two frames; top right sits under the header button,
    // so it holds «модель», which is not in the word cycle and comes into focus only on hover
    const ROWS = [
      [[['photo', ['ag-08', 'ag-38']], ['makeup', ['r-makeup', 'r-makeup-c']], ['host', ['r-host', 'r-host-c']]],
        [['photo', ['ag-13', 'ag-03']], ['video', ['r-video', 'r-video-c']], ['model', ['r-model', 'r-model-c']]]],
      [[['reels', ['r-reels', 'r-reels-c']], ['photo', ['ag-61', 'ag-33']], ['decor', ['r-decor', 'r-decor-c']]],
        [['hair', ['r-hair', 'r-hair-c']], ['photo', ['ag-60', 'ag-40']], ['organizer', ['r-organizer', 'r-organizer-c']]]]
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const groups = [], frames = [];
    ROWS.forEach((strips, ri) => {
      const row = ri ? rowB : rowT;
      strips.forEach(gs => {
        const strip = el('div', 'strip');
        gs.forEach(([p, ids]) => {
          const g = el('div', 'grp');
          ids.forEach(id => {
            const f = el('span', 'fr');
            f.append(img(SOFT(id), 'soft'), img(S(id, 280), 'sharp'));
            g.append(f);
            frames.push(f);
          });
          g.append(el('span', 'grp__l', PROF[p]));
          const svg = document.createElementNS(NS, 'svg');
          svg.setAttribute('class', 'grp__mark');
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('pathLength', '1');
          svg.append(path);
          g.append(svg);
          strip.append(g);
          groups.push({ el: g, p, svg, path });
        });
        row.append(strip);
      });
    });

    // frame size: by width (12 frames in a row with 40 px margins) and by height (both rows + text fit)
    const textBox = $('.hero__c');
    const heroPad = $('.hero__pad', hero), heroFoot = $('.hero__foot', hero), spacers = $$('.hero__sp', hero);
    const px = v => parseFloat(v) || 0;
    const mark = g => {
      const w = g.el.offsetWidth + 18, h = g.el.offsetHeight + 18;
      const x0 = 2, y0 = 2, x1 = w - 2, y1 = h - 2, r = 10, f = n => n.toFixed(1);
      g.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      g.path.setAttribute('d', `M${f(x0 + 18)} ${f(y0 + .5)}L${f(x1 - r)} ${y0}Q${x1} ${y0} ${f(x1 + .5)} ${y0 + r}`
        + `L${x1} ${y1 - r}Q${x1} ${y1} ${x1 - r} ${f(y1 + .5)}L${x0 + r} ${y1}Q${x0} ${y1} ${f(x0 - .5)} ${y1 - r}`
        + `L${x0} ${y0 + r + 2}Q${x0} ${y0} ${x0 + r + 2} ${f(y0 - .6)}L${x0 + 40} ${f(y0 - 1.6)}`);
    };
    const size = () => {
      const W = hero.clientWidth, H = hero.clientHeight;
      const byW = (W - 212) / 12;
      // everything that is not a frame, read from the live layout (low screens get tighter spacing in CSS)
      const fixed = heroPad.offsetHeight + px(getComputedStyle(rowT).paddingTop) + px(getComputedStyle(rowB).paddingBottom)
        + 4 * px(getComputedStyle(hero).getPropertyValue('--E')) + spacers.reduce((a, s) => a + px(getComputedStyle(s).minHeight), 0)
        + textBox.offsetHeight + heroFoot.offsetHeight + px(getComputedStyle(heroFoot).marginBottom);
      const byH = (H - fixed) / 2 / 1.25;
      const fw = Math.round(clamp(Math.min(byW, byH), 56, 140));
      hero.style.setProperty('--fw', `${fw}px`);
      hero.style.setProperty('--fh', `${Math.round(fw * 1.25)}px`);
      groups.forEach(mark);
    };
    size();
    addEventListener('resize', size);
    document.fonts?.ready.then(size);

    // words
    const WORDS = [['photo', 'фотограф'], ['makeup', 'визажист'], ['host', 'ведущий'], ['video', 'видеограф'],
      ['hair', 'стилист'], ['decor', 'декоратор'], ['reels', 'reels-мейкер'], ['organizer', 'организатор']];
    const line = $('.slot__line', slot);
    const lpath = $('path', line);
    lpath.setAttribute('pathLength', '1');
    const words = [$('.slot__w', slot)];
    WORDS.slice(1).forEach(([, w]) => { const s = el('span', 'slot__w', w); slot.insertBefore(s, line); words.push(s); });
    let wi = 0;
    const setLine = w => {
      const L = Math.max(20, w.offsetWidth - 4);
      line.style.setProperty('--lw', `${L}px`);
      line.setAttribute('viewBox', `0 0 ${L} 8`);
      lpath.setAttribute('d', `M2 5.5C${(L * .25).toFixed(1)} 3 ${(L * .58).toFixed(1)} 2.6 ${(L - 2).toFixed(1)} 4.2`);
    };
    const draw = () => { line.classList.remove('is-draw'); void line.getBoundingClientRect(); line.classList.add('is-draw'); };
    const sizeSlot = () => {
      slot.style.setProperty('--w', `${Math.max(...words.map(w => w.offsetWidth))}px`);
      setLine(words[wi]);
    };
    const showWord = i => {
      if (i === wi) return;
      const prev = words[wi];
      wi = i;
      prev.classList.remove('is-on');
      prev.classList.add('is-out');
      setTimeout(() => prev.classList.remove('is-out'), 560);
      words[wi].classList.add('is-on');
      setLine(words[wi]);
      draw();
    };
    const focus = p => {
      hero.classList.toggle('is-focus', !!p);
      groups.forEach(g => g.el.classList.toggle('is-on', !!p && g.p === p));
    };

    // hover on a group: its profession in focus, the word follows when there is one
    let hoverP = null;
    groups.forEach(g => {
      g.el.addEventListener('pointerenter', () => {
        hoverP = g.p;
        focus(g.p);
        const k = WORDS.findIndex(([p]) => p === g.p);
        if (k >= 0 && !RM) showWord(k);
      });
      g.el.addEventListener('pointerleave', () => { hoverP = null; focus(null); });
    });

    if (RM) {
      words[0].textContent = 'исполнитель';
      sizeSlot();
      document.fonts?.ready.then(sizeSlot);
      addEventListener('resize', sizeSlot);
      line.classList.add('is-draw');
      hero.classList.add('is-in');
      pauseBtn.hidden = true;
    } else {
      sizeSlot();
      document.fonts?.ready.then(sizeSlot);
      addEventListener('resize', sizeSlot);
      // entry: strips come in soft and develop from the centre outwards
      hero.classList.add('is-dev');
      const cx = innerWidth / 2;
      frames.forEach(f => {
        const r = f.getBoundingClientRect();
        f.querySelector('.sharp').style.setProperty('--dl', `${Math.round(Math.abs(r.left + r.width / 2 - cx) * .55)}ms`);
      });
      requestAnimationFrame(() => hero.classList.add('is-in'));
      setTimeout(() => hero.classList.remove('is-dev'), 350);
      setTimeout(() => frames.forEach(f => f.querySelector('.sharp').style.removeProperty('--dl')), 1600);

      // cycle: word → focus pull for 1.4 s → everything sharp again; two full rounds, then it stops
      const STEP = 3400, F_ON = 150, F_OFF = 1550;
      let t = 0, started = false, focused = false, changes = 0, userPaused = false, done = false;
      setTimeout(() => { started = true; draw(); }, 1500);
      const ctl = autoplay(hero, dt => {
        if (!started || hoverP) return;
        t += dt;
        if (!focused && t >= F_ON && t < F_OFF) { focused = true; focus(WORDS[wi][0]); }
        if (focused && t >= F_OFF) { focused = false; focus(null); }
        if (t >= STEP) {
          t = 0;
          showWord((wi + 1) % WORDS.length);
          if (++changes >= WORDS.length * 2) { done = true; setPaused(true); }
        }
      }, {
        hoverEls: [rowT, rowB], threshold: .3, blocked: () => userPaused || done,
        onStop: () => { if (focused && !hoverP) { focused = false; focus(null); } }
      });
      const setPaused = v => {
        userPaused = v;
        if (!v) done = false;
        if (!v && changes >= WORDS.length * 2) changes = 0;
        pauseBtn.classList.toggle('is-paused', v);
        pauseBtn.setAttribute('aria-label', v ? 'Продолжить смену слов' : 'Остановить смену слов');
        ctl.sync();
      };
      pauseBtn.addEventListener('click', () => setPaused(!userPaused));
    }
  }

  /* ── 3. viewfinder ─────────────────────────────────────────────────── */
  {
    const vf = $('#vf'), stage = $('#vf-stage');
    if (!RM) {
      onScroll(vf, (r, vh) => {
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        stage.style.setProperty('--g', easeInOut(clamp((p - .04) / .56)).toFixed(4));
        stage.style.setProperty('--q', easeOut(clamp((p - .5) / .3)).toFixed(4));
      });
    }
  }

  /* ── 4. card builds itself, steps with progress line ───────────────── */
  {
    const sec = $('#vizitka');
    const card = $('#vcard');
    const steps = $$('.step', sec);
    const grid = $('#vcard-grid');
    const timerEl = $('#timer');
    const WORKS = ['ag-08', 'ag-38', 'ag-60', 'ag-13', 'ag-03', 'ag-40', 'ag-33', 'ag-18', 'ag-52'];
    const cells = WORKS.map(id => {
      const c = el('span', 'vw');
      c.append(img(BL(id), 'vw__s'), img(S(id, 280), 'vw__f'));
      grid.append(c);
      return c;
    });
    const [nameT, nickT] = $$('.type', card);
    const fades = ['.vcard__meta', '.vcard__city', '.vcard__lbl', '.vcard__svc', '.vcard__url'].map(s => {
      const n = $(s, card); n.classList.add('fade'); return n;
    });
    const [meta, city, lbl, svc, url] = fades;
    const pubBtn = $('.vcard__btn--pub', card), shareBtn = $('.vcard__btn--share', card);
    const DURS = [3600, 6400, 4200, 4600, 5200];
    const TOTAL = DURS.reduce((a, b) => a + b, 0);
    const START = DURS.map((_, i) => DURS.slice(0, i).reduce((a, b) => a + b, 0));

    const typed = (node, t0, t, speed) => {
      const full = node.dataset.text;
      const n = t < t0 ? 0 : Math.min(full.length, Math.floor((t - t0) / speed) + 1);
      const txt = full.slice(0, n);
      if (node.textContent !== txt) node.textContent = txt;
      node.classList.toggle('is-typing', t >= t0 - 300 && n < full.length);
    };
    // Pure render of the card for (step, time inside step): pausable and seekable
    const render = (s, t) => {
      const at = (st, ms) => s > st || (s === st && t >= ms);
      card.classList.toggle('press-login', at(0, 1500));
      card.classList.toggle('no-login', at(0, 2500));
      cells.forEach((c, i) => {
        c.classList.toggle('on', at(1, 150 + i * 220));
        c.classList.toggle('sh', at(1, 450 + i * 220));
      });
      if (s < 1) typed(nameT, 1e9, 0, 1);
      else if (s === 1) typed(nameT, 2500, t, 62);
      else typed(nameT, 0, 1e9, 1);
      meta.classList.toggle('on', at(1, 3700));
      city.classList.toggle('on', at(1, 3950));
      lbl.classList.toggle('on', at(1, 4250));
      svc.classList.toggle('on', at(1, 4450));
      card.classList.toggle('src-on', at(1, 3900) && !at(3, 2000));
      card.classList.toggle('draft', at(1, 2300));
      url.classList.toggle('on', at(2, 200));
      if (s < 2) typed(nickT, 1e9, 0, 1);
      else if (s === 2) typed(nickT, 700, t, 120);
      else typed(nickT, 0, 1e9, 1);
      pubBtn.classList.toggle('is-press', s === 3 && t > 1700 && t < 2000);
      card.classList.toggle('pub', at(3, 2000));
      card.classList.toggle('share', at(4, 300));
      shareBtn.classList.toggle('is-press', s === 4 && t > 1500 && t < 1800);
      card.classList.toggle('toast', at(4, 1800) && !(s === 4 && t > 4400));
    };
    const setStepUI = (s, t, dur) => {
      steps.forEach((li, i) => {
        li.classList.toggle('is-active', i === s);
        li.classList.toggle('is-done', i < s);
        li.style.setProperty('--sp', i === s ? clamp(t / dur).toFixed(3) : 0);
      });
      const total = clamp((START[s] + Math.min(t, DURS[s])) / TOTAL);
      const sec5 = Math.round(total * 300);
      const txt = `${Math.floor(sec5 / 60)}:${String(sec5 % 60).padStart(2, '0')}`;
      if (timerEl.textContent !== txt) timerEl.textContent = txt;
    };

    // the list keeps the height of its tallest open step, so the button below does not jump
    const stepsEl = $('#steps');
    const fitSteps = () => {
      if (stepsEl.classList.contains('steps--all')) { stepsEl.style.minHeight = ''; return; }
      const heads = steps.reduce((a, li) => a + $('.step__h', li).offsetHeight, 0);
      const desc = Math.max(...steps.map(li => $('.step__d > p', li).scrollHeight));
      stepsEl.style.minHeight = `${Math.ceil(heads + desc)}px`;
    };

    if (RM) {
      // no animation: the card shows the end of the chosen step; every description is open
      $('#steps').classList.add('steps--all');
      const pick = i => {
        render(i, 1e9);
        card.classList.remove('toast');
        steps.forEach((li, k) => { li.classList.toggle('is-active', k === i); li.classList.toggle('is-done', k < i); li.style.setProperty('--sp', k === i ? 1 : 0); });
        timerEl.textContent = `${Math.floor(Math.round((START[i] + DURS[i]) / TOTAL * 300) / 60)}:${String(Math.round((START[i] + DURS[i]) / TOTAL * 300) % 60).padStart(2, '0')}`;
      };
      pick(4);
      steps.forEach((li, i) => $('.step__h', li).addEventListener('click', () => pick(i)));
    } else {
      // plays once when half of the section is visible; a click replays from that step
      let s = 0, t = 0, dur = DURS[0], done = false;
      render(0, 0);
      setStepUI(0, 0, dur);
      const tick = dt => {
        t += dt;
        if (t >= dur) {
          if (s === steps.length - 1) {
            t = dur; done = true;
            render(s, 1e9);
            setStepUI(s, dur, dur);
            ctl.sync();
            return;
          }
          s += 1; t = 0; dur = DURS[s];
        }
        render(s, t);
        setStepUI(s, t, dur);
      };
      const ctl = autoplay(sec, tick, { hoverEls: [card], threshold: .5, blocked: () => done });
      steps.forEach((li, i) => $('.step__h', li).addEventListener('click', () => {
        s = i; t = 0; dur = DURS[i]; done = false;
        render(s, 0);
        setStepUI(s, 0, dur);
        ctl.sync();
      }));
    }
    fitSteps();
    document.fonts?.ready.then(fitSteps);
    addEventListener('resize', fitSteps);
  }

  /* ── 5. professions: the chosen line comes into focus ──────────────── */
  {
    const LIST = [
      ['Фотографы', 'ag-38', 'Фотографы'], ['Видеографы', 'r-video'], ['Reels-мейкеры', 'r-reels'], ['Ведущие', 'r-host'],
      ['Визажисты', 'r-makeup'], ['Стилисты', 'r-hair', 'Стилисты по волосам'], ['Модели', 'r-model'],
      ['Организаторы', 'r-organizer'], ['Декораторы', 'r-decor']
    ];
    const ul = $('#plist');
    const layers = $$('.scene__l');
    const name = $('#scene-name');
    const cr = $('#scene-cr');
    let stopped = RM, autoCount = 0;
    const btns = LIST.map(([label], i) => {
      const li = el('li');
      const b = el('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.append(el('span', 'pl', `<span class="pl__soft">${label}</span><span class="pl__sharp" aria-hidden="true">${label}</span>`));
      li.append(b);
      ul.append(li);
      b.addEventListener('click', () => { stopAuto(); select(i); });
      b.addEventListener('pointerenter', () => { stopAuto(); select(i); });
      b.addEventListener('focus', () => { stopAuto(); select(i); });
      return b;
    });
    let cur = -1, front = 0, ver = 0;
    const select = i => {
      if (i === cur) return;
      cur = i;
      btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      const [label, id, full] = LIST[i];
      const isAg = id.startsWith('ag-');
      name.textContent = full || label;
      cr.classList.toggle('is-on', isAg);
      const v = ++ver;
      const back = layers[1 - front];
      const [bg, im] = $$('img', back);
      bg.src = BL(id);
      im.alt = isAg ? `${label}: работа Анастасии Агаповой` : `${full || label}: пример работы`;
      const swap = () => {
        if (v !== ver) return;
        layers[front].classList.remove('is-on');
        back.classList.add('is-on');
        front = 1 - front;
      };
      im.onload = swap;
      im.src = S(id, 640);
      if (im.complete && im.naturalWidth) swap();
      (new Image()).src = S(LIST[(i + 1) % LIST.length][1], 640);
    };
    // auto-advance every 4.5 s, one pass through the list; any hover, focus or click stops it
    let acc = 0;
    const tick = dt => {
      acc += dt;
      if (acc >= 4500) {
        acc = 0;
        select((cur + 1) % LIST.length);
        if (++autoCount >= LIST.length - 1) stopAuto();
      }
    };
    const stopAuto = () => { stopped = true; ctl.sync(); };
    const ctl = autoplay($('#roles'), tick, { hoverEls: [$('#scene')], blocked: () => stopped, threshold: .4 });
    once($('#roles'), () => select(0), 0);
  }

  /* ── 6. search: query in the field, results pull focus ─────────────── */
  {
    const sec = $('#poisk');
    // per query: [matching, fresh, new authors]; at most two works of Anastasia in a set, none among new authors
    const Q = [
      ['совместная съёмка', [
        ['r-makeup', 'r-hair', 'ag-08', 'r-model', 'r-decor', 'r-video'],
        ['r-model-c', 'r-makeup2', 'r-hair-c', 'ag-18', 'r-reels', 'r-decor-c'],
        ['r-hair-c', 'r-makeup-c', 'r-decor-c2', 'r-video-c', 'r-reels-c', 'r-organizer-c']]],
      ['визажист на творческую съёмку', [
        ['r-makeup2', 'r-makeup', 'ag-38', 'r-makeup-c', 'r-model-c', 'r-makeup2-c'],
        ['r-makeup-c', 'r-model', 'r-makeup2-c', 'r-hair', 'ag-60', 'r-makeup2'],
        ['r-makeup2-c', 'r-hair-c', 'r-model-c', 'r-makeup', 'r-decor-c', 'r-model']]],
      ['плёночная эстетика', [
        ['ag-41', 'r-reels', 'r-organizer', 'ag-03', 'r-decor-c', 'r-host'],
        ['r-organizer-c', 'ag-57', 'r-reels2', 'r-decor', 'r-host-c', 'r-reels-c'],
        ['r-reels2', 'r-decor-c2', 'r-organizer-c', 'r-host-c', 'r-reels-c', 'r-hair']]],
      ['ч/б репортаж', [
        ['ag-02', 'r-host-bw', 'r-video-bw', 'ag-60', 'r-reels2-bw', 'r-makeup2-bw'],
        ['r-video-bw', 'ag-11', 'r-host-bw', 'r-organizer-bw', 'r-makeup2-bw', 'r-reels2-bw'],
        ['r-host-bw', 'r-reels2-bw', 'r-organizer-bw', 'r-model-bw', 'r-video-bw', 'r-makeup2-bw']]]
    ];
    const qEl = $('#sbar-q');
    const gridEl = $('#sgrid');
    const sq = $('#sq');
    const chips = Q.map(([q], i) => {
      const b = el('button', null, q);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => { stopped = true; ctl?.sync(); setQuery(i, true); });
      sq.append(b);
      return b;
    });
    const cells = Array.from({ length: 6 }, () => {
      const c = el('figure', 'sw');
      const s = el('img', 'sw__s'), f = el('img', 'sw__f');
      s.alt = ''; f.alt = '';
      s.decoding = f.decoding = 'async';
      const cap = el('figcaption', 'sw__cr');
      c.append(s, f, cap);
      gridEl.append(c);
      return { c, s, f, cap };
    });
    let qi = 0, mode = 0, ver = 0, stopped = RM, ctl = null;
    const show = instant => {
      const v = ++ver;
      const set = Q[qi][1][mode];
      cells.forEach((cell, k) => {
        const id = set[k];
        const isAg = id.startsWith('ag-');
        cell.c.classList.remove('is-sharp');
        cell.s.src = BL(id);
        cell.cap.innerHTML = (mode === 2 ? '<span class="sw__new"><i class="seg__dot"></i>новый автор</span> ' : '')
          + `<span>${isAg ? AUTHOR : PROF[profOf(id)]}</span>`;
        const go = () => {
          if (v !== ver) return;
          setTimeout(() => { if (v === ver) cell.c.classList.add('is-sharp'); }, instant ? 0 : 120 + k * 60);
        };
        setTimeout(() => {
          if (v !== ver) return;
          cell.f.onload = go;
          cell.f.src = S(id, 400);
          if (cell.f.complete && cell.f.naturalWidth) go();
        }, instant ? 0 : 320);
      });
      Q[(qi + 1) % Q.length][1][mode].forEach(id => { (new Image()).src = BL(id); });
    };
    // typing of the query in the field
    let typing = null;
    const setQuery = (i, instant) => {
      qi = i;
      chips.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      if (instant || RM) { typing = null; qEl.textContent = Q[i][0]; show(RM); return; }
      typing = { q: Q[i][0], t: 0 };
    };
    const tickType = dt => {
      if (!typing) return;
      typing.t += dt;
      const n = Math.min(typing.q.length, Math.floor(typing.t / 45));
      qEl.textContent = typing.q.slice(0, n) || '​';
      if (n >= typing.q.length) { typing = null; show(); }
    };
    // one pass through the queries, then it rests on the last one
    let acc = 0;
    const tick = dt => {
      tickType(dt);
      if (typing) return;
      acc += dt;
      if (acc >= 6000) {
        acc = 0;
        if (qi === Q.length - 1) { stopped = true; ctl.sync(); return; }
        setQuery(qi + 1);
      }
    };
    once(sec, () => show(RM), 0);
    if (!RM) {
      ctl = autoplay(sec, tick, {
        hoverEls: [gridEl], threshold: .3, blocked: () => stopped,
        onStart: () => sec.classList.add('is-run'), onStop: () => sec.classList.remove('is-run')
      });
    }
    // segment control: every mode has its own set
    const seg = $('#seg');
    const sb = $$('button', seg);
    const thumb = $('.seg__thumb', seg);
    const place = b => { thumb.style.setProperty('--tx', `${b.offsetLeft}px`); thumb.style.setProperty('--tw', `${b.offsetWidth}px`); };
    sb.forEach((b, i) => b.addEventListener('click', () => {
      sb.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      place(b);
      mode = i;
      acc = 0;
      show(RM);
    }));
    const placeCur = () => place(sb.find(b => b.getAttribute('aria-pressed') === 'true'));
    placeCur();
    document.fonts?.ready.then(placeCur);
  }

  /* ── 7. colleagues: a labelled graph of the team ───────────────────── */
  {
    const box = $('#constel');
    const svg = $('.constel__lines', box);
    const NODES = [
      ['ag-33', 'photo', -150, 220, 64], ['r-makeup2', 'makeup', -108, 204, 56], ['r-hair', 'hair', -58, 228, 52],
      ['r-host', 'host', -8, 252, 60], ['r-video', 'video', 40, 216, 56], ['r-reels2', 'reels', 88, 214, 50],
      ['r-model', 'model', 134, 240, 58], ['r-decor', 'decor', 178, 196, 50]
    ];
    const C = [320, 260];
    const NS = 'http://www.w3.org/2000/svg';
    const items = NODES.map(([id, prof, ang, rad, size], i) => {
      const a = (ang * Math.PI) / 180;
      const x = C[0] + Math.cos(a) * rad, y = C[1] + Math.sin(a) * rad;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', C[0]); ln.setAttribute('y1', C[1]);
      ln.setAttribute('x2', x.toFixed(1)); ln.setAttribute('y2', y.toFixed(1));
      const len = Math.hypot(x - C[0], y - C[1]);
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = RM ? 0 : len;
      ln.style.transitionDelay = `${i * 50}ms`;
      svg.append(ln);
      const n = el('span', 'cnode');
      n.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dl:${300 + i * 50}ms`;
      n.append(img(BL(id)), img(S(id, 280), 'cnode__f'));
      const l = el('span', 'cnode__l', PROF[prof]);
      l.style.cssText = `left:${x}px;top:${(y + size / 2 + 7).toFixed(1)}px;--dl:${420 + i * 50}ms`;
      box.append(n, l);
      return { ln, n, l, prof };
    });
    const highlight = profs => {
      box.classList.toggle('is-hl', !!profs);
      items.forEach(it => {
        const on = !!profs && profs.includes(it.prof);
        it.n.classList.toggle('is-hl', on);
        it.l.classList.toggle('is-hl', on);
        it.ln.classList.toggle('is-hl', on);
      });
    };
    // buttons are toggles: the chosen one stays lit until another is chosen
    const tbtn = $$('#ctypes button');
    let pressed = null;
    tbtn.forEach(b => {
      const profs = b.dataset.hl.split(' ');
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        tbtn.forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', String(on));
        pressed = on ? profs : null;
        highlight(pressed);
      });
      b.addEventListener('pointerenter', () => highlight(profs));
      b.addEventListener('pointerleave', () => highlight(pressed));
    });
    if (RM) box.classList.add('is-in');
    else once(box, () => {
      box.classList.add('is-in');
      items.forEach(it => { it.ln.style.strokeDashoffset = 0; });
      setTimeout(() => items.forEach(it => {
        it.ln.style.transitionDelay = '0ms'; it.n.style.setProperty('--dl', '0ms'); it.l.style.setProperty('--dl', '0ms');
      }), 1300);
    }, .35);
  }

  /* ── 8. formats converge to the title on scroll ─────────────────────── */
  if (!RM) {
    const orbit = $('#obuchenie');
    onScroll(orbit, (r, vh) => {
      const p = clamp((vh - r.top) / (vh + r.height));
      orbit.style.setProperty('--pp', easeOut(clamp(p / .55)).toFixed(4));
      orbit.style.setProperty('--pv', (p - .5).toFixed(4));
    });
  }

  /* ── 9. live → course ──────────────────────────────────────────────── */
  {
    const scene = $('#lscene');
    const wave = $('#wave');
    const H = [10, 18, 26, 14, 30, 38, 22, 16, 28, 40, 34, 20, 12, 24, 36, 42, 30, 18, 26, 14,
      22, 32, 40, 28, 16, 12, 20, 30, 38, 26, 18, 34, 42, 24, 14, 20, 28, 16, 10, 8];
    wave.innerHTML = H.map((h, i) => `<i style="--h:${h};--i:${i}"></i>`).join('');
    $$('.lessons li', scene).forEach((li, i) => li.style.setProperty('--i', i));
    if (!RM) {
      once(scene, () => scene.classList.add('is-play'), .35);
      onScroll(scene, (r, vh) => {
        const p = clamp((vh - r.top) / (vh + r.height));
        scene.style.setProperty('--ly', (p - .5).toFixed(4));
      });
    } else scene.classList.add('is-play');
    const mark = $('#lmark'), mb = $('#lmark-btn');
    mb.addEventListener('click', () => {
      const on = !mark.classList.contains('is-shown');
      mark.classList.toggle('is-shown', on);
      mb.setAttribute('aria-pressed', String(on));
      mb.textContent = on ? 'Скрыть метку' : 'Показать метку';
    });
  }

  /* ── 10. honest numbers and tokens ─────────────────────────────────── */
  {
    const tokens = $('#tokens');
    $$('.tk__card', tokens).forEach(c => $$(':scope > *', c).forEach((n, i) => n.style.setProperty('--i', i)));
    if (RM) tokens.classList.add('is-in');
    else {
      once(tokens, () => tokens.classList.add('is-in'), .3);
      const n15 = $('#n15');
      const v = n15.parentElement;
      n15.textContent = '0';
      once($('#nums'), () => {
        // tabular figures only while counting, so the digits do not jump
        v.classList.add('is-count');
        const t0 = performance.now() + 200;
        const step = now => {
          const k = clamp((now - t0) / 900);
          n15.textContent = Math.round(easeOut(k) * 15);
          if (k < 1) requestAnimationFrame(step);
          else v.classList.remove('is-count');
        };
        requestAnimationFrame(step);
      }, .4);
    }
  }

  /* ── 11. heart runs once along the growth loop ─────────────────────── */
  {
    const track = $('#track');
    const heart = $('#track-heart');
    const labels = $$('.track__labels li', track).map(li => ({ li, at: parseFloat(li.dataset.at) }));
    const START = .065, DUR = 9000;
    const all = () => labels.forEach(({ li }) => li.classList.add('is-on'));
    const mark = p => labels.forEach(({ li, at }) => {
      let d = at - p;
      if (d < -.5) d += 1;
      li.classList.toggle('is-on', d > -.035 && d < .085);
    });
    if (RM || !heart.animate) all();
    else {
      // from the first label round the loop and back to it, then every stage stays lit
      const s0 = `${START * 100}%`;
      const anim = heart.animate([
        { offsetDistance: s0, offset: 0 }, { offsetDistance: '100%', offset: 1 - START },
        { offsetDistance: '0%', offset: 1 - START }, { offsetDistance: s0, offset: 1 }
      ], { duration: DUR, iterations: 1, fill: 'forwards', easing: 'linear' });
      anim.pause();
      let done = false;
      anim.onfinish = () => { done = true; all(); ctl.sync(); };
      const tick = () => { if (!done) mark((START + (anim.currentTime || 0) / DUR) % 1); };
      const ctl = autoplay(track, tick, { onStart: () => anim.play(), onStop: () => { if (!done) anim.pause(); }, threshold: .4, blocked: () => done });
      mark(START);
    }
  }

  /* ── 12. final: the line draws a heart ─────────────────────────────── */
  {
    const fin = $('#final');
    const love = $('.final__love');
    const em = $('em', love);
    const svg = $('#final-line');
    const path = $('.final__path:not(.final__heart)', svg);
    const fill = $('.final__fill', svg);
    const HEART = 'M54 100C49 95 0 65 0 29 0 12 13 0 28 0c11 0 20 6 26 16C60 6 69 0 80 0c15 0 28 12 28 29 0 36-49 66-54 71z';
    let len = 1;
    const build = () => {
      const W = em.offsetWidth, Hh = love.offsetHeight;
      const k = .48, hx = W + 46, hy = Hh * .04;
      const tipX = hx + 54 * k, tipY = hy + 100 * k;
      const uy = Hh * .93;
      const f = n => n.toFixed(1);
      // underline → small loop → into the heart tip
      const d = `M${f(W * .04)} ${f(uy)}`
        + `C${f(W * .4)} ${f(uy + 7)} ${f(W * .8)} ${f(uy + 4)} ${f(W + 6)} ${f(uy - 4)}`
        + `C${f(W + 34)} ${f(uy - 12)} ${f(W + 40)} ${f(uy - 44)} ${f(W + 20)} ${f(uy - 44)}`
        + `C${f(W + 2)} ${f(uy - 44)} ${f(W + 8)} ${f(uy - 12)} ${f(W + 34)} ${f(uy - 14)}`
        + `C${f(W + 50)} ${f(uy - 15)} ${f(tipX - 8)} ${f(tipY + 14)} ${f(tipX)} ${f(tipY)}`;
      path.setAttribute('d', d);
      // heart outline (brand mark) continues the same stroke from its tip
      $('.final__hg', svg).setAttribute('transform', `translate(${f(hx)} ${f(hy)}) scale(${k})`);
      const hp = $('.final__heart', svg);
      hp.setAttribute('d', HEART);
      hp.style.strokeWidth = `${2 / k}px`;
      fill.setAttribute('d', HEART);
      len = path.getTotalLength();
      svg._parts = [[path, len], [hp, hp.getTotalLength() * k, k]];
      draw(RM ? 1 : svg._p || 0);
    };
    const draw = p => {
      svg._p = p;
      const [[a, la], [h, lh, k]] = svg._parts;
      const total = la + lh;
      const dA = clamp(p * total / la);
      const dH = clamp((p * total - la) / lh);
      a.style.strokeDasharray = `${la} ${la}`;
      a.style.strokeDashoffset = (la * (1 - dA)).toFixed(1);
      // dash units of the scaled heart are in its own (unscaled) coordinates
      const lu = lh / k;
      h.style.strokeDasharray = `${lu} ${lu}`;
      h.style.strokeDashoffset = (lu * (1 - dH)).toFixed(1);
      svg.classList.toggle('is-full', p >= .995 || (svg.classList.contains('is-full') && p > .9));
    };
    build();
    document.fonts?.ready.then(build);
    addEventListener('resize', build);
    if (!RM) {
      onScroll(fin, (r, vh) => draw(clamp((vh - r.top) / (vh * .6))));
    }
  }
})();
