/* EventMatch — вариант D. Ванильный JS, без библиотек. */
(() => {
  "use strict";
  const d = document;
  const root = d.documentElement;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ONBOARD = "https://adhappyday2017-cell.github.io/eventmatch-prototype/#onboarding";

  /* вкладка скрыта — всё на паузе */
  let tabHidden = d.hidden;
  root.classList.toggle("hidden-tab", tabHidden);
  d.addEventListener("visibilitychange", () => {
    tabHidden = d.hidden;
    root.classList.toggle("hidden-tab", tabHidden);
  });

  const once = (els, fn, opts) => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }), opts || { threshold: 0.25 });
    els.forEach((el) => el && io.observe(el));
  };

  /* ── появление ── */
  once($$("[data-r]"), (el) => el.classList.add("in"), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  /* ── секции вне экрана: CSS-анимации на паузу ── */
  const vis = new Map();
  const secIO = new IntersectionObserver((es) => es.forEach((e) => {
    vis.set(e.target, e.isIntersecting);
    e.target.classList.toggle("paused", !e.isIntersecting);
  }), { rootMargin: "80px 0px" });
  $$("main > section, .foot").forEach((s) => secIO.observe(s));
  const isVis = (el) => vis.get(el) !== false;

  /* ── переход по якорям: прокрутка + перенос фокуса ── */
  d.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute("href").slice(1);
    const t = id && d.getElementById(id);
    if (!t) return;
    e.preventDefault();
    if (t.tagName === "DETAILS") t.open = true;
    const y = id === "top" || id === "main" ? 0 : t.getBoundingClientRect().top + scrollY - (t.tagName === "DETAILS" ? 140 : 0);
    scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
    const focusEl = id === "top" ? $("#main") : (t.tagName === "DETAILS" ? $("summary", t) : t);
    if (focusEl.tagName !== "SUMMARY" && !focusEl.hasAttribute("tabindex")) focusEl.setAttribute("tabindex", "-1");
    focusEl.focus({ preventScroll: true });
    if (id !== "main") history.replaceState(null, "", "#" + id);
  });

  /* ── шапка: тёмный режим и активный пункт ── */
  const cap = $("[data-cap]");
  const darks = $$("[data-dark]");
  const navMap = { vizitka: "vizitka", kollegi: "kollegi", efiry: "efiry", obuchenie: "efiry", pravila: "pravila", priglashenie: "priglashenie", final: "priglashenie" };
  const navSecs = Object.keys(navMap).map((id) => d.getElementById(id)).filter(Boolean);
  const navLinks = $$("[data-nav]");
  let navOn = "";
  function headerTick() {
    const dark = darks.some((el) => { const r = el.getBoundingClientRect(); return r.top <= 50 && r.bottom >= 50; });
    cap.classList.toggle("on-dark", dark);
    let cur = "";
    const line = innerHeight * 0.4;
    navSecs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) cur = navMap[s.id]; });
    if (cur !== navOn) {
      navOn = cur;
      navLinks.forEach((a) => {
        const on = a.dataset.nav === cur;
        a.classList.toggle("on", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
  }

  /* ── 1. hero: машинка — один проход по фразам, пауза при наведении и фокусе ── */
  const hero = $(".hero");
  const tw = $("[data-tw]");
  if (tw && !RM) {
    const NB = " ";
    const phrases = ["второго фотографа на" + NB + "субботу", "визажиста в" + NB + "пару", "замену, если заболел", "мастер-класс по" + NB + "свету", "второго фотографа на" + NB + "субботу"];
    let pi = 0, text = phrases[0], mode = "hold", hold = false;
    hero.addEventListener("pointerenter", () => { hold = true; });
    hero.addEventListener("pointerleave", () => { hold = false; });
    hero.addEventListener("focusin", () => { hold = true; });
    hero.addEventListener("focusout", () => { hold = false; });
    const step = () => {
      if (tabHidden || hold || !isVis(hero)) return setTimeout(step, 400);
      if (mode === "hold") {
        if (pi === phrases.length - 1) { tw.closest(".tw").classList.add("done"); return; }
        mode = "erase"; return setTimeout(step, 1800);
      }
      if (mode === "erase") {
        text = text.slice(0, -1);
        tw.textContent = text;
        if (!text) { mode = "type"; pi += 1; return setTimeout(step, 260); }
        return setTimeout(step, 26);
      }
      const target = phrases[pi];
      text = target.slice(0, text.length + 1);
      tw.textContent = text;
      if (text === target) mode = "hold";
      return setTimeout(step, 52);
    };
    setTimeout(step, 1200);
  } else if (tw) {
    tw.closest(".tw").classList.add("done");
  }

  /* ── 1. hero: бейдж на ленте ── */
  const swing = $("[data-swing]");
  const badge = $("[data-badge]");
  let ang = 0, vel = 0, target = 0, swingRun = false;
  function swingFrame() {
    target *= 0.9;
    vel = (vel + (target - ang) * 0.08) * 0.86;
    ang = clamp(ang + vel, -3.5, 3.5);
    swing.style.transform = "rotate(" + ang.toFixed(3) + "deg)";
    if (Math.abs(ang) < 0.01 && Math.abs(vel) < 0.01 && Math.abs(target) < 0.01) {
      swingRun = false;
      swing.style.transform = "";
      return;
    }
    requestAnimationFrame(swingFrame);
  }
  const kick = () => { if (!swingRun && !RM) { swingRun = true; requestAnimationFrame(swingFrame); } };
  if (badge && !RM) {
    setTimeout(() => { vel += 0.55; kick(); }, 1150);
    let gx = 0, gy = 0, gq = false;
    hero.addEventListener("pointermove", (e) => {
      gx = e.clientX; gy = e.clientY;
      if (!gq) {
        gq = true;
        requestAnimationFrame(() => {
          gq = false;
          const r = badge.getBoundingClientRect();
          const mx = clamp((gx - r.left) / r.width, -0.3, 1.3);
          const my = clamp((gy - r.top) / r.height, -0.3, 1.3);
          badge.style.setProperty("--mx", (mx * 100).toFixed(1) + "%");
          badge.style.setProperty("--my", (my * 100).toFixed(1) + "%");
          badge.style.setProperty("--ha", (210 + (mx - 0.5) * 70).toFixed(1) + "deg");
        });
      }
    }, { passive: true });
    badge.addEventListener("pointermove", (e) => {
      vel += clamp(e.movementX * 0.012, -0.25, 0.25);
      kick();
    }, { passive: true });
  }
  if (badge) {
    const faces = $$("[data-face]", badge);
    const flips = $$("[data-flip]", badge);
    const flip = (fromKeyboard) => {
      const on = !badge.classList.contains("flipped");
      badge.classList.toggle("flipped", on);
      faces.forEach((f) => { f.inert = (f.dataset.face === "back") !== on; });
      flips.forEach((b) => b.setAttribute("aria-pressed", String(on)));
      vel += on ? 0.5 : -0.5;
      kick();
      if (fromKeyboard) {
        const face = faces.find((f) => !f.inert);
        const b = face && $("[data-flip]", face);
        if (b) b.focus({ preventScroll: true });
      }
    };
    badge.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const btn = e.target.closest("[data-flip]");
      flip(Boolean(btn) && e.detail === 0);
    });
  }

  /* ── 2. лента работ ── */
  const works = $("#raboty");
  $$("[data-letters]").forEach((w) => {
    const t = w.textContent;
    w.textContent = "";
    [...t].forEach((ch, i) => {
      const s = d.createElement("span");
      s.className = "lt";
      s.style.setProperty("--i", i);
      s.textContent = ch;
      w.appendChild(s);
    });
  });
  once($$("[data-letters]"), (w) => w.classList.add("in"), { threshold: 0.4 });
  const strip = $("[data-strip]");
  const track = $(".strip__track");
  if (RM && strip) {
    strip.tabIndex = 0;
    strip.setAttribute("role", "region");
    strip.setAttribute("aria-label", "Работы исполнителей, листать вбок");
  }
  const pauseBtn = $("[data-pause]");
  let userPaused = false;
  if (pauseBtn) pauseBtn.addEventListener("click", () => {
    userPaused = !userPaused;
    works.classList.toggle("is-paused", userPaused);
    pauseBtn.setAttribute("aria-pressed", String(userPaused));
    $("[data-pause-t]", pauseBtn).textContent = userPaused ? "Дальше" : "Пауза";
  });
  let stripAnim = null, boost = 0, boostRun = false;
  function boostFrame() {
    boost *= 0.9;
    if (stripAnim) stripAnim.playbackRate = 1 + boost;
    if (boost < 0.01) { boost = 0; if (stripAnim) stripAnim.playbackRate = 1; boostRun = false; return; }
    requestAnimationFrame(boostFrame);
  }

  /* ── 4. визитка ── */
  const poster = $("[data-poster]");
  $$(".swatches button").forEach((b) => b.addEventListener("click", () => {
    poster.dataset.tone = b.dataset.tone;
    $$(".swatches button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
  once([$("[data-check]")], (list) => {
    const items = $$("li", list).slice(0, 4);
    items.forEach((li, i) => setTimeout(() => li.classList.add("done"), RM ? 0 : 200 + i * 500));
  }, { threshold: 0.5 });
  const chat = $("[data-chat]");
  once([chat], () => {
    const nick = $("[data-type]", chat);
    const full = nick.dataset.type;
    if (RM) { chat.classList.add("s1", "s3", "s4"); return; }
    nick.textContent = "";
    chat.classList.add("s1");
    setTimeout(() => chat.classList.add("s2"), 900);
    setTimeout(() => {
      chat.classList.remove("s2");
      chat.classList.add("s3");
      let i = 0;
      const t = setInterval(() => {
        nick.textContent = full.slice(0, ++i);
        if (i >= full.length) { clearInterval(t); setTimeout(() => chat.classList.add("s4"), 250); }
      }, 45);
    }, 1700);
  }, { threshold: 0.6 });
  const cyc = $("[data-cycle]");
  if (cyc && !RM) {
    const imgs = $$("img", cyc);
    let ci = 0, timer = 0;
    cyc.closest(".poster").addEventListener("mouseenter", () => {
      clearInterval(timer);
      timer = setInterval(() => {
        imgs[ci].classList.remove("on");
        ci = (ci + 1) % imgs.length;
        imgs[ci].classList.add("on");
      }, 1600);
    });
    cyc.closest(".poster").addEventListener("mouseleave", () => {
      clearInterval(timer);
      imgs.forEach((im, i) => im.classList.toggle("on", i === 0));
      ci = 0;
    });
  }

  /* ── 5. запросы коллег: веер билетов, чипы выбирают верхний ── */
  const stack = $("[data-stack]");
  if (stack) {
    const tks = $$(".tk", stack);
    const chips = $$(".chips button");
    let order = tks.slice();
    const layout = () => {
      order.forEach((tk, p) => {
        tk.dataset.p = String(p);
        tk.style.zIndex = String(10 - p);
        tk.inert = p !== 0;
      });
      const k = order[0].dataset.k;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.k === k)));
    };
    layout();
    chips.forEach((c) => c.addEventListener("click", () => {
      const i = order.findIndex((t) => t.dataset.k === c.dataset.k);
      order = order.slice(i).concat(order.slice(0, i));
      layout();
    }));
  }

  /* ── 6. титры: колонки фото едут с разной скоростью, рамка раскрывается на входе ── */
  const kino = $("[data-kino]");
  let kinoTick = () => {};
  if (kino && !RM) {
    const frame = $("[data-frame]", kino);
    const bg = $(".kino__bg", kino);
    const cols = $$("[data-col]", kino);
    const A = [0, 0.42, 0.14, 0.58];
    const B = [0.92, 0.5, 0.78, 0.4];
    let lastIn = -1;
    kinoTick = () => {
      const r = kino.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0) return;
      const bh = bg.offsetHeight;
      const k = clamp(1 - r.top / innerHeight, 0, 1);
      const inset = Math.round(56 * (1 - k) * 10) / 10;
      if (inset !== lastIn) {
        lastIn = inset;
        frame.style.setProperty("--in", inset + "px");
        frame.style.setProperty("--r", (12 * (1 - k)).toFixed(1) + "px");
      }
      const p = clamp(-r.top / Math.max(1, kino.offsetHeight - bh), 0, 1);
      cols.forEach((c, i) => {
        const travel = Math.max(0, c.offsetHeight - bh);
        c.style.setProperty("--y", (-(A[i] + B[i] * p) * travel).toFixed(1) + "px");
      });
    };
  }

  /* ── 8. обучение: полоса и счёт ── */
  const pad = (n) => String(n).padStart(2, "0");
  once([$("[data-panel]")], (panel) => {
    panel.classList.add("in");
    const el = $("[data-count]", panel);
    const end = 160;
    const fmt = (m) => Math.floor(m / 60) + ":" + pad(Math.round(m % 60));
    if (RM) { el.textContent = fmt(end); return; }
    const t0 = performance.now();
    const f = (t) => {
      const k = clamp((t - t0) / 1200, 0, 1);
      el.textContent = fmt(Math.floor(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, { threshold: 0.4 });

  /* ── 9. печати ── */
  once([$(".stamps")], (s) => s.closest(".sheet").classList.add("go"), { threshold: 0.5 });

  /* ── 10. приглашение ── */
  const invite = $("[data-invite]");
  if (invite) {
    const yes = $("[data-yes]", invite);
    const go = $("[data-go]", invite);
    const input = $("[data-nick]", invite);
    const form = $("[data-nickform]", invite);
    yes.addEventListener("click", () => {
      if (yes.classList.contains("done")) { input.focus(); return; }
      yes.classList.add("done");
      yes.setAttribute("aria-expanded", "true");
      go.inert = false;
      setTimeout(() => invite.classList.add("stamped"), RM ? 0 : 300);
      setTimeout(() => { go.classList.add("open"); input.focus({ preventScroll: true }); }, RM ? 0 : 650);
    });
    const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
    const MAX = 24;
    const toNick = (v) => v.toLowerCase().replace(/[а-яё]/g, (c) => TR[c]).replace(/\s+/g, "-").replace(/[^a-z0-9_.-]/g, "");
    input.addEventListener("input", () => {
      const v = input.value;
      const caret = input.selectionStart == null ? v.length : input.selectionStart;
      const next = toNick(v).slice(0, MAX);
      if (next === v) return;
      const pos = Math.min(toNick(v.slice(0, caret)).length, next.length);
      input.value = next;
      input.setSelectionRange(pos, pos);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nick = toNick(input.value).slice(0, MAX);
      location.href = nick ? ONBOARD.replace("#", "?nick=" + encodeURIComponent(nick) + "#") : ONBOARD;
    });
  }

  /* ── 11. финальные титры ── */
  once([$("[data-credits]")], (c) => c.classList.add("in"), { threshold: 0.5 });
  once([$("[data-mark]")], (m) => m.classList.add("in"), { threshold: 0.4 });

  /* ── прокрутка: один rAF на всё ── */
  let lastY = scrollY, queued = false;
  function onFrame() {
    queued = false;
    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    headerTick();
    kinoTick();
    if (!RM && dy) {
      if (badge && y < innerHeight * 1.2) { target = clamp(dy * 0.1, -3, 3); kick(); }
      if (works && isVis(works) && !userPaused) {
        if (!stripAnim && track.getAnimations) stripAnim = track.getAnimations()[0] || null;
        boost = Math.max(boost, Math.min(Math.abs(dy) * 0.02, 3));
        if (!boostRun) { boostRun = true; requestAnimationFrame(boostFrame); }
      }
    }
  }
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(onFrame); } }, { passive: true });
  addEventListener("resize", () => { lastY = scrollY; onFrame(); }, { passive: true });
  onFrame();
})();
