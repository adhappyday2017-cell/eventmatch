/* EventMatch — главная, вариант K. Без библиотек; без скрипта страница полная: переключатель профессии,
   вкладки и стартовый формат калькулятора работают на radio + :has, скрипт только добавляет движение.
   Правило движения: спокойно, «как в фотолаборатории»; всё автоматическое — на паузе вне экрана и при скрытой вкладке;
   «меньше движения» выключает всё. */
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
  const NB = ' ';
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')}${NB}₽`;
  const plural = (n, [one, few, many]) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; };
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* ── Данные (та же таблица, что собирает index.html) ───────────────── */
  const D = {"CARD": {"photo": ["k-r-photo", "Фотограф", "Санкт‑Петербург", "50% 30%", "Фотограф с плёночной камерой"], "photo2": ["k-r-photo2", "Фотограф", "Екатеринбург", "50% 40%", "Фотограф с камерой в студии"], "photo3": ["k-r-photo3", "Фотограф", "Казань", "50% 45%", "Фотограф с камерой среди ёлок"], "group": ["k-r-group", "Фотограф", "Москва", "50% 35%", "Фотографы снимают на улице"], "video": ["k-r-video", "Видеограф", "Санкт‑Петербург", "62% 50%", "Камера на съёмочной площадке"], "video2": ["k-r-video2", "Видеограф", "Казань", "50% 30%", "Видеограф за камерой"], "reels": ["k-r-reels", "Reels-мейкер", "Сочи", "50% 20%", "Съёмка reels на вечеринке"], "reels2": ["k-r-reels2", "Reels-мейкер", "Москва", "50% 50%", "Съёмка reels в неоновом свете"], "makeup": ["k-r-makeup", "Визажист", "Москва", "50% 22%", "Визажист наносит макияж"], "makeup2": ["k-r-makeup2", "Визажист", "Новосибирск", "50% 50%", "Макияж глаз крупным планом"], "hair": ["k-r-hair", "Стилист по волосам", "Екатеринбург", "50% 30%", "Свадебная причёска с цветами"], "model": ["k-r-model", "Модель", "Санкт‑Петербург", "50% 15%", "Модель в вечернем платье"], "model2": ["k-r-model2", "Модель", "Москва", "50% 30%", "Рыжая модель с веснушками и гирляндой"], "model3": ["k-r-model3", "Модель", "Самара", "50% 30%", "Рыжая модель, портрет в профиль"], "model4": ["k-r-model4", "Модель", "Казань", "50% 25%", "Модель с кудрявыми волосами"], "host": ["k-r-host", "Ведущий", "Казань", "30% 40%", "Ведущий на сцене"], "organizer": ["k-r-organizer", "Организатор", "Нижний Новгород", "50% 45%", "Выездная регистрация в беседке"], "hall": ["k-r-hall", "Организатор", "Москва", "50% 50%", "Банкетный зал с гирляндами"], "decor": ["k-r-decor", "Декоратор", "Москва", "50% 50%", "Декор стола с фонарями"], "c-host": ["k-r-host", "Курс для ведущих", "6 недель · ведущий", "30% 40%", "Ведущий на сцене"], "c-host2": ["k-r-desk", "Разбор первых пяти минут", "ведущий · запись", "50% 50%", "Ноутбук и конспект на столе"], "c-host3": ["k-r-hall", "Мастер-класс: свадьба на 200 гостей", "ведущий · офлайн", "50% 50%", "Банкетный зал"], "e-smeta": ["k-r-hall", "Смета свадьбы без сюрпризов", "эфир · организатор", "50% 50%", "Банкетный зал"], "e-plan": ["k-r-organizer", "Планируем сезон: цены и календарь", "эфир · организатор", "50% 45%", "Беседка для регистрации"], "e-price": ["k-r-desk", "Как ставить цену на съёмку", "эфир · фотограф", "50% 50%", "Ноутбук и конспект"]}, "QUERIES": {"photo": [["второй фотограф на свадьбу", ["photo", "photo3", "group"]], ["модель, рыжая с веснушками", ["model2", "model3", "model4"]], ["свободный фотограф на вторник", ["photo2", "group", "photo3"]]], "video": [["фотограф в пару на свадьбу", ["photo", "photo3", "group"]], ["модель для рекламного ролика", ["model2", "model4", "model3"]], ["второй оператор или reels-мейкер", ["video", "video2", "reels2"]]], "reels": [["модель для reels в студии", ["model2", "model3", "model4"]], ["визажист или стилист на съёмку reels", ["makeup", "makeup2", "hair"]], ["фотограф, с кем снимать свадьбы", ["photo3", "group", "photo"]]], "host": [["видеограф или reels-мейкер на свадьбу", ["video2", "video", "reels2"]], ["организатор или декоратор на сезон", ["organizer", "hall", "decor"]], ["курс для начинающих ведущих", ["c-host", "c-host2", "c-host3"], "edu"]], "makeup": [["фотограф для съёмки в портфолио", ["photo", "photo3", "group"]], ["модель на отработку", ["model2", "model3", "model4"]], ["стилист по волосам или визажист в пару", ["hair", "makeup", "makeup2"]]], "hair": [["фотограф для съёмки в портфолио", ["photo3", "photo", "group"]], ["модель на отработку", ["model4", "model2", "model3"]], ["визажист или второй стилист на свадьбу", ["makeup", "makeup2", "hair"]]], "model": [["фотограф на тест", ["photo", "photo2", "photo3"]], ["визажист или стилист на съёмку", ["makeup", "makeup2", "hair"]], ["организатор и ведущий на показ", ["organizer", "hall", "host"]]], "organizer": [["декоратор и фотограф на совместную съёмку", ["decor", "photo", "photo3"]], ["команда на выездную регистрацию", ["host", "video2", "decor"]], ["эфир про сметы и цены", ["e-smeta", "e-plan", "e-price"], "edu"]], "decor": [["организатор и фотограф на совместную съёмку", ["organizer", "hall", "photo"]], ["фотограф на съёмку декора", ["photo", "photo3", "group"]], ["эфир про сметы и цены", ["e-smeta", "e-plan", "e-price"], "edu"]]}, "CALC_START": {"photo": "master", "video": "video", "reels": "video", "host": "course", "makeup": "master", "hair": "master", "model": "review", "organizer": "course", "decor": "master"}, "PRO_LOW": {"photo": "фотограф", "video": "видеограф", "reels": "reels-мейкер", "host": "ведущий", "makeup": "визажист", "hair": "стилист по волосам", "model": "модель", "organizer": "организатор", "decor": "декоратор"}};
  const CARD = D.CARD, QUERIES = D.QUERIES, CALC_START = D.CALC_START, PRO_LOW = D.PRO_LOW;
  const proRadios = $$('.pro__r');
  const getPro = () => (proRadios.find((r) => r.checked) || proRadios[0]).value;

  // Калькулятор: пресеты и границы проверены по research/16 (19.10.2026). Заголовок — под профессию.
  const FEE = 0.15;
  const CALC = {
    course: { price: 30000, min: 15000, max: 90000, step: 500, sales: 6, maxSales: 40, slabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: `Курсы практиков с${NB}обратной связью стоят 15–\u206090${NB}тысяч. Это самый частый формат у${NB}тех, кто учит коллег.`,
      title: { photo: 'Свадебная съёмка: 8 недель', video: 'Свадебный фильм: 8 недель', reels: 'Reels для событий: 6 недель', host: 'Курс для ведущих: 6 недель', makeup: 'Свадебный макияж: 6 недель', hair: 'Свадебные причёски: 6 недель', model: 'Позирование для тестов: 4 недели', organizer: 'Свадьба под ключ: 8 недель', decor: 'Декор событий: 6 недель' } },
    master: { price: 55000, min: 7900, max: 149900, step: 100, sales: 10, maxSales: 30, slabel: 'Мест в потоке', unit: ['место', 'места', 'мест'], note: `1${NB}поток в${NB}месяц`,
      hint: `Два дня практики${NB}— около 55${NB}тысяч за${NB}место при группе 10–\u206015${NB}человек; вечерний мастер-класс на${NB}3${NB}часа${NB}— около 8${NB}тысяч.`,
      title: { photo: 'Два дня офлайн, группа до 15 человек', video: 'Съёмка свадьбы за два дня офлайн', reels: 'Reels прямо на площадке: вечер', host: 'Первые пять минут ведущего: вечер', makeup: 'Отработка на модели, индивидуально: 4–\u20606 часов', hair: 'Отработка: свадебные причёски, день', model: 'Позирование с фотографом: вечер', organizer: 'Выездная регистрация: один день', decor: 'Декор стола: вечер' },
      // старт под профессию — по research/16 §4 и CSV №9, №10, №26, №39: вечерний МК на 3 часа — 7 900 ₽ (reels, ведущий, модель); визажист — отработки 25–45 тыс., 1–3 ученика в месяц; причёски — день 4–9 тыс.; декор — МК 2 500–8 500
      pp: {
        reels: { price: 7900, min: 3000, max: 20000, step: 100, sales: 12, hint: `Вечерний мастер-класс на${NB}3${NB}часа${NB}— около 8${NB}тысяч за${NB}место.` },
        host: { price: 7900, min: 3000, max: 20000, step: 100, sales: 12, hint: `Вечерний мастер-класс на${NB}3${NB}часа${NB}— около 8${NB}тысяч за${NB}место.` },
        model: { price: 7900, min: 3000, max: 20000, step: 100, sales: 12, hint: `Вечерний мастер-класс на${NB}3${NB}часа${NB}— около 8${NB}тысяч за${NB}место.` },
        makeup: { price: 25000, min: 25000, max: 45000, step: 500, sales: 3, maxSales: 10, slabel: 'Учеников в месяц', unit: ['ученик', 'ученика', 'учеников'], note: 'индивидуально', hint: `Отработка у${NB}практика${NB}— 25–\u206045${NB}тысяч за${NB}ученика, индивидуально; обычно 1–\u20603${NB}ученика в${NB}месяц.` },
        hair: { price: 9000, min: 4000, max: 20000, step: 500, sales: 8, hint: `Один день причёсок на${NB}моделях${NB}— 4–\u20609${NB}тысяч за${NB}место, два-три дня${NB}— до${NB}20${NB}тысяч.` },
        decor: { price: 8500, min: 2500, max: 30000, step: 500, sales: 10, hint: `Вечерний мастер-класс по${NB}декору${NB}— 2,5–\u20608,5${NB}тысячи за${NB}место; очный курс на${NB}несколько дней${NB}— 25–\u206030${NB}тысяч.` }
      } },
    video: { price: 5900, min: 2990, max: 9900, step: 10, sales: 28, maxSales: 200, slabel: 'Продаж в месяц', unit: ['продажа', 'продажи', 'продаж'],
      hint: `Видеоурок на${NB}1,5${NB}часа за${NB}5${NB}900${NB}₽ принёс знакомому фотографу около 2${NB}млн${NB}₽${NB}— примерно 340${NB}продаж. Так продаётся у${NB}автора с${NB}большой аудиторией.`,
      title: { photo: 'Репортаж на свадьбе: 1,5 часа', video: 'Звук на церемонии: 1 час', reels: 'Монтаж в телефоне: 1,5 часа', host: 'Сценарий вечера: 1,5 часа', makeup: 'Макияж до утра: 1 час', hair: 'Причёска с фатой: 1 час', model: 'Позирование: 1 час', organizer: 'Тайминг дня: 1,5 часа', decor: 'Свечи и текстиль: 1 час' } },
    review: { price: 15000, min: 5000, max: 20000, step: 500, sales: 6, maxSales: 40, slabel: 'Консультаций в месяц', unit: ['консультация', 'консультации', 'консультаций'],
      hint: `Разбор портфолио или консультация у${NB}практика${NB}— 15–\u206020${NB}тысяч за${NB}2–\u20603${NB}часа. Почти без подготовки, подходит, даже если курса пока нет.`,
      title: { photo: 'Разбор портфолио: до 3 часов', video: 'Разбор монтажа: до 3 часов', reels: 'Разбор аккаунта: до 3 часов', host: 'Разбор выступления: до 3 часов', makeup: 'Разбор работ: до 3 часов', hair: 'Разбор работ: до 3 часов', model: 'Разбор портфолио: до 3 часов', organizer: 'Разбор сметы: до 3 часов', decor: 'Разбор проекта: до 3 часов' } }
  };

  // Календарь эфиров. «Сегодня» — реальная дата; события заданы смещением в днях, поэтому демо не устаревает.
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const TODAY = ymdOf(new Date());
  const dayFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return ymdOf(d); };
  // Эфир Анастасии — ближайший вторник или среда не раньше чем через 7 дней
  const nastyaDay = () => { for (let n = 7; n < 14; n += 1) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); if (d.getDay() === 2 || d.getDay() === 3) return ymdOf(d); } return dayFrom(7); };
  const TOPICS = ['Фото', 'Видео и reels', 'Ведущие', 'Образ', 'Организация и декор'];
  const FORMATS = ['Эфир', 'Мастер-класс', 'Разбор', 'Офлайн-встреча'];
  const NASTYA = { name: 'Анастасия Агапова', role: `фотограф · Санкт‑Петербург`, ava: 'img/t/k-nastya-160.webp' };
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
    { id: 'e24', d: dayFrom(143), t: '19:00', title: 'Весенние образы: причёски и макияж', host: 'стилист по волосам', topic: 'Образ', fmt: 'Эфир' },
    { id: 'e25', d: dayFrom(-20), t: '19:00', title: 'Свадебный макияж при разном свете', host: 'визажист', topic: 'Образ', fmt: 'Эфир', rec: true },
    { id: 'e26', d: dayFrom(-22), t: '19:00', title: 'Позирование для тестов: что просит фотограф', host: 'модель', topic: 'Образ', fmt: 'Эфир', rec: true },
    { id: 'e27', d: dayFrom(-23), t: '19:00', title: 'Декор на бюджет: что арендовать, что купить', host: 'декоратор', topic: 'Организация и декор', fmt: 'Эфир', rec: true }
  ];
  EVENTS.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t)); // список и месяц — по дате, эфир Анастасии встаёт на своё место

  /* ── Общие помощники ────────────────────────────────────────────────── */
  const loops = [];
  function makeLoop(target, step, delay, opts = {}) {
    let t = 0, vis = !hasIO, held = false, stopped = false, on = false;
    const ok = () => vis && !held && !stopped && !document.hidden && !RM;
    const sched = () => { clearTimeout(t); t = setTimeout(() => { if (!ok()) return; step(); sched(); }, delay()); };
    const sync = () => { const now = ok(); if (now && !on) { on = true; sched(); } else if (!now && on) { on = false; clearTimeout(t); } };
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
    (opts.hoverEls || []).forEach((h) => { h.addEventListener('pointerenter', () => { hovered = true; sync(); }); h.addEventListener('pointerleave', () => { hovered = false; sync(); }); });
    return { sync };
  }
  const once = (target, cb, threshold = 0.3) => {
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); cb(); } }, { threshold });
    io.observe(target);
  };
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

  /* ── Шапка: активный раздел ──────────────────────────────────────────── */
  if (hasIO) {
    const links = $$('.hdr__nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((es) => {
      es.forEach((e) => { if (!e.isIntersecting) return; links.forEach((a) => a.classList.remove('is-on')); const a = map.get(e.target.id); if (a) a.classList.add('is-on'); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'luchshie', 'poisk', 'znakomtes', 'redaktor', 'vozmozhnosti', 'dohod', 'efiry', 'chestno', 'partneram', 'final'].forEach((id) => { const n = document.getElementById(id); if (n) spy.observe(n); });
  }

  /* ── Линии полос прорисовываются слева направо, один раз ─────────────── */
  {
    const bands = $$('.hero, .band, .vf');
    if (RM || !hasIO) bands.forEach((b) => b.classList.add('in'));
    else {
      const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      bands.forEach((b) => io.observe(b));
    }
  }

  /* ── 1. Контактный лист: даты прошедшей недели ───────────────────────── */
  {
    const now = new Date();
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const txt = mon.getMonth() === sun.getMonth() ? `${mon.getDate()}–${sun.getDate()} ${MONTHS_G[mon.getMonth()]}` : `${mon.getDate()} ${MONTHS_G[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_G[sun.getMonth()]}`;
    $$('[data-week]').forEach((w) => { w.textContent = txt; });
  }

  /* ── Переключатель профессии: CSS уже переключил всё; скрипт запускает движение ── */
  const proListeners = [];
  const onPro = (fn) => proListeners.push(fn);
  const proLive = document.createElement('p');
  proLive.className = 'vh'; proLive.setAttribute('aria-live', 'polite');
  $('#pro').append(proLive);
  proRadios.forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    const k = r.value;
    proListeners.forEach((fn) => fn(k));
    proLive.textContent = `Подсказки поиска, примеры и калькулятор — для профессии «${PRO_LOW[k]}»`;
  }));

  /* ── 2. Умный поиск: запрос набирается, выдача проявляется ───────────── */
  {
    const sec = $('#poisk'), field = $('.sfield', sec), qText = $('#sfield-q'), resBox = $('#res-box'), suggBox = $('#sugg-box'), tf = $('#res-tf');
    const preload = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
    const ready = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })));
    let pro = getPro(), qI = 0, token = 0, typing = 0, userTouched = false;
    const cardHtml = (cid, k) => {
      const [img, t1, t2, pos, alt] = CARD[cid];
      return `<li class="rc" style="--d:${k * 70}ms"><div class="rc__pic"><img src="img/t/${img}.webp" alt="${esc(alt)}" decoding="async" style="object-position:${pos}"></div><p class="rc__cap"><b>${esc(t1)}</b><span>${esc(t2)}</span></p></li>`;
    };
    const activeGrid = () => $(`.res[data-pro="${pro}"] .res__g`, resBox);
    const render = (i) => {
      const grid = activeGrid();
      const ids = QUERIES[pro][i][1];
      grid.innerHTML = ids.map((id, k) => cardHtml(id, k)).join('');
      tf.classList.toggle('is-edu', !!QUERIES[pro][i][2]); // курсы и эфиры — другая подпись в рамке
      const cells = $$('.rc', grid);
      Promise.all($$('img', grid).map(ready)).then(() => { if (cells[0] && cells[0].isConnected) { cells[0].classList.add('is-mark'); setTimeout(() => cells[0].classList.remove('is-mark'), 1400); } });
    };
    const markSugg = (i) => $$(`.sugg[data-pro="${pro}"] .sug`, suggBox).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    qText.textContent = QUERIES[pro][0][0];
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
      setTimeout(() => { if (tok !== token) { resBox.classList.remove('is-swap'); return; } render(i); void resBox.offsetWidth; resBox.classList.remove('is-swap'); }, 180);
    };
    const setQuery = (i, fast = false) => {
      qI = i;
      const tok = ++token;
      markSugg(i);
      QUERIES[pro][i][1].forEach((id) => preload(`img/t/${CARD[id][0]}.webp`));
      const typed = typeQuery(QUERIES[pro][i][0], fast);
      if (fast) swap(i, tok); else typed.then(() => swap(i, tok));
    };
    const qLoop = makeLoop(resBox, () => setQuery((qI + 1) % QUERIES[pro].length), () => 6200, { threshold: 0.35 });
    suggBox.addEventListener('click', (e) => {
      const b = e.target.closest('.sug');
      if (!b) return;
      userTouched = true; qLoop.stop();
      setQuery(Number(b.dataset.i), true);
    });
    holdWhile(qLoop, [resBox, field, suggBox]);
    onPro((k) => { pro = k; qI = 0; token += 1; clearTimeout(typing); markSugg(0); qText.textContent = QUERIES[pro][0][0]; resBox.classList.remove('is-swap'); render(0); if (!userTouched) qLoop.sync(); });
    if (hasIO && !RM) new IntersectionObserver(([e]) => field.classList.toggle('is-live', e.isIntersecting && !document.hidden), { threshold: 0.5 }).observe(field);
    document.addEventListener('visibilitychange', () => { if (document.hidden) field.classList.remove('is-live'); });
  }

  /* ── 3. Видоискатель: кадр растёт из ячейки контактного листа в разворот ─ */
  {
    const vf = $('#znakomtes'), stage = $('#vf-stage');
    const setAll = (v) => { stage.style.setProperty('--g', v); stage.style.setProperty('--n', v); stage.style.setProperty('--q', v); };
    if (RM) setAll('1');
    else {
      onScroll(vf, (r, vh) => {
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        stage.style.setProperty('--g', easeInOut(clamp((p - 0.04) / 0.5)).toFixed(4));
        stage.style.setProperty('--n', easeOut(clamp((p - 0.22) / 0.28)).toFixed(4));
        stage.style.setProperty('--q', easeOut(clamp((p - 0.4) / 0.3)).toFixed(4));
      });
      queueScroll();
      vf.addEventListener('focusin', () => setAll('1')); // ссылка «ближайший эфир» видна, когда на ней фокус
      loops.push({ sync() { if (RM) setAll('1'); } });
    }
  }

  /* ── 4. Профиль за 5 минут: лист собирает себя ───────────────────────── */
  {
    const root = $('#redaktor'), card = $('#pc');
    const steps = $$('#aip-steps .step');
    const urlT = $('#pc-url'), nameT = $('#pc-name'), nickT = $('#pc-nick');
    const grid = $('#pc-grid');
    const btn = $('#pc-btn');
    const replay = $('#aip-replay');
    const cells = $$('.pw', grid);
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
      cells.forEach((c, i) => c.classList.toggle('on', t >= 4500 + i * 170));
      typed(nickT, 6400, t, 100);
      btn.classList.toggle('is-press', t >= 7600 && t < 7900);
      card.classList.toggle('is-pub', t >= 7900);
      btn.textContent = t >= 7900 ? 'Опубликовано' : 'Опубликовать';
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
      const tick = (dt) => { t += dt; if (t >= END) { t = END; done = true; render(1e9); replay.hidden = false; ctl.sync(); return; } render(t); };
      const ctl = autoplay(root, tick, { hoverEls: [card], threshold: 0.45, blocked: () => done, onChange: (on) => card.classList.toggle('is-run', on) });
      replay.addEventListener('click', () => { t = 0; done = false; replay.hidden = true; render(0); ctl.sync(); });
      steps.forEach((li, i) => li.addEventListener('click', () => { t = [0, 2500, 6200][i]; done = false; replay.hidden = true; render(t); ctl.sync(); }));
    }
  }

  /* ── 5. Вкладки возможностей ─────────────────────────────────────────── */
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
    const fromHash = panels.findIndex((p) => p && location.hash === `#${p.id}`);
    select(fromHash >= 0 ? fromHash : 0, false);
  }

  /* ── 6. Калькулятор дохода: формат — radio, старт под профессию ───────── */
  {
    const calc = $('#calc');
    const price = $('[data-in="price"]', calc), sales = $('[data-in="sales"]', calc);
    const radios = $$('.fmt__r', calc);
    const live = $('#calc-live');
    let cur = 'course', pro = getPro(), shown = 0, anim = 0, liveT = 0, userFmt = false;
    const cfg = () => { const f = CALC[cur]; const o = f.pp && f.pp[pro]; return o ? Object.assign({}, f, o) : f; };
    // фото чека — под профессию; у фотографа остаются работы Анастасии из разметки
    const CHK_IMG = { video: ['k-r-video', '62% 50%', 'Камера на съёмочной площадке'], reels: ['k-r-video2', '50% 30%', 'Видеограф за камерой'], host: ['k-r-host', '30% 40%', 'Ведущий на сцене'], makeup: ['k-r-makeup', '50% 22%', 'Визажист наносит макияж'], hair: ['k-r-hair', '50% 30%', 'Свадебная причёска с цветами'], model: ['k-r-model', '50% 15%', 'Модель в вечернем платье'], organizer: ['k-r-organizer', '50% 45%', 'Выездная регистрация в беседке'], decor: ['k-r-decor', '50% 50%', 'Декор стола с фонарями'] };
    const chkImgs = $$('.chk__img', calc);
    const setChkImg = (k) => chkImgs.forEach((im) => { const c = CHK_IMG[k]; const src = c ? `img/t/${c[0]}.webp` : im.dataset.src; if (im.getAttribute('src') === src) return; im.src = src; im.alt = c ? c[2] : im.dataset.alt; im.style.objectPosition = c ? c[1] : im.dataset.pos; });
    const vals = (f) => $(`.calc__vals .cv[data-f="${f}"]`, calc);
    const chk = (f) => $(`.calc__chk .cv[data-f="${f}"]`, calc);
    const announce = () => { clearTimeout(liveT); liveT = setTimeout(() => { live.textContent = `К выплате ${money(Number(price.value) * Number(sales.value) * (1 - FEE))} в месяц, до налога`; }, 500); };
    const fill = (input) => input.style.setProperty('--p', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    const countTo = (target) => {
      const sumEl = $('[data-sum]', vals(cur));
      cancelAnimationFrame(anim);
      if (RM) { shown = target; sumEl.textContent = money(target); return; }
      const from = shown, t0 = performance.now();
      const tick = (t) => { const k = Math.min(1, (t - t0) / 420); shown = from + (target - from) * easeOut(k); sumEl.textContent = money(shown); if (k < 1) anim = requestAnimationFrame(tick); };
      anim = requestAnimationFrame(tick);
    };
    const update = () => {
      const f = cfg(), p = Number(price.value), s = Number(sales.value), gross = p * s, net = gross * (1 - FEE);
      price.setAttribute('aria-valuetext', money(p));
      sales.setAttribute('aria-valuetext', `${s} ${plural(s, f.unit)}`);
      $('.calc__big', vals(cur)).classList.toggle('is-long', net >= 1e6); // от миллиона — кегль меньше, иначе «₽» не влезает в 7 колонок
      $('[data-price]', calc).textContent = money(p);
      $('[data-sales]', calc).textContent = String(s);
      $('[data-slabel]', calc).textContent = f.slabel;
      $('[data-line]', vals(cur)).textContent = `${money(p)} · ${s}${NB}${plural(s, f.unit)}${f.note ? ` · ${f.note}` : ` в${NB}месяц`}`;
      $('[data-hint]', vals(cur)).textContent = f.hint;
      const c = chk(cur);
      $('[data-title]', c).textContent = f.title[pro];
      $('[data-gross]', c).textContent = money(gross);
      $('[data-fee]', c).textContent = `−${money(gross * FEE)}`;
      $('[data-net]', c).textContent = money(net);
      fill(price); fill(sales);
      countTo(net);
      announce();
    };
    const setFormat = (key, keepValues = false) => {
      cur = key;
      const f = cfg();
      radios.forEach((r) => { r.checked = r.value === key; });
      if (!keepValues) {
        Object.assign(price, { min: f.min, max: f.max, step: f.step }); price.value = f.price;
        Object.assign(sales, { min: 1, max: f.maxSales, step: 1 }); sales.value = f.sales;
      }
      shown = 0;
      update();
    };
    radios.forEach((r) => r.addEventListener('change', () => { if (r.checked) { userFmt = true; setFormat(r.value); } }));
    price.addEventListener('input', update);
    sales.addEventListener('input', update);
    onPro((k) => { pro = k; setChkImg(k); setFormat(userFmt ? cur : CALC_START[k]); }); // цена и число — заново под профессию, выбранный формат остаётся
    setChkImg(pro);
    setFormat(CALC_START[pro]);
    clearTimeout(liveT);
    cancelAnimationFrame(anim);
    shown = Number(price.value) * Number(sales.value) * (1 - FEE);
    $('[data-sum]', vals(cur)).textContent = money(shown);
    if (!RM && hasIO) once(calc, () => { const target = shown; shown = 0; countTo(target); }, 0.4);
  }

  /* ── 7. Календарь эфиров и панель справа ─────────────────────────────── */
  {
    const cal = $('#cal'), body = $('#cal-body'), mLabel = $('#cal-m'), sumEl = $('#cal-sum');
    const epn = $('#epn'), kickEl = $('#epn-kick'), bodyEl = $('#epn-b'), footEl = $('.epn__f', epn), closeB = $('#epn-x'), liveEl = $('#epn-live');
    const prevB = $('#cal-prev'), nextB = $('#cal-next'), mineB = $('#cal-mine');
    const viewB = $$('.cal__views button');
    const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const WDF = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const pad = pad2, ymd = ymdOf;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const ymOf = (s) => s.slice(0, 7);
    const ymLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
    const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
    const RANGE = [ymAdd(ymOf(TODAY), -1), ymAdd(ymOf(TODAY), 5)];
    const state = { ym: ymOf(EVENTS.find((e) => e.id === 'e14').d), view: 'month', topics: [], fmts: [], mine: false, sel: 'e14' };
    const ICON = (id, s = 12) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const isPast = (e) => e.d < TODAY;
    const hostName = (e) => (typeof e.host === 'string' ? e.host : e.host.name);
    const filtered = (list) => list.filter((e) => (!state.topics.length || state.topics.includes(e.topic)) && (!state.fmts.length || state.fmts.includes(e.fmt)) && (!state.mine || e.mine));
    const monthEvents = (ym) => EVENTS.filter((e) => ymOf(e.d) === ym);
    const dateText = (e) => { const dt = parse(e.d); return `${dt.getDate()} ${MONTHS_G[dt.getMonth()]}`; };
    $$('[data-ev-date]').forEach((n) => { const e = byId(n.dataset.evDate); if (e) n.textContent = dateText(e); });

    const dds = [
      { key: 'topics', all: 'Все темы', few: 'Темы', list: TOPICS, det: $('#dd-topic'), lbl: $('#dd-topic-l'), box: $('#dd-topic-list') },
      { key: 'fmts', all: 'Все форматы', few: 'Форматы', list: FORMATS, det: $('#dd-fmt'), lbl: $('#dd-fmt-l'), box: $('#dd-fmt-list') }
    ];
    const renderDd = (dd) => {
      const sel = state[dd.key];
      dd.box.innerHTML = dd.list.map((v) => `<button type="button" aria-pressed="${sel.includes(v)}" data-v="${esc(v)}"><i class="pro__sq" aria-hidden="true"></i>${esc(v)}</button>`).join('');
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

    const isOpen = () => cal.classList.contains('is-open');
    const chip = (e) => `<button type="button" class="cch${e.mine ? ' mine' : ''}${isPast(e) ? ' past' : ''}${state.sel === e.id && isOpen() ? ' is-sel' : ''}" data-ev="${e.id}" aria-pressed="${state.sel === e.id}" title="${esc(e.title)}" aria-label="${esc(e.title)}, ${dateText(e)}, ${e.t}${e.rec ? ', есть запись' : ''}${e.off ? ', офлайн' : ''}"><span class="cch__in"><b>${e.t}</b>${e.rec ? ICON('check') : ''}${e.off ? ICON('pin') : ''}<span>${esc(e.title)}</span></span></button>`;

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
          cells += `<div class="cd${out ? ' out' : ''}${today ? ' today' : ''}${past ? ' past' : ''}" data-col="${i}"><span class="cd__n" aria-hidden="true">${d.getDate()}</span>${evs.map((e) => chip(e).replace('class="cch', `style="--d:${k++ * 40}ms" class="cch`)).join('')}</div>`;
          d.setDate(d.getDate() + 1);
        }
        rows.push(`<div class="cw">${cells}</div>`);
      }
      const empty = !shown.length ? `<div class="cal__empty"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'В этом месяце эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>` : '';
      body.innerHTML = `<div class="cgrid${gridSeen ? ' is-in' : ''}" id="cgrid" aria-label="${ymLabel(state.ym)}"><div class="cw cw--h" aria-hidden="true">${WD7.map((w) => `<div class="cwd">${w}</div>`).join('')}</div>${rows.join('')}</div>${empty}`;
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
    // подробности строки списка: раскрываются под ней, без панели поверх списка
    const rowMore = (e) => {
      const dt = parse(e.d), past = isPast(e);
      const who = typeof e.host === 'string' ? `${cap(e.host)}, практик` : `${e.host.name}, ${e.host.role}`;
      const act = past
        ? (e.rec ? `<a class="lnk" href="${ONB}#onboarding">Смотреть запись</a>` : `<span>Записи нет</span>`)
        : `<a class="lnk" href="${ONB}#onboarding">${e.mine ? 'Ты записан' : 'Записаться'}</a><a class="lnk" href="${ONB}#onboarding">В${NB}календарь</a>`;
      return `<dl class="cer__dl"><div><dt>Когда</dt><dd>${WDF[dt.getDay()]}, ${dateText(e)} · ${e.t}${NB}мск · ${e.off ? `${esc(e.city)}, вживую` : 'онлайн'}</dd></div><div><dt>Ведёт</dt><dd>${esc(who)}</dd></div></dl><p class="cer__act">${act}</p>`;
    };
    const toggleRow = (btn) => {
      const was = btn.getAttribute('aria-expanded') === 'true';
      $$('.cer[aria-expanded="true"]', body).forEach((b) => { b.setAttribute('aria-expanded', 'false'); $(`#${b.getAttribute('aria-controls')}`).hidden = true; });
      if (was) return;
      state.sel = btn.dataset.ev;
      btn.setAttribute('aria-expanded', 'true');
      const more = $(`#${btn.getAttribute('aria-controls')}`);
      more.hidden = false;
      const list = btn.closest('.clist'), lr = list.getBoundingClientRect(), mr = more.getBoundingClientRect();
      if (mr.bottom > lr.bottom) list.scrollTop += mr.bottom - lr.bottom + 8; // подробности не прячутся за нижним краем списка
    };
    const drawList = (shown, all) => {
      const [, m] = state.ym.split('-').map(Number);
      if (!shown.length) { body.innerHTML = `<div class="cal__empty"><b>${all.length ? 'Ничего не нашли по фильтрам' : 'Эфиров пока нет'}</b>${all.length ? 'Попробуй другую тему или сбрось фильтры.' : 'Расписание появляется за месяц-полтора до начала.'}</div>`; return; }
      const days = [];
      shown.forEach((e) => { const g = days.find((x) => x.d === e.d); if (g) g.ev.push(e); else days.push({ d: e.d, ev: [e] }); });
      body.innerHTML = `<div class="clist">${days.map(({ d, ev }) => {
        const dt = parse(d);
        return `<div class="clist__d"><div class="clist__dt"><b>${dt.getDate()} ${MONTHS_G[m - 1].slice(0, 3)}</b>${WD[dt.getDay()]}${d === TODAY ? ' · сегодня' : ''}</div><div class="clist__ev">${ev.map((e) => `<div class="cer-w"><button type="button" class="cer${isPast(e) ? ' past' : ''}" data-ev="${e.id}" aria-expanded="false" aria-controls="cm-${e.id}"><span class="cer__t">${e.t}</span><span class="cer__m"><span class="cer__n">${esc(e.title)}</span><span class="cer__k">${esc(hostName(e))} · ${esc(e.fmt)}${e.off ? ` · ${esc(e.city)}` : ''}${e.mine ? ' · ты записан' : ''}</span></span>${e.rec ? ICON('check', 16) : ''}${e.off ? ICON('pin', 16) : ''}</button><div class="cer__more" id="cm-${e.id}" hidden>${rowMore(e)}</div></div>`).join('')}</div></div>`;
      }).join('')}</div>`;
    };

    const relText = (e) => {
      const days = Math.round((parse(e.d) - parse(TODAY)) / 864e5);
      if (days === 0) return 'сегодня';
      if (days === 1) return 'завтра';
      if (days > 1) return `через ${days} ${plural(days, ['день', 'дня', 'дней'])}`;
      return e.rec ? 'есть запись' : 'уже прошёл';
    };
    let focusPanel = false;
    const drawEv = () => {
      const e = byId(state.sel);
      if (!e) return;
      const dt = parse(e.d);
      const past = isPast(e);
      const kick = `<span class="epn__tag">${esc(e.fmt)}</span><span>${esc(e.topic)}</span><span>${relText(e)}</span>`;
      const rows = `<dl class="epn__rows">
        <div><dt>Когда</dt><dd><b>${WDF[dt.getDay()]}, ${dateText(e)}</b><span>${e.t} мск${e.off ? ` · ${esc(e.city)}, вживую` : ' · онлайн'}</span></dd></div>
        <div><dt>Кто может прийти</dt><dd><b>Все, у${NB}кого есть профиль</b><span>${e.off ? 'вживую, адрес после записи' : 'онлайн, ссылка придёт за час'}</span></dd></div>
      </dl>`;
      const host = typeof e.host === 'string'
        ? `<div class="epn__host"><i>${esc(e.host.slice(0, 1).toUpperCase())}</i><div><b>${esc(cap(e.host))}</b><span>практик, работает на событиях</span></div></div>`
        : `<div class="epn__host"><img src="${e.host.ava}" width="40" height="40" alt=""><div><b>${esc(e.host.name)}</b><span>${esc(e.host.role)}</span></div></div>`;
      const rec = past && e.rec ? `<p class="epn__rec">${ICON('play', 16)}Есть запись${NB}— из неё соберётся курс</p>` : '';
      const action = past
        ? (e.rec ? `<a class="btn" href="${ONB}#onboarding">Смотреть запись</a>` : `<p class="epn__note">Эфир уже прошёл, записи нет.</p>`)
        : (e.mine ? `<a class="btn btn--ghost" href="${ONB}#onboarding">Ты записан</a>` : `<a class="btn" href="${ONB}#onboarding">Записаться</a>`) + `<a class="lnk" href="${ONB}#onboarding">В${NB}календарь</a>`;
      const paint = () => {
        kickEl.innerHTML = kick;
        bodyEl.innerHTML = `<h3 class="epn__h" id="epn-h" tabindex="-1">${esc(e.title)}</h3>${rows}${host}${rec}`;
        footEl.innerHTML = action;
        epn.classList.remove('is-swap');
        if (focusPanel) { focusPanel = false; const h = $('#epn-h'); if (h) h.focus({ preventScroll: true }); }
      };
      cal.classList.toggle('epn-left', dt.getDay() === 0 || dt.getDay() === 6);
      liveEl.textContent = `${e.title}, ${WDF[dt.getDay()].toLowerCase()}, ${dateText(e)}, ${e.t}`;
      if (RM || !isOpen()) paint();
      else { epn.classList.add('is-swap'); setTimeout(paint, 170); }
    };
    // две колонки под панелью (сб–вс или пн–вт) недоступны с клавиатуры и для скринридера, пока панель открыта
    const cover = () => { const open = isOpen(), left = cal.classList.contains('epn-left'); $$('.cd[data-col]', body).forEach((c) => { const i = Number(c.dataset.col); c.inert = open && (left ? i < 2 : i > 4); }); };
    const markSel = () => $$('.cch[data-ev]', body).forEach((b) => { const on = b.dataset.ev === state.sel && isOpen(); b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', String(on)); });
    const openEv = (id, byKeyboard = false) => { state.sel = id; focusPanel = byKeyboard; cal.classList.add('is-open'); drawEv(); markSel(); cover(); };
    const closeEv = () => {
      const wasInside = epn.contains(document.activeElement);
      cal.classList.remove('is-open'); markSel(); cover();
      if (wasInside) { const back = $(`[data-ev="${state.sel}"]`, body) || $('[data-ev]', body) || mLabel; if (back) back.focus({ preventScroll: true }); }
    };
    closeB.addEventListener('click', closeEv);
    cal.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const dd = dds.find((x) => x.det.open && x.det.contains(e.target));
      if (dd) { dd.det.open = false; $('summary', dd.det).focus(); e.stopPropagation(); }
    });
    // Esc закрывает панель и без фокуса внутри календаря (после загрузки фокус на body; в WebKit клик по чипу фокус не даёт)
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !isOpen()) return;
      if (document.querySelector('dialog[open]') || dds.some((x) => x.det.open)) return;
      const r = cal.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      closeEv();
    });
    const draw = () => {
      const half = state.view === 'half';
      const all = monthEvents(state.ym), shown = filtered(all);
      mLabel.textContent = half ? `${ymLabel(ymOf(TODAY))} – ${ymLabel(ymAdd(ymOf(TODAY), 5))}` : ymLabel(state.ym);
      prevB.disabled = half || state.ym <= RANGE[0];
      nextB.disabled = half || state.ym >= RANGE[1];
      const anyF = state.topics.length || state.fmts.length || state.mine;
      sumEl.innerHTML = anyF && !half ? `Показано ${shown.length} ${plural(shown.length, ['эфир', 'эфира', 'эфиров'])} из ${all.length} · <button type="button" id="cal-reset">Сбросить фильтры</button>` : (half ? `Дни с${NB}эфирами обведены. Нажми на${NB}день${NB}— откроется месяц.` : `${all.length} ${plural(all.length, ['эфир', 'эфира', 'эфиров'])} в${NB}этом месяце`);
      // панель открыта только в виде «Месяц» и только если выбранный эфир в этом месяце — иначе она закрывала бы «Полгода» и «Список»
      const sel = byId(state.sel);
      if (isOpen() && (state.view !== 'month' || !sel || ymOf(sel.d) !== state.ym || !shown.includes(sel))) closeEv();
      if (half) drawHalf(); else if (state.view === 'list') drawList(shown, all); else drawMonth(shown, all);
      cover();
    };
    body.addEventListener('click', (e) => {
      const ev = e.target.closest('[data-ev]');
      if (ev) { if (state.view === 'list') toggleRow(ev); else openEv(ev.dataset.ev, e.detail === 0); return; }
      const day = e.target.closest('[data-day]');
      if (day) {
        state.ym = ymOf(day.dataset.day);
        state.view = 'month';
        const first = filtered(EVENTS.filter((x) => x.d === day.dataset.day))[0];
        viewB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
        draw();
        if (first) openEv(first.id);
      }
    });
    sumEl.addEventListener('click', (e) => {
      if (e.target.id !== 'cal-reset') return;
      state.topics = []; state.fmts = []; state.mine = false;
      mineB.checked = false;
      dds.forEach(renderDd);
      draw();
    });
    prevB.addEventListener('click', () => { state.ym = ymAdd(state.ym, -1); draw(); });
    nextB.addEventListener('click', () => { state.ym = ymAdd(state.ym, 1); draw(); });
    viewB.forEach((b) => b.addEventListener('click', () => {
      state.view = b.dataset.view;
      viewB.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    mineB.addEventListener('change', () => { state.mine = mineB.checked; draw(); });
    $$('[data-ev-open]').forEach((a) => a.addEventListener('click', () => {
      const e = byId(a.dataset.evOpen);
      if (!e) return;
      state.ym = ymOf(e.d); state.view = 'month';
      viewB.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'month')));
      draw();
      openEv(e.id);
    }));
    draw();
    drawEv();
    markSel();
    cover();
  }

  /* ── 8. Окно «Как считается место» ───────────────────────────────────── */
  {
    const dlg = $('#rules');
    const close = () => { if (dlg.open) dlg.close(); };
    $$('[data-rules]').forEach((b) => b.addEventListener('click', () => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }));
    $('#rules-x').addEventListener('click', close);
    $('#rules-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  /* ── 9. Партнёрам: шаги подсвечиваются по очереди, один раз ──────────── */
  {
    const steps = $$('#orbit .orbit__s');
    const all = () => steps.forEach((li) => li.classList.add('is-on'));
    if (RM || !hasIO) all();
    else once($('#orbit'), () => steps.forEach((li, i) => setTimeout(() => li.classList.add('is-on'), 300 + i * 500)), 0.4);
  }

  /* ── 10. Финал: отпечатки, сердце, поле ника ──────────────────────────── */
  {
    const prints = $('#prints');
    const ready = () => prints.classList.add('is-ready');
    if (RM || !hasIO) ready(); else once(prints, () => setTimeout(ready, 120), 0.3);
    const heart = $('#final-heart');
    if (RM || !hasIO) heart.classList.add('in'); else once(heart, () => heart.classList.add('in'), 0.6);
    const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-' };
    const clean = (v) => v.toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
    $$('[data-nick]').forEach((form) => {
      const input = $('input', form);
      input.addEventListener('input', () => {
        const pos = input.selectionStart, before = input.value, v = clean(before);
        if (v !== before) { input.value = v; const p = Math.max(0, Math.min(v.length, pos - (before.length - v.length))); try { input.setSelectionRange(p, p); } catch (e) { /* noop */ } }
      });
      form.addEventListener('submit', (ev) => { ev.preventDefault(); const v = clean(input.value); location.href = `${ONB}${v ? `?nick=${encodeURIComponent(v)}` : ''}#onboarding`; });
    });
  }

  /* ── Смена «меньше движения» на лету ─────────────────────────────────── */
  const onMQ = () => {
    RM = mq.matches;
    loops.forEach((l) => l.sync());
    if (RM) { $$('.hero, .band, .vf').forEach((b) => b.classList.add('in')); $('#prints').classList.add('is-ready'); }
  };
  if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ);
})();
