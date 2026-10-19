/* EventMatch — итоговая главная (вариант F). Без библиотек; без скрипта страница тоже полная. */
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
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };

  /* ── Данные ─────────────────────────────────────────────────────────── */
  // Подписи к снимкам профессий: только профессия и город (имена не придумываем).
  const AG = { name: 'Анастасия Агапова', meta: 'фотограф · Санкт‑Петербург' };
  const ROLE = {
    'r-video': ['Видеограф', 'Краснодар'], 'r-reels': ['Reels-мейкер', 'Сочи'], 'r-reels2': ['Reels-мейкер', 'Москва'],
    'r-host': ['Ведущий', 'Казань'], 'r-makeup': ['Визажист', 'Москва'], 'r-makeup2': ['Визажист', 'Новосибирск'],
    'r-hair': ['Стилист по волосам', 'Екатеринбург'], 'r-model': ['Модель', 'Санкт‑Петербург'],
    'r-organizer': ['Организатор', 'Нижний Новгород'], 'r-decor': ['Декоратор', 'Москва']
  };
  const capOf = (id) => (id.startsWith('ag-') ? [AG.name, AG.meta] : [ROLE[id][0], ROLE[id][1]]);

  // Умный поиск: запрос → шесть карточек (не больше трёх работ Анастасии в наборе)
  const QUERIES = [
    { q: 'визажист и стилист на творческую съёмку в субботу', ids: ['r-makeup', 'r-hair', 'r-makeup2', 'r-model', 'ag-38', 'r-decor'] },
    { q: 'свободный фотограф на вторник, Петербург', ids: ['ag-61', 'ag-08', 'ag-27', 'r-model', 'ag-43', 'r-video'] },
    { q: 'ведущий и reels-мейкер на вечеринку', ids: ['r-host', 'r-reels2', 'r-reels', 'r-video', 'r-organizer', 'r-decor'] },
    { q: 'модель на мастер-класс по свету', ids: ['r-model', 'ag-05', 'ag-60', 'r-makeup', 'r-hair', 'ag-13'] }
  ];

  // Калькулятор дохода. Форматы и ориентиры цен — по research/10 и research/11:
  // курс 30–150 тыс., мастер-класс/интенсив 20–150 тыс., разбор портфолио 15–20 тыс., пресеты 2–10 тыс.
  // Поменять форматы или цены — только здесь. min кратен step, иначе ползунок сдвигает значение.
  const FEE = 0.15;
  // Форматы и цены — по аналитике research/16 (GetCourse и что продают исполнители, 19.10.2026).
  // min кратен step, иначе ползунок сдвигает цену (5 900 → 5 890)
  const CALC_FORMATS = [
    { key: 'course', label: 'Курс', lead: 'Твой курс может приносить', badge: 'Курс', title: 'Свадебная съёмка: от первого контакта до альбома', cover: 'img/t/w-ag-16.webp', price: 30000, min: 10000, max: 150000, step: 500, sales: 6, maxSales: 40, hint: 'Курсы практиков в записи с обратной связью стоят от 15 до 90 тысяч. Курс продаёт больше половины исполнителей, которые учат коллег.' },
    { key: 'master', label: 'Мастер-класс', lead: 'Твой мастер-класс может приносить', badge: 'Мастер-класс', title: 'Свадебный фотограф: два дня практики', cover: 'img/t/w-ag-38.webp', price: 55000, min: 5000, max: 150000, step: 500, sales: 10, maxSales: 40, hint: 'Двухдневный мастер-класс для фотографов — около 55 тысяч за место при группе до 15 человек. Интенсивы бывают и за 100–150 тысяч.' },
    { key: 'video', label: 'Видеоурок', lead: 'Твой видеоурок может приносить', badge: 'Видеоурок', title: 'Репортаж на свадьбе: 1,5 часа без воды', cover: 'img/t/w-ag-27.webp', price: 5900, min: 1000, max: 20000, step: 100, sales: 28, maxSales: 200, hint: 'Реальный пример: видеоурок на 1,5 часа за 5 900 ₽ принёс знакомому фотографу около 2 млн ₽ — примерно 340 продаж, он продавал через свой сайт.' },
    { key: 'review', label: 'Разбор портфолио', lead: 'Твои разборы могут приносить', badge: 'Разбор', title: 'Разбор портфолио: два часа один на один', cover: 'img/t/w-ag-60.webp', price: 15000, min: 3000, max: 30000, step: 500, sales: 6, maxSales: 40, hint: 'Разбор портфолио или консультация у практика — 15–20 тысяч за 2–3 часа. Почти без подготовки, подходит, даже если курса пока нет.' }
  ];

  // Календарь эфиров: темы исполнителей. Сегодня — 19.10.2026 (понедельник).
  const TODAY = '2026-10-19';
  const TOPICS = ['Фото', 'Видео и reels', 'Образ', 'Ведущие', 'Организация и декор'];
  const FORMATS = ['Эфир', 'Мастер-класс', 'Разбор', 'Офлайн-встреча'];
  const NASTYA = { name: 'Анастасия Агапова', role: 'фотограф', ava: 'img/t/nastya-96.webp' };
  const EVENTS = [
    { id: 'e1', d: '2026-09-24', t: '19:00', title: 'Тайминг свадебного дня без паники', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e2', d: '2026-10-01', t: '19:00', title: 'Свет в банкетном зале без вспышки', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', rec: true },
    { id: 'e3', d: '2026-10-03', t: '12:00', title: 'Макияж, который держится до утра', host: 'визажист', topic: 'Образ', fmt: 'Мастер-класс', rec: true },
    { id: 'e4', d: '2026-10-06', t: '20:00', title: 'Reels прямо на площадке', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e5', d: '2026-10-08', t: '19:00', title: 'Первые пять минут ведущего', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e6', d: '2026-10-10', t: '12:00', title: 'Разбор портфолио: свадебный репортаж', host: 'фотограф', topic: 'Фото', fmt: 'Разбор', rec: true },
    { id: 'e7', d: '2026-10-14', t: '19:00', title: 'Свадебные причёски: тренды сезона', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир', rec: true },
    { id: 'e8', d: '2026-10-15', t: '18:00', title: 'Звук на церемонии: петлички и запас', host: 'видеограф', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e9', d: '2026-10-17', t: '11:00', title: 'Свет в студии: мастер-класс вживую', host: 'фотограф', topic: 'Фото', fmt: 'Офлайн-встреча', off: true, city: 'Санкт‑Петербург' },
    { id: 'e10', d: '2026-10-20', t: '19:00', title: 'Как ставить цену на съёмку', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', mine: true },
    { id: 'e11', d: '2026-10-22', t: '19:00', title: 'Декор стола: свечи, свет и текстиль', host: 'декоратор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e12', d: '2026-10-24', t: '11:00', title: 'Совместная съёмка: модель, визажист, фотограф', host: 'визажист', topic: 'Образ', fmt: 'Офлайн-встреча', off: true, city: 'Москва' },
    { id: 'e13', d: '2026-10-27', t: '20:00', title: 'Смета свадьбы без сюрпризов', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e14', d: '2026-10-29', t: '19:00', title: 'Женский портрет: свет из окна', host: NASTYA, topic: 'Фото', fmt: 'Эфир' },
    { id: 'e15', d: '2026-10-31', t: '12:00', title: 'Ведущий и диджей: как делить вечер', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e16', d: '2026-11-05', t: '19:00', title: 'Reels для свадебного фотографа: три формата', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир' },
    { id: 'e17', d: '2026-11-12', t: '19:00', title: 'Макияж для съёмки при смешанном свете', host: 'визажист', topic: 'Образ', fmt: 'Мастер-класс' },
    { id: 'e18', d: '2026-11-19', t: '18:00', title: 'Разбор портфолио ведущих', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e19', d: '2026-11-26', t: '11:00', title: 'Встреча фотографов: съёмочный день вместе', host: 'фотограф', topic: 'Фото', fmt: 'Офлайн-встреча', off: true, city: 'Ростов‑на‑Дону' },
    { id: 'e20', d: '2026-12-03', t: '19:00', title: 'Итоги сезона: что покупали у исполнителей', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e21', d: '2026-12-10', t: '19:00', title: 'Зимний свет: съёмка на улице', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'e22', d: '2027-01-14', t: '19:00', title: 'Планируем сезон: цены и календарь', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e23', d: '2027-02-11', t: '19:00', title: 'Портфолио к сезону: что обновить', host: 'фотограф', topic: 'Фото', fmt: 'Разбор' },
    { id: 'e24', d: '2027-03-11', t: '19:00', title: 'Весенние образы: причёски и макияж', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир' }
  ];

  /* ── Общие помощники ────────────────────────────────────────────────── */
  const loops = [];
  // Цикл, который идёт только на экране, при открытой вкладке, без наведения и без «меньше движения»
  function makeLoop(target, step, delay, opts = {}) {
    let t = 0, vis = !hasIO, held = false, stopped = false, on = false;
    const ok = () => vis && !held && !stopped && !document.hidden && !RM;
    const sched = () => { clearTimeout(t); t = setTimeout(() => { if (!ok()) return; step(); sched(); }, delay()); };
    const sync = () => {
      const now = ok();
      if (now && !on) { on = true; sched(); opts.onRun && opts.onRun(true); }
      else if (!now && on) { on = false; clearTimeout(t); opts.onRun && opts.onRun(false); }
    };
    if (hasIO) new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; sync(); }, { threshold: opts.threshold ?? 0.25 }).observe(target);
    document.addEventListener('visibilitychange', sync);
    const api = { hold(v) { held = v; sync(); }, stop() { stopped = true; sync(); }, sync, get on() { return on; } };
    loops.push(api);
    return api;
  }
  // Пауза, пока на блок навели мышь или в нём стоит фокус
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
  // Общий тикер rAF: работает, пока есть активные компоненты
  const ticks = new Set();
  let rafId = 0, last = 0;
  const frame = (now) => { const dt = Math.min(64, now - last); last = now; ticks.forEach((f) => f(dt)); rafId = ticks.size ? requestAnimationFrame(frame) : 0; };
  const addTick = (f) => { ticks.add(f); if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); } };
  const delTick = (f) => ticks.delete(f);
  function autoplay(root, tick, opts = {}) {
    let inView = false, hovered = false, on = false;
    const sync = () => {
      const should = inView && !document.hidden && !hovered && !(opts.blocked && opts.blocked());
      if (should === on) return;
      on = should;
      if (on) addTick(tick); else delTick(tick);
    };
    if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: opts.threshold ?? 0.3 }).observe(root); else { inView = true; sync(); }
    document.addEventListener('visibilitychange', sync);
    (opts.hoverEls || []).forEach((h) => {
      h.addEventListener('pointerenter', () => { hovered = true; sync(); });
      h.addEventListener('pointerleave', () => { hovered = false; sync(); });
    });
    return { sync };
  }
  const once = (target, cb, threshold = 0.3) => {
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); cb(); } }, { threshold });
    io.observe(target);
  };
  // Эффекты, привязанные к прокрутке: считаем только когда элемент рядом с экраном
  const scrollFx = [];
  let queued = false;
  const runScroll = () => { queued = false; const vh = innerHeight; scrollFx.forEach((fx) => { if (fx.near) fx.fn(fx.el.getBoundingClientRect(), vh); }); };
  const queueScroll = () => { if (!queued) { queued = true; requestAnimationFrame(runScroll); } };
  const onScroll = (target, fn) => {
    const fx = { el: target, fn, near: !hasIO };
    scrollFx.push(fx);
    if (hasIO) new IntersectionObserver(([e]) => { fx.near = e.isIntersecting; if (fx.near) queueScroll(); }, { rootMargin: '200px 0px' }).observe(target);
  };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);

  /* ── Шапка: тень при прокрутке и активный раздел ─────────────────────── */
  const hdr = $('#hdr');
  const onHdr = () => hdr.classList.toggle('is-s', scrollY > 8);
  addEventListener('scroll', onHdr, { passive: true });
  onHdr();
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
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'luchshie', 'vozmozhnosti', 'poisk', 'znakomtes', 'efiry', 'konstruktor', 'dohod', 'chestno', 'partneram', 'final'].forEach((id) => { const n = document.getElementById(id); if (n) spy.observe(n); });
  }

  /* ── Появление при прокрутке ─────────────────────────────────────────── */
  const rv = $$('[data-rv]');
  rv.forEach((n) => {
    const sibs = Array.from(n.parentElement.children).filter((c) => c.hasAttribute('data-rv'));
    const i = sibs.indexOf(n);
    if (i > 0) n.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
  });
  if (hasIO && !RM) {
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -5% 0px', threshold: 0.1 });
    rv.forEach((n) => io.observe(n));
  } else rv.forEach((n) => n.classList.add('in'));
  document.addEventListener('focusin', (e) => { const r = e.target.closest && e.target.closest('[data-rv]'); if (r) r.classList.add('in'); });

  /* ── 2. Стена работ: наводка на резкость по мере появления ───────────── */
  {
    const items = $$('.wk');
    if (RM || !hasIO) items.forEach((n) => n.classList.add('is-f'));
    else {
      let batch = 0, batchAt = 0;
      const io = new IntersectionObserver((es) => {
        const now = performance.now();
        if (now - batchAt > 200) batch = 0;
        batchAt = now;
        es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left).forEach((e) => {
          const n = e.target;
          n.style.setProperty('--d', `${batch * 90}ms`);
          batch += 1;
          n.classList.add('is-f');
          setTimeout(() => n.style.removeProperty('--d'), 1800);
          io.unobserve(n);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.2 });
      items.forEach((n) => io.observe(n));
    }
  }

  /* ── 3. Вкладки возможностей ─────────────────────────────────────────── */
  {
    const tabs = $$('.tabs .tab');
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
  }

  /* ── 4. Умный поиск: запрос набирается, выдача наводится на резкость ─── */
  {
    const resBox = $('#res'), qText = $('#sbar-q'), chipsBox = $('#qchips');
    const sec = $('#poisk');
    const preload = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
    const ready = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })));
    const chips = QUERIES.map((q, i) => {
      const b = el('button', 'qchip', esc(q.q));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === 0));
      chipsBox.append(b);
      return b;
    });
    let qI = 0, cells = [], token = 0, typing = 0;
    const render = (i) => {
      resBox.innerHTML = QUERIES[i].ids.map((id) => {
        const [name, meta] = capOf(id);
        return `<li class="res__i"><div class="res__pic"><div class="res__in"><img class="res__s" src="img/t/f-${id}-s.webp" width="140" height="175" alt="" decoding="async"><img class="res__f" src="img/t/f-${id}-400.webp" width="400" height="500" alt="${esc(name)}" decoding="async"></div><i class="corners"></i></div><p class="res__cap"><b>${esc(name)}</b><span>${esc(meta)}</span></p></li>`;
      }).join('');
      cells = $$('.res__i', resBox);
      if (!RM) cells.forEach((c) => c.classList.add('is-soft'));
    };
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
    const typeQuery = (text) => new Promise((resolve) => {
      clearTimeout(typing);
      if (RM) { qText.textContent = text; resolve(); return; }
      let cur = qText.textContent;
      const erase = () => {
        if (cur.length) { cur = cur.slice(0, -1); qText.textContent = cur; typing = setTimeout(erase, 12); }
        else { let i = 0; const add = () => { i += 1; qText.textContent = text.slice(0, i); if (i < text.length) typing = setTimeout(add, 36); else resolve(); }; typing = setTimeout(add, 120); }
      };
      erase();
    });
    const setQuery = (i) => {
      qI = i;
      const tok = ++token;
      chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
      QUERIES[i].ids.forEach((id) => preload(`img/t/f-${id}-400.webp`));
      cells.forEach((c) => c.classList.add('is-soft'));
      typeQuery(QUERIES[i].q).then(() => {
        if (tok !== token) return;
        if (RM) { render(i); return; }
        resBox.classList.add('is-swap');
        setTimeout(() => {
          if (tok !== token) return;
          render(i);
          void resBox.offsetWidth;
          resBox.classList.remove('is-swap');
          focusIn();
        }, 200);
      });
    };
    render(0);
    QUERIES.forEach((q) => q.ids.forEach((id) => preload(`img/t/f-${id}-s.webp`)));
    if (RM || !hasIO) cells.forEach((c) => c.classList.remove('is-soft'));
    else once(resBox, () => focusIn(140), 0.35);
    const qLoop = makeLoop(resBox, () => setQuery((qI + 1) % QUERIES.length), () => 6200, { threshold: 0.35 });
    chips.forEach((c, k) => c.addEventListener('click', () => { qLoop.stop(); setQuery(k); }));
    holdWhile(qLoop, [resBox, $('.sbar', sec), chipsBox]);
  }

  /* ── 5a. Портрет: зум по мере прокрутки ──────────────────────────────── */
  {
    const pic = $('#meet-pic');
    if (!RM) onScroll(pic, (r, vh) => {
      const p = clamp((vh - r.top) / (vh * 0.85));
      pic.style.setProperty('--z', (1.14 - 0.14 * easeOut(p)).toFixed(4));
    });
    else pic.style.setProperty('--z', '1');
  }

  /* ── 5b. ИИ-редактор профиля: карточка собирает себя ─────────────────── */
  {
    const root = $('#aip'), card = $('#pc');
    const steps = $$('#aip-steps .step');
    const urlT = $('#pc-url'), nameT = $('#pc-name'), nickT = $('#pc-nick');
    const grid = $('#pc-grid');
    const btn = $('#pc-btn');
    const replay = $('#aip-replay');
    const WORKS = ['ag-08', 'ag-38', 'ag-60', 'ag-13', 'ag-03', 'ag-40'];
    const cells = WORKS.map((id) => {
      const c = el('span', 'pw');
      c.innerHTML = `<img class="pw__s" src="img/t/f-${id}-s.webp" alt="" decoding="async"><img class="pw__f" src="img/t/f-${id}-280.webp" alt="" decoding="async">`;
      grid.append(c);
      return c;
    });
    const fades = $$('.fade', card);
    const [role, cities, lbl, svc] = fades;
    const typed = (node, t0, t, speed) => {
      const full = node.dataset.text;
      const n = t < t0 ? 0 : Math.min(full.length, Math.floor((t - t0) / speed) + 1);
      const txt = full.slice(0, n);
      if (node.textContent !== txt) node.textContent = txt;
      node.classList.toggle('is-typing', t >= t0 - 200 && n < full.length);
    };
    const END = 8600;
    // чистый рендер состояния на момент t (мс): можно ставить на паузу и проигрывать заново
    const render = (t) => {
      typed(urlT, 0, t, 85);
      card.classList.toggle('is-reading', t >= 1500 && t < 6000);
      card.classList.toggle('has-ava', t >= 2500);
      typed(nameT, 2600, t, 52);
      role.classList.toggle('on', t >= 3700);
      cities.classList.toggle('on', t >= 3900);
      lbl.classList.toggle('on', t >= 4150);
      svc.classList.toggle('on', t >= 4300);
      card.classList.toggle('is-draft', t >= 3800 && t < 7900);
      cells.forEach((c, i) => { c.classList.toggle('on', t >= 4500 + i * 170); c.classList.toggle('sh', t >= 4800 + i * 170); });
      typed(nickT, 6400, t, 100);
      btn.classList.toggle('is-press', t >= 7600 && t < 7900);
      card.classList.toggle('is-pub', t >= 7900);
      const s = t < 2500 ? 0 : t < 6200 ? 1 : 2;
      steps.forEach((li, i) => { li.classList.toggle('is-on', i === s); li.classList.toggle('is-done', i < s || t >= END); });
    };
    if (RM) {
      render(1e9);
      replay.hidden = true;
      steps.forEach((li, i) => $('.step__t', li).addEventListener('click', () => {
        render([2400, 6100, 1e9][i]);
      }));
    } else {
      let t = 0, done = false;
      render(0);
      const tick = (dt) => {
        t += dt;
        if (t >= END) { t = END; done = true; render(1e9); replay.hidden = false; ctl.sync(); return; }
        render(t);
      };
      const ctl = autoplay(root, tick, { hoverEls: [card], threshold: 0.45, blocked: () => done });
      const restart = () => { t = 0; done = false; replay.hidden = true; render(0); ctl.sync(); };
      replay.addEventListener('click', restart);
      steps.forEach((li, i) => li.addEventListener('click', () => { t = [0, 2500, 6200][i]; done = false; replay.hidden = true; render(t); ctl.sync(); }));
    }
  }

  /* ── 6. Календарь эфиров ─────────────────────────────────────────────── */
  {
    const body = $('#cal-body'), mLabel = $('#cal-m'), sumEl = $('#cal-sum'), evBox = $('#ev');
    const prevB = $('#cal-prev'), nextB = $('#cal-next'), mineB = $('#cal-mine');
    const segB = $$('.cal__seg button');
    const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const ymOf = (s) => s.slice(0, 7);
    const ymLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
    const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
    const RANGE = ['2026-09', '2027-03'];
    const state = { ym: ymOf(TODAY), view: 'month', topics: [], fmts: [], mine: false, sel: 'e14' };
    const ICON = (id, s = 12) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const isPast = (e) => e.d < TODAY;
    const hostName = (e) => (typeof e.host === 'string' ? e.host : e.host.name);
    const filtered = (list) => list.filter((e) => (!state.topics.length || state.topics.includes(e.topic)) && (!state.fmts.length || state.fmts.includes(e.fmt)) && (!state.mine || e.mine));
    const monthEvents = (ym) => EVENTS.filter((e) => ymOf(e.d) === ym);

    // выпадашки «Все темы» / «Все форматы»
    const dds = [
      { key: 'topics', all: 'Все темы', few: 'Темы', list: TOPICS, det: $('#dd-topic'), lbl: $('#dd-topic-l'), box: $('#dd-topic-list') },
      { key: 'fmts', all: 'Все форматы', few: 'Форматы', list: FORMATS, det: $('#dd-fmt'), lbl: $('#dd-fmt-l'), box: $('#dd-fmt-list') }
    ];
    const renderDd = (dd) => {
      const sel = state[dd.key];
      dd.box.innerHTML = dd.list.map((v) => `<button type="button" role="menuitemcheckbox" aria-checked="${sel.includes(v)}" data-v="${esc(v)}"><span class="dd__box">${ICON('check', 13)}</span>${esc(v)}</button>`).join('');
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dds.forEach((dd) => { dd.det.open = false; }); });

    const chip = (e) => `<button type="button" class="cch${e.mine ? ' mine' : ''}${isPast(e) ? ' past' : ''}${state.sel === e.id ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}" title="${esc(e.title)}"><b>${e.t}</b>${e.rec ? ICON('check') : ''}${e.off ? ICON('pin') : ''}<span>${esc(e.title)}</span></button>`;

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
          cells += `<div class="cd${out ? ' out' : ''}${today ? ' today' : ''}${past ? ' past' : ''}" role="gridcell"><span class="cd__n">${d.getDate()}</span>${evs.map((e) => chip(e).replace('class="cch', `style="--d:${k++ * 45}ms" class="cch`)).join('')}</div>`;
          d.setDate(d.getDate() + 1);
        }
        rows.push(`<div class="cw" role="row">${cells}</div>`);
      }
      const empty = !shown.length ? `<div class="cal__empty" style="margin-top:14px"><b>${all.length ? 'Ничего не нашли по фильтрам' : `В ${MONTHS[m - 1].replace(/ь$/, 'е').replace(/й$/, 'е').replace(/т$/, 'те')} эфиров пока нет`}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>` : '';
      body.innerHTML = `<div class="cgrid${gridSeen ? ' is-in' : ''}" id="cgrid" role="grid" aria-label="${ymLabel(state.ym)}"><div class="cw cw--h" role="row">${WD7.map((w) => `<div class="cwd" role="columnheader">${w}</div>`).join('')}</div>${rows.join('')}</div>${empty}`;
      if (!gridSeen) {
        const g = $('#cgrid');
        if (RM || !hasIO) { g.classList.add('is-in'); gridSeen = true; }
        else once(g, () => { g.classList.add('is-in'); gridSeen = true; }, 0.25);
      }
    };
    let gridSeen = false;

    const drawHalf = () => {
      const start = ymOf(TODAY);
      const months = Array.from({ length: 6 }, (_, i) => ymAdd(start, i));
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
          const cls = `hmd${has ? ' has' : ''}${has && has.some((e) => e.mine) ? ' mine' : ''}${today ? ' today' : ''}${past ? ' past' : ''}`;
          cells += has ? `<button type="button" class="${cls}" data-day="${key}" aria-label="${dd} ${MONTHS_G[m - 1]}, ${has.length} ${plural(has.length, ['эфир', 'эфира', 'эфиров'])}">${dd}</button>` : `<span class="${cls}">${dd}</span>`;
        }
        return `<div class="hmo"><p class="hmo__t">${ymLabel(ym)}<small>${evs.length ? `${evs.length} ${plural(evs.length, ['эфир', 'эфира', 'эфиров'])}` : 'пока пусто'}</small></p><div class="hmo__g">${cells}</div></div>`;
      }).join('')}</div>`;
    };

    const drawList = (shown, all) => {
      const [, m] = state.ym.split('-').map(Number);
      if (!shown.length) { body.innerHTML = `<div class="cal__empty"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'Эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>`; return; }
      const days = [];
      shown.forEach((e) => { const g = days.find((x) => x.d === e.d); if (g) g.ev.push(e); else days.push({ d: e.d, ev: [e] }); });
      body.innerHTML = `<div class="clist">${days.map(({ d, ev }) => {
        const dt = parse(d);
        return `<div class="clist__d"><div class="clist__dt"><b>${dt.getDate()} ${MONTHS_G[m - 1].slice(0, 3)}</b>${WD[dt.getDay()]}${d === TODAY ? ' · сегодня' : ''}</div><div class="clist__ev">${ev.map((e) => `<button type="button" class="cer${isPast(e) ? ' past' : ''}${state.sel === e.id ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}"><span class="cer__t">${e.t}</span><span class="cer__m"><span class="cer__n">${esc(e.title)}</span><span class="cer__k">${esc(hostName(e))} · ${esc(e.fmt)}${e.off ? ` · ${esc(e.city)}` : ''}${e.mine ? ' · ты записан' : ''}</span></span>${e.rec ? ICON('check', 16) : ''}${e.off ? ICON('pin', 16) : ''}</button>`).join('')}</div></div>`;
      }).join('')}</div>`;
    };

    const drawEv = () => {
      const e = byId(state.sel);
      if (!e) return;
      const dt = parse(e.d);
      const past = isPast(e);
      const host = typeof e.host === 'string'
        ? `<i>${ICON('users', 18)}</i><div><b>${esc(cap(e.host))}</b><span>практик, работает на событиях</span></div>`
        : `<img src="${e.host.ava}" width="36" height="36" alt=""><div><b>${esc(e.host.name)}</b><span>${esc(e.host.role)}</span></div>`;
      const tags = `<span class="ev__tag">${esc(e.fmt)}</span><span class="ev__tag ev__tag--line">${esc(e.topic)}</span>${e.rec ? `<span class="ev__tag ev__tag--line">${ICON('check', 12)}есть запись</span>` : ''}`;
      const when = `${WD[dt.getDay()]}, ${dt.getDate()} ${MONTHS_G[dt.getMonth()]} · ${e.t}${e.off ? ` <span>· ${esc(e.city)}</span>` : ' <span>· мск, онлайн</span>'}`;
      const action = past
        ? (e.rec ? `<a class="btn" href="${ONB}#onboarding">Смотреть запись</a>` : `<p class="ev__note">Эфир уже прошёл.</p>`)
        : (e.mine ? `<a class="btn btn--ghost" href="${ONB}#onboarding">${ICON('check', 16)}&nbsp;Ты записан</a>` : `<a class="btn" href="${ONB}#onboarding">Записаться</a>`);
      evBox.classList.add('is-swap');
      setTimeout(() => {
        evBox.innerHTML = `<div class="ev__k">${tags}</div><p class="ev__t">${esc(e.title)}</p><p class="ev__when">${when}</p><div class="ev__host">${host}</div><p class="ev__free">${ICON('check', 16)}Бесплатно для участников</p>${action}<p class="ev__note">${past ? 'Участники заполнили анкету — спикер уже знает, что было полезно.' : 'После эфира участники заполняют анкету — спикер видит, что было полезно.'}</p>`;
        evBox.classList.remove('is-swap');
      }, RM ? 0 : 160);
    };

    const draw = () => {
      const half = state.view === 'half';
      const all = monthEvents(state.ym), shown = filtered(all);
      mLabel.textContent = half ? `${ymLabel(ymOf(TODAY))} – ${ymLabel(ymAdd(ymOf(TODAY), 5))}` : ymLabel(state.ym);
      prevB.disabled = half || state.ym <= RANGE[0];
      nextB.disabled = half || state.ym >= RANGE[1];
      const anyF = state.topics.length || state.fmts.length || state.mine;
      sumEl.innerHTML = anyF && !half ? `Показано ${shown.length} ${plural(shown.length, ['эфир', 'эфира', 'эфиров'])} из ${all.length} · <button type="button" id="cal-reset">Сбросить фильтры</button>` : (half ? 'Дни с эфирами обведены. Нажми на день — откроется месяц.' : `${all.length} ${plural(all.length, ['эфир', 'эфира', 'эфиров'])} в этом месяце`);
      if (half) drawHalf(); else if (state.view === 'list') drawList(shown, all); else drawMonth(shown, all);
    };

    body.addEventListener('click', (e) => {
      const ev = e.target.closest('[data-ev]');
      if (ev) {
        state.sel = ev.dataset.ev;
        $$('[data-ev]', body).forEach((b) => { b.classList.toggle('is-sel', b.dataset.ev === state.sel); b.setAttribute('aria-pressed', String(b.dataset.ev === state.sel)); });
        drawEv();
        return;
      }
      const day = e.target.closest('[data-day]');
      if (day) {
        state.ym = ymOf(day.dataset.day);
        state.view = 'month';
        const first = filtered(EVENTS.filter((x) => x.d === day.dataset.day))[0];
        if (first) state.sel = first.id;
        segB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
        draw();
        drawEv();
      }
    });
    sumEl.addEventListener('click', (e) => {
      if (e.target.id !== 'cal-reset') return;
      state.topics = []; state.fmts = []; state.mine = false;
      mineB.setAttribute('aria-checked', 'false');
      dds.forEach(renderDd);
      draw();
    });
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
    draw();
    drawEv();
  }

  /* ── 7. ИИ-конструктор курса ─────────────────────────────────────────── */
  {
    const cs = $('#cs'), wave = $('#cs-wave'), cst = $('#cst');
    const H = [10, 18, 26, 14, 30, 38, 22, 16, 28, 40, 34, 20, 12, 24, 36, 42, 30, 18, 26, 14, 22, 32, 40, 28, 16, 12, 20, 30, 38, 26, 18, 34, 42, 24, 14, 20, 28, 16, 10, 8];
    wave.innerHTML = H.map((h, i) => `<i style="--h:${h};--i:${i}"></i>`).join('');
    $$('.lessons li', cs).forEach((li, i) => li.style.setProperty('--i', i));
    $$('.cf', cs).forEach((f, i) => f.style.setProperty('--d', `${i * 140}ms`));
    $$('li', cst).forEach((li, i) => li.style.setProperty('--d', `${i * 420}ms`));
    const play = () => { cs.classList.add('is-play'); setTimeout(() => cst.classList.add('is-done'), RM ? 0 : 2200); };
    if (RM) play(); else once(cs, play, 0.35);
    const mark = $('#cs-mark'), mb = $('#cs-mark-btn');
    mb.addEventListener('click', () => {
      const on = !mark.classList.contains('is-shown');
      mark.classList.toggle('is-shown', on);
      mb.setAttribute('aria-pressed', String(on));
      mb.textContent = on ? 'Скрыть метку' : 'Показать метку';
    });
  }

  /* ── 8. Калькулятор дохода ───────────────────────────────────────────── */
  {
    const price = $('[data-calc-input="price"]'), sales = $('[data-calc-input="sales"]');
    const sumEl = $('[data-calc-sum]'), cover = $('[data-calc-cover]'), hint = $('[data-calc-hint]');
    const fmtBox = $('#calc-fmts');
    let shown = 0, anim = 0, cur = CALC_FORMATS[0];
    const btns = CALC_FORMATS.map((f, i) => {
      const b = el('button', null, esc(f.label));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === 0));
      b.addEventListener('click', () => setFormat(f));
      fmtBox.append(b);
      return b;
    });
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
    const update = () => {
      const p = Number(price.value), s = Number(sales.value), gross = p * s, net = gross * (1 - FEE);
      $('[data-calc-price]').textContent = money(p);
      $('[data-calc-sales]').textContent = String(s);
      $('[data-calc-price-text]').textContent = money(p);
      $('[data-calc-sales-text]').textContent = `${s} ${plural(s, ['продажа', 'продажи', 'продаж'])}`;
      $('[data-calc-gross]').textContent = money(gross);
      $('[data-calc-fee]').textContent = `−${money(gross * FEE)}`;
      $('[data-calc-net]').textContent = money(net);
      fill(price); fill(sales);
      countTo(net);
    };
    const setFormat = (f) => {
      cur = f;
      btns.forEach((b, i) => b.setAttribute('aria-checked', String(CALC_FORMATS[i] === f)));
      $('[data-calc-lead]').textContent = f.lead;
      $('[data-calc-badge]').textContent = f.badge;
      $('[data-calc-title]').textContent = f.title;
      hint.textContent = f.hint || '';
      Object.assign(price, { min: f.min, max: f.max, step: f.step });
      price.value = f.price;
      Object.assign(sales, { min: 1, max: f.maxSales, step: 1 });
      sales.value = f.sales;
      if (!cover.src.endsWith(f.cover)) {
        cover.classList.add('is-swapping');
        setTimeout(() => { cover.src = f.cover; cover.onload = () => cover.classList.remove('is-swapping'); }, RM ? 0 : 220);
      }
      update();
    };
    price.addEventListener('input', update);
    sales.addEventListener('input', update);
    setFormat(cur);
    // сумма досчитывается с нуля, когда калькулятор появился на экране
    cancelAnimationFrame(anim);
    shown = Number(price.value) * Number(sales.value) * (1 - FEE);
    sumEl.textContent = Math.round(shown).toLocaleString('ru-RU');
    if (!RM && hasIO) once($('.calc__panel'), () => { const target = shown; shown = 0; countTo(target); }, 0.4);
  }

  /* ── 9. Честный рейтинг: аватарки плавают только на экране; окно правил ─ */
  {
    const bubbles = $('#bubbles');
    if (hasIO) new IntersectionObserver(([e]) => bubbles.classList.toggle('is-paused', !e.isIntersecting), { threshold: 0.05 }).observe(bubbles);
    document.addEventListener('visibilitychange', () => { if (document.hidden) bubbles.classList.add('is-paused'); else queueScroll(); });
    const dlg = $('#rules'), open = $('#rules-btn');
    const close = () => { if (dlg.open) dlg.close(); };
    open.addEventListener('click', () => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); });
    $('#rules-x').addEventListener('click', close);
    $('#rules-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  /* ── 10. Программа для партнёров: сердечко один раз обходит круг ─────── */
  {
    const loop = $('#loop'), heart = $('#loop-heart');
    const labels = $$('.loop__labels li', loop).map((li) => ({ li, at: parseFloat(li.dataset.at) }));
    const START = 0.048, DUR = 9000;
    const all = () => labels.forEach(({ li }) => li.classList.add('is-on'));
    const mark = (p) => labels.forEach(({ li, at }) => { let d = at - p; if (d < -0.5) d += 1; li.classList.toggle('is-on', d > -0.035 && d < 0.085); });
    if (RM || !heart.animate || !CSS.supports('offset-path', 'path("M0 0h1")')) all();
    else {
      const s0 = `${START * 100}%`;
      const anim = heart.animate([
        { offsetDistance: s0, offset: 0 }, { offsetDistance: '100%', offset: 1 - START },
        { offsetDistance: '0%', offset: 1 - START }, { offsetDistance: s0, offset: 1 }
      ], { duration: DUR, iterations: 1, fill: 'forwards', easing: 'linear' });
      anim.pause();
      let done = false;
      anim.onfinish = () => { done = true; all(); ctl.sync(); };
      const tick = () => { if (!done) mark((START + (anim.currentTime || 0) / DUR) % 1); };
      const ctl = autoplay(loop, tick, { threshold: 0.4, blocked: () => done });
      // запуск и пауза вместе с тикером
      const origSync = ctl.sync;
      let playing = false;
      ctl.sync = () => { origSync(); const should = ticks.has(tick); if (should && !playing) { playing = true; anim.play(); } else if (!should && playing && !done) { playing = false; anim.pause(); } };
      ctl.sync();
      mark(START);
    }
  }

  /* ── 11. Финал: веер, сердце, поле ника ──────────────────────────────── */
  {
    const fan = $('#fan'), tilt = $('#fan-tilt'), fin = $('#final');
    const ready = () => fan.classList.add('is-ready');
    if (RM || !hasIO) ready(); else once(fan, () => setTimeout(ready, 120), 0.3);
    if (!RM) {
      fin.addEventListener('mousemove', (e) => {
        const r = fan.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
        tilt.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      });
      fin.addEventListener('mouseleave', () => { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); });
    }
    const heart = $('#final-heart');
    if (RM || !hasIO) heart.classList.add('in'); else once(heart, () => heart.classList.add('in'), 0.6);

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
    if (RM) {
      rv.forEach((n) => n.classList.add('in'));
      $$('.wk').forEach((n) => n.classList.add('is-f'));
      $$('.res__i').forEach((c) => c.classList.remove('is-soft'));
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ);
})();
