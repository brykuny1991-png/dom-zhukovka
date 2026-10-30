// Презентация дома в Жуковке.
// Прокрутка — главный «пульт»: она ведёт видео-пролёт, фото-фильм и подписи.
(() => {
  gsap.registerPlugin(ScrollTrigger);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");

  // ---------- Плавная прокрутка ----------
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y) =>
    lenis
      ? lenis.scrollTo(y, { duration: 1.6 })
      : window.scrollTo({ top: y, behavior: "auto" });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-scroll]");
    if (!a) return;
    const el = document.querySelector(a.getAttribute("href"));
    if (!el) return;
    e.preventDefault();
    scrollToY(
      a.getAttribute("href") === "#top"
        ? 0
        : el.getBoundingClientRect().top + scrollY,
    );
  });

  // ---------- 1. Обложка: одно появление и лёгкий параллакс ----------
  if (!reduce) {
    gsap.from("#heroImg", { scale: 1.14, duration: 2.6, ease: "power2.out" });
    gsap.from(".hero .line > span", {
      yPercent: 110,
      duration: 1.1,
      stagger: 0.09,
      ease: "power3.out",
      delay: 0.2,
    });
    gsap.from(".spec > div", {
      opacity: 0,
      y: 16,
      duration: 0.8,
      stagger: 0.07,
      ease: "power2.out",
      delay: 0.7,
    });
    gsap.to("#heroImg", {
      yPercent: 10,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  }

  // ---------- 2. Пролёт: прокрутка перематывает видео ----------
  // Время начала каждой комнаты — по стыкам роликов в пролёте
  const ROOMS = [
    {
      t: 0,
      title: "Подъезд",
      text: "Дорожка из светлого камня ведёт к дому. Консоли крыши раскрываются над входом.",
    },
    {
      t: 4.83,
      title: "Крыльцо",
      text: "Стальные колонны и широкие ступени под белой консолью.",
    },
    {
      t: 9.66,
      title: "Внутренний двор",
      text: "Сад из графитовой гальки. Терраса второго этажа даёт тень.",
    },
    {
      t: 14.45,
      title: "Гостиная",
      text: "Камин в мраморной стене и окна от пола до потолка.",
    },
    {
      t: 19.24,
      title: "Лестница",
      text: "Парящие ступени на фоне стены из реек. Свет льётся сверху.",
    },
    {
      t: 24.11,
      title: "Кухня",
      text: "Шкафы из ореха до потолка и остров из цельного мрамора.",
    },
    {
      t: 28.99,
      title: "Холл",
      text: "Сквозь мраморную стену — в холл с волнистым металлом.",
    },
  ];
  const DUR = 34.1;
  const capsEl = $("#roomsCaps"),
    chapEl = $("#chapters");
  ROOMS.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<span class="num">${pad(i + 1)} / ${pad(ROOMS.length)}</span>` +
      `<h3><span class="line"><span>${r.title}</span></span></h3>` +
      `<p><span class="line"><span>${r.text}</span></span></p>`;
    capsEl.appendChild(li);
    const c = document.createElement("li");
    c.innerHTML = `<button type="button" data-room="${i}">${r.title}</button>`;
    chapEl.appendChild(c);
  });
  const caps = [...capsEl.children],
    chapBtns = [...chapEl.querySelectorAll("button")];
  let room = -1;
  function setRoom(i) {
    if (i === room) return;
    if (room >= 0) {
      caps[room].classList.remove("is-active");
      caps[room].classList.add("is-gone");
    }
    caps[i].classList.remove("is-gone");
    caps[i].classList.add("is-active");
    chapBtns.forEach((b, j) => b.toggleAttribute("aria-current", j === i));
    room = i;
  }
  const roomAt = (t) => {
    let i = 0;
    ROOMS.forEach((r, j) => {
      if (t >= r.t - 0.2) i = j;
    });
    return i;
  };
  setRoom(0);

  const canvas = $("#flightCanvas"),
    ctx = canvas.getContext("2d"),
    video = $("#flightVideo");
  const fill = $("#chaptersFill");
  let target = 0,
    cur = 0,
    ready = false,
    needsDraw = true;

  const stFlight = ScrollTrigger.create({
    trigger: "#flight",
    pin: "#flightStage",
    start: "top top",
    end: () => "+=" + Math.round(innerHeight * 10),
    onUpdate: (s) => {
      target = s.progress * (DUR - 0.05);
      setRoom(roomAt(target));
      gsap.set(fill, { scaleY: s.progress });
    },
  });
  chapBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const r = ROOMS[+b.dataset.room];
      scrollToY(
        stFlight.start + ((r.t + 0.4) / DUR) * (stFlight.end - stFlight.start),
      );
    }),
  );

  // Кадр рисуется в canvas: перемотка паузного <video> перерисовывается не во всех браузерах
  const poster = new Image();
  poster.onload = () => (needsDraw = true);
  poster.src = "media/poster.jpg";
  function cover(src, sw, sh) {
    const w = canvas.width,
      h = canvas.height,
      k = Math.max(w / sw, h / sh);
    ctx.drawImage(src, (w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k);
  }
  // Кадр рисуем сразу, как только перемотка закончилась: если ждать следующего тика,
  // он успеет запустить новую перемотку, и рисовать будет нечего (картинка «стоит»)
  video.addEventListener("seeked", () => {
    if (ready && video.readyState >= 2) {
      cover(video, video.videoWidth, video.videoHeight);
      needsDraw = false;
    } else needsDraw = true;
  });
  gsap.ticker.add(() => {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr),
      h = Math.round(canvas.clientHeight * dpr);
    if (w && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      needsDraw = true;
    }
    // Время видео догоняет прокрутку с довеской: колесо щёлкает рывками, а камера скользит
    cur += (target - cur) * (reduce ? 1 : 0.14);
    if (Math.abs(target - cur) < 0.002) cur = target;
    if (ready) {
      // Сначала рисуем готовый кадр, потом просим следующий
      if (needsDraw && !video.seeking && video.readyState >= 2) {
        cover(video, video.videoWidth, video.videoHeight);
        needsDraw = false;
      }
      if (!video.seeking && Math.abs(video.currentTime - cur) > 0.02)
        video.currentTime = cur;
    } else if (needsDraw && poster.naturalWidth) {
      cover(poster, poster.naturalWidth, poster.naturalHeight);
      needsDraw = false;
    }
  });

  // Видео грузим целиком в память: так перемотка работает на любом хостинге
  const loadBox = $("#flightLoad"),
    pct = $("#flightPct"),
    barEl = $("#flightBar");
  const setPct = (p) => {
    pct.textContent = Math.round(p * 100) + "%";
    barEl.style.width = p * 100 + "%";
  };
  async function loadFlight() {
    const small =
      innerWidth < 900 ||
      (navigator.connection && navigator.connection.saveData);
    const src = small ? "media/flight-854.mp4" : "media/flight-1280.mp4";
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(res.status);
      const total = +res.headers.get("content-length") || 0;
      const reader = res.body.getReader(),
        parts = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.length;
        if (total) setPct(Math.min(got / total, 1));
      }
      video.src = URL.createObjectURL(new Blob(parts, { type: "video/mp4" }));
    } catch (e) {
      video.src = src;
    }
    video.addEventListener(
      "loadeddata",
      () => {
        setPct(1);
        // Прогрев декодера: без короткого play/pause первый кадр местами не рисуется
        video
          .play()
          .then(() => video.pause())
          .catch(() => {})
          .finally(() => {
            ready = true;
            needsDraw = true;
            video.currentTime = cur;
            loadBox.classList.add("is-done");
          });
      },
      { once: true },
    );
    video.load();
  }
  if (document.readyState === "complete") loadFlight();
  else addEventListener("load", loadFlight, { once: true });

  // ---------- 3. Второй этаж и SPA: фото-фильм ----------
  const SCENES = [
    {
      img: "spalnya-glavnaya",
      title: "Главная спальня",
      text: "Изголовье из реек ореха с волной и окна в пол на террасу.",
      cam: "pull",
      focus: "45% 55%",
      next: "fold",
    },
    {
      img: "garderob",
      title: "Гардеробная",
      text: "Стеклянные шкафы и туалетный столик у высоких окон.",
      cam: "push",
      focus: "50% 50%",
      next: "fade",
    },
    {
      img: "vannaya",
      title: "Ванная",
      text: "Ванна у окна в пол, стены из крупного мрамора.",
      cam: "push",
      focus: "50% 45%",
      next: "zoom",
    },
    {
      img: "spalnya-3",
      title: "Спальня",
      text: "Светлая комната с рельефной стеной и видом на сосны.",
      cam: "left",
      focus: "50% 50%",
      next: "fold",
    },
    {
      img: "terrasa",
      title: "Терраса",
      text: "Терраса второго этажа: верхушки сосен на уровне глаз.",
      cam: "left",
      focus: "50% 60%",
      next: "sink",
    },
    {
      img: "spa-otdyh",
      title: "Зона отдыха SPA",
      text: "Цокольный этаж: диван, рейки из термодерева, вид на купель.",
      cam: "right",
      focus: "55% 50%",
      next: "zoom",
    },
    {
      img: "kupel",
      title: "Купель",
      text: "Купель в мозаике и световое кольцо над водой.",
      cam: "push",
      focus: "40% 55%",
      next: "fold",
    },
    {
      img: "sauna",
      title: "Сауна",
      text: "Сауна из термодерева со стеклянной стеной к купели.",
      cam: "right",
      focus: "60% 50%",
      next: "fade",
    },
    {
      img: "hammam",
      title: "Хаммам",
      text: "Мраморные стены и мерцающий мозаичный свод.",
      cam: "up",
      focus: "50% 40%",
      next: "zoom",
    },
    {
      img: "nad-dvorom",
      title: "Над двором",
      text: "Вид с террасы на складчатую крышу и сад. Дом целиком.",
      cam: "pull",
      focus: "50% 50%",
      next: null,
    },
  ];
  const CAM = {
    push: [{ scale: 1.06 }, { scale: 1.26 }],
    pull: [{ scale: 1.28 }, { scale: 1.06 }],
    left: [
      { scale: 1.18, xPercent: -4 },
      { scale: 1.18, xPercent: 4 },
    ],
    right: [
      { scale: 1.18, xPercent: 4 },
      { scale: 1.18, xPercent: -4 },
    ],
    up: [
      { scale: 1.18, yPercent: -4 },
      { scale: 1.18, yPercent: 4 },
    ],
  };
  const HOLD = 1,
    TR = 0.6,
    STEP = HOLD + TR,
    at = (i) => i * STEP;
  const shotsEl = $("#filmShots"),
    fcapsEl = $("#filmCaps"),
    segsEl = $("#filmSegs");
  SCENES.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "film-shot";
    d.innerHTML = `<img src="img/${s.img}.jpg" alt="${s.title}" decoding="async">`;
    shotsEl.appendChild(d);
    const c = document.createElement("div");
    c.className = "film-cap";
    c.innerHTML = `<h3><span class="line"><span>${s.title}</span></span></h3><p><span class="line"><span>${s.text}</span></span></p>`;
    fcapsEl.appendChild(c);
    segsEl.insertAdjacentHTML("beforeend", "<li><i></i></li>");
  });
  $("#filmTotal").textContent = pad(SCENES.length);
  const shots = [...shotsEl.children],
    imgs = shots.map((s) => s.querySelector("img"));
  const fcaps = [...fcapsEl.children],
    flines = fcaps.map((c) => c.querySelectorAll(".line > span"));
  const segFills = [...segsEl.querySelectorAll("i")];

  let filmCur = -1;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    paused: true,
    onUpdate: () => {
      const t = tl.time();
      segFills.forEach((f, j) =>
        gsap.set(f, {
          scaleX: gsap.utils.clamp(
            0,
            1,
            (t - at(j)) / (j === SCENES.length - 1 ? HOLD : STEP),
          ),
        }),
      );
      const idx = Math.min(SCENES.length - 1, Math.floor((t + TR / 2) / STEP));
      if (idx !== filmCur) {
        filmCur = idx;
        $("#filmCur").textContent = pad(idx + 1);
      }
    },
  });
  SCENES.forEach((s, i) => {
    const [from, to] = reduce ? [{ scale: 1.06 }, { scale: 1.06 }] : CAM[s.cam];
    const t0 = i === 0 ? 0 : at(i) - TR,
      t1 = s.next ? at(i) + HOLD + TR : at(i) + HOLD;
    gsap.set(imgs[i], { transformOrigin: s.focus, ...from });
    tl.fromTo(
      imgs[i],
      from,
      { ...to, immediateRender: false, duration: t1 - t0 },
      t0,
    );
    if (i > 0) {
      tl.set(fcaps[i], { visibility: "visible" }, at(i) - 0.2);
      tl.fromTo(
        flines[i],
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 0.35,
          stagger: 0.07,
          ease: "power3.out",
          immediateRender: false,
        },
        at(i) - 0.2,
      );
    }
    if (s.next) {
      tl.to(
        flines[i],
        { yPercent: -110, duration: 0.28, stagger: 0.04, ease: "power2.in" },
        at(i) + HOLD - 0.3,
      );
      tl.set(fcaps[i], { visibility: "hidden" }, at(i) + HOLD);
      transition(
        shots[i],
        shots[i + 1],
        reduce ? "fade" : s.next,
        at(i) + HOLD,
      );
    }
  });
  function transition(a, b, type, t) {
    const io = { immediateRender: false, duration: TR, ease: "power2.inOut" };
    tl.set(b, { visibility: "visible" }, t);
    if (type === "fold") {
      // Шторка по диагонали — как скошенные панели крыши
      tl.fromTo(
        b,
        { clipPath: "polygon(130% 0%, 140% 0%, 140% 100%, 100% 100%)" },
        { clipPath: "polygon(0% 0%, 140% 0%, 140% 100%, -30% 100%)", ...io },
        t,
      );
      tl.fromTo(a, { xPercent: 0 }, { xPercent: -12, ...io }, t);
    } else if (type === "zoom") {
      tl.fromTo(
        a,
        { scale: 1, filter: "blur(0px)" },
        { scale: 1.45, filter: "blur(10px)", ...io, ease: "power2.in" },
        t,
      );
      tl.fromTo(
        b,
        { opacity: 0, scale: 0.88 },
        { opacity: 1, scale: 1, ...io, ease: "power2.out" },
        t,
      );
    } else if (type === "sink") {
      tl.fromTo(b, { yPercent: 100 }, { yPercent: 0, ...io }, t);
      tl.fromTo(a, { yPercent: 0 }, { yPercent: -40, ...io }, t);
    } else {
      tl.fromTo(
        b,
        { opacity: 0 },
        { opacity: 1, ...io, ease: "sine.inOut" },
        t,
      );
    }
    tl.set(a, { visibility: "hidden" }, t + TR);
  }
  ScrollTrigger.create({
    trigger: "#interiors",
    pin: "#filmStage",
    start: "top top",
    end: () => "+=" + Math.round(tl.duration() * innerHeight * 0.7),
    scrub: reduce ? true : 0.8,
    animation: tl,
  });

  // ---------- 5. Галерея и просмотр на весь экран ----------
  const PHOTOS = [
    ["fasad", "Фасад"],
    ["podezd", "Подъезд к дому"],
    ["dvor", "Внутренний двор"],
    ["fasad-sad", "Фасад со стороны сада"],
    ["gostinaya", "Гостиная"],
    ["gostinaya-lestnica", "Гостиная и лестница"],
    ["gostinaya-kamin", "Гостиная, камин"],
    ["kuhnya-stolovaya", "Кухня-столовая"],
    ["kuhnya", "Кухня"],
    ["kamen", "Мраморная столешница"],
    ["kuhnya-obshiy", "Кухня и столовая"],
    ["holl", "Холл"],
    ["kabinet", "Кабинет"],
    ["atrium", "Второй свет над лестницей"],
    ["spalnya-glavnaya", "Главная спальня"],
    ["garderob", "Гардеробная"],
    ["vannaya", "Ванная"],
    ["spalnya-2", "Спальня"],
    ["vannaya-2", "Ванная"],
    ["spalnya-3", "Спальня"],
    ["dush", "Душевая"],
    ["terrasa", "Терраса"],
    ["nad-dvorom", "Вид с террасы"],
    ["bar", "Бар в зоне отдыха"],
    ["spa-otdyh", "Зона отдыха SPA"],
    ["kupel", "Купель"],
    ["sauna", "Сауна"],
    ["hammam", "Хаммам"],
    ["postirochnaya", "Постирочная"],
    ["dvor-2", "Двор"],
    ["vhod", "Вход"],
  ];
  const grid = $("#grid");
  PHOTOS.forEach(([f, cap], i) =>
    grid.insertAdjacentHTML(
      "beforeend",
      `<li><button type="button" data-i="${i}"><img src="img/${f}.jpg" alt="${cap}" loading="lazy" width="965" height="683"></button></li>`,
    ),
  );
  const lb = $("#lightbox"),
    lbImg = $("#lbImg"),
    lbCap = $("#lbCap");
  let lbI = 0;
  const show = (i) => {
    lbI = (i + PHOTOS.length) % PHOTOS.length;
    lbImg.src = `img/${PHOTOS[lbI][0]}.jpg`;
    lbImg.alt = PHOTOS[lbI][1];
    lbCap.textContent = `${PHOTOS[lbI][1]} — ${lbI + 1} из ${PHOTOS.length}`;
  };
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    show(+b.dataset.i);
    lb.showModal();
    lenis && lenis.stop();
  });
  lb.addEventListener("close", () => lenis && lenis.start());
  $("#lbClose").addEventListener("click", () => lb.close());
  $("#lbPrev").addEventListener("click", () => show(lbI - 1));
  $("#lbNext").addEventListener("click", () => show(lbI + 1));
  lb.addEventListener("click", (e) => {
    if (e.target === lb) lb.close();
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(lbI + 1);
    if (e.key === "ArrowLeft") show(lbI - 1);
  });

  // ---------- Шапка и меню: создаются после закреплённых разделов, иначе позиции
  // считаются без их высоты и подсветка срабатывает не там ----------
  const bar = $("#bar");
  // Тёмный фон шапки — как только обложка ушла; без «конца зоны», иначе внизу страницы он гаснет
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: () =>
      bar.classList.toggle("is-solid", scrollY > innerHeight * 0.8),
  });
  document.querySelectorAll(".about, .place").forEach((sec) =>
    ScrollTrigger.create({
      trigger: sec,
      start: "top 64px",
      end: "bottom 64px",
      toggleClass: { targets: bar, className: "on-light" },
    }),
  );
  const navLinks = [...document.querySelectorAll(".nav a")];
  navLinks.forEach((a) => {
    const sec = document.querySelector(a.getAttribute("href"));
    ScrollTrigger.create({
      trigger: sec,
      start: "top center",
      end: "bottom center",
      onToggle: (s) => a.toggleAttribute("aria-current", s.isActive),
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
