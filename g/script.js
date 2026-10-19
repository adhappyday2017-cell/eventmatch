/* EventMatch — главная, вариант G. Без библиотек; без скрипта страница тоже полная.
   Правило движения: один автоматический процесс на экран, пауза вне экрана и при скрытой вкладке,
   «меньше движения» выключает всё. Анимируются только transform/opacity (и CSS-переменные). */
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
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  if (/[?&]variants\b/.test(location.search) && !/[?&]clean\b/.test(location.search)) document.documentElement.classList.add('is-variants');

  /* ── Данные ─────────────────────────────────────────────────────────── */
  // Подписи к снимкам профессий: только профессия и город (имена не придумываем).
  const AG = { name: 'Анастасия Агапова', meta: 'фотограф · Санкт‑Петербург' };
  const ROLE = {
    'r-video': ['Видеограф', 'Санкт‑Петербург'], 'r-reels': ['Reels-мейкер', 'Сочи'], 'r-reels2': ['Видеограф, reels', 'Санкт‑Петербург'],
    'r-host': ['Ведущий', 'Казань'], 'r-makeup': ['Визажист', 'Москва'], 'r-makeup2': ['Визажист', 'Новосибирск'],
    'r-hair': ['Стилист по волосам', 'Екатеринбург'], 'r-model': ['Модель', 'Санкт‑Петербург'],
    'r-organizer': ['Организатор', 'Нижний Новгород'], 'r-decor': ['Декоратор', 'Москва']
  };
  const capOf = (id) => (id.startsWith('ag-') ? [AG.name, AG.meta] : [ROLE[id][0], ROLE[id][1]]);

  // Умный поиск: запрос → 2–3 карточки, каждая отвечает запросу (профессия и город), Агапова не больше одной на набор.
  // Снимков профессий десять, поэтому выдача честно короткая, а не добрана чужими профессиями.
  const QUERIES = [
    { q: 'второй фотограф или видеограф на субботу, Петербург', ids: ['ag-27', 'r-video', 'r-reels2'] },
    { q: 'reels-мейкер на съёмку мастер-класса', ids: ['r-reels', 'r-reels2'] },
    { q: 'модель на мастер-класс, рыжая с веснушками', ids: ['r-model', 'r-makeup'] },
    { q: 'визажист и стилист на творческую съёмку', ids: ['r-makeup', 'r-makeup2', 'r-hair'] }
  ];

  // Калькулятор: пресеты и границы — те же, что в calc-presets.json (цены проверены по research/16).
  // Статичная разметка index.html = стартовые значения первого формата. min кратен step.
  const FEE = 0.15;
  const CALC_FORMATS = [
    { key: 'course', label: 'Курс', lead: 'Твой курс может приносить', badge: 'Курс', title: 'Свадебная съёмка: 8 недель с обратной связью', cover: 'img/t/w-ag-41.webp', pos: '50% 100%',
      price: 30000, min: 15000, max: 90000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: 'Курсы практиков с обратной связью стоят 15–90 тысяч. Это самый частый формат у тех, кто учит коллег.' },
    { key: 'master', label: 'Мастер-класс', lead: 'Твой мастер-класс может приносить', badge: 'Мастер-класс', title: 'Два дня практики, группа до 15 человек', cover: 'img/t/w-ag-02.webp', pos: '50% 30%',
      price: 55000, min: 7900, max: 149900, step: 100, sales: 10, maxSales: 30, salesLabel: 'Мест в потоке', unit: ['место', 'места', 'мест'], note: '1 поток в месяц',
      hint: 'Два дня практики — около 55 тысяч за место при группе 10–15 человек.' },
    { key: 'video', label: 'Видеоурок', lead: 'Твой видеоурок может приносить', badge: 'Видеоурок', title: 'Репортаж на свадьбе: 1,5 часа', cover: 'img/t/w-ag-03.webp', pos: '50% 62%',
      price: 5900, min: 2990, max: 9900, step: 10, sales: 28, maxSales: 200, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: 'Видеоурок на 1,5 часа за 5 900 ₽ принёс знакомому фотографу около 2 млн ₽ — примерно 340 продаж. Так продаётся у автора с большой аудиторией.' },
    { key: 'review', label: 'Разбор', lead: 'Твои разборы могут приносить', badge: 'Разбор', title: 'Разбор портфолио: до 3 часов один на один', cover: 'img/t/w-ag-60.webp', pos: '50% 100%',
      price: 15000, min: 5000, max: 20000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Консультаций в месяц', unit: ['консультация', 'консультации', 'консультаций'],
      hint: 'Разбор портфолио или консультация у практика — 15–20 тысяч за 2–3 часа. Почти без подготовки, подходит, даже если курса пока нет.' }
  ];

  // Календарь эфиров. «Сегодня» — реальная дата; события заданы смещением в днях от неё, поэтому демо не устаревает.
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const TODAY = ymdOf(new Date());
  const dayFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return ymdOf(d); };
  const TOPICS = ['Фото', 'Видео и reels', 'Ведущие', 'Образ', 'Организация и декор'];
  const FORMATS = ['Эфир', 'Мастер-класс', 'Разбор', 'Офлайн-встреча'];
  const NASTYA = { name: 'Анастасия Агапова', role: 'фотограф', ava: 'img/t/nastya-96.webp' };
  const EVENTS = [
    { id: 'e1', d: dayFrom(-25), t: '19:00', title: 'Тайминг свадебного дня без паники', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e2', d: dayFrom(-18), t: '19:00', title: 'Свет в банкетном зале без вспышки', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', rec: true },
    { id: 'e3', d: dayFrom(-16), t: '12:00', title: 'Макияж, который держится до утра', host: 'визажист', topic: 'Образ', fmt: 'Мастер-класс', rec: true },
    { id: 'e4', d: dayFrom(-13), t: '20:00', title: 'Reels прямо на площадке', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e5', d: dayFrom(-11), t: '19:00', title: 'Первые пять минут ведущего', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир', rec: true, mine: true },
    { id: 'e6', d: dayFrom(-9), t: '12:00', title: 'Разбор портфолио: свадебный репортаж', host: 'фотограф', topic: 'Фото', fmt: 'Разбор', rec: true },
    { id: 'e7', d: dayFrom(-5), t: '19:00', title: 'Свадебные причёски: тренды сезона', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир', rec: true },
    { id: 'e8', d: dayFrom(-4), t: '18:00', title: 'Звук на церемонии: петлички и запас', host: 'видеограф', topic: 'Видео и reels', fmt: 'Эфир', rec: true },
    { id: 'e9', d: dayFrom(-2), t: '11:00', title: 'Свет в студии: мастер-класс вживую', host: 'фотограф', topic: 'Фото', fmt: 'Офлайн-встреча', off: true, city: 'Санкт‑Петербург' },
    { id: 'e10', d: dayFrom(1), t: '19:00', title: 'Как ставить цену на съёмку', host: 'фотограф', topic: 'Фото', fmt: 'Эфир', mine: true },
    { id: 'e11', d: dayFrom(3), t: '19:00', title: 'Декор стола: свечи, свет и текстиль', host: 'декоратор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e12', d: dayFrom(5), t: '11:00', title: 'Совместная съёмка: модель, визажист, фотограф', host: 'визажист', topic: 'Образ', fmt: 'Офлайн-встреча', off: true, city: 'Москва' },
    { id: 'e13', d: dayFrom(8), t: '20:00', title: 'Смета свадьбы без сюрпризов', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e14', d: dayFrom(10), t: '19:00', title: 'Женский портрет: свет из окна', host: NASTYA, topic: 'Фото', fmt: 'Эфир' },
    { id: 'e15', d: dayFrom(12), t: '12:00', title: 'Ведущий и диджей: как делить вечер', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e16', d: dayFrom(17), t: '19:00', title: 'Как упаковать первый мастер-класс', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'e17', d: dayFrom(24), t: '19:00', title: 'Сколько стоит твой разбор', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир' },
    { id: 'e18', d: dayFrom(31), t: '18:00', title: 'Разбор портфолио ведущих', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e19', d: dayFrom(38), t: '19:00', title: 'Из эфира — в видеоурок', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир' },
    { id: 'e20', d: dayFrom(45), t: '19:00', title: 'Итоги сезона: что покупали у исполнителей', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e21', d: dayFrom(52), t: '19:00', title: 'Зимний свет: съёмка на улице', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'e22', d: dayFrom(87), t: '19:00', title: 'Планируем сезон: цены и календарь', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
    { id: 'e23', d: dayFrom(115), t: '19:00', title: 'Портфолио к сезону: что обновить', host: 'фотограф', topic: 'Фото', fmt: 'Разбор' },
    { id: 'e24', d: dayFrom(143), t: '19:00', title: 'Весенние образы: причёски и макияж', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир' }
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
      if (now && !on) { on = true; sched(); }
      else if (!now && on) { on = false; clearTimeout(t); }
    };
    if (hasIO) new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; sync(); }, { threshold: opts.threshold ?? 0.25 }).observe(target);
    document.addEventListener('visibilitychange', sync);
    const api = { hold(v) { held = v; sync(); }, stop() { stopped = true; sync(); }, sync, get on() { return on; } };
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
  // Общий тикер rAF: работает, пока есть активные компоненты
  const ticks = new Set();
  let rafId = 0, last = 0;
  const frame = (now) => { const dt = Math.min(64, now - last); last = now; ticks.forEach((f) => f(dt, now)); rafId = ticks.size ? requestAnimationFrame(frame) : 0; };
  const addTick = (f) => { ticks.add(f); if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); } };
  const delTick = (f) => ticks.delete(f);
  function autoplay(root, tick, opts = {}) {
    let inView = false, hovered = false, on = false;
    const sync = () => {
      const should = inView && !document.hidden && !hovered && !(opts.blocked && opts.blocked());
      if (should === on) return;
      on = should;
      if (on) addTick(tick); else delTick(tick);
      if (opts.onChange) opts.onChange(on);
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
  // «Таблетка» переключателя: едет transform, ширина — у маленького элемента
  const pillOf = (box, ind, selOn) => {
    const place = () => {
      const on = $$('button, a', box).find(selOn);
      if (!on) return;
      ind.style.setProperty('--x', `${on.offsetLeft}px`);
      ind.style.setProperty('--w', `${on.offsetWidth}px`);
      box.classList.add('is-ready');
    };
    addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    place();
    return place;
  };

  /* ── Шапка: прозрачная над хиро, бумага после; активный раздел ──────── */
  const hdr = $('#hdr'), hero = $('#top');
  const onHdr = () => {
    const h = hero.offsetHeight;
    hdr.classList.toggle('is-s', scrollY > h - hdr.offsetHeight * 2);
    hero.classList.toggle('is-off', scrollY > h - 160);
  };
  addEventListener('scroll', onHdr, { passive: true });
  addEventListener('resize', onHdr);
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
    ['top', 'luchshie', 'poisk', 'znakomtes', 'prodavay', 'dohod', 'efiry', 'konstruktor', 'chestno', 'partneram', 'final'].forEach((id) => { const n = document.getElementById(id); if (n) spy.observe(n); });
  }

  /* ── 1. Первый экран: проявление, наезд, параллакс ───────────────────── */
  {
    const img = $('#hero-img'), move = $('#hero-move'), glow = $('#hero-glow');
    const t0 = performance.now();
    hero.classList.add('is-in');
    setTimeout(() => hero.classList.add('is-done'), RM ? 0 : 2300); // после входа подпись и «листай» статичны, их гасит только прокрутка
    const showImg = () => {
      const left = Math.max(0, 600 - (performance.now() - t0));
      hero.style.setProperty('--hero-d', `${Math.round(left)}ms`);
      hero.classList.add('is-img');
    };
    if (img.complete && img.naturalWidth) showImg();
    else if (img.decode) img.decode().then(showImg, showImg);
    else img.addEventListener('load', showImg, { once: true });
    if (!RM) {
      let tx = 0, ty = 0, x = 0, y = 0;
      const tick = () => {
        x += (tx - x) * 0.08; y += (ty - y) * 0.08;
        const sy = scrollY * 0.12;
        move.style.transform = `translate3d(${x.toFixed(2)}px, ${(y + sy).toFixed(2)}px, 0)`;
        glow.style.transform = `translate3d(${(x * 0.4).toFixed(2)}px, ${(y * 0.4 + sy * 0.5).toFixed(2)}px, 0)`;
      };
      hero.addEventListener('mousemove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 16; ty = (e.clientY / innerHeight - 0.5) * 16; });
      hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
      autoplay(hero, tick, { threshold: 0.05 });
    }
  }

  /* ── Появление при прокрутке: один механизм, каскад 70 мс, не больше 5 ─ */
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

  /* ── 2. Лучшие недели: даты прошедшей недели ─────────────────────────── */
  {
    const w = $('[data-week]');
    const now = new Date();
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    w.textContent = mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()}–${sun.getDate()} ${MONTHS_G[mon.getMonth()]}`
      : `${mon.getDate()} ${MONTHS_G[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_G[sun.getMonth()]}`;
  }

  /* ── 2. Стена работ: «плоскость резкости» ────────────────────────────── */
  // Резкими становятся только карточки в полосе 42–58% высоты экрана; прокрутка = перевод фокуса.
  // Курсор над стеной — прицел видоискателя, карточка под ним резкая независимо от полосы.
  {
    const grid = $('#wall'), cards = $$('.wk', grid), aim = $('#aim'), aimCap = $('#aim-cap');
    if (!RM && hasIO) {
      const update = () => {
        const c = innerHeight * 0.5;
        for (let i = 0; i < cards.length; i += 1) {
          const k = cards[i], r = k.getBoundingClientRect();
          const f = 1 - clamp((Math.abs(r.top + r.height / 2 - c) - 140) / 600);
          const v = f.toFixed(2);
          if (k.dataset.f !== v) { k.dataset.f = v; k.style.setProperty('--fs', v); }
        }
      };
      onScroll(grid, update, '200px 0px');
      queueScroll();
      // прицел: один абсолютный элемент, лёгкое запаздывание (lerp 0.18)
      let tx = 0, ty = 0, x = 0, y = 0, active = false, cur = null, lockT = 0;
      const tick = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        aim.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (!active && Math.abs(tx - x) < 0.2 && Math.abs(ty - y) < 0.2) delTick(tick);
      };
      const setCur = (k) => {
        if (k === cur) return;
        if (cur) cur.classList.remove('is-aim');
        cur = k;
        aim.classList.remove('is-lock');
        clearTimeout(lockT);
        if (k) { k.classList.add('is-aim'); aimCap.textContent = k.dataset.cap || ''; lockT = setTimeout(() => aim.classList.add('is-lock'), 400); }
        else aimCap.textContent = '';
      };
      grid.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = grid.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!active) { active = true; x = tx; y = ty; grid.classList.add('is-aim'); addTick(tick); }
        setCur(e.target.closest ? e.target.closest('.wk') : null);
      });
      grid.addEventListener('pointerleave', () => { active = false; grid.classList.remove('is-aim'); setCur(null); });
      // смена «меньше движения» на лету — всё резкое
      loops.push({ sync() { if (RM) { cards.forEach((k) => k.style.removeProperty('--fs')); grid.classList.remove('is-aim'); setCur(null); active = false; } } });
    }
  }

  /* ── 3. Умный поиск: запрос набирается, выдача наводится на резкость ─── */
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
    // Автосмена стирает и набирает неспешно; по клику запрос стирается сразу, набор быстрый, карточки меняются параллельно
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
    const swap = (i, tok) => {
      if (tok !== token) return;
      if (RM) { render(i); return; }
      resBox.classList.add('is-swap');
      setTimeout(() => {
        if (tok !== token) return;
        render(i);
        void resBox.offsetWidth;
        resBox.classList.remove('is-swap');
        focusIn(fastNow ? 90 : 110);
      }, 200);
    };
    let fastNow = false;
    const setQuery = (i, fast = false) => {
      qI = i;
      fastNow = fast;
      const tok = ++token;
      chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
      QUERIES[i].ids.forEach((id) => preload(`img/t/f-${id}-400.webp`));
      cells.forEach((c) => c.classList.add('is-soft'));
      const typed = typeQuery(QUERIES[i].q, fast);
      if (fast) swap(i, tok); else typed.then(() => swap(i, tok));
    };
    render(0);
    QUERIES.forEach((q) => q.ids.forEach((id) => preload(`img/t/f-${id}-s.webp`)));
    if (RM || !hasIO) cells.forEach((c) => c.classList.remove('is-soft'));
    else once(resBox, () => focusIn(110), 0.35);
    const qLoop = makeLoop(resBox, () => setQuery((qI + 1) % QUERIES.length), () => 6200, { threshold: 0.35 });
    chips.forEach((c, k) => c.addEventListener('click', () => { qLoop.stop(); setQuery(k, true); }));
    holdWhile(qLoop, [resBox, $('.sbar', sec), chipsBox]);
    // каретка мигает только пока строка поиска на экране
    const bar = $('.sbar', sec);
    if (hasIO && !RM) new IntersectionObserver(([e]) => bar.classList.toggle('is-live', e.isIntersecting && !document.hidden), { threshold: 0.5 }).observe(bar);
    document.addEventListener('visibilitychange', () => { if (document.hidden) bar.classList.remove('is-live'); });
  }

  /* ── 4a. Портрет: зум по мере прокрутки ──────────────────────────────── */
  {
    const pic = $('#meet-pic');
    if (!RM) onScroll(pic, (r, vh) => {
      const p = clamp((vh - r.top) / (vh * 0.85));
      pic.style.setProperty('--z', (1.12 - 0.12 * easeOut(p)).toFixed(4));
    });
    else pic.style.setProperty('--z', '1');
  }

  /* ── 4b. ИИ-редактор профиля: карточка собирает себя ─────────────────── */
  {
    const root = $('#aip'), card = $('#pc');
    const steps = $$('#aip-steps .step');
    const urlT = $('#pc-url'), nameT = $('#pc-name'), nickT = $('#pc-nick');
    const grid = $('#pc-grid');
    const btn = $('#pc-btn');
    const replay = $('#aip-replay');
    const WORKS = ['ag-11', 'ag-46', 'ag-40', 'ag-54', 'ag-07', 'ag-09'];
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
    // Таймлайн сборки — 3,4 с: ссылка 0–0,5, имя с 0,8, плитки каскадом с 1,4, услуги 2,0, ник 2,2, «Опубликовать» на 3,0
    const END = 3400;
    const render = (t) => {
      typed(urlT, 0, t, 30);
      card.classList.toggle('is-reading', t >= 450 && t < 2600);
      card.classList.toggle('has-ava', t >= 700);
      typed(nameT, 800, t, 40);
      role.classList.toggle('on', t >= 1600);
      cities.classList.toggle('on', t >= 1700);
      lbl.classList.toggle('on', t >= 1850);
      svc.classList.toggle('on', t >= 1950);
      card.classList.toggle('is-draft', t >= 1500 && t < 3000);
      cells.forEach((c, i) => { c.classList.toggle('on', t >= 1400 + i * 70); c.classList.toggle('sh', t >= 1650 + i * 70); });
      typed(nickT, 2200, t, 45);
      btn.classList.toggle('is-press', t >= 2850 && t < 3000);
      card.classList.toggle('is-pub', t >= 3000);
      const s = t < 700 ? 0 : t < 2300 ? 1 : 2;
      steps.forEach((li, i) => { li.classList.toggle('is-on', i === s); li.classList.toggle('is-done', i < s || t >= END); });
    };
    if (RM) {
      render(1e9);
      replay.hidden = true;
      steps.forEach((li, i) => li.addEventListener('click', () => render([650, 2250, 1e9][i])));
    } else {
      let t = 0, done = false;
      render(0);
      const tick = (dt) => {
        t += dt;
        if (t >= END) { t = END; done = true; render(1e9); replay.hidden = false; ctl.sync(); return; }
        render(t);
      };
      const ctl = autoplay(root, tick, { hoverEls: [card], threshold: 0.25, blocked: () => done, onChange: (on) => card.classList.toggle('is-live', on) });
      const restart = () => { t = 0; done = false; replay.hidden = true; render(0); ctl.sync(); };
      replay.addEventListener('click', restart);
      steps.forEach((li, i) => li.addEventListener('click', () => { t = [0, 700, 2300][i]; done = false; replay.hidden = true; render(t); ctl.sync(); }));
    }
  }

  /* ── 5a. Всё в одном: окна сходятся в карточку профиля по прокрутке ──── */
  {
    const scene = $('#one-scene');
    if (RM) { scene.style.setProperty('--pa', '1'); scene.style.setProperty('--pb', '1'); }
    else onScroll(scene, (r, vh) => {
      const start = vh * 0.98, end = vh * 0.5 - r.height / 2;
      const p = clamp((start - r.top) / (start - end));
      const pa = clamp(p / 0.42), pb = clamp((p - 0.38) / 0.62);
      scene.style.setProperty('--pa', pa.toFixed(3));
      scene.style.setProperty('--pb', pb.toFixed(3));
    }, '120px 0px');
  }

  /* ── 5b. Вкладки форматов ────────────────────────────────────────────── */
  {
    const box = $('.tabs'), ind = $('.tabs__ind', box);
    const tabs = $$('.tab', box);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const place = pillOf(box, ind, (t) => t.getAttribute('aria-selected') === 'true');
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) { panels[k].classList.toggle('is-on', on); panels[k].setAttribute('aria-hidden', String(!on)); }
      });
      place();
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

  /* ── 6. Калькулятор дохода ───────────────────────────────────────────── */
  {
    const price = $('[data-calc-input="price"]'), sales = $('[data-calc-input="sales"]');
    const sumEl = $('[data-calc-sum]'), cover = $('[data-calc-cover]'), hint = $('[data-calc-hint]');
    const fmtBox = $('#calc-fmts'), pill = $('.seg__pill', fmtBox);
    let shown = 0, anim = 0, cur = CALC_FORMATS[0];
    const btns = CALC_FORMATS.map((f, i) => {
      const b = el('button', null, esc(f.label));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === 0));
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => setFormat(f));
      b.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % CALC_FORMATS.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + CALC_FORMATS.length) % CALC_FORMATS.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = CALC_FORMATS.length - 1;
        if (n === null) return;
        e.preventDefault();
        setFormat(CALC_FORMATS[n]);
        btns[n].focus();
      });
      fmtBox.append(b);
      return b;
    });
    const sumBox = $('[data-calc-sumbox]');
    const place = pillOf(fmtBox, pill, (b) => b.getAttribute('aria-checked') === 'true');
    const fill = (input) => input.style.setProperty('--p', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    // значение над бегунком — только пока тянут
    $$('.range').forEach((lab) => {
      const input = $('input', lab), val = el('span', 'range__val');
      lab.append(val);
      const show = () => { val.textContent = input === price ? money(input.value) : `${input.value} ${plural(Number(input.value), cur.unit)}`; val.style.setProperty('--pv', (input.value - input.min) / (input.max - input.min)); };
      input.addEventListener('input', show);
      input.addEventListener('pointerdown', () => { show(); lab.classList.add('is-drag'); });
      addEventListener('pointerup', () => lab.classList.remove('is-drag'));
      addEventListener('pointercancel', () => lab.classList.remove('is-drag'));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); input.value = Number(input.value) + (e.key === 'PageUp' ? 10 : -10) * Number(input.step); input.dispatchEvent(new Event('input')); }
      });
    });
    const countTo = (target) => {
      cancelAnimationFrame(anim);
      if (RM) { shown = target; sumEl.textContent = Math.round(target).toLocaleString('ru-RU'); return; }
      const from = shown, t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 320);
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
      $('[data-calc-sales-text]').textContent = `${s} ${plural(s, cur.unit)}${cur.note ? ` · ${cur.note}` : ' в месяц'}`;
      $('[data-calc-gross]').textContent = money(gross);
      $('[data-calc-fee]').textContent = `−${money(gross * FEE)}`;
      $('[data-calc-net]').textContent = money(net);
      sumBox.classList.toggle('is-7', Math.round(net) >= 1e6);
      fill(price); fill(sales);
      countTo(net);
    };
    const setFormat = (f) => {
      cur = f;
      btns.forEach((b, i) => { const on = CALC_FORMATS[i] === f; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      place();
      $('[data-calc-lead]').textContent = f.lead;
      $('[data-calc-badge]').textContent = f.badge;
      $('[data-calc-title]').textContent = f.title;
      $('[data-calc-sales-label]').textContent = f.salesLabel;
      sales.setAttribute('aria-label', f.salesLabel);
      hint.textContent = f.hint || '';
      Object.assign(price, { min: f.min, max: f.max, step: f.step });
      price.value = f.price;
      Object.assign(sales, { min: 1, max: f.maxSales, step: 1 });
      sales.value = f.sales;
      if (!cover.src.endsWith(f.cover)) {
        cover.classList.add('is-swapping');
        setTimeout(() => { cover.src = f.cover; cover.style.objectPosition = f.pos || '50% 30%'; cover.onload = () => cover.classList.remove('is-swapping'); }, RM ? 0 : 220);
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

  /* ── 7. Календарь эфиров ─────────────────────────────────────────────── */
  let openEvent = () => {};
  {
    const body = $('#cal-body'), mLabel = $('#cal-m'), sumEl = $('#cal-sum'), evBox = $('#ev');
    const prevB = $('#cal-prev'), nextB = $('#cal-next'), mineB = $('#cal-mine');
    const segBox = $('.cal__seg'), segB = $$('button', segBox);
    const segPlace = pillOf(segBox, $('.seg__pill', segBox), (b) => b.getAttribute('aria-pressed') === 'true');
    const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const pad = pad2;
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const ymOf = (s) => s.slice(0, 7);
    const ymLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
    const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
    const RANGE = [ymAdd(ymOf(TODAY), -1), ymAdd(ymOf(TODAY), 5)];
    const state = { ym: ymOf(TODAY), view: 'month', topics: [], fmts: [], mine: false, sel: 'e14' };
    const ICON = (id, s = 12) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const isPast = (e) => e.d < TODAY;
    const hostName = (e) => (typeof e.host === 'string' ? e.host : e.host.name);
    const filtered = (list) => list.filter((e) => (!state.topics.length || state.topics.includes(e.topic)) && (!state.fmts.length || state.fmts.includes(e.fmt)) && (!state.mine || e.mine));
    const monthEvents = (ym) => EVENTS.filter((e) => ymOf(e.d) === ym);

    const dds = [
      { key: 'topics', all: 'Все темы', few: 'Темы', list: TOPICS, det: $('#dd-topic'), lbl: $('#dd-topic-l'), box: $('#dd-topic-list') },
      { key: 'fmts', all: 'Все форматы', few: 'Форматы', list: FORMATS, det: $('#dd-fmt'), lbl: $('#dd-fmt-l'), box: $('#dd-fmt-list') }
    ];
    // Список строится один раз; переключение меняет aria-checked у кнопки, поэтому список не закрывается и фокус остаётся
    const syncDd = (dd) => {
      const sel = state[dd.key];
      $$('button[data-v]', dd.box).forEach((b) => b.setAttribute('aria-checked', String(sel.includes(b.dataset.v))));
      dd.lbl.textContent = !sel.length ? dd.all : sel.length === 1 ? sel[0] : `${dd.few} · ${sel.length}`;
      dd.det.classList.toggle('is-on', sel.length > 0);
    };
    const renderDd = (dd) => {
      dd.box.innerHTML = dd.list.map((v) => `<button type="button" role="checkbox" aria-checked="false" data-v="${esc(v)}"><span class="dd__box">${ICON('check', 13)}</span>${esc(v)}</button>`).join('');
      syncDd(dd);
    };
    dds.forEach((dd) => {
      renderDd(dd);
      dd.box.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        const v = b.dataset.v, arr = state[dd.key], i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
        syncDd(dd);
        draw();
      });
    });
    document.addEventListener('click', (e) => { dds.forEach((dd) => { if (dd.det.open && !dd.det.contains(e.target)) dd.det.open = false; }); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dds.forEach((dd) => { dd.det.open = false; }); });

    const chip = (e) => `<button type="button" class="cch${e.mine ? ' mine' : ''}${isPast(e) ? ' past' : ''}${state.sel === e.id ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}" title="${esc(e.title)}"><span class="cch__top"><b>${e.t}</b>${e.rec ? ICON('check') : ''}${e.off ? ICON('pin') : ''}</span><span class="cch__t">${esc(e.title)}</span></button>`;

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
          cells += `<div class="cd${out ? ' out' : ''}${today ? ' today' : ''}${past ? ' past' : ''}" role="gridcell"><span class="cd__n">${d.getDate()}</span>${evs.map((e) => chip(e).replace('class="cch', `style="--d:${k++ * 40}ms" class="cch`)).join('')}</div>`;
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
          cells += has ? `<button type="button" class="${cls}" data-day="${key}" aria-label="${dd} ${MONTHS_G[m - 1]}, ${has.length} ${plural(has.length, ['событие', 'события', 'событий'])}">${dd}</button>` : `<span class="${cls}">${dd}</span>`;
        }
        return `<div class="hmo"><p class="hmo__t">${ymLabel(ym)}<small>${evs.length ? `${evs.length} ${plural(evs.length, ['событие', 'события', 'событий'])}` : 'пока пусто'}</small></p><div class="hmo__g">${cells}</div></div>`;
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
        ? (e.rec ? `<p class="ev__rec-note">${ICON('play', 16)}Запись открыта исполнителям платформы</p>` : '<p class="ev__note">Эфир уже прошёл.</p>')
        : (e.mine ? `<button type="button" class="btn btn--ghost" data-join="${e.id}" aria-pressed="true">${ICON('check', 16)}&nbsp;Ты записан</button>` : `<button type="button" class="btn" data-join="${e.id}" aria-pressed="false">Записаться</button>`);
      const rec = past && e.rec ? '<p class="ev__rec"><a class="lnk" href="#konstruktor">из записи можно собрать курс →</a></p>' : '';
      evBox.classList.add('is-swap');
      setTimeout(() => {
        evBox.innerHTML = `<div class="ev__k">${tags}</div><p class="ev__t">${esc(e.title)}</p><p class="ev__when">${when}</p><div class="ev__host">${host}</div><p class="ev__free">${ICON('check', 16)}Бесплатно для участников</p>${action}${rec}<p class="ev__note">${past ? 'Участники заполнили анкету — спикер уже знает, что было полезно.' : 'После эфира участники заполняют анкету — спикер видит, что было полезно.'}</p>`;
        evBox.classList.remove('is-swap');
      }, RM ? 0 : 160);
    };

    evBox.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-join]');
      if (!b) return;
      const e = byId(b.dataset.join);
      if (!e) return;
      e.mine = !e.mine;
      draw();
      drawEv();
    });
    const draw = () => {
      const half = state.view === 'half';
      const all = monthEvents(state.ym), shown = filtered(all);
      mLabel.textContent = half ? `${ymLabel(ymOf(TODAY))} – ${ymLabel(ymAdd(ymOf(TODAY), 5))}` : ymLabel(state.ym);
      prevB.disabled = half || state.ym <= RANGE[0];
      nextB.disabled = half || state.ym >= RANGE[1];
      const anyF = state.topics.length || state.fmts.length || state.mine;
      sumEl.innerHTML = anyF && !half ? `Показано ${shown.length} ${plural(shown.length, ['событие', 'события', 'событий'])} из ${all.length} · <button type="button" id="cal-reset">Сбросить фильтры</button>` : (half ? 'Дни с событиями обведены. Нажми на день — откроется месяц.' : `${all.length} ${plural(all.length, ['событие', 'события', 'событий'])} в этом месяце`);
      if (half) drawHalf(); else if (state.view === 'list') drawList(shown, all); else drawMonth(shown, all);
    };
    const setView = (v) => { state.view = v; segB.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.view === v))); segPlace(); };

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
        setView('month');
        const first = filtered(EVENTS.filter((x) => x.d === day.dataset.day))[0];
        if (first) state.sel = first.id;
        draw();
        drawEv();
      }
    });
    sumEl.addEventListener('click', (e) => {
      if (e.target.id !== 'cal-reset') return;
      state.topics = []; state.fmts = []; state.mine = false;
      mineB.setAttribute('aria-checked', 'false');
      dds.forEach(syncDd);
      draw();
    });
    prevB.addEventListener('click', () => { state.ym = ymAdd(state.ym, -1); draw(); });
    nextB.addEventListener('click', () => { state.ym = ymAdd(state.ym, 1); draw(); });
    segB.forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); draw(); }));
    mineB.addEventListener('click', () => {
      state.mine = !state.mine;
      mineB.setAttribute('aria-checked', String(state.mine));
      draw();
    });
    openEvent = (id) => {
      const e = byId(id);
      if (!e) return;
      state.ym = ymOf(e.d); state.sel = id;
      state.topics = []; state.fmts = []; state.mine = false; mineB.setAttribute('aria-checked', 'false'); dds.forEach(syncDd);
      setView('month');
      draw();
      drawEv();
    };
    draw();
    drawEv();
    $$('[data-ev-date]').forEach((n) => { const e = byId(n.dataset.evDate); if (e) { const dt = parse(e.d); n.textContent = `${dt.getDate()}\u00a0${MONTHS_G[dt.getMonth()]}`; } });
  }
  $$('[data-ev-open]').forEach((a) => a.addEventListener('click', () => openEvent(a.dataset.evOpen)));

  /* ── 8. ИИ-конструктор курса ─────────────────────────────────────────── */
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

  /* ── 9. Честный рейтинг: аватарки плавают только на экране; окно правил ─ */
  {
    const bubbles = $('#bubbles');
    if (hasIO) new IntersectionObserver(([e]) => bubbles.classList.toggle('is-paused', !e.isIntersecting), { threshold: 0.05 }).observe(bubbles);
    document.addEventListener('visibilitychange', () => { if (document.hidden) bubbles.classList.add('is-paused'); else queueScroll(); });
    const dlg = $('#rules'), open = $('#rules-btn');
    const close = () => { if (dlg.open) dlg.close(); };
    open.addEventListener('click', () => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); document.body.classList.add('is-modal'); });
    dlg.addEventListener('close', () => { document.body.classList.remove('is-modal'); open.focus(); });
    $('#rules-x').addEventListener('click', close);
    $('#rules-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  /* ── 10. Программа для партнёров: сердечко один раз обходит круг ─────── */
  {
    const loop = $('#loop'), heart = $('#loop-heart');
    const labels = $$('.loop__labels li', loop).map((li) => ({ li, at: parseFloat(li.dataset.at) }));
    const START = 0.055, DUR = 9000;
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
      const ctl = autoplay(loop, tick, {
        threshold: 0.4, blocked: () => done,
        onChange: (on) => { if (done) return; if (on) anim.play(); else anim.pause(); }
      });
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
      const input = $('input', form), btn = $('button[type="submit"]', form), help = $('#nick-help');
      const helpText = help.textContent;
      let errT = 0;
      const hint = (msg, err = true) => {
        clearTimeout(errT);
        form.classList.toggle('is-err', err); help.classList.toggle('is-err', err); help.textContent = msg;
        errT = setTimeout(() => { form.classList.remove('is-err'); help.classList.remove('is-err'); help.textContent = helpText; }, 2600);
      };
      input.addEventListener('input', () => {
        const pos = input.selectionStart, before = input.value, v = clean(before);
        if (v !== before) {
          input.value = v;
          const p = Math.max(0, Math.min(v.length, pos - (before.length - v.length)));
          try { input.setSelectionRange(p, p); } catch (e) { /* noop */ }
          // поле само всё исправило — подсказка нейтральная; ошибка только если после чистки ничего не осталось
          if (v) hint(`Получится eventmatch.ru/${v}`, false);
          else hint('Только латиница, цифры, точка и дефис');
        }
      });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const v = clean(input.value);
        if (!v) { hint('Придумай ник — латиница, цифры, точка и дефис'); form.classList.remove('is-empty'); void form.offsetWidth; form.classList.add('is-empty'); input.focus(); setTimeout(() => form.classList.remove('is-empty'), 500); return; }
        if (btn.classList.contains('is-loading') || btn.classList.contains('is-ok')) return;
        const go = () => { location.href = `${ONB}?nick=${encodeURIComponent(v)}#onboarding`; };
        if (RM) { go(); return; }
        btn.classList.add('is-loading');
        setTimeout(() => { btn.classList.remove('is-loading'); btn.classList.add('is-ok'); setTimeout(go, 450); }, 700);
      });
    });
  }

  /* ── Смена «меньше движения» на лету ─────────────────────────────────── */
  const onMQ = () => {
    RM = mq.matches;
    loops.forEach((l) => l.sync());
    if (RM) {
      rv.forEach((n) => n.classList.add('in'));
      $$('.res__i').forEach((c) => c.classList.remove('is-soft'));
      const sc = $('#one-scene'); sc.style.setProperty('--pa', '1'); sc.style.setProperty('--pb', '1');
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ);
})();
