/* EventMatch — главная, вариант E. Без библиотек. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PROTO = 'https://adhappyday2017-cell.github.io/eventmatch-prototype/';
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  const loops = [];
  const hasIO = 'IntersectionObserver' in window;

  /* Цикл, который идёт только на экране, при открытой вкладке и без «меньше движения» */
  function makeLoop(el, step, delay, onRun, threshold = 0.25) {
    let t = 0, vis = !hasIO, held = false, stopped = false, on = false;
    const ok = () => vis && !held && !stopped && !document.hidden && !reduce;
    const sched = () => {
      clearTimeout(t);
      t = setTimeout(() => { if (!ok()) return; step(); sched(); }, delay());
    };
    const sync = () => {
      const now = ok();
      if (now && !on) { on = true; sched(); if (onRun) onRun(true); }
      else if (!now && on) { on = false; clearTimeout(t); if (onRun) onRun(false); }
    };
    if (hasIO) {
      new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; sync(); }, { threshold }).observe(el);
    }
    document.addEventListener('visibilitychange', sync);
    const api = {
      hold(v) { held = v; sync(); },
      stop() { stopped = true; sync(); },
      restart() { if (on) sched(); },
      sync,
      get on() { return on; },
      get stopped() { return stopped; }
    };
    loops.push(api);
    return api;
  }

  const preload = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
  const ready = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })));

  /* ── Шапка: тень при прокрутке и активный раздел ───────────── */
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('is-s', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (hasIO) {
    const links = $$('.hdr__nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-on'));
        const a = map.get(e.target.id);
        if (a) a.classList.add('is-on');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'who', 'vizitka', 'kollegi', 'obuchenie', 'chestno', 'kadry', 'dengi'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ── Появление при прокрутке ────────────────────────────────── */
  const rv = $$('[data-rv]');
  rv.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-rv'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i, 5) * 70 + 'ms');
  });
  if (hasIO && !reduce) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.12 });
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add('in'));
  }
  // клавиатура: то, на что попал фокус, показываем сразу, даже если оно у самого края окна
  document.addEventListener('focusin', (e) => {
    const r = e.target.closest && e.target.closest('[data-rv]');
    if (r) r.classList.add('in');
  });

  /* Пауза автосмены, пока на блок навели мышь или в нём стоит фокус */
  const holdWhile = (loop, els) => {
    let ptr = 0, foc = false;
    const upd = () => loop.hold(ptr > 0 || foc);
    els.filter(Boolean).forEach((el) => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { ptr += 1; upd(); } });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { ptr = Math.max(0, ptr - 1); upd(); } });
      el.addEventListener('focusin', () => { foc = true; upd(); });
      el.addEventListener('focusout', (e) => {
        if (!els.some((x) => x && x.contains(e.relatedTarget))) { foc = false; upd(); }
      });
    });
  };

  /* Плашка прототипа: на локальных серверах каждый вариант живёт на своём порту */
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const V = { a: 'https://adhappyday2017-cell.github.io/eventmatch/', b: 3300, c: 3301, d: 3302 };
    $$('.variant [data-variant]').forEach((a) => {
      const v = V[a.dataset.variant];
      if (v) a.href = typeof v === 'number' ? location.protocol + '//' + location.hostname + ':' + v + '/' : v;
    });
  }

  /* ── Поле ника ──────────────────────────────────────────────── */
  const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-' };
  const clean = (v) => v.toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  $$('[data-nick]').forEach((form) => {
    const input = $('input', form);
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const before = input.value;
      const v = clean(before);
      if (v !== before) {
        input.value = v;
        const p = Math.max(0, Math.min(v.length, pos - (before.length - v.length)));
        try { input.setSelectionRange(p, p); } catch (e) { /* noop */ }
      }
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v = clean(input.value);
      window.location.href = PROTO + (v ? '?nick=' + encodeURIComponent(v) : '') + '#onboarding';
    });
  });

  /* ── 1. Контактный лист: наводка на резкость ────────────────── */
  const ROLES = [
    { k: 'ph', w: 'фотограф', l: 'фотограф', d: 5200 },
    { k: 'mu', w: 'визажист', l: 'визажист' },
    { k: 'ho', w: 'ведущий', l: 'ведущий' },
    { k: 'vi', w: 'видеограф', l: 'видеограф' },
    { k: 're', w: 'reels-мейкер', l: 'reels-мейкер' },
    { k: 'ha', w: 'стилист', l: 'стилист по волосам' },
    { k: 'de', w: 'декоратор', l: 'декоратор' },
    { k: 'or', w: 'организатор', l: 'организатор' }
  ];
  const LBL = Object.fromEntries(ROLES.map((r) => [r.k, r.l]));
  const ROW_T = [['ag-02', 'ph'], ['ag-13', 'ph'], ['ag-08', 'ph'], ['r-makeup2', 'mu'], ['ag-24', 'ph'], ['r-host', 'ho'], ['ag-57', 'ph'], ['r-reels', 're'], ['ag-38', 'ph'], ['ag-30', 'ph'], ['ag-60', 'ph'], ['r-organizer', 'or'], ['ag-27', 'ph'], ['ag-49', 'ph']];
  const ROW_B = [['ag-59', 'ph'], ['ag-34', 'ph'], ['r-video', 'vi'], ['ag-16', 'ph'], ['r-hair', 'ha'], ['ag-05', 'ph'], ['r-decor', 'de'], ['ag-43', 'ph'], ['r-makeup', 'mu'], ['ag-15', 'ph'], ['ag-63', 'ph'], ['r-reels2', 're'], ['ag-61', 'ph'], ['ag-07', 'ph']];

  const frames = [];
  const buildRow = (host, row) => {
    if (!host) return;
    const frag = document.createDocumentFragment();
    row.forEach(([id, k]) => {
      const fr = document.createElement('div');
      fr.className = 'fr';
      fr.dataset.k = k;
      fr.innerHTML =
        '<div class="fr__in"><img class="fr__s" src="img/t/f-' + id + '-s.webp" width="140" height="175" alt="" decoding="async">' +
        '<img class="fr__f" src="img/t/f-' + id + '-280.webp" width="280" height="350" alt="" decoding="async"></div>' +
        '<i class="corners"></i>' + (k !== 'ph' ? '<span class="fr__l">' + LBL[k] + '</span>' : '');
      frag.appendChild(fr);
      frames.push(fr);
    });
    host.appendChild(frag);
  };
  buildRow($('#sheet-t'), ROW_T);
  buildRow($('#sheet-b'), ROW_B);

  const slot = $('#slot');
  let roleI = 0;
  const focusRole = (k) => {
    frames.forEach((fr) => {
      const f = fr.dataset.k === k;
      fr.classList.toggle('is-f', f);
      fr.classList.toggle('is-mark', f && k !== 'ph');
    });
  };
  // старое слово уходит в размытие (0,3 с), только потом проявляется новое
  const setWord = (text, then) => {
    if (!slot) return;
    const old = $('.slot__w.is-on', slot);
    const nw = document.createElement('span');
    nw.className = 'slot__w';
    nw.textContent = text;
    slot.appendChild(nw);
    if (old) {
      old.classList.remove('is-on');
      setTimeout(() => old.remove(), 600);
    }
    setTimeout(() => { nw.classList.add('is-on'); if (then) then(); }, old ? 320 : 0);
  };
  const hero = $('#top');
  const pauseBtn = $('#hero-pause');
  let heroLoop = null;

  if (reduce) {
    frames.forEach((fr) => fr.classList.add('is-f'));
  } else {
    focusRole('ph');
    heroLoop = makeLoop(hero, () => {
      roleI = (roleI + 1) % ROLES.length;
      const r = ROLES[roleI];
      setWord(r.w, () => focusRole(r.k));
    }, () => ROLES[roleI].d || 4200, null, 0.3);
  }
  if (pauseBtn) {
    if (reduce) pauseBtn.hidden = true;
    pauseBtn.addEventListener('click', () => {
      const p = pauseBtn.getAttribute('aria-pressed') !== 'true';
      pauseBtn.setAttribute('aria-pressed', String(p));
      if (heroLoop) heroLoop.hold(p);
    });
  }

  /* ── 2. Профессии: превью под курсором ──────────────────────── */
  const peek = $('#peek');
  const peekImg = peek && $('img', peek);
  if (peek && window.matchMedia('(hover: hover)').matches) {
    let raf = 0, x = 0, y = 0, cur = null;
    const place = () => {
      raf = 0;
      const w = 168, h = 210;
      let px = x + 22, py = y - h - 14;
      if (px + w > window.innerWidth - 12) px = x - w - 22;
      if (py < 76) py = y + 22;
      peek.style.setProperty('--x', px + 'px');
      peek.style.setProperty('--y', py + 'px');
    };
    $$('.pw').forEach((w) => {
      preload(w.dataset.img);
      w.addEventListener('pointerenter', (e) => {
        cur = w;
        peekImg.src = w.dataset.img;
        x = e.clientX; y = e.clientY; place();
        peek.classList.add('is-on');
      });
      w.addEventListener('pointermove', (e) => {
        x = e.clientX; y = e.clientY;
        if (!raf) raf = requestAnimationFrame(place);
      });
      w.addEventListener('pointerleave', () => {
        if (cur === w) { peek.classList.remove('is-on'); cur = null; }
      });
    });
    window.addEventListener('scroll', () => { if (cur) { peek.classList.remove('is-on'); cur = null; } }, { passive: true });
  }

  /* ── 3. Визитка: шаги подсвечивают части визитки ───────────── */
  const stepsBox = $('#steps');
  const steps = $$('#steps .step');
  const win = $('#win');
  const STEP_MS = 3400;
  let stepI = 0;
  const setStep = (i) => {
    stepI = i;
    steps.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      s.setAttribute('aria-pressed', String(k === i));
    });
    $$('[data-part]', win).forEach((p) => p.classList.toggle('is-hl', p.dataset.part === String(i + 1)));
    // перезапуск полоски
    const bar = $('.step__bar', steps[i]);
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
  };
  if (stepsBox && win) {
    stepsBox.style.setProperty('--dur', STEP_MS + 'ms');
    setStep(0);
    const stepLoop = makeLoop(win, () => setStep((stepI + 1) % steps.length), () => STEP_MS, (run) => {
      stepsBox.classList.toggle('is-run', run);
      if (run) setStep(stepI);
    }, 0.4);
    steps.forEach((s, k) => s.addEventListener('click', () => {
      stepLoop.stop();
      stepsBox.classList.remove('is-run');
      setStep(k);
    }));
    holdWhile(stepLoop, [stepsBox, win]);
  }

  /* ── 4. Коллеги: поиск, выдача наводится на резкость ───────── */
  // Снимки профессий подписаны только профессией. Работы Анастасии — одна карточка автора.
  const AU = { name: 'Анастасия Агапова', role: 'фотограф', ava: 'img/t/nastya-96.webp' };
  const Q = [
    { q: 'совместная съёмка', it: [['r-makeup2', 'визажист'], ['r-hair', 'стилист по волосам'], ['r-model', 'модель'], ['r-decor', 'декоратор'], ['r-organizer', 'организатор'], ['r-reels2', 'reels\u2011мейкер']] },
    { q: 'свадебный репортаж', au: ['ag-46', 'ag-61', 'ag-27', 'ag-43'], it: [['r-video', 'видеограф'], ['r-reels', 'reels\u2011мейкер']] },
    { q: 'женский портрет', au: ['ag-08', 'ag-38', 'ag-05', 'ag-60'], it: [['r-makeup', 'визажист'], ['r-hair', 'стилист по волосам']] }
  ];
  const resBox = $('#res');
  const qText = $('#sbar-q');
  const chips = $$('#qchips .qchip');
  let qI = 0;
  let cells = [];
  const ids = (q) => (q.au || []).concat(q.it.map((x) => x[0]));
  const pics = (id) =>
    '<img class="res__s" src="img/t/f-' + id + '-s.webp" width="140" height="175" alt="" decoding="async">' +
    '<img class="res__f" src="img/t/f-' + id + '-400.webp" width="400" height="500" alt="" decoding="async">';
  const renderQ = (i) => {
    const q = Q[i];
    let h = '';
    if (q.au) {
      h += '<li class="res__i res__au"><div class="au__strip"><div class="au__row">' +
        q.au.map((id) => '<div class="au__ph">' + pics(id) + '</div>').join('') +
        '</div><i class="corners"></i></div>' +
        '<p class="res__cap au__cap"><img class="au__ava" src="' + AU.ava + '" width="36" height="36" alt="">' +
        '<span class="au__t"><b>' + AU.name + '</b><span>' + AU.role + ' · ' + q.au.length + ' работы по\u00a0запросу</span></span></p></li>';
    }
    q.it.forEach(([id, role]) => {
      h += '<li class="res__i"><div class="res__pic"><div class="res__in">' + pics(id) +
        '</div><i class="corners"></i></div><p class="res__cap"><b>' + role + '</b></p></li>';
    });
    resBox.innerHTML = h;
    cells = $$('.res__i', resBox);
    if (!reduce) cells.forEach((c) => c.classList.add('is-soft'));
  };

  let typing = 0;
  const typeQuery = (text) => new Promise((resolve) => {
    clearTimeout(typing);
    if (reduce || !qText) { if (qText) qText.textContent = text; resolve(); return; }
    let cur = qText.textContent;
    const erase = () => {
      if (cur.length) { cur = cur.slice(0, -1); qText.textContent = cur; typing = setTimeout(erase, 16); }
      else { let i = 0; const add = () => { i += 1; qText.textContent = text.slice(0, i); if (i < text.length) typing = setTimeout(add, 42); else resolve(); }; typing = setTimeout(add, 120); }
    };
    erase();
  });

  const focusIn = (stagger = 110) => {
    const now = cells;
    now.forEach((c, k) => {
      Promise.all($$('.res__f', c).map(ready)).then(() => setTimeout(() => {
        if (cells !== now) return;
        c.classList.remove('is-soft');
        if (k === 0) { c.classList.add('is-mark'); setTimeout(() => c.classList.remove('is-mark'), 1400); }
      }, 160 + k * stagger));
    });
  };

  let qToken = 0;
  const setQuery = (i) => {
    qI = i;
    const tok = ++qToken;
    chips.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.setAttribute('aria-pressed', String(k === i)); });
    ids(Q[i]).forEach((id) => preload('img/t/f-' + id + '-400.webp'));
    cells.forEach((c) => c.classList.add('is-soft'));
    typeQuery(Q[i].q).then(() => {
      if (tok !== qToken) return;
      if (reduce) { renderQ(i); return; }
      resBox.classList.add('is-swap');
      setTimeout(() => {
        if (tok !== qToken) return;
        renderQ(i);
        void resBox.offsetWidth;
        resBox.classList.remove('is-swap');
        focusIn();
      }, 200);
    });
  };

  if (resBox) {
    renderQ(0);
    // мягкие копии всех запросов — сразу, они крошечные
    Q.forEach((q) => ids(q).forEach((id) => preload('img/t/f-' + id + '-s.webp')));
    // первая наводка на резкость — когда выдача показалась, независимо от автосмены
    if (reduce || !hasIO) cells.forEach((c) => c.classList.remove('is-soft'));
    else {
      const fio = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { fio.disconnect(); focusIn(140); }
      }, { threshold: 0.35 });
      fio.observe(resBox);
    }
    const qLoop = makeLoop(resBox, () => setQuery((qI + 1) % Q.length), () => 5600, null, 0.35);
    chips.forEach((c, k) => c.addEventListener('click', () => { qLoop.stop(); setQuery(k); }));
    holdWhile(qLoop, [resBox, $('#kollegi .find')]);
  }

  /* ── 6. Обучение: вкладки ───────────────────────────────────── */
  const tabs = $$('.tabs .tab');
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const aiDemo = $('#ai-demo');
  const wave = $('#rec-wave');
  if (wave) {
    let s = 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 52; i += 1) {
      const sp = document.createElement('span');
      const h = 18 + Math.round(rnd() * 70 * (0.55 + 0.45 * Math.sin(i / 4.2) ** 2));
      sp.style.setProperty('--h', Math.min(100, h) + '%');
      frag.appendChild(sp);
    }
    wave.appendChild(frag);
  }
  let aiTimers = [];
  const runAI = () => {
    if (!aiDemo) return;
    aiTimers.forEach(clearTimeout);
    aiTimers = [];
    const lis = $$('.course__list li', aiDemo);
    const bars = $$('span', wave);
    if (reduce) { aiDemo.classList.remove('is-build'); aiDemo.classList.add('is-done'); return; }
    aiDemo.classList.remove('is-done');
    aiDemo.classList.add('is-build');
    lis.forEach((li) => li.classList.remove('is-in'));
    bars.forEach((b) => b.classList.remove('is-cut'));
    const cutsAt = [12, 24, 33, 44];
    lis.forEach((li, k) => {
      aiTimers.push(setTimeout(() => {
        li.classList.add('is-in');
        for (let j = k ? cutsAt[k - 1] : 0; j < cutsAt[k]; j += 1) if (bars[j]) bars[j].classList.add('is-cut');
      }, 500 + k * 650));
    });
    aiTimers.push(setTimeout(() => { aiDemo.classList.remove('is-build'); }, 500 + lis.length * 650));
    aiTimers.push(setTimeout(() => { aiDemo.classList.add('is-done'); }, 900 + lis.length * 650));
  };
  const selectTab = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (panels[k]) {
        panels[k].classList.toggle('is-on', on);
        panels[k].setAttribute('aria-hidden', String(!on));
      }
    });
    if (focus) tabs[i].focus();
    if (panels[i] && panels[i].contains(aiDemo)) runAI();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i, false));
    t.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(n, true); }
    });
  });
  if (tabs.length) selectTab(0, false);

  /* ── 9. Сердце в финале рисуется один раз ───────────────────── */
  const heart = $('#final-heart');
  if (heart) {
    if (hasIO && !reduce) {
      const hio = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { heart.classList.add('in'); hio.disconnect(); }
      }, { threshold: 0.6 });
      hio.observe(heart);
    } else heart.classList.add('in');
  }

  /* ── Смена настройки «меньше движения» на лету ──────────────── */
  const onMQ = () => {
    reduce = mq.matches;
    loops.forEach((l) => l.sync());
    if (reduce) {
      frames.forEach((fr) => fr.classList.add('is-f'));
      cells.forEach((c) => c.classList.remove('is-soft'));
      rv.forEach((el) => el.classList.add('in'));
      if (heart) heart.classList.add('in');
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ);
  else if (mq.addListener) mq.addListener(onMQ);
})();
