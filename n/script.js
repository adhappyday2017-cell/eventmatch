/* EventMatch — главные L, M, N: скрипт основы. Без библиотек; без скрипта страница тоже полная.
   Правило движения: один автоматический процесс на экран, пауза вне экрана и при скрытой вкладке,
   «меньше движения» выключает всё. Анимируются только transform/opacity (и CSS-переменные).
   Сменные и общие блоки — свои IIFE ниже (собирает build.py); отсюда в window ничего не выходит. */
document.documentElement.classList.add('ready'); // снимает CSS-страховку: скрипт дошёл
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ONB = 'https://adhappyday2017-cell.github.io/eventmatch-prototype/';
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let RM = mq.matches;
  const hasIO = 'IntersectionObserver' in window;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── Данные умного поиска ───────────────────────────────────────────── */
  // Подписи — только роль и город (имена не придумываем; города — Ростов-на-Дону, Краснодар, Москва).
  // Работы — Анастасии Агаповой (agapovanastya.ru, с её согласия), без повторов с остальной страницей.
  // pos — точка кадра из img/ag/focal.json, чтобы лица не резались (у ag-025 макушка у самого края — кадр от верха).
  // Подписи — в одну строку (карточка 256 px).
  // Агаповой в выдаче коллег нет (она не «открыта к работе»), зато её обучение находится по запросу про курс.
  const ITEMS = {
    ph1: { f: 'img/r/ag-036-560.webp', s: 'img/r/ag-036-s.webp', pos: '50% 31%', t: 'Фотограф', m: 'Ростов‑на‑Дону' },
    vid1: { f: 'img/r/ag-037-560.webp', s: 'img/r/ag-037-s.webp', pos: '50% 30%', t: 'Видеограф', m: 'Краснодар' },
    ph2: { f: 'img/r/ag-025-560.webp', s: 'img/r/ag-025-s.webp', pos: '50% 0%', t: 'Фотограф', m: 'Москва' },
    mod1: { f: 'img/t/f-r-model2-400.webp', s: 'img/t/f-r-model2-s.webp', t: 'Модель', m: 'Москва' },
    mod2: { f: 'img/r/ag-041-560.webp', s: 'img/r/ag-041-s.webp', pos: '50% 32%', t: 'Модель', m: 'Краснодар' },
    mod3: { f: 'img/r/fs-primer-1-560.webp', s: 'img/r/fs-primer-1-s.webp', pos: '54% 24%', t: 'Модель', m: 'Ростов‑на‑Дону' },  // «Пример 1» основателя
    edu1: { f: 'img/r/ag-061-560.webp', s: 'img/r/ag-061-s.webp', pos: '50% 0%', k: 'Мастер-класс · 2 дня', t: '«Свадебный фотограф»', m: 'Анастасия Агапова · до\u00a015\u00a0человек' },
    edu2: { f: 'img/r/ag-003-560.webp', s: 'img/r/ag-003-s.webp', pos: '50% 0%', k: 'Эфир · 28 октября', t: 'Женский портрет: свет из окна', m: 'Анастасия Агапова · 19:00\u00a0мск' },
    edu3: { f: 'img/r/ag-032-560.webp', s: 'img/r/ag-032-s.webp', pos: '50% 48%', k: 'Курс', t: 'Свет в\u00a0банкетном зале', m: 'фотограф · онлайн, в\u00a0своём темпе' }
  };
  // Три подсказки: две — коллеги в команду, третья — обучение (пункт 2 «Как работает»).
  // На «рыжую с веснушками» первая модель действительно рыжая с веснушками. Эта подсказка открыта первой (START).
  const QUERIES = [
    { q: 'второй фотограф или видеограф на субботу', ids: ['ph1', 'vid1', 'ph2'] },
    { q: 'модель на мастер-класс, рыжая с веснушками', ids: ['mod1', 'mod3', 'mod2'] },  // чёрно-белая — посередине
    { q: 'курс по свету для свадебного фотографа', ids: ['edu1', 'edu2', 'edu3'] }
  ];
  const START = 1;

  /* ── Общие помощники ────────────────────────────────────────────────── */
  const loops = [];
  // Цикл, который идёт только на экране, при открытой вкладке, без наведения и без «меньше движения»
  function makeLoop(target, step, delay, opts = {}) {
    let t = 0, vis = !hasIO, held = false, stopped = false, on = false;
    const ok = () => vis && !held && !stopped && !document.hidden && !RM;
    const sched = () => { clearTimeout(t); t = setTimeout(() => { if (!ok()) return; step(); sched(); }, delay()); };
    const sync = () => {
      const now = ok();
      if (now && !on) { on = true; sched(); }
      else if (!now && on) { on = false; clearTimeout(t); }
    };
    if (hasIO) new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; sync(); }, { threshold: opts.threshold ?? 0.25 }).observe(target);
    document.addEventListener('visibilitychange', sync);
    const api = { hold(v) { held = v; sync(); }, stop() { stopped = true; sync(); }, sync };
    loops.push(api);
    return api;
  }
  const holdWhile = (loop, els) => {
    let ptr = 0, foc = false;
    const upd = () => loop.hold(ptr > 0 || foc);
    els.filter(Boolean).forEach((n) => {
      n.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { ptr += 1; upd(); } });
      n.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { ptr = Math.max(0, ptr - 1); upd(); } });
      n.addEventListener('focusin', () => { foc = true; upd(); });
      n.addEventListener('focusout', (e) => { if (!els.some((x) => x && x.contains(e.relatedTarget))) { foc = false; upd(); } });
    });
  };
  const once = (target, cb, threshold = 0.3) => {
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); cb(); } }, { threshold });
    io.observe(target);
  };
  // Эффекты от прокрутки: считаем только когда элемент рядом с экраном, один rAF на всех
  const scrollFx = [];
  let queued = false;
  const runScroll = () => { queued = false; const vh = innerHeight; scrollFx.forEach((fx) => { if (fx.near) fx.fn(fx.el.getBoundingClientRect(), vh); }); };
  const queueScroll = () => { if (!queued) { queued = true; requestAnimationFrame(runScroll); } };
  const onScroll = (target, fn, margin = '200px 0px') => {
    const fx = { el: target, fn, near: !hasIO };
    scrollFx.push(fx);
    if (hasIO) new IntersectionObserver(([e]) => { fx.near = e.isIntersecting; if (fx.near) queueScroll(); }, { rootMargin: margin }).observe(target);
  };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueScroll(); });

  /* ── Шапка: тень при прокрутке, активный раздел, тёмная только над vf--dark ── */
  const hdr = $('#hdr');
  const onHdr = () => hdr.classList.toggle('is-s', scrollY > 8);
  addEventListener('scroll', onHdr, { passive: true });
  onHdr();
  if (hasIO) {
    const links = $$('.hdr__nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    // глава «Профиль» и блок «Заполни сам» — продолжение «Как это работает»; калькулятор, рейтинг — глава эфиров
    [['profil', 'kak'], ['redaktor', 'kak'], ['dohod', 'efiry'], ['reiting', 'efiry']].forEach(([id, to]) => { if (map.get(to)) map.set(id, map.get(to)); });
    const spy = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-on'));
        const a = map.get(e.target.id);
        if (a) a.classList.add('is-on');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'kak', 'profil', 'redaktor', 'poisk', 'vozmozhnosti', 'efiry', 'dohod', 'reiting', 'partneram', 'final'].forEach((id) => { const n = document.getElementById(id); if (n) spy.observe(n); });
  }
  // Шапка темнеет, пока тёмная сцена профиля заходит под неё и ниже неё (только вариант с vf--dark).
  // Когда под шапкой остался лишь хвост профиля (после перехода по якорю к следующему блоку) —
  // шапка светлая и непрозрачная, чтобы тёмная полоса не просвечивала над белым блоком.
  {
    const vfSec = $('#profil');
    if (vfSec && vfSec.classList.contains('vf--dark')) {
      let raf = 0;
      const syncDark = () => {
        raf = 0;
        const h = hdr.offsetHeight, r = vfSec.getBoundingClientRect();
        const under = r.top < h && r.bottom > 0;
        const dark = under && r.bottom > h + 8;
        hdr.classList.toggle('is-dark', dark);
        hdr.classList.toggle('is-solid', under && !dark);
      };
      const q = () => { if (!raf) raf = requestAnimationFrame(syncDark); };
      addEventListener('scroll', q, { passive: true });
      addEventListener('resize', q);
      syncDark();
    }
  }

  /* ── Появление при прокрутке: один механизм, каскад 70 мс (и для блоков) ── */
  const rv = $$('[data-rv]');
  rv.forEach((n) => {
    if (n.style.getPropertyValue('--d')) return;
    const sibs = Array.from(n.parentElement.children).filter((c) => c.hasAttribute('data-rv'));
    const i = sibs.indexOf(n);
    if (i > 0) n.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
  });
  if (hasIO && !RM) {
    // без отступа снизу и с порогом 0: всё, что видно хотя бы краем, появляется сразу
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px', threshold: 0 });
    rv.forEach((n) => io.observe(n));
  } else rv.forEach((n) => n.classList.add('in'));
  document.addEventListener('focusin', (e) => { const r = e.target.closest && e.target.closest('[data-rv]'); if (r) r.classList.add('in'); });

  /* ── 1. Стена работ: трек мягко догоняет прокрутку ───────────────────── */
  // Цель — доля пути прокрутки (RANGE × --u), показ — догоняет цель с lerp ≈ 0,1 за кадр 60 Гц
  // (с поправкой на реальную длительность кадра). Цикл rAF живёт, только пока есть что догонять.
  // «Меньше движения» и без скрипта — статичная раскладка из семи карточек.
  let wallSync = () => {};
  {
    const track = $('#cc-track');
    const stage = track && track.parentElement;
    if (track) {
      const RANGE = 560, K = 0.1;
      let cur = 0, target = 0, raf = 0, last = 0, near = true;
      const unit = () => clamp(stage.clientWidth / 1440, 0.83, 1.1);
      const goal = () => clamp(scrollY / (RANGE * unit()));
      // --p — доля пути; по ней же в CSS проявляются хвостовые карточки (--o)
      const paint = (p) => track.style.setProperty('--p', p.toFixed(4));
      const step = (now) => {
        // метка кадра rAF бывает раньше performance.now() из kick — тогда dt < 0 и трек дёргался назад;
        // первый кадр считаем обычным (16,7 мс), dt и k держим в допустимых границах
        const dt = last && now > last ? Math.min(64, now - last) : 16.7;
        last = now;
        const k = clamp(1 - Math.pow(1 - K, dt / 16.7));
        cur += (target - cur) * k;
        if (Math.abs(target - cur) < 0.0004) cur = target;
        paint(cur);
        raf = cur !== target && near && !document.hidden ? requestAnimationFrame(step) : 0;
      };
      const kick = () => {
        if (RM) { cur = target = 0; paint(0); return; }
        target = goal();
        if (!near || document.hidden) { cur = target; paint(cur); return; } // вне экрана — сразу на место, без догоняния
        if (!raf) { last = 0; raf = requestAnimationFrame(step); }
      };
      if (hasIO) new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) kick(); }, { rootMargin: '160px 0px' }).observe(stage);
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', kick);
      document.addEventListener('visibilitychange', kick);
      // открыли страницу посередине (восстановленная прокрутка) — без доезда
      cur = target = RM ? 0 : goal();
      paint(cur);
      wallSync = kick;
    }
  }

  /* ── 5. Умный поиск: запрос набирается, выдача проявляется ───────────── */
  {
    const resBox = $('#res'), qText = $('#sbar-q'), chipsBox = $('#qchips');
    const sec = $('#poisk');
    if (resBox && qText && chipsBox) {
      const preload = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
      const ready = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })));
      const chips = $$('.qchip', chipsBox);
      let qI = 0, cells = [], token = 0, typing = 0;
      const render = (i) => {
        resBox.innerHTML = QUERIES[i].ids.map((id) => {
          const it = ITEMS[id];
          const pos = it.pos ? ` style="object-position:${it.pos}"` : '';
          const k = it.k ? `<span class="res__k">${esc(it.k)}</span>` : '';
          return `<li class="res__i"><div class="res__pic"><div class="res__in"><img class="res__s" src="${it.s}" alt="" decoding="async"${pos}><img class="res__f" src="${it.f}" alt="${esc(it.k ? `${it.k}: ${it.t}` : it.t)}" decoding="async"${pos}>${k}</div></div><p class="res__cap"><b>${esc(it.t)}</b><span>${esc(it.m)}</span></p></li>`;
        }).join('');
        cells = $$('.res__i', resBox);
        if (!RM) cells.forEach((c) => c.classList.add('is-soft'));
      };
      // все карточки проявляются одинаково, по очереди — без особого эффекта на первой
      const focusIn = (stagger = 110) => {
        const now = cells;
        now.forEach((c, k) => {
          Promise.all($$('.res__f', c).map(ready)).then(() => setTimeout(() => {
            if (cells === now) c.classList.remove('is-soft');
          }, 160 + k * stagger));
        });
      };
      // Автосмена стирает и набирает неспешно; по клику запрос стирается сразу, набор быстрый
      const typeQuery = (text, fast) => new Promise((resolve) => {
        clearTimeout(typing);
        if (RM) { qText.textContent = text; resolve(); return; }
        let cur = fast ? '' : qText.textContent;
        const speed = fast ? 18 : 36;
        const erase = () => {
          if (cur.length) { cur = cur.slice(0, -1); qText.textContent = cur; typing = setTimeout(erase, 12); }
          else { qText.textContent = ''; let i = 0; const add = () => { i += 1; qText.textContent = text.slice(0, i); if (i < text.length) typing = setTimeout(add, speed); else resolve(); }; typing = setTimeout(add, fast ? 40 : 120); }
        };
        erase();
      });
      const swap = (i, tok, fast) => {
        if (tok !== token) return;
        if (RM) { render(i); return; }
        resBox.classList.add('is-swap');
        setTimeout(() => {
          if (tok !== token) return;
          render(i);
          void resBox.offsetWidth;
          resBox.classList.remove('is-swap');
          focusIn(fast ? 90 : 110);
        }, 200);
      };
      const setQuery = (i, fast = false) => {
        qI = i;
        const tok = ++token;
        chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
        QUERIES[i].ids.forEach((id) => preload(ITEMS[id].f));
        cells.forEach((c) => c.classList.add('is-soft'));
        const typed = typeQuery(QUERIES[i].q, fast);
        if (fast) swap(i, tok, fast); else typed.then(() => swap(i, tok, fast));
      };
      qI = START;
      qText.textContent = QUERIES[START].q;
      render(START);
      QUERIES.forEach((q) => q.ids.forEach((id) => preload(ITEMS[id].s)));
      if (RM || !hasIO) cells.forEach((c) => c.classList.remove('is-soft'));
      else once(resBox, () => focusIn(110), 0.35);
      const qLoop = makeLoop(resBox, () => setQuery((qI + 1) % QUERIES.length), () => 6200, { threshold: 0.35 });
      chips.forEach((c, k) => c.addEventListener('click', () => { qLoop.stop(); setQuery(k, true); }));
      holdWhile(qLoop, [resBox, $('.sbar', sec), chipsBox]);
      // каретка мигает только пока строка поиска на экране
      const bar = $('.sbar', sec);
      let barIn = false;
      const syncBar = () => bar.classList.toggle('is-live', barIn && !document.hidden && !RM);
      if (hasIO) new IntersectionObserver(([e]) => { barIn = e.isIntersecting; syncBar(); }, { threshold: 0.5 }).observe(bar);
      document.addEventListener('visibilitychange', syncBar);
      loops.push({ sync: syncBar });
    }
  }

  /* ── 3. Профиль Анастасии: рамка раскрывается по прокрутке, данные подгружаются ─ */
  {
    const vf = $('#profil'), stage = $('#vf-stage');
    if (vf && stage) {
      const setAll = (v) => { stage.style.setProperty('--g', v); stage.style.setProperty('--n', v); stage.style.setProperty('--q', v); };
      if (RM) setAll('1');
      else {
        onScroll(vf, (r, vh) => {
          const p = clamp(-r.top / Math.max(1, r.height - vh));
          stage.style.setProperty('--g', easeInOut(clamp((p - 0.04) / 0.5)).toFixed(4));
          stage.style.setProperty('--n', easeOut(clamp((p - 0.2) / 0.28)).toFixed(4));
          stage.style.setProperty('--q', easeOut(clamp((p - 0.4) / 0.3)).toFixed(4));
        });
        queueScroll();
      }
      loops.push({ sync() { if (RM) setAll('1'); else queueScroll(); } });
    }
  }

  /* ── 11. Финал: веер, сердце, поле ника ──────────────────────────────── */
  {
    const fan = $('#fan'), tilt = $('#fan-tilt'), fin = $('#final');
    const head = $('#final-title');
    // Заголовок: строки проявляются по очереди (≈ 1,2 с каждая), затем сердце рисуется контуром ≈ 2,6 с
    // и заливается (тайминги — в CSS). Старт — когда заголовок целиком в верхних двух третях экрана,
    // а не у самого края. Веер раскрывается вместе с заголовком; если до него докрутили раньше — сам по себе.
    if (head) {
      if (RM || !hasIO) head.classList.add('is-in');
      else {
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          head.classList.add('is-in');
          if (fan) setTimeout(() => fan.classList.add('is-ready'), 350);
        }, { rootMargin: '0px 0px -30% 0px', threshold: 1 });
        io.observe(head);
      }
    }
    if (fan && tilt && fin) {
      const ready = () => fan.classList.add('is-ready');
      if (RM || !hasIO) ready(); else once(fan, () => setTimeout(ready, 120), 0.6);
      fin.addEventListener('mousemove', (e) => {
        if (RM) return;
        const r = fan.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
        tilt.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      });
      fin.addEventListener('mouseleave', () => { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); });
    }

    const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-' };
    const clean = (v) => v.toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
    $$('[data-nick]').forEach((form) => {
      const input = $('input', form);
      input.addEventListener('input', () => {
        const pos = input.selectionStart, before = input.value, v = clean(before);
        if (v !== before) {
          input.value = v;
          const p = Math.max(0, Math.min(v.length, pos - (before.length - v.length)));
          try { input.setSelectionRange(p, p); } catch (e) { /* noop */ }
        }
      });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const v = clean(input.value);
        location.href = `${ONB}${v ? `?nick=${encodeURIComponent(v)}` : ''}#onboarding`;
      });
    });
  }

  /* ── Смена «меньше движения» на лету ─────────────────────────────────── */
  const onMQ = () => {
    RM = mq.matches;
    loops.forEach((l) => l.sync());
    wallSync();
    if (RM) {
      rv.forEach((n) => n.classList.add('in'));
      const fh = $('#final-title'); if (fh) fh.classList.add('is-in');
      const fn = $('#fan'); if (fn) fn.classList.add('is-ready');
      $$('.res__i').forEach((c) => c.classList.remove('is-soft'));
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ);
})();


/* ══ блок how-3 ══ */
/* Как работает EventMatch · вариант N: шаги слева переключают живую карточку справа.
   Автосмена по окончании полоски шага (≈ 4,6 с; у поиска — 5,6 с, чтобы успел напечататься запрос);
   пауза при наведении, фокусе, вне экрана и при скрытой вкладке; клик по шагу — переключение.
   «Меньше движения» — без автосмены и печати, переключение только кликом. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="how-3"]');
  if (!root) return;
  const steps = Array.from(root.querySelectorAll('.how3__step'));
  const btns = steps.map((s) => s.querySelector('.how3__btn'));
  const scrs = Array.from(root.querySelectorAll('.how3__scr'));
  const find = root.querySelector('.how3__scr--find');
  const q = root.querySelector('.how3__q');
  const QUERY = q.textContent;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = !RM && 'IntersectionObserver' in window;
  let cur = 0, typeT = 0, visible = false, hovered = false, focused = false;

  // запрос в поиске печатается заново (≈ 1 с) при каждом показе экрана; выдача видна приглушённой и проявляется в конце
  const typeQuery = () => {
    clearTimeout(typeT);
    if (!live) { q.textContent = QUERY; find.classList.add('is-found'); return; }
    find.classList.remove('is-found');
    find.classList.add('is-typing');
    q.textContent = '';
    let n = 0;
    const tick = () => {
      q.textContent = QUERY.slice(0, ++n);
      if (n < QUERY.length) typeT = setTimeout(tick, 20);
      else { find.classList.remove('is-typing'); typeT = setTimeout(() => find.classList.add('is-found'), 120); }
    };
    typeT = setTimeout(tick, 300);
  };

  const show = (i) => {
    if (i === cur) return;
    cur = i;
    steps.forEach((s, n) => {
      s.classList.toggle('is-on', n === i);
      btns[n].setAttribute('aria-expanded', String(n === i));
    });
    scrs.forEach((s, n) => s.classList.toggle('is-on', n === i));
    if (i === 1) typeQuery();
  };
  btns.forEach((b, n) => b.addEventListener('click', () => show(n)));
  find.classList.add('is-found');                     // без скрипта и до первого показа выдача видна

  if (!live) return;
  root.classList.add('is-live');
  const sync = () => root.classList.toggle('is-paused', !visible || hovered || focused || document.hidden);
  sync();
  // полоска активного шага дошла до конца — следующий шаг
  root.addEventListener('animationend', (e) => {
    if (e.animationName === 'how3-fill') show((cur + 1) % steps.length);
  });
  const grid = root.querySelector('.how3__grid');
  grid.addEventListener('pointerenter', () => { hovered = true; sync(); });
  grid.addEventListener('pointerleave', () => { hovered = false; sync(); });
  root.addEventListener('focusin', () => { focused = true; sync(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { focused = false; sync(); } });
  new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; sync(); }), { threshold: 0.35 }).observe(grid);
  document.addEventListener('visibilitychange', sync);
})();


/* ══ блок fill-3 ══ */
/* Заполни сам — или доверь ИИ · вариант 3 (N): конвейер «что даёшь → ИИ-редактор → что получаешь».
   Метки полей бегут по пунктиру от узла к карточке; когда метка доходит — поле появляется с пометкой источника.
   Ролик идёт, только когда блок на экране и вкладка открыта; курсор на конвейере — пауза; «меньше движения» — сразу итог. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="fill-3"]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  const belt = $('.fill3__belt');
  const pipe = $('.fill3__pipe');
  const steps = $$('.fill3__step');
  const replay = $('[data-fill3-replay]');
  const url = $('[data-k="url"]');
  const nick = $('[data-k="nick"]');
  const link = $('.fill3__link');
  const shots = $$('.fill3__shot');
  const flies = $$('.fill3__fly');

  // Сценарий, мс. Метки летят 900 мс; поле появляется, когда метка долетела.
  const FLY = 900;
  const FLY_AT = { name: 3000, svc: 3700, cities: 4400, works: 5100 };
  const ARRIVE = {};
  Object.keys(FLY_AT).forEach((k) => { ARRIVE[k] = FLY_AT[k] + FLY; });
  const STEP_AT = [0, 1500, 6600];
  const END = 9200;
  const GAP = { svc: 110, works: 110 };
  const seen = {};
  const fields = $$('.fill3__f').map((n) => {
    const k = n.dataset.k;
    seen[k] = (seen[k] ?? -1) + 1;
    return [n, ARRIVE[k] + (GAP[k] ? seen[k] * GAP[k] : 0)];
  });

  // путь меток: от узла почти до карточки — метка гаснет за STOP px до её края и не наезжает на рамку и тень;
  // меряем при старте, ресайзе и смене оформления
  const STOP = 28;
  let span = 0;
  const widths = new Map();
  const measure = () => {
    span = pipe.clientWidth / 2 - 32 - STOP;
    flies.forEach((f) => widths.set(f, f.offsetWidth));
  };

  const type = (node, t0, t, speed) => {
    const full = node.dataset.text;
    const n = t < t0 ? 0 : Math.min(full.length, Math.floor((t - t0) / speed) + 1);
    const s = full.slice(0, n);
    if (node.textContent !== s) node.textContent = s;
    node.classList.toggle('is-typing', t >= t0 - 250 && n < full.length && t < END);
  };

  const render = (t) => {
    type(url, 0, t, 75);
    shots.forEach((s, i) => {
      s.classList.toggle('on', t >= 300 + i * 300);
      const r = 1800 + i * 400;
      s.classList.toggle('is-read', t >= r && t < r + 550);
    });
    link.classList.toggle('is-read', t >= 1500 && t < 2050);
    root.classList.toggle('is-ingest', t >= 1500 && t < 3000);
    root.classList.toggle('is-work', t >= 1500 && t < 6400);
    root.classList.toggle('is-ok', t >= 6400);
    const st = t < 1500 ? '' : t < 3000 ? 'read' : t < 6400 ? 'fill' : 'done';
    if (root.dataset.st !== st) root.dataset.st = st;

    flies.forEach((f) => {
      const p = clamp((t - FLY_AT[f.dataset.k]) / FLY);
      const x = ease(p) * Math.max(0, span - (widths.get(f) || 60));
      f.style.transform = `translateX(${x.toFixed(1)}px)`;
      f.style.opacity = p <= 0 || p >= 1 ? '0' : String(Math.min(1, p * 8, (1 - p) * 8));
    });
    fields.forEach(([n, at]) => { n.classList.toggle('on', t >= at); n.classList.toggle('is-new', t >= at && t < at + 900 && t < END); });

    type(nick, 6800, t, 90);
    root.classList.toggle('is-press', t >= 7900 && t < 8200);
    root.classList.toggle('is-pub', t >= 8200);

    const s = t < STEP_AT[1] ? 0 : t < STEP_AT[2] ? 1 : 2;
    steps.forEach((li, i) => {
      li.classList.toggle('is-on', i === s);
      const to = i < 2 ? STEP_AT[i + 1] : END;
      li.style.setProperty('--p', (i < s ? 1 : i > s ? 0 : clamp((t - STEP_AT[i]) / (to - STEP_AT[i]))).toFixed(3));
    });
  };

  root.classList.add('is-demo');
  let t = RM ? END : 0;
  let run = false, inView = false, hover = false, raf = 0, last = 0;
  const frame = (now) => {
    t = Math.min(END, t + Math.min(64, now - last));
    last = now;
    render(t);
    if (t >= END) { sync(); return; }
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const should = !RM && inView && !hover && !document.hidden && t < END;
    if (should !== run) {
      run = should;
      root.classList.toggle('is-run', run);
      if (run) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    }
    root.classList.toggle('is-over', !RM && t >= END);
  };

  measure();
  render(t);
  addEventListener('resize', () => { measure(); render(t); });
  document.addEventListener('skinchange', () => requestAnimationFrame(() => { measure(); render(t); }));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); render(t); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.4 }).observe(root);
  } else { inView = true; }
  document.addEventListener('visibilitychange', sync);
  belt.addEventListener('pointerenter', () => { hover = true; sync(); });
  belt.addEventListener('pointerleave', () => { hover = false; sync(); });
  replay.addEventListener('click', () => { t = 0; render(t); sync(); });
  sync();
})();


/* ══ блок vozmozhnosti ══ */
/* 6. Возможности: вкладки (клавиатура как у tablist), тарифы курса и окна консультации.
   Без автосмены: одна панель видна, переключает только человек. Каскад карточек — один раз, когда блок дошёл до экрана. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="vozmozhnosti"]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // блок на экране — карточки первой вкладки поднимаются каскадом; дальше каскад идёт при каждой смене вкладки
  const seen = () => root.classList.add('is-seen');
  if (RM || !('IntersectionObserver' in window)) seen();
  else {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); seen(); } }, { threshold: 0.25 });
    io.observe($('.caps__panels'));
  }

  // вкладки
  const tabs = $$('.caps__tab');
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (panels[k]) { panels[k].classList.toggle('is-on', on); panels[k].setAttribute('aria-hidden', String(!on)); }
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', (e) => { e.preventDefault(); select(i, false); });
    t.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });
  });
  const fromHash = panels.findIndex((p) => p && location.hash === `#${p.id}`);
  select(fromHash >= 0 ? fromHash : 0, false);

  // «Свои курсы»: тариф → сумма тебе с продажи (комиссия 7%)
  const FEE = 0.07;
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
  const net = $('[data-caps-net]'), live = $('[data-caps-live]');
  const tar = $$('.caps__tar button');
  tar.forEach((b) => b.addEventListener('click', () => {
    tar.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const v = money(Number(b.dataset.price) * (1 - FEE));
    net.textContent = v;
    live.textContent = `Тебе с продажи ${v}`;
  }));

  // «Разбор»: выбор окна консультации
  const slots = $$('.caps__slots button');
  slots.forEach((b) => b.addEventListener('click', () => slots.forEach((x) => x.setAttribute('aria-pressed', String(x === b)))));
})();


/* ══ блок efiry ══ */
/* 7. Календарь эфиров из J: месяц / полгода / список, фильтры, «мои записи», панель выбранного эфира.
   Даты прототипа зафиксированы: открыт октябрь 2026 и эфир Анастасии в среду, 28 октября, 19:00.
   «Сегодня» — настоящая дата, пока она в 1–27 октября 2026, иначе 22 октября: эфир Анастасии всегда впереди. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="efiry"]');
  if (!root) return;
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => Array.from(r.querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const NB = ' ';
  const ONB = 'https://adhappyday2017-cell.github.io/eventmatch-prototype/#onboarding';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };
  const once = (target, cb, threshold = 0.3) => {
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); cb(); } }, { threshold });
    io.observe(target);
  };

  /* ── Даты ── */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const REAL = ymd(new Date());
  const TODAY = REAL >= '2026-10-01' && REAL <= '2026-10-27' ? REAL : '2026-10-22';
  const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const WDF = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const ymOf = (s) => s.slice(0, 7);
  const ymLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
  const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

  /* ── Расписание прототипа. Эфиры только в будни: выходные закрывает панель эфира ── */
  const TOPICS = ['Фото', 'Видео и reels', 'Ведущие', 'Образ', 'Организация и декор'];
  const FORMATS = ['Эфир', 'Мастер-класс', 'Разбор', 'Офлайн-встреча'];
  const AUDIENCE = { 'Фото': 'Фотографы и видеографы', 'Видео и reels': 'Видеографы и reels-мейкеры', 'Ведущие': 'Ведущие и организаторы', 'Образ': 'Визажисты и стилисты', 'Организация и декор': 'Организаторы и декораторы' };
  const NASTYA = { name: 'Анастасия Агапова', role: 'свадебный и женский фотограф', ava: 'img/efiry/nastya-96.webp' };
  const EVENTS = [
    { id: 's1', d: '2026-09-15', t: '19:00', title: 'Первый танец в темноте: как снимать', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', rec: true },
    { id: 's2', d: '2026-09-22', t: '19:00', title: 'Прайс ведущего: из чего складывается', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир', rec: true },
    { id: 's3', d: '2026-09-29', t: '12:00', title: 'Разбор портфолио визажистов', host: 'визажист', topic: 'Образ', fmt: 'Разбор', rec: true },
    { id: 'e1', d: '2026-10-01', t: '19:00', title: 'Тайминг свадебного дня без паники', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e2', d: '2026-10-02', t: '19:00', title: 'Свет в банкетном зале без вспышки', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', rec: true },
    { id: 'e3', d: '2026-10-06', t: '12:00', title: 'Макияж, который держится до утра', host: 'визажист', topic: 'Образ', fmt: 'Мастер-класс', rec: true, dur: '2 часа' },
    { id: 'e4', d: '2026-10-07', t: '20:00', title: 'Reels прямо на площадке', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e5', d: '2026-10-09', t: '19:00', title: 'Первые пять минут ведущего', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e6', d: '2026-10-13', t: '12:00', title: 'Разбор портфолио: свадебный репортаж', host: 'фотограф', topic: 'Фото', fmt: 'Разбор', rec: true, dur: '2 часа' },
    { id: 'e7', d: '2026-10-14', t: '19:00', title: 'Свадебные причёски: тренды сезона', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир', rec: true },
    { id: 'e8', d: '2026-10-15', t: '18:00', title: 'Звук на церемонии: петлички и запас', host: 'видеограф', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e9', d: '2026-10-20', t: '11:00', title: 'Свет в студии: мастер-класс вживую', host: 'фотограф', topic: 'Фото', fmt: 'Офлайн-встреча', off: true, city: 'Краснодар' },
    { id: 'e10', d: '2026-10-21', t: '19:00', title: 'Как ставить цену на съёмку', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', rec: true },
    { id: 'e11', d: '2026-10-23', t: '19:00', title: 'Декор стола: свечи, свет и текстиль', host: 'декоратор', topic: 'Организация и декор', fmt: 'Эфир', mine: true },
    { id: 'e12', d: '2026-10-26', t: '20:00', title: 'Смета свадьбы без сюрпризов', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e13', d: '2026-10-27', t: '12:00', title: 'Ведущий и диджей: как делить вечер', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор', dur: '2 часа' },
    { id: 'e14', d: '2026-10-28', t: '19:00', title: 'Женский портрет: свет из\u00a0окна', host: NASTYA, topic: 'Фото', fmt: 'Эфир', who: 'Фотографы и визажисты' },
    { id: 'e15', d: '2026-10-29', t: '19:00', title: 'Как упаковать первый мастер-класс', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'e16', d: '2026-10-30', t: '11:00', title: 'Совместная съёмка: модель, визажист, фотограф', host: 'визажист', topic: 'Образ', fmt: 'Офлайн-встреча', off: true, city: 'Москва', who: 'Модели, визажисты, фотографы' },
    { id: 'n1', d: '2026-11-03', t: '19:00', title: 'Сколько стоит твой разбор', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир' },
    { id: 'n2', d: '2026-11-05', t: '18:00', title: 'Разбор портфолио ведущих', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор', dur: '2 часа' },
    { id: 'n3', d: '2026-11-11', t: '19:00', title: 'Reels из бэкстейджа: монтаж за вечер', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир' },
    { id: 'n4', d: '2026-11-18', t: '19:00', title: 'Итоги сезона: что покупали коллеги', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'n5', d: '2026-11-25', t: '19:00', title: 'Зимний свет: съёмка на улице', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'd1', d: '2026-12-09', t: '19:00', title: 'Планируем сезон: цены и календарь', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'd2', d: '2026-12-16', t: '19:00', title: 'Корпоративы: сценарий ведущего', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир' },
    { id: 'j1', d: '2027-01-20', t: '19:00', title: 'Портфолио к сезону: что обновить', host: 'фотограф', topic: 'Фото', fmt: 'Разбор', dur: '2 часа' },
    { id: 'f1', d: '2027-02-17', t: '19:00', title: 'Весенние образы: причёски и макияж', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир' },
    { id: 'm1', d: '2027-03-17', t: '19:00', title: 'Свадебный фильм за выходные', host: 'видеограф', topic: 'Видео и reels', fmt: 'Эфир' }
  ];

  /* ── Узлы ── */
  const cal = $('#lv-cal'), body = $('#lv-body'), mLabel = $('#lv-m'), resetB = $('#lv-reset');
  const epn = $('#lv-epn'), kickEl = $('#lv-epn-kick'), bodyEl = $('#lv-epn-b'), footEl = $('.epn__f', epn), closeB = $('#lv-epn-x'), liveEl = $('#lv-epn-live');
  const prevB = $('#lv-prev'), nextB = $('#lv-next'), mineB = $('#lv-mine');
  const segB = $$('.cal__seg button');
  const RANGE = ['2026-09', '2027-03'];
  const HALF_FROM = ymOf(TODAY);
  const state = { ym: '2026-10', view: 'month', topics: [], fmts: [], mine: false, sel: 'e14' };
  const ICON = (id, s = 12) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#lv-i-${id}"/></svg>`;
  const byId = (id) => EVENTS.find((e) => e.id === id);
  const isPast = (e) => e.d < TODAY;
  const hostName = (e) => (typeof e.host === 'string' ? e.host : e.host.name);
  const filtered = (list) => list.filter((e) => (!state.topics.length || state.topics.includes(e.topic)) && (!state.fmts.length || state.fmts.includes(e.fmt)) && (!state.mine || e.mine));
  const monthEvents = (ym) => EVENTS.filter((e) => ymOf(e.d) === ym);
  const dateText = (e) => { const dt = parse(e.d); return `${dt.getDate()} ${MONTHS_G[dt.getMonth()]}`; };

  /* ── Выпадашки «Все темы» / «Все форматы» ── */
  const dds = [
    { key: 'topics', all: 'Все темы', few: 'Темы', list: TOPICS, det: $('#lv-dd-topic'), lbl: $('#lv-dd-topic-l'), box: $('#lv-dd-topic-list') },
    { key: 'fmts', all: 'Все форматы', few: 'Форматы', list: FORMATS, det: $('#lv-dd-fmt'), lbl: $('#lv-dd-fmt-l'), box: $('#lv-dd-fmt-list') }
  ];
  const renderDd = (dd) => {
    const sel = state[dd.key];
    dd.box.innerHTML = dd.list.map((v) => `<button type="button" aria-pressed="${sel.includes(v)}" data-v="${esc(v)}"><span class="live__ddx">${ICON('check', 13)}</span>${esc(v)}</button>`).join('');
    dd.lbl.textContent = !sel.length ? dd.all : sel.length === 1 ? sel[0] : `${dd.few} · ${sel.length}`;
    dd.det.classList.toggle('is-on', sel.length > 0);
  };
  dds.forEach((dd) => {
    renderDd(dd);
    dd.box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      const v = b.dataset.v, arr = state[dd.key], i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      renderDd(dd);
      draw();
    });
  });
  document.addEventListener('click', (e) => { dds.forEach((dd) => { if (dd.det.open && !dd.det.contains(e.target)) dd.det.open = false; }); });

  /* ── Вид «Месяц» ── */
  // чип эфира: время, значок офлайна и название одним абзацем, дальше многоточие.
  // «Ты записан» рамкой не выделяем (легенды нет): выделен только выбранный эфир; запись видна в панели, списке и по тумблеру «Мои записи»
  const chip = (e, k) => `<button type="button" style="--d:${k * 40}ms" class="cch${isPast(e) ? ' past' : ''}${state.sel === e.id && cal.classList.contains('is-open') ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}" title="${esc(e.title)}" aria-label="${esc(e.title)}, ${dateText(e)}, ${e.t}${e.off ? ', офлайн' : ''}${e.mine ? ', ты записан' : ''}"><span class="cch__x"><b>${e.t}</b><wbr>${e.off ? ICON('pin') : ''}${esc(e.title)}</span></button>`;
  let gridSeen = false;
  const drawMonth = (shown, all) => {
    const [y, m] = state.ym.split('-').map(Number);
    const first = new Date(y, m - 1, 1), lastD = new Date(y, m, 0);
    const map = {};
    shown.forEach((e) => { (map[e.d] = map[e.d] || []).push(e); });
    const d = new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7));
    const rows = [];
    let k = 0;
    while (d <= lastD) {
      let cells = '';
      for (let i = 0; i < 7; i += 1) {
        const key = ymd(d), out = d.getMonth() !== m - 1, evs = map[key] || [], today = key === TODAY, past = key < TODAY;
        cells += `<div class="cd${out ? ' out' : ''}${today ? ' today' : ''}${past && !out ? ' past' : ''}${evs.length > 1 ? ' multi' : ''}"><span class="cd__n" aria-hidden="true">${d.getDate()}</span>${evs.map((e) => chip(e, k++)).join('')}</div>`;
        d.setDate(d.getDate() + 1);
      }
      rows.push(`<div class="cw">${cells}</div>`);
    }
    const empty = !shown.length ? `<div class="cal__empty" style="margin-top:12px"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'В этом месяце эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>` : '';
    body.innerHTML = `<div class="cgrid${rows.length > 5 ? ' cgrid--6' : ''}${gridSeen ? ' is-in' : ''}" id="lv-grid" aria-label="${ymLabel(state.ym)}"><div class="cw cw--h" aria-hidden="true">${WD7.map((w) => `<div class="cwd">${w}</div>`).join('')}</div>${rows.join('')}</div>${empty}`;
    if (!gridSeen) {
      const g = $('#lv-grid');
      if (RM || !hasIO) { g.classList.add('is-in'); gridSeen = true; }
      else once(g, () => { g.classList.add('is-in'); gridSeen = true; }, 0.25);
    }
  };

  /* ── Вид «Полгода»: при открытой панели — сетка 3 × 2 слева от неё ── */
  const drawHalf = () => {
    const months = Array.from({ length: 6 }, (_, i) => ymAdd(HALF_FROM, i));
    body.innerHTML = `<div class="chalf">${months.map((ym) => {
      const [y, m] = ym.split('-').map(Number);
      const evs = filtered(monthEvents(ym));
      const map = {};
      evs.forEach((e) => { (map[e.d] = map[e.d] || []).push(e); });
      const first = new Date(y, m - 1, 1), lastD = new Date(y, m, 0);
      const lead = (first.getDay() + 6) % 7;
      let cells = WD7.map((w) => `<span class="hmd hd">${w}</span>`).join('');
      for (let i = 0; i < lead; i += 1) cells += '<span class="hmd hid"></span>';
      for (let dd = 1; dd <= lastD.getDate(); dd += 1) {
        const key = `${ym}-${pad(dd)}`, has = map[key], today = key === TODAY, past = key < TODAY;
        const cls = `hmd${has ? ' has' : ''}${today ? ' today' : ''}${past ? ' past' : ''}`;
        cells += has ? `<button type="button" class="${cls}" data-day="${key}" aria-label="${dd} ${MONTHS_G[m - 1]}, ${has.length} ${plural(has.length, ['эфир', 'эфира', 'эфиров'])}">${dd}</button>` : `<span class="${cls}">${dd}</span>`;
      }
      return `<div class="hmo"><p class="hmo__t">${ymLabel(ym)}<small>${evs.length ? `${evs.length} ${plural(evs.length, ['эфир', 'эфира', 'эфиров'])}` : 'пока пусто'}</small></p><div class="hmo__g">${cells}</div></div>`;
    }).join('')}</div>`;
  };

  /* ── Вид «Список» ── */
  const drawList = (shown, all) => {
    const [, m] = state.ym.split('-').map(Number);
    if (!shown.length) { body.innerHTML = `<div class="cal__empty"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'Эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>`; return; }
    const days = [];
    shown.forEach((e) => { const g = days.find((x) => x.d === e.d); if (g) g.ev.push(e); else days.push({ d: e.d, ev: [e] }); });
    body.innerHTML = `<div class="clist">${days.map(({ d, ev }) => {
      const dt = parse(d);
      return `<div class="clist__d${d >= TODAY ? ' is-next' : ''}"><div class="clist__dt"><b>${dt.getDate()} ${MONTHS_G[m - 1].slice(0, 3)}</b>${WD[dt.getDay()]}${d === TODAY ? ' · сегодня' : ''}</div><div class="clist__ev">${ev.map((e) => `<button type="button" class="cer${isPast(e) ? ' past' : ''}${state.sel === e.id && cal.classList.contains('is-open') ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}"><span class="cer__t">${e.t}</span><span class="cer__m"><span class="cer__n">${esc(e.title)}</span><span class="cer__k">${esc(hostName(e))} · ${esc(e.fmt)}${e.off ? ` · ${esc(e.city)}` : ''}${e.mine ? ' · ты записан' : ''}</span></span>${e.off ? ICON('pin', 16) : ''}</button>`).join('')}</div></div>`;
    }).join('')}</div>`;
    // список начинается с ближайшего эфира: прошедшие — выше, их видно прокруткой
    const list = $('.clist', body), next = $('.clist__d.is-next', body);
    if (list && next) list.scrollTop = next.offsetTop - list.offsetTop - 2;
  };

  /* ── Панель выбранного эфира ── */
  const relText = (e) => {
    const days = Math.round((parse(e.d) - parse(TODAY)) / 864e5);
    if (days === 0) return 'сегодня';
    if (days === 1) return 'завтра';
    if (days > 1) return `через ${days}${NB}${plural(days, ['день', 'дня', 'дней'])}`;
    return e.rec ? 'есть запись' : 'уже прошёл';
  };
  let focusPanel = false;
  const drawEv = () => {
    const e = byId(state.sel);
    if (!e) return;
    const dt = parse(e.d);
    const past = isPast(e);
    const kick = `<span class="epn__tag">${esc(e.fmt)}</span><span>${esc(e.topic)}</span><span>${relText(e)}</span>`;
    const format = e.off ? `<b>Встреча вживую, 3${NB}часа</b><span>${esc(e.city)}, адрес${NB}— после записи</span>` : `<b>${esc(e.fmt)}, ${e.dur || `1,5${NB}часа`}</b><span>онлайн, вопросы в${NB}чате</span>`;
    const rows = `<dl class="epn__rows">
      <div><dt>Когда</dt><dd><b>${WDF[dt.getDay()]}, ${dateText(e)}</b><span>${e.t} мск${e.off ? ` · ${esc(e.city)}` : ' · онлайн'}</span></dd></div>
      <div><dt>Формат</dt><dd>${format}</dd></div>
      <div><dt>Для кого</dt><dd><b>${esc(e.who || AUDIENCE[e.topic])}</b><span>вход свободный</span></dd></div>
    </dl>`;
    const host = typeof e.host === 'string'
      ? `<div class="epn__host"><i>${ICON('users', 18)}</i><div><b>${esc(cap(e.host))}</b><span>ведёт практик, работает на${NB}событиях</span></div></div>`
      : `<div class="epn__host"><img src="${e.host.ava}" width="40" height="40" alt=""><div><b>${esc(e.host.name)}</b><span>${esc(e.host.role)}</span></div></div>`;
    const action = past
      ? (e.rec ? `<a class="btn" href="${ONB}">Смотреть запись</a>` : '')
      : (e.mine ? `<a class="btn btn--ghost" href="${ONB}">${ICON('check', 16)}${NB}Ты записан</a>` : `<a class="btn" href="${ONB}">Записаться</a>`) + `<a class="epn__ghost" href="${ONB}">${ICON('cal', 16)}В${NB}календарь</a>`;
    const note = past
      ? (e.rec ? `Запись и${NB}обучение спикера${NB}— в${NB}его профиле.` : `Эфир уже прошёл, записи нет.`)
      : `Запись останется в${NB}профиле спикера${NB}— там${NB}же его обучение.`;
    const paint = () => {
      kickEl.innerHTML = kick;
      bodyEl.innerHTML = `<h3 class="epn__h" id="lv-epn-h" tabindex="-1">${esc(e.title)}</h3>${rows}${host}`;
      footEl.innerHTML = `${action}<p class="epn__note">${note}</p>`;
      epn.classList.remove('is-swap');
      if (focusPanel) { focusPanel = false; const h = $('#lv-epn-h'); if (h) h.focus({ preventScroll: true }); }
    };
    liveEl.textContent = `${e.title}, ${WDF[dt.getDay()].toLowerCase()}, ${dateText(e)}, ${e.t}`;
    if (RM || !cal.classList.contains('is-open')) paint();
    else { epn.classList.add('is-swap'); setTimeout(paint, 170); }
  };
  const markSel = () => $$('[data-ev]', body).forEach((b) => { const on = b.dataset.ev === state.sel && cal.classList.contains('is-open'); b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', String(on)); });
  // фокус: открыли с клавиатуры — на заголовок панели; закрыли из панели — обратно на чип эфира
  const openEv = (id, byKeyboard = false) => { state.sel = id; focusPanel = byKeyboard; cal.classList.add('is-open'); drawEv(); markSel(); };
  const closeEv = () => {
    const wasInside = epn.contains(document.activeElement);
    cal.classList.remove('is-open'); markSel();
    if (wasInside) { const back = $(`[data-ev="${state.sel}"]`, body) || $('[data-ev]', body) || mLabel; if (back) back.focus({ preventScroll: true }); }
  };
  closeB.addEventListener('click', closeEv);
  // Esc — только внутри календаря: сначала закрывает список фильтра, потом панель
  cal.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const dd = dds.find((x) => x.det.open && x.det.contains(e.target));
    if (dd) { dd.det.open = false; $('summary', dd.det).focus(); e.stopPropagation(); return; }
    if (cal.classList.contains('is-open')) { closeEv(); e.stopPropagation(); }
  });

  /* ── Отрисовка и управление ── */
  const draw = () => {
    const half = state.view === 'half';
    const all = monthEvents(state.ym), shown = filtered(all);
    mLabel.textContent = half ? `${ymLabel(HALF_FROM)} – ${ymLabel(ymAdd(HALF_FROM, 5))}` : ymLabel(state.ym);
    prevB.disabled = half || state.ym <= RANGE[0];
    nextB.disabled = half || state.ym >= RANGE[1];
    resetB.hidden = !(state.topics.length || state.fmts.length || state.mine);
    if (half) drawHalf(); else if (state.view === 'list') drawList(shown, all); else drawMonth(shown, all);
  };
  body.addEventListener('click', (e) => {
    const ev = e.target.closest('[data-ev]');
    if (ev) { openEv(ev.dataset.ev, e.detail === 0); return; }
    const day = e.target.closest('[data-day]');
    if (day) {
      state.ym = ymOf(day.dataset.day);
      state.view = 'month';
      const first = filtered(EVENTS.filter((x) => x.d === day.dataset.day))[0];
      segB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
      draw();
      if (first) openEv(first.id);
    }
  });
  resetB.addEventListener('click', () => {
    state.topics = []; state.fmts = []; state.mine = false;
    mineB.setAttribute('aria-checked', 'false');
    dds.forEach(renderDd);
    draw();
    mineB.focus({ preventScroll: true });
  });
  // панель выбранного эфира закрывает только крестик: при смене месяца и вида («Месяц · Полгода · Список»)
  // выбор помнится, панель остаётся открытой — вернулись на «Месяц», эфир по-прежнему выделен и открыт
  prevB.addEventListener('click', () => { state.ym = ymAdd(state.ym, -1); draw(); });
  nextB.addEventListener('click', () => { state.ym = ymAdd(state.ym, 1); draw(); });
  segB.forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    segB.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  mineB.addEventListener('click', () => {
    state.mine = !state.mine;
    mineB.setAttribute('aria-checked', String(state.mine));
    draw();
  });
  // ссылки на эфир из других блоков страницы (data-ev-open="e14"): открыть месяц и панель
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ev-open]');
    if (!a) return;
    const ev = byId(a.dataset.evOpen);
    if (!ev) return;
    state.ym = ymOf(ev.d); state.view = 'month';
    segB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
    draw();
    openEv(ev.id);
  });
  draw();
  drawEv();
  markSel();
})();


/* ══ блок dohod ══ */
/* 8. Калькулятор дохода: формат → цена и число продаж → сумма к выплате за вычетом 7%.
   Пресеты цен — из I (research/16, 19.10.2026); обложка курса — «Настя 1» (img/fs, точка фокуса из img/fs/focal.json); статичная разметка = старт курса: 6 × 30 000 = 180 000 − 12 600 = 167 400 ₽.
   Сумма один раз «досчитывает» от нуля, когда блок дошёл до экрана; «меньше движения» — сразу итог. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="dohod"]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NB = ' ';
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')}${NB}₽`;
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const FEE = 0.07;
  const FORMATS = [
    { key: 'course', badge: 'Курс', title: 'Свадебная съёмка: 8\u00a0недель с\u00a0обратной связью', cover: 'img/fs/fs-nastya-1.webp', pos: '60% 17%',
      price: 30000, min: 15000, max: 90000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'] },
    { key: 'master', badge: 'Мастер-класс', title: 'Мастер-класс офлайн: съёмка в\u00a0студии', cover: 'img/dohod/ag-022-900.webp', pos: '39% 26%',
      price: 55000, min: 7900, max: 149900, step: 100, sales: 10, maxSales: 30, salesLabel: 'Мест в потоке', unit: ['место', 'места', 'мест'], note: '1 поток в месяц' },
    { key: 'video', badge: 'Видеоурок', title: 'Репортаж на\u00a0свадьбе: 1,5\u00a0часа', cover: 'img/dohod/ag-026-900.webp', pos: '61% 32%',
      price: 5900, min: 2990, max: 9900, step: 10, sales: 28, maxSales: 200, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'] },
    { key: 'review', badge: 'Разбор', title: 'Разбор портфолио: до\u00a03\u00a0часов один на\u00a0один', cover: 'img/dohod/ag-072-900.webp', pos: '51% 26%',
      price: 15000, min: 5000, max: 20000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Консультаций в месяц', unit: ['консультация', 'консультации', 'консультаций'] }
  ];

  const price = $('[data-calc-input="price"]'), sales = $('[data-calc-input="sales"]');
  const sumEl = $('[data-calc-sum]'), cover = $('[data-calc-cover]'), live = $('[data-calc-live]');
  const btns = $$('.calc__seg button');
  let shown = 0, anim = 0, cur = FORMATS[0], liveT = 0, swapT = 0;

  // скринридеру — одна фраза через полсекунды после того, как отпустили ползунок
  const announce = () => { clearTimeout(liveT); liveT = setTimeout(() => { live.textContent = `К выплате ${money(Number(price.value) * Number(sales.value) * (1 - FEE))} в месяц, до налога`; }, 500); };
  const fill = (input) => input.style.setProperty('--p', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  const countTo = (target) => {
    cancelAnimationFrame(anim);
    if (RM) { shown = target; sumEl.textContent = Math.round(target).toLocaleString('ru-RU'); return; }
    const from = shown, t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 420);
      shown = from + (target - from) * easeOut(k);
      sumEl.textContent = Math.round(shown).toLocaleString('ru-RU');
      if (k < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  };
  const update = (quiet) => {
    const p = Number(price.value), s = Number(sales.value), gross = p * s, fee = Math.round(gross * FEE), net = gross - fee;
    $('[data-calc-price]').textContent = money(p);
    $('[data-calc-sales]').textContent = String(s);
    $('[data-calc-price-text]').textContent = money(p);
    $('[data-calc-sales-text]').textContent = `${s}${NB}${plural(s, cur.unit)}${cur.note ? ` · ${cur.note}` : ` в${NB}месяц`}`;
    $('[data-calc-gross]').textContent = money(gross);
    $('[data-calc-fee]').textContent = `−${money(fee)}`;
    $('[data-calc-net]').textContent = money(net);
    fill(price); fill(sales);
    if (quiet) { shown = net; sumEl.textContent = Math.round(net).toLocaleString('ru-RU'); return; }
    countTo(net);
    announce();
  };
  const setFormat = (f, quiet) => {
    cur = f;
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === f.key)));
    $('[data-calc-badge]').textContent = f.badge;
    $('[data-calc-title]').textContent = f.title;
    $('[data-calc-sales-label]').textContent = f.salesLabel;
    Object.assign(price, { min: f.min, max: f.max, step: f.step });
    price.value = f.price;
    Object.assign(sales, { min: 1, max: f.maxSales, step: 1 });
    sales.value = f.sales;
    if (!cover.getAttribute('src').endsWith(f.cover)) {
      clearTimeout(swapT);
      cover.classList.add('is-swapping');
      swapT = setTimeout(() => {
        cover.onload = () => cover.classList.remove('is-swapping');
        cover.src = f.cover; cover.style.objectPosition = f.pos;
      }, RM ? 0 : 220);
    }
    update(quiet);
  };
  btns.forEach((b) => b.addEventListener('click', () => setFormat(FORMATS.find((f) => f.key === b.dataset.fmt))));
  $$('[data-calc-pick]').forEach((b) => b.addEventListener('click', () => {
    const t = btns.find((x) => x.dataset.fmt === b.dataset.calcPick);
    if (t) { t.click(); t.focus({ preventScroll: true }); }
  }));
  price.addEventListener('input', () => update());
  sales.addEventListener('input', () => update());
  setFormat(cur, true);

  // первый показ: сумма досчитывает от нуля, когда калькулятор на экране
  if (!RM && 'IntersectionObserver' in window) {
    const box = $('.calc__box');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const target = shown; shown = 0; countTo(target);
    }, { threshold: 0.4 });
    io.observe(box);
  }
})();


/* ══ блок reiting ══ */
/* 9. Рейтинг: пузыри плавают только пока блок на экране и вкладка открыта. «Меньше движения» — CSS выключает анимацию. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="reiting"]');
  if (!root) return;
  const box = root.querySelector('.fair__bubbles');
  let inView = !('IntersectionObserver' in window);
  const sync = () => box.classList.toggle('is-paused', document.hidden || !inView);
  if (!inView) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.05 }).observe(box);
  document.addEventListener('visibilitychange', sync);
  sync();
})();


/* ══ блок partner-3 ══ */
/* Программа для партнёров · вариант N.
   Точка медленно идёт по линии над карточками от шага к шагу; пройденная часть линии темнеет, карточка подсвечивается,
   когда точка до неё доходит (у четвёртой по шкале «24 месяца» проходят риски — это CSS по .is-on). После четвёртого шага точка гаснет и начинает сначала. Наведение на карточку — точка
   переходит к ней и ждёт. Пауза вне экрана и при скрытой вкладке; «меньше движения» — без точки, все шаги видны. */
(() => {
  'use strict';
  const root = document.querySelector('[data-block="partner-3"]');
  if (!root) return;
  const rail = root.querySelector('.pt3__rail');
  const line = root.querySelector('.pt3__line');
  const dot = root.querySelector('.pt3__dot');
  const fill = root.querySelector('.pt3__fill');
  const marks = Array.from(root.querySelectorAll('.pt3__mk'));
  const cards = Array.from(root.querySelectorAll('.pt3__card'));
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const N = cards.length;
  const MOVE = 1800, ARRIVE = 1350, HOLD = 2300, LAST = 3400;
  let cur = -1, timer = 0, lit = 0, seen = false, held = false;

  const light = (k) => {
    cards.forEach((c, j) => c.classList.toggle('is-on', j === k));
    marks.forEach((m, j) => m.classList.toggle('is-on', j <= k));
  };
  // точка к отметке k: jump — без проезда (появление у первого шага)
  const go = (k, jump) => {
    const from = cur;
    cur = k;
    line.classList.toggle('is-jump', !!jump);
    const x = `${(k / (N - 1)) * 100}%`;
    dot.style.left = x;
    fill.style.width = x;
    dot.classList.add('is-shown');
    fill.style.opacity = '1';
    clearTimeout(lit);
    if (jump || from === k) light(k);
    else { cards.forEach((c) => c.classList.remove('is-on')); lit = setTimeout(() => light(k), ARRIVE); }
  };

  const next = () => {
    if (cur === N - 1) {                       // круг пройден: точка и линия гаснут, всё сначала
      dot.classList.remove('is-shown');
      fill.style.opacity = '0';
      timer = setTimeout(() => {
        cur = -1; light(-1);
        go(0, true);
        timer = setTimeout(next, HOLD + 600);
      }, 800);
      return;
    }
    const k = cur + 1, first = cur === -1;
    go(k, first);
    timer = setTimeout(next, (first ? 0 : MOVE) + (k === N - 1 ? LAST : HOLD));
  };

  const play = () => {
    if (timer || rm.matches || !seen || document.hidden || held) return;
    timer = setTimeout(next, cur === -1 ? 500 : HOLD);
  };
  const pause = () => { clearTimeout(timer); timer = 0; };

  cards.forEach((c, j) => c.addEventListener('mouseenter', () => {
    if (rm.matches) return;
    held = true; pause();
    if (j !== cur) go(j, cur === -1);
  }));
  rail.addEventListener('mouseleave', () => { held = false; play(); });

  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver((es) => es.forEach((e) => {
    seen = e.isIntersecting;
    if (seen) play(); else pause();
  }), { threshold: 0.35 }).observe(rail);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else play(); });
  const onRm = () => {
    if (!rm.matches) { play(); return; }
    pause(); clearTimeout(lit); cur = -1; light(-1);
    dot.classList.remove('is-shown'); fill.style.width = '0';
  };
  if (rm.addEventListener) rm.addEventListener('change', onRm);
})();


/* Переключатели на плашке прототипа: оформление EventMatch ↔ «Галерея» (Figma) и форма кнопок «мягкие · круглые».
   Начальные значения ставит строчка в <head> (см. build.py: HEAD_SKIN) — до отрисовки, без мигания.
   Выбор помнится в браузере и дописывается в адрес и в ссылки на соседние варианты L/M/N (?skin=gallery&btn=pill).
   Форма кнопок видна и действует только в «Галерее»: в EventMatch кнопки всегда полукруглые. */
(() => {
  const root = document.documentElement;
  const bar = document.querySelector('.variant');
  if (!bar) return;
  const group = (cls, label, html) => {
    const box = document.createElement('span');
    box.className = cls;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', label);
    box.innerHTML = html;
    bar.appendChild(box);
    return box;
  };
  const skinBox = group('variant__skin', 'Оформление',
    '<button type="button" data-skin="em">EventMatch</button><button type="button" data-skin="gallery">Галерея</button>');
  const btnBox = group('variant__btn', 'Кнопки',
    '<span aria-hidden="true">Кнопки:</span><button type="button" data-btn="soft">мягкие</button><button type="button" data-btn="pill">круглые</button>');

  const state = () => ({ skin: root.dataset.skin === 'gallery' ? 'gallery' : 'em', btn: root.dataset.btn === 'pill' ? 'pill' : 'soft' });
  // ?skin=gallery и ?btn=pill — только непустые отличия от значений по умолчанию;
  // btn=pill — только в «Галерее» (в EventMatch он ни на что не влияет), сам выбор помнится в браузере
  const mark = (u, { skin, btn }) => {
    if (skin === 'gallery') u.searchParams.set('skin', 'gallery'); else u.searchParams.delete('skin');
    if (skin === 'gallery' && btn === 'pill') u.searchParams.set('btn', 'pill'); else u.searchParams.delete('btn');
    return u;
  };
  const paint = (save) => {
    const st = state();
    skinBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skin === st.skin)));
    btnBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.btn === st.btn)));
    // ссылки на L/M/N несут оформление и кнопки дальше; на старые варианты A–K — без параметров.
    // Исходный адрес («../m/») хранится в data-base: после первой подстановки href уже абсолютный.
    bar.querySelectorAll('a').forEach((a) => {
      if (!a.dataset.base) a.dataset.base = a.getAttribute('href') || '';
      if (!a.dataset.base.startsWith('../')) return;
      const u = new URL(a.dataset.base, location.href);
      if (/\/(l|m|n)\/$/.test(u.pathname)) a.href = mark(u, st).href;
    });
    if (save) {
      try { localStorage.setItem('em-skin', st.skin); localStorage.setItem('em-btn', st.btn); } catch (e) { /* приватный режим — просто не помним */ }
      history.replaceState(null, '', mark(new URL(location.href), st).href);
      document.dispatchEvent(new CustomEvent('skinchange', { detail: st }));
    }
  };
  skinBox.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-skin]');
    if (b) { root.dataset.skin = b.dataset.skin; paint(true); }
  });
  btnBox.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-btn]');
    if (b) { root.dataset.btn = b.dataset.btn; paint(true); }
  });
  root.dataset.skin = state().skin;
  root.dataset.btn = state().btn;
  paint(false);
})();
