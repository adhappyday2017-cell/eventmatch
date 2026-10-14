// EventMatch — главная, вариант B. Без зависимостей; без скриптов страница тоже полная.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

  // Шапка: тонкая линия, когда страницу прокрутили
  const top = $('.top')
  const onScroll = () => top.classList.toggle('is-scrolled', scrollY > 8)
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Появление блоков при прокрутке — один раз
  const items = $$('[data-reveal]')
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'))
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('in')
          io.unobserve(entry.target)
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    items.forEach((el) => io.observe(el))
  }

  // Веер карточек: раскрывается после загрузки, слегка поворачивается за мышью
  const fan = $('.fan')
  const tilt = $('.fan__tilt')
  requestAnimationFrame(() => setTimeout(() => fan.classList.add('is-ready'), reduce ? 0 : 180))
  if (!reduce) {
    const hero = $('.hero')
    hero.addEventListener('mousemove', (e) => {
      const r = fan.getBoundingClientRect()
      const x = (e.clientX - (r.left + r.width / 2)) / r.width
      const y = (e.clientY - (r.top + r.height / 2)) / r.height
      tilt.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`)
      tilt.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`)
    })
    hero.addEventListener('mouseleave', () => {
      tilt.style.setProperty('--ry', '0deg')
      tilt.style.setProperty('--rx', '0deg')
    })
  }

  // Главная кнопка: блик идёт за курсором
  $$('.btn--grad').forEach((btn) =>
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect()
      btn.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`)
      btn.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`)
    }),
  )

  // Карусель профессий: стрелки и их доступность у краёв
  $$('[data-carousel]').forEach((track) => {
    const id = track.dataset.carousel
    const prev = $(`[data-carousel-prev="${id}"]`)
    const next = $(`[data-carousel-next="${id}"]`)
    const step = () => Math.round(track.clientWidth * 0.75)
    const sync = () => {
      prev.disabled = track.scrollLeft < 4
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4
    }
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }))
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }))
    track.addEventListener('scroll', sync, { passive: true })
    addEventListener('resize', sync)
    sync()
  })

  // Сердечко «Сохранить» на карточках обучения
  $$('.save').forEach((btn) =>
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', String(on))
      btn.setAttribute('aria-label', on ? 'Сохранено' : 'Сохранить')
    }),
  )

  // Калькулятор: «Твой курс может приносить N ₽ в месяц» — после комиссии 15%
  const FEE = 0.15
  // min кратен step: иначе браузер сдвигает значение ползунка (3 500 → 3 490)
  const FORMATS = {
    course: { lead: 'Твой курс может приносить', badge: 'Курс', title: 'Свадебная съёмка: свет и композиция', cover: 'img/ag/16.jpg', price: 4900, min: 1000, max: 30000, step: 100, sales: 12 },
    master: { lead: 'Твой мастер-класс может приносить', badge: 'Мастер-класс', title: 'Живой мастер-класс: портрет у окна', cover: 'img/ag/38.jpg', price: 3500, min: 1000, max: 20000, step: 100, sales: 15 },
    presets: { lead: 'Твои пресеты могут приносить', badge: 'Пресеты', title: 'Пресеты «Тёплая плёнка»', cover: 'img/ag/57.jpg', price: 990, min: 290, max: 5000, step: 10, sales: 40 },
  }
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`
  const plural = (n, [one, few, many]) => {
    const a = n % 10
    const b = n % 100
    if (a === 1 && b !== 11) return one
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
    return many
  }
  const price = $('[data-calc-input="price"]')
  const sales = $('[data-calc-input="sales"]')
  const sumEl = $('[data-calc-sum]')
  const cover = $('[data-calc-cover]')
  let shown = 0
  let anim = 0

  const fill = (input) => {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100
    input.style.setProperty('--p', `${p}%`)
  }
  const countTo = (target) => {
    cancelAnimationFrame(anim)
    if (reduce) {
      shown = target
      sumEl.textContent = Math.round(target).toLocaleString('ru-RU')
      return
    }
    const from = shown
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 420)
      shown = from + (target - from) * (1 - Math.pow(1 - k, 3))
      sumEl.textContent = Math.round(shown).toLocaleString('ru-RU')
      if (k < 1) anim = requestAnimationFrame(tick)
    }
    anim = requestAnimationFrame(tick)
  }
  const update = () => {
    const p = Number(price.value)
    const s = Number(sales.value)
    const gross = p * s
    const net = gross * (1 - FEE)
    $('[data-calc-price]').textContent = money(p)
    $('[data-calc-sales]').textContent = String(s)
    $('[data-calc-price-text]').textContent = money(p)
    $('[data-calc-sales-text]').textContent = `${s} ${plural(s, ['продажа', 'продажи', 'продаж'])}`
    $('[data-calc-gross]').textContent = money(gross)
    $('[data-calc-fee]').textContent = `−${money(gross * FEE)}`
    $('[data-calc-net]').textContent = money(net)
    fill(price)
    fill(sales)
    countTo(net)
  }
  const setFormat = (key) => {
    const f = FORMATS[key]
    $('[data-calc-lead]').textContent = f.lead
    $('[data-calc-badge]').textContent = f.badge
    $('[data-calc-title]').textContent = f.title
    Object.assign(price, { min: f.min, max: f.max, step: f.step })
    price.value = f.price
    sales.value = f.sales
    if (!cover.src.endsWith(f.cover)) {
      cover.classList.add('is-swapping')
      setTimeout(() => {
        cover.src = f.cover
        cover.onload = () => cover.classList.remove('is-swapping')
      }, reduce ? 0 : 220)
    }
    update()
  }
  price.addEventListener('input', update)
  sales.addEventListener('input', update)
  $$('input[name="fmt"]').forEach((r) => r.addEventListener('change', () => setFormat(r.value)))
  // Сумма досчитывается с нуля, когда калькулятор появился на экране
  update()
  cancelAnimationFrame(anim)
  shown = Number(price.value) * Number(sales.value) * (1 - FEE)
  sumEl.textContent = Math.round(shown).toLocaleString('ru-RU')
  if (!reduce && 'IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      seen.disconnect()
      const target = shown
      shown = 0
      countTo(target)
    }, { threshold: 0.4 })
    seen.observe($('.calc__panel'))
  }
})()
