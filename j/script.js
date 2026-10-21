/* EventMatch — главная, вариант J. Без библиотек; без скрипта страница тоже полная (лента идёт на CSS).
   Правило движения: один автоматический процесс на экран, пауза вне экрана и при скрытой вкладке,
   «меньше движения» выключает всё. Анимируются только transform/opacity (и CSS-переменные). */
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
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NB = ' ';
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')}${NB}₽`;
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* ── Данные ─────────────────────────────────────────────────────────── */
  // Подписи к снимкам профессий: только профессия и город (имена не придумываем).
  const AG = { name: 'Анастасия Агапова', meta: 'фотограф · Санкт‑Петербург' };
  const ROLE = {
    'r-video': ['Видеограф', 'Санкт‑Петербург'], 'r-reels': ['Reels-мейкер', 'Сочи'], 'r-reels2': ['Видеограф, reels', 'Санкт‑Петербург'],
    'r-host': ['Ведущий', 'Казань'], 'r-makeup': ['Визажист', 'Москва'], 'r-makeup2': ['Визажист', 'Новосибирск'],
    'r-hair': ['Стилист по волосам', 'Екатеринбург'], 'r-model': ['Модель', 'Санкт‑Петербург'],
    'r-organizer': ['Организатор', 'Нижний Новгород'], 'r-decor': ['Декоратор', 'Москва'],
    'r-photo': ['Фотограф', 'Санкт‑Петербург'], 'r-photo3': ['Фотограф', 'Санкт‑Петербург'], 'r-video2': ['Видеограф', 'Санкт‑Петербург'],
    's-phone': ['Reels-мейкер', 'Москва'], 's-phone2': ['Reels-мейкер', 'Сочи'],
    'r-model2': ['Модель', 'Москва'], 'r-model3': ['Модель', 'Санкт‑Петербург'], 'r-model4': ['Модель', 'Казань']
  };
  const capOf = (id) => (id.startsWith('ag-') ? [AG.name, AG.meta] : [ROLE[id][0], ROLE[id][1]]);

  // Умный поиск: три подсказки, по три карточки на запрос. Агаповой в выдаче нет: она не «открыта к работе».
  // Ни один снимок выдачи не повторяет ленту и не повторяется между запросами.
  // На «рыжую с веснушками» — три модели, первая действительно рыжая с веснушками (img/roles/model2.jpg).
  const QUERIES = [
    { q: 'второй фотограф или видеограф на субботу, Петербург', ids: ['r-photo', 'r-video2', 'r-photo3'] },
    { q: 'reels-мейкер на съёмку мастер-класса', ids: ['s-phone', 'r-reels2', 's-phone2'] },
    { q: 'модель на мастер-класс, рыжая с веснушками', ids: ['r-model2', 'r-model3', 'r-model4'] }
  ];

  // Калькулятор: пресеты и границы проверены по research/16 (19.10.2026). Статичная разметка = старт первого формата.
  const FEE = 0.15;
  const CALC_FORMATS = [
    { key: 'course', label: 'Курс', badge: 'Курс', title: 'Свадебная съёмка: курс для начинающих', cover: 'img/t/w-ag-41.webp', pos: '50% 70%',
      price: 30000, min: 15000, max: 90000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: 'Курсы практиков с обратной связью стоят 15–90 тысяч. Это самый частый формат у тех, кто учит коллег.' },
    { key: 'master', label: 'Мастер-класс', badge: 'Мастер-класс', title: 'Мастер-класс офлайн: группа до 15 человек', cover: 'img/t/w-ag-02.webp', pos: '50% 30%',
      price: 55000, min: 7900, max: 149900, step: 100, sales: 10, maxSales: 30, salesLabel: 'Мест в потоке', unit: ['место', 'места', 'мест'], note: '1 поток в месяц',
      hint: 'Два дня практики у известного автора стоят 55–150 тысяч за место, вечерний мастер-класс на 3 часа — около 8 тысяч.' },
    { key: 'video', label: 'Видеоурок', badge: 'Видеоурок', title: 'Репортаж на свадьбе: 1,5 часа', cover: 'img/t/w-ag-03.webp', pos: '50% 62%',
      price: 5900, min: 2990, max: 9900, step: 10, sales: 28, maxSales: 200, salesLabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: 'Видеоурок на 1,5 часа за 5 900 ₽ принёс знакомому фотографу около 2 млн ₽ — примерно 340 продаж. Так продаётся у автора с большой аудиторией.' },
    { key: 'review', label: 'Разбор', badge: 'Разбор', title: 'Разбор портфолио: до 3 часов один на один', cover: 'img/t/w-ag-60.webp', pos: '50% 100%',
      price: 15000, min: 5000, max: 20000, step: 500, sales: 6, maxSales: 40, salesLabel: 'Консультаций в месяц', unit: ['консультация', 'консультации', 'консультаций'],
      hint: 'Разбор портфолио или консультация у практика — 15–20 тысяч за 2–3 часа. Почти без подготовки, подходит, даже если курса пока нет.' }
  ];

  // Календарь эфиров. «Сегодня» — реальная дата; события заданы смещением в днях, поэтому демо не устаревает.
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const TODAY = ymdOf(new Date());
  const dayFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return ymdOf(d); };
  // Эфир Анастасии — ближайший вторник или среда не раньше чем через 7 дней: чип всегда в колонке Вт/Ср, панель справа его не закрывает
  const nastyaDay = () => { for (let n = 7; n < 14; n += 1) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); if (d.getDay() === 2 || d.getDay() === 3) return ymdOf(d); } return dayFrom(7); };
  const TOPICS = ['Фото', 'Видео и reels', 'Ведущие', 'Образ', 'Организация и декор'];
  const FORMATS = ['Эфир', 'Мастер-класс', 'Разбор', 'Офлайн-встреча'];
  const NASTYA = { name: 'Анастасия Агапова', role: 'свадебный и женский фотограф', ava: 'img/t/nastya-96.webp' };
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
    { id: 'e14', d: nastyaDay(), t: '19:00', title: 'Женский портрет: свет из окна', host: NASTYA, topic: 'Фото', fmt: 'Эфир' },
    { id: 'e15', d: dayFrom(12), t: '12:00', title: 'Ведущий и диджей: как делить вечер', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e16', d: dayFrom(17), t: '19:00', title: 'Как упаковать первый мастер-класс', host: 'фотограф', topic: 'Фото', fmt: 'Эфир' },
    { id: 'e17', d: dayFrom(24), t: '19:00', title: 'Сколько стоит твой разбор', host: 'ведущий', topic: 'Ведущие', fmt: 'Эфир' },
    { id: 'e18', d: dayFrom(31), t: '18:00', title: 'Разбор портфолио ведущих', host: 'ведущий', topic: 'Ведущие', fmt: 'Разбор' },
    { id: 'e19', d: dayFrom(38), t: '19:00', title: 'Из эфира — в видеоурок', host: 'reels-мейкер', topic: 'Видео и reels', fmt: 'Эфир' },
    { id: 'e20', d: dayFrom(45), t: '19:00', title: 'Итоги сезона: что покупали коллеги', host: 'организатор', topic: 'Организация и декор', fmt: 'Эфир' },
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

  /* ── Шапка: тень при прокрутке, активный раздел, тёмная над сценой ──── */
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
    ['top', 'luchshie', 'poisk', 'znakomtes', 'redaktor', 'vozmozhnosti', 'dohod', 'efiry', 'chestno', 'partneram', 'final'].forEach((id) => { const n = document.getElementById(id); if (n) spy.observe(n); });
    // шапка темнеет, пока под ней тёмная сцена видоискателя
    const vfSec = $('#znakomtes');
    let darkIO = null;
    const watchDark = () => {
      if (darkIO) darkIO.disconnect();
      const h = hdr.offsetHeight;
      darkIO = new IntersectionObserver(([e]) => hdr.classList.toggle('is-dark', e.isIntersecting), { rootMargin: `-${h - 1}px 0px -${Math.max(1, innerHeight - h)}px 0px`, threshold: 0 });
      darkIO.observe(vfSec);
    };
    watchDark();
    addEventListener('resize', watchDark);
  }

  /* ── Появление при прокрутке: один механизм, каскад 70 мс ────────────── */
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

  /* ── 2. Лучшие недели: даты прошедшей недели; лента на паузе вне экрана и при скрытой вкладке ─ */
  {
    const w = $('[data-week]');
    const now = new Date();
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    w.textContent = mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()}–${sun.getDate()} ${MONTHS_G[mon.getMonth()]}`
      : `${mon.getDate()} ${MONTHS_G[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_G[sun.getMonth()]}`;

    // Движение — CSS-анимация трека (только под html.js). Скрипт: ставит старт так, чтобы Анастасия стояла
    // у центра, а края всегда были заняты; паузы вне экрана и при скрытой вкладке; фокус с клавиатуры
    // подводит карточку к центру. «Меньше движения» — один набор, листается вбок (CSS), скрипт центрирует.
    const view = $('#strip');
    if (view) {
      const track = $('.strip__track', view);
      const sets = $$('.strip__set', view);
      const real = sets[1] || sets[0];
      const center = $('[data-center]', real);
      let inView = !hasIO, setW = 0, x0 = 0, manual = false;
      const isStatic = () => RM || getComputedStyle(track).animationName === 'none';
      const place = () => {
        const vw = view.clientWidth;
        if (isStatic()) {
          view.classList.add('is-static');
          if (center) view.scrollLeft = center.offsetLeft + center.offsetWidth / 2 - vw / 2;
          return;
        }
        view.classList.remove('is-static');
        setW = real.offsetWidth;
        const c = center ? center.offsetLeft + center.offsetWidth / 2 : setW * 1.5;
        // трек сдвигается на один набор за круг: слева край не должен открыться в начале, справа — в конце
        x0 = Math.min(0, Math.max(vw / 2 - c, vw - 2 * setW));
        track.style.setProperty('--x0', `${Math.round(x0)}px`);
      };
      const sync = () => view.classList.toggle('is-off', !inView || document.hidden);
      if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0 }).observe(view);
      document.addEventListener('visibilitychange', sync);
      addEventListener('resize', place);
      loops.push({ sync: place });
      place();
      sync();

      // Клавиатура: карточка за краем — ленту на паузе подводим так, чтобы карточка встала по центру
      view.addEventListener('focusin', (e) => {
        const card = e.target.closest && e.target.closest('.sc');
        if (!card) return;
        const vr = view.getBoundingClientRect(), r = card.getBoundingClientRect();
        if (!manual && r.left >= vr.left + 24 && r.right <= vr.right - 24) return;
        if (view.classList.contains('is-static')) { view.scrollLeft += r.left + r.width / 2 - (vr.left + vr.width / 2); return; }
        if (!manual) {
          const m = getComputedStyle(track).transform;
          const cur = m && m !== 'none' ? new DOMMatrixReadOnly(m).m41 : x0;
          track.style.setProperty('--tx', `${cur}px`);
          view.classList.add('is-manual');
          void track.offsetWidth;
          manual = true;
        }
        track.style.setProperty('--tx', `${Math.round(vr.width / 2 - (card.offsetLeft + card.offsetWidth / 2))}px`);
      });
      // фокус ушёл из ленты — круг продолжается с того же места (сдвиг на целый набор не виден: наборы одинаковые)
      view.addEventListener('focusout', (e) => {
        if (!manual || view.contains(e.relatedTarget)) return;
        const tx = parseFloat(track.style.getPropertyValue('--tx')) || 0;
        manual = false;
        view.classList.remove('is-manual');
        const a = track.getAnimations ? track.getAnimations().find((x) => x.animationName === 'strip-run') : null;
        if (a && setW) {
          const D = a.effect.getComputedTiming().duration;
          const ph = ((((x0 - tx) % setW) + setW) % setW) / setW;
          a.currentTime = ph * D;
        }
      });
    }
  }

  /* ── 3. Умный поиск: запрос набирается, выдача наводится на резкость ─── */
  {
    const resBox = $('#res'), qText = $('#sbar-q'), chipsBox = $('#qchips');
    const sec = $('#poisk');
    const preload = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
    const ready = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })));
    const chips = $$('.qchip', chipsBox);
    let qI = 0, cells = [], token = 0, typing = 0, fastNow = false;
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
    const setQuery = (i, fast = false) => {
      qI = i;
      const tok = ++token;
      fastNow = fast;
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

  /* ── 4. Видоискатель: рамка раскрывается по прокрутке, данные подгружаются ─ */
  {
    const vf = $('#znakomtes'), stage = $('#vf-stage');
    const setAll = (v) => { stage.style.setProperty('--g', v); stage.style.setProperty('--n', v); stage.style.setProperty('--q', v); };
    // фокус с клавиатуры внутри сцены (ссылка на эфир) — сцена сразу раскрыта, иначе ссылку не видно
    let forced = false;
    vf.addEventListener('focusin', () => { forced = true; setAll('1'); });
    vf.addEventListener('focusout', (e) => { if (!vf.contains(e.relatedTarget)) { forced = false; queueScroll(); } });
    if (RM) setAll('1');
    else {
      onScroll(vf, (r, vh) => {
        if (forced) { setAll('1'); return; }
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        stage.style.setProperty('--g', easeInOut(clamp((p - 0.04) / 0.5)).toFixed(4));
        stage.style.setProperty('--n', easeOut(clamp((p - 0.2) / 0.28)).toFixed(4));
        stage.style.setProperty('--q', easeOut(clamp((p - 0.4) / 0.3)).toFixed(4));
      });
      queueScroll();
      loops.push({ sync() { if (RM) setAll('1'); } });
    }
  }

  /* ── 5. ИИ-редактор профиля: карточка собирает себя ──────────────────── */
  {
    const root = $('#redaktor'), card = $('#pc');
    const steps = $$('#aip-steps .step');
    const urlT = $('#pc-url'), nameT = $('#pc-name'), nickT = $('#pc-nick');
    const grid = $('#pc-grid');
    const btn = $('#pc-btn');
    const replay = $('#aip-replay');
    const WORKS = ['ag-11', 'ag-46', 'ag-40', 'ag-54', 'ag-07', 'ag-09'];
    grid.innerHTML = '';
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
      steps.forEach((li, i) => li.addEventListener('click', () => render([2400, 6100, 1e9][i])));
    } else {
      let t = 0, done = false;
      render(0);
      const tick = (dt) => {
        t += dt;
        if (t >= END) { t = END; done = true; render(1e9); replay.hidden = false; ctl.sync(); return; }
        render(t);
      };
      const ctl = autoplay(root, tick, { hoverEls: [card], threshold: 0.45, blocked: () => done, onChange: (on) => card.classList.toggle('is-run', on) });
      const restart = () => { t = 0; done = false; replay.hidden = true; render(0); ctl.sync(); };
      replay.addEventListener('click', restart);
      steps.forEach((li, i) => li.addEventListener('click', () => { t = [0, 2500, 6200][i]; done = false; replay.hidden = true; render(t); ctl.sync(); }));
    }
  }

  /* ── 6. Вкладки возможностей ─────────────────────────────────────────── */
  {
    const tabs = $$('.tabs__bar .tab');
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
    // ссылки внутри панелей, которые переключают вкладку («Смотреть, как продавать своё»)
    $$('[data-tab-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); select(Number(a.dataset.tabGo), true); }));
    const fromHash = panels.findIndex((p) => p && location.hash === `#${p.id}`);
    select(fromHash >= 0 ? fromHash : 0, false);
  }

  /* ── 7. Калькулятор дохода ───────────────────────────────────────────── */
  {
    const price = $('[data-calc-input="price"]'), sales = $('[data-calc-input="sales"]');
    const sumEl = $('[data-calc-sum]'), cover = $('[data-calc-cover]'), hint = $('[data-calc-hint]');
    const btns = $$('#calc-fmts button');
    const live = $('#calc-live');
    let shown = 0, anim = 0, cur = CALC_FORMATS[0], liveT = 0;
    // скринридеру — одна фраза через полсекунды после того, как отпустили ползунок, а не на каждый шаг
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
    const update = () => {
      const p = Number(price.value), s = Number(sales.value), gross = p * s, net = gross * (1 - FEE);
      $('[data-calc-price]').textContent = money(p);
      $('[data-calc-sales]').textContent = String(s);
      $('[data-calc-gross]').textContent = money(gross);
      $('[data-calc-fee]').textContent = `−${money(gross * FEE)}`;
      $('[data-calc-net]').textContent = money(net);
      fill(price); fill(sales);
      countTo(net);
      announce();
    };
    const setFormat = (f) => {
      cur = f;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === f.key)));
      $('[data-calc-badge]').textContent = f.badge;
      $('[data-calc-title]').textContent = f.title;
      $('[data-calc-sales-label]').textContent = f.salesLabel;
      hint.textContent = f.hint || '';
      Object.assign(price, { min: f.min, max: f.max, step: f.step });
      price.value = f.price;
      Object.assign(sales, { min: 1, max: f.maxSales, step: 1 });
      sales.value = f.sales;
      if (!cover.src.endsWith(f.cover)) {
        cover.classList.add('is-swapping');
        setTimeout(() => { cover.src = f.cover; cover.style.objectPosition = f.pos || '50% 50%'; cover.onload = () => cover.classList.remove('is-swapping'); }, RM ? 0 : 220);
      }
      update();
    };
    btns.forEach((b) => b.addEventListener('click', () => setFormat(CALC_FORMATS.find((f) => f.key === b.dataset.fmt))));
    $$('[data-calc-pick]').forEach((b) => b.addEventListener('click', () => { const t = btns.find((x) => x.dataset.fmt === b.dataset.calcPick); if (t) { t.click(); t.focus({ preventScroll: true }); } }));
    price.addEventListener('input', update);
    sales.addEventListener('input', update);
    setFormat(cur);
    clearTimeout(liveT);
    cancelAnimationFrame(anim);
    shown = Number(price.value) * Number(sales.value) * (1 - FEE);
    sumEl.textContent = Math.round(shown).toLocaleString('ru-RU');
    if (!RM && hasIO) once($('#calc'), () => { const target = shown; shown = 0; countTo(target); }, 0.4);
  }

  /* ── 8. Календарь эфиров и панель справа ─────────────────────────────── */
  {
    const cal = $('#cal'), body = $('#cal-body'), mLabel = $('#cal-m'), sumEl = $('#cal-sum');
    const epn = $('#epn'), kickEl = $('#epn-kick'), bodyEl = $('#epn-b'), footEl = $('.epn__f', epn), closeB = $('#epn-x'), liveEl = $('#epn-live');
    const prevB = $('#cal-prev'), nextB = $('#cal-next'), mineB = $('#cal-mine');
    const segB = $$('.cal__seg button');
    const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const WDF = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const pad = pad2;
    const ymd = ymdOf;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const ymOf = (s) => s.slice(0, 7);
    const ymLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
    const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
    const RANGE = [ymAdd(ymOf(TODAY), -1), ymAdd(ymOf(TODAY), 5)];
    // открываем месяц эфира Анастасии: панель по умолчанию стоит на нём, и чип должен быть в сетке
    const state = { ym: ymOf(EVENTS.find((e) => e.id === 'e14').d), view: 'month', topics: [], fmts: [], mine: false, sel: 'e14' };
    const ICON = (id, s = 12) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const isPast = (e) => e.d < TODAY;
    const hostName = (e) => (typeof e.host === 'string' ? e.host : e.host.name);
    const filtered = (list) => list.filter((e) => (!state.topics.length || state.topics.includes(e.topic)) && (!state.fmts.length || state.fmts.includes(e.fmt)) && (!state.mine || e.mine));
    const monthEvents = (ym) => EVENTS.filter((e) => ymOf(e.d) === ym);
    const dateText = (e) => { const dt = parse(e.d); return `${dt.getDate()} ${MONTHS_G[dt.getMonth()]}`; };
    // даты эфира в других блоках
    $$('[data-ev-date]').forEach((n) => { const e = byId(n.dataset.evDate); if (e) n.textContent = dateText(e); });

    // выпадашки «Все темы» / «Все форматы»
    const dds = [
      { key: 'topics', all: 'Все темы', few: 'Темы', list: TOPICS, det: $('#dd-topic'), lbl: $('#dd-topic-l'), box: $('#dd-topic-list') },
      { key: 'fmts', all: 'Все форматы', few: 'Форматы', list: FORMATS, det: $('#dd-fmt'), lbl: $('#dd-fmt-l'), box: $('#dd-fmt-list') }
    ];
    const renderDd = (dd) => {
      const sel = state[dd.key];
      dd.box.innerHTML = dd.list.map((v) => `<button type="button" aria-pressed="${sel.includes(v)}" data-v="${esc(v)}"><span class="dd__box">${ICON('check', 13)}</span>${esc(v)}</button>`).join('');
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

    // чип эфира: время, значки и название идут одним абзацем в две строки, дальше многоточие
    const chip = (e) => `<button type="button" class="cch${e.mine ? ' mine' : ''}${isPast(e) ? ' past' : ''}${state.sel === e.id && cal.classList.contains('is-open') ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}" title="${esc(e.title)}" aria-label="${esc(e.title)}, ${dateText(e)}, ${e.t}${e.rec ? ', есть запись' : ''}${e.off ? ', офлайн' : ''}"><span class="cch__x"><b>${e.t}</b>${e.rec ? ICON('check') : ''}${e.off ? ICON('pin') : ''}${esc(e.title)}</span></button>`;

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
          cells += `<div class="cd${out ? ' out' : ''}${today ? ' today' : ''}${past ? ' past' : ''}${evs.length > 1 ? ' multi' : ''}"><span class="cd__n" aria-hidden="true">${d.getDate()}</span>${evs.map((e) => chip(e).replace('class="cch', `style="--d:${k++ * 40}ms" class="cch`)).join('')}</div>`;
          d.setDate(d.getDate() + 1);
        }
        rows.push(`<div class="cw">${cells}</div>`);
      }
      const empty = !shown.length ? `<div class="cal__empty" style="margin-top:12px"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'В этом месяце эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>` : '';
      // 6 недель — чипы в две строки, 5 и меньше — в три: сетка одной высоты, секция не прыгает
      body.innerHTML = `<div class="cgrid${rows.length > 5 ? ' cgrid--6' : ''}${gridSeen ? ' is-in' : ''}" id="cgrid" aria-label="${ymLabel(state.ym)}"><div class="cw cw--h" aria-hidden="true">${WD7.map((w) => `<div class="cwd">${w}</div>`).join('')}</div>${rows.join('')}</div>${empty}`;
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
        return `<div class="clist__d"><div class="clist__dt"><b>${dt.getDate()} ${MONTHS_G[m - 1].slice(0, 3)}</b>${WD[dt.getDay()]}${d === TODAY ? ' · сегодня' : ''}</div><div class="clist__ev">${ev.map((e) => `<button type="button" class="cer${isPast(e) ? ' past' : ''}${state.sel === e.id && cal.classList.contains('is-open') ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}"><span class="cer__t">${e.t}</span><span class="cer__m"><span class="cer__n">${esc(e.title)}</span><span class="cer__k">${esc(hostName(e))} · ${esc(e.fmt)}${e.off ? ` · ${esc(e.city)}` : ''}${e.mine ? ' · ты записан' : ''}</span></span>${e.rec ? ICON('check', 16) : ''}${e.off ? ICON('pin', 16) : ''}</button>`).join('')}</div></div>`;
      }).join('')}</div>`;
    };

    // панель выбранного эфира — выезжает справа поверх календаря
    const relText = (e) => {
      const days = Math.round((parse(e.d) - parse(TODAY)) / 864e5);
      if (days === 0) return 'сегодня';
      if (days === 1) return 'завтра';
      if (days > 1) return `через ${days} ${plural(days, ['день', 'дня', 'дней'])}`;
      return e.rec ? 'есть запись' : 'уже прошёл';
    };
    const drawEv = () => {
      const e = byId(state.sel);
      if (!e) return;
      const dt = parse(e.d);
      const past = isPast(e);
      const kick = `<span class="epn__tag">${esc(e.fmt)}</span><span>${esc(e.topic)}</span><span>${relText(e)}</span>`;
      const rows = `<dl class="epn__rows">
        <div><dt>Когда</dt><dd><b>${WDF[dt.getDay()]}, ${dateText(e)}</b><span>${e.t} мск${e.off ? ` · ${esc(e.city)}, вживую` : ' · онлайн'}</span></dd></div>
        <div><dt>Кто может прийти</dt><dd><b>Все, у${NB}кого есть профиль</b><span>вход свободный</span></dd></div>
      </dl>`;
      const host = typeof e.host === 'string'
        ? `<div class="epn__host"><i>${ICON('users', 18)}</i><div><b>${esc(cap(e.host))}</b><span>практик, работает на событиях</span></div></div>`
        : `<div class="epn__host"><img src="${e.host.ava}" width="40" height="40" alt=""><div><b>${esc(e.host.name)}</b><span>${esc(e.host.role)}</span></div></div>`;
      const rec = past && e.rec ? `<p class="epn__rec">${ICON('play', 14)}<span>Есть запись · из${NB}неё можно <a class="lnk" href="#kurs">собрать${NB}курс</a></span></p>` : '';
      const action = past
        ? (e.rec ? `<a class="btn" href="${ONB}#onboarding">Смотреть запись</a>` : `<p class="epn__note">Эфир уже прошёл, записи нет.</p>`)
        : (e.mine ? `<a class="btn btn--ghost" href="${ONB}#onboarding">${ICON('check', 16)}&nbsp;Ты записан</a>` : `<a class="btn" href="${ONB}#onboarding">Записаться</a>`) + `<a class="ghost" href="${ONB}#onboarding">${ICON('cal', 16)}В&nbsp;календарь</a>`;
      const note = past ? `Запись и${NB}обучение спикера${NB}— в${NB}его профиле.` : `После эфира участники попадают в${NB}профиль спикера${NB}— там его обучение.`;
      const paint = () => {
        kickEl.innerHTML = kick;
        bodyEl.innerHTML = `<h3 class="epn__h" id="epn-h" tabindex="-1">${esc(e.title)}</h3>${rows}${host}${rec}`;
        footEl.innerHTML = `${action}<p class="epn__note">${note}</p>`;
        epn.classList.remove('is-swap');
        if (focusPanel) { focusPanel = false; const h = $('#epn-h'); if (h) h.focus({ preventScroll: true }); }
      };
      liveEl.textContent = `${e.title}, ${WDF[dt.getDay()].toLowerCase()}, ${dateText(e)}, ${e.t}`;
      if (RM || !cal.classList.contains('is-open')) paint();
      else { epn.classList.add('is-swap'); setTimeout(paint, 170); }
    };
    const markSel = () => $$('[data-ev]', body).forEach((b) => { const on = b.dataset.ev === state.sel && cal.classList.contains('is-open'); b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', String(on)); });
    // фокус: открыли с клавиатуры — переводим на заголовок панели; закрыли из панели — возвращаем на чип эфира
    let focusPanel = false;
    const openEv = (id, byKeyboard = false) => { state.sel = id; focusPanel = byKeyboard; cal.classList.add('is-open'); drawEv(); markSel(); };
    const closeEv = () => {
      const wasInside = epn.contains(document.activeElement);
      cal.classList.remove('is-open'); markSel();
      if (wasInside) { const back = $(`[data-ev="${state.sel}"]`, body) || $('[data-ev]', body) || mLabel; if (back) back.focus({ preventScroll: true }); }
    };
    closeB.addEventListener('click', closeEv);
    // Esc работает только внутри календаря: сначала закрывает открытый список фильтра, потом панель
    cal.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const dd = dds.find((x) => x.det.open && x.det.contains(e.target));
      if (dd) { dd.det.open = false; $('summary', dd.det).focus(); e.stopPropagation(); return; }
      if (cal.classList.contains('is-open')) { closeEv(); e.stopPropagation(); }
    });

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
    sumEl.addEventListener('click', (e) => {
      if (e.target.id !== 'cal-reset') return;
      state.topics = []; state.fmts = []; state.mine = false;
      mineB.setAttribute('aria-checked', 'false');
      dds.forEach(renderDd);
      draw();
    });
    // панель закрывается, когда выбранного эфира нет на экране: другой месяц, вид «Полгода» или «Список»
    const dropIfHidden = () => {
      if (!cal.classList.contains('is-open')) return;
      const e = byId(state.sel);
      if (state.view !== 'month' || !e || ymOf(e.d) !== state.ym) closeEv();
    };
    prevB.addEventListener('click', () => { state.ym = ymAdd(state.ym, -1); dropIfHidden(); draw(); });
    nextB.addEventListener('click', () => { state.ym = ymAdd(state.ym, 1); dropIfHidden(); draw(); });
    segB.forEach((b) => b.addEventListener('click', () => {
      state.view = b.dataset.view;
      segB.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      dropIfHidden();
      draw();
    }));
    mineB.addEventListener('click', () => {
      state.mine = !state.mine;
      mineB.setAttribute('aria-checked', String(state.mine));
      draw();
    });
    // ссылки на эфир из других блоков: открыть месяц и панель
    $$('[data-ev-open]').forEach((a) => a.addEventListener('click', () => {
      const e = byId(a.dataset.evOpen);
      if (!e) return;
      state.ym = ymOf(e.d); state.view = 'month';
      segB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
      draw();
      openEv(e.id);
    }));
    draw();
    drawEv();
    markSel();
  }

  /* ── 9. Курс из записи (карточка под календарём): уроки отмечаются один раз ─ */
  {
    const kd = $('#kurs');
    if (kd) {
      $$('.lessons li', kd).forEach((li, i) => li.style.setProperty('--i', i));
      const play = () => kd.classList.add('is-play');
      if (RM || !hasIO) play(); else once(kd, play, 0.35);
    }
  }

  /* ── 10. Честный рейтинг: кружочки плавают только на экране; окно правил ─ */
  {
    const bubbles = $('#bubbles');
    let bubIn = !hasIO;
    const syncBub = () => bubbles.classList.toggle('is-paused', document.hidden || !bubIn);
    if (hasIO) new IntersectionObserver(([e]) => { bubIn = e.isIntersecting; syncBub(); }, { threshold: 0.05 }).observe(bubbles);
    document.addEventListener('visibilitychange', () => { syncBub(); if (!document.hidden) queueScroll(); });
    const dlg = $('#rules');
    const close = () => { if (dlg.open) dlg.close(); };
    $$('[data-rules]').forEach((b) => b.addEventListener('click', () => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }));
    $('#rules-x').addEventListener('click', close);
    $('#rules-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  /* ── 11. Программа для партнёров: сердечко один раз обходит орбиту ───── */
  {
    const orbit = $('#orbit'), heart = $('#orbit-heart'), path = $('#orbit-path');
    const steps = $$('.orbit__s', orbit);
    const all = () => steps.forEach((li) => li.classList.add('is-on'));
    if (RM || !heart.animate || !CSS.supports('offset-path', 'path("M0 0h1")') || !path.getTotalLength) all();
    else {
      // доля пути у каждой точки — по геометрии эллипса
      const L = path.getTotalLength();
      const labels = steps.map((li) => {
        const x = Number(li.dataset.x), y = Number(li.dataset.y);
        let best = 0, bd = 1e9;
        for (let i = 0; i <= 400; i += 1) { const p = path.getPointAtLength((L * i) / 400); const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i / 400; } }
        return { li, at: best };
      });
      const DUR = 9000;
      const mark = (p) => labels.forEach(({ li, at }) => { let d = at - p; if (d < -0.5) d += 1; li.classList.toggle('is-on', d > -0.03 && d < 0.09); });
      const anim = heart.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], { duration: DUR, iterations: 1, fill: 'forwards', easing: 'linear' });
      anim.pause();
      let done = false;
      anim.onfinish = () => { done = true; all(); ctl.sync(); };
      const tick = () => { if (!done) mark(((anim.currentTime || 0) / DUR) % 1); };
      // autoplay сам включает и выключает ролик по экрану и вкладке; сердечко идёт только пока тикает
      const ctl = autoplay(orbit, tick, { threshold: 0.4, blocked: () => done, onChange: (on) => { if (on) anim.play(); else if (!done) anim.pause(); } });
      mark(0);
    }
  }

  /* ── 12. Финал: веер, сердце, поле ника ──────────────────────────────── */
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
      $$('.res__i').forEach((c) => c.classList.remove('is-soft'));
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ);
})();
