(() => {
  const INTERVAL = 5000;                
  const slides = [...document.querySelectorAll('.slide')];
  const bar = document.getElementById('progress');
  const label = document.getElementById('label');
  const count = document.getElementById('count');
  const copies = [...document.querySelectorAll('.copy')];
  let cur = -1, timer;

  const segs = slides.map((_, i) => {
    const b = document.createElement('button');
    b.className = 'seg'; b.setAttribute('aria-label', 'Slide ' + (i + 1));
    b.innerHTML = '<i></i>';
    b.onclick = () => go(i);
    bar.appendChild(b); return b;
  });

  slides.forEach(s => { const u = s.style.getPropertyValue('--img').match(/url\(['"]?(.*?)['"]?\)/); if (u) new Image().src = u[1]; });

  function go(n) {
    n = (n + slides.length) % slides.length;
    if (n === cur) return;
    slides.forEach(s => s.classList.remove('is-prev'));
    if (cur > -1) { slides[cur].classList.remove('is-active'); slides[cur].classList.add('is-prev'); }
    slides[n].classList.remove('is-active'); void slides[n].offsetWidth;   
    slides[n].classList.add('is-active');
    segs.forEach((s, i) => {
      s.classList.remove('on'); void s.offsetWidth;
      s.classList.toggle('done', i < n); s.classList.toggle('on', i === n);
    });
    copies.forEach((c, i) => c.classList.toggle('on', i === n));
    label.textContent = slides[n].dataset.label;
    label.style.animation = 'none'; void label.offsetWidth; label.style.animation = '';
    count.textContent = (n + 1) + ' / ' + slides.length;
    cur = n; schedule();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => go(cur + 1), INTERVAL); }

  document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(timer) : go(cur + 1));

  const hero = document.getElementById('hero'), top = document.getElementById('topbar');
  let tick = false;
  addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const p = Math.min(scrollY / hero.offsetHeight, 1);
      hero.style.setProperty('--p', p.toFixed(3));
      top.classList.toggle('solid', scrollY > 60);
      drawWire();
      tick = false;
    });
  }, { passive: true });


  const burger = document.getElementById('burger'), nav = document.getElementById('menu').parentElement;
  burger.onclick = () => burger.setAttribute('aria-expanded', nav.classList.toggle('open'));

  const sec = document.getElementById('next'), wire = document.getElementById('wirePath');
  const tour = document.getElementById('tour'), vid = document.getElementById('tourVideo'), snd = document.getElementById('vsound');

  document.querySelectorAll('[data-split]').forEach(el => {
    let i = 0, out = '';
    el.childNodes.forEach(n => {
      const hl = n.nodeType === 1;
      n.textContent.trim().split(/\s+/).filter(Boolean).forEach(w => {
        out += '<span class="w" style="--w:' + (i++) + '"><span' + (hl ? ' class="hl"' : '') + '>' + w + '</span></span>';
      });
    });
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = out;
  });

  const rows = [...document.querySelectorAll('.mv-row')], stageEl = document.getElementById('stage');
  function drawWire() {
    const r = sec.getBoundingClientRect();
    const sp = Math.min(Math.max((innerHeight * .8 - r.top) / r.height, 0), 1);
    wire.style.strokeDashoffset = (1 - sp).toFixed(3);
    const t = tour.getBoundingClientRect();
    const off = (t.top + t.height / 2 - innerHeight / 2) / innerHeight;       // -1 … 1
    tour.style.setProperty('--vy', (Math.max(-1, Math.min(1, off)) * -26).toFixed(1) + 'px');

    rows.forEach(row => {
      const b = row.getBoundingClientRect();
      const o = Math.max(-1, Math.min(1, (b.top + b.height / 2 - innerHeight / 2) / innerHeight));
      row.style.setProperty('--py', (o * -34).toFixed(1) + 'px');
      row.style.setProperty('--gy', (o * 60).toFixed(1) + 'px');
    });
    if (stageEl) stageEl.style.setProperty('--sr', (scrollY * .12).toFixed(1));
  }
  addEventListener('resize', drawWire);

  const reveal = th => new IntersectionObserver((es, o) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); }
  }), { threshold: th });
  const ioA = reveal(.2), ioB = reveal(.08);
  document.querySelectorAll('[data-reveal]').forEach(el => (el.dataset.reveal === 'early' ? ioB : ioA).observe(el));
  vid.muted = true; vid.playsInline = true;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause();
  }), { threshold: .25 }).observe(vid);
  snd.onclick = () => {
    vid.muted = !vid.muted;
    snd.firstElementChild.className = 'fa-solid ' + (vid.muted ? 'fa-volume-xmark' : 'fa-volume-high');
    snd.setAttribute('aria-label', vid.muted ? 'Turn sound on' : 'Turn sound off');
  };

  document.querySelectorAll('.vcard').forEach(c => {
    c.addEventListener('pointermove', e => {
      const b = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      c.style.setProperty('--my', (e.clientY - b.top) + 'px');
    });
  });

  (() => {
    const cv = document.getElementById('fx');
    if (!stageEl || !cv || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const ctx = cv.getContext('2d'), W = 1100, STEPS = 360, PER = 5, SPEED = 2.4;
    let k = 1, dpr = 1, last = performance.now(), visible = false;
    const segs = [...stageEl.querySelectorAll('.flow')].map(p => {
      const L = p.getTotalLength(), pts = [];
      for (let i = 0; i <= STEPS; i++) { const q = p.getPointAtLength(L * i / STEPS); pts.push([q.x, q.y]); }
      return { pts, len: L };
    });
    const dots = [];
    segs.forEach(s => { for (let i = 0; i < PER; i++) dots.push({ s, t: i / PER }); });
    function size() {
      const r = stageEl.getBoundingClientRect(); if (!r.width) return;
      dpr = Math.min(devicePixelRatio || 1, 2); k = r.width / W;
      cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    new ResizeObserver(size).observe(stageEl); size();
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(stageEl);
    const at = (s, t) => {
      const f = t * STEPS, i = Math.min(Math.floor(f), STEPS - 1), a = s.pts[i], b = s.pts[i + 1], m = f - i;
      return [(a[0] + (b[0] - a[0]) * m) * k, (a[1] + (b[1] - a[1]) * m) * k];
    };
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (!visible || document.hidden || !cv.offsetWidth) return;
      ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
      dots.forEach(d => {
        d.t += dt * SPEED * (300 / d.s.len) * .6; if (d.t >= 1) d.t -= 1;
        const [x, y] = at(d.s, d.t), g = ctx.createRadialGradient(x, y, 0, x, y, 11 * k);
        g.addColorStop(0, 'rgba(227,24,55,.65)'); g.addColorStop(1, 'rgba(227,24,55,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#E31837'; ctx.beginPath(); ctx.arc(x, y, 5.5 * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.2 * k, 0, 7); ctx.fill();
      });
    })(last);
  })();

  const indCards = [...document.querySelectorAll('.ind-card')], chips = [...document.querySelectorAll('.chip')], indCount = document.getElementById('indCount');
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c => { c.classList.toggle('on', c === ch); c.setAttribute('aria-selected', c === ch); });
    const f = ch.dataset.f; let n = 0;
    indCards.forEach(card => {
      const show = f === 'all' || card.dataset.cat === f;
      if (show) { n++; card.hidden = false; void card.offsetWidth; card.classList.remove('off'); }
      else { card.classList.add('off'); setTimeout(() => { if (card.classList.contains('off')) card.hidden = true; }, 380); }
    });
    indCount.textContent = 'Showing ' + n + ' ' + (n === 1 ? 'industry' : 'industries');
  }));
  indCards.forEach(card => {
    card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      card.style.setProperty('--ry', ((x / b.width - .5) * 6).toFixed(1) + 'deg');
      card.style.setProperty('--rx', ((.5 - y / b.height) * 6).toFixed(1) + 'deg');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });

  const sp = document.getElementById('sp'), toTop = document.getElementById('toTop');
  function progress() {
    const m = document.documentElement.scrollHeight - innerHeight;
    sp.style.setProperty('--p', (m > 0 ? Math.min(1, scrollY / m) : 0).toFixed(4));
    toTop.classList.toggle('show', scrollY > 700);
  }
  addEventListener('scroll', progress, { passive: true }); progress();
  toTop.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });

  drawWire();

  go(0);
})();

(() => {
  const stats = document.getElementById('stats');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (stats) {
    const nums = [...stats.querySelectorAll('[data-count]')];
    if (!reduce) nums.forEach(n => n.textContent = '0');
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return; o.unobserve(e.target);
      nums.forEach((n, i) => {
        const to = +n.dataset.count, dur = 1900 + i * 150, t0 = performance.now() + 300 + i * 120;
        (function step(now) {
          const p = Math.min(Math.max((now - t0) / dur, 0), 1);
          n.textContent = Math.round(to * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));   // ease-out count-up
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }), { threshold: .35 }).observe(stats);
  }
  document.querySelectorAll('.pc-card').forEach(card => {                              // tilt + red spotlight
    card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      card.style.setProperty('--ry', ((x / b.width - .5) * 6).toFixed(1) + 'deg');
      card.style.setProperty('--rx', ((.5 - y / b.height) * 6).toFixed(1) + 'deg');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });
})();

(() => {
  const tabs = document.getElementById('abTabs'); if (!tabs) return;
  const items = [...tabs.querySelectorAll('.ab-tab')]; let cur = 0;
  function open(n) {
    items.forEach((it, i) => {
      const on = i === n;
      it.classList.toggle('on', on);
      it.querySelector('.ab-tbtn').setAttribute('aria-expanded', on);
      if (on) { const f = it.querySelector('.ab-fill'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; }   // restart timer
    });
    cur = n;
  }
  items.forEach((it, i) => {
    it.querySelector('.ab-tbtn').addEventListener('click', () => open(i));
    it.querySelector('.ab-fill').addEventListener('animationend', () => { if (i === cur) open((cur + 1) % items.length); });
  });
  new IntersectionObserver(es => es.forEach(e => tabs.classList.toggle('go', e.isIntersecting)), { threshold: .3 }).observe(tabs);

  const col = document.querySelector('.ab-collage');
  if (col) {
    col.addEventListener('pointermove', e => {
      const b = col.getBoundingClientRect();
      col.style.setProperty('--px', ((e.clientX - b.left) / b.width - .5) * 2);
      col.style.setProperty('--py', ((e.clientY - b.top) / b.height - .5) * 2);
    });
    col.addEventListener('pointerleave', () => { col.style.setProperty('--px', 0); col.style.setProperty('--py', 0); });
  }
})();

(() => {
  const stage = document.getElementById('tmStage'); if (!stage) return;
  const cards = [...stage.querySelectorAll('.tm-card')], n = cards.length;
  const dotsEl = document.getElementById('tmDots'), status = document.getElementById('tmStatus');
  let cur = 1;                                                        // 2nd testimonial starts in the centre
  dotsEl.innerHTML = cards.map((_, i) => '<button type="button" class="tm-dot" data-i="' + i + '" aria-label="Show testimonial ' + (i + 1) + '"></button>').join('');
  const dots = [...dotsEl.children];

  function render() {
    cards.forEach((c, i) => {
      c.classList.remove('is-left', 'is-center', 'is-right');
      if (i === cur) c.classList.add('is-center');
      else if (i === (cur - 1 + n) % n) c.classList.add('is-left');
      else if (i === (cur + 1) % n) c.classList.add('is-right');
      c.setAttribute('aria-hidden', i !== cur);
    });
    dots.forEach((b, i) => { b.classList.toggle('on', i === cur); b.setAttribute('aria-current', i === cur); });
    status.textContent = 'Testimonial ' + (cur + 1) + ' of ' + n;
  }
  const show = i => { cur = (i + n) % n; render(); };
  render();

  document.getElementById('tmPrev').onclick = () => show(cur - 1);
  document.getElementById('tmNext').onclick = () => show(cur + 1);
  dotsEl.addEventListener('click', e => { const b = e.target.closest('.tm-dot'); if (b) show(+b.dataset.i); });
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
})();

(() => {
  const sec = document.getElementById('brands'), vp = document.getElementById('bwViewport'), track = document.getElementById('bwTrack');
  const prev = document.getElementById('bwPrev'), next = document.getElementById('bwNext');
  if (!sec || !vp || !track) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  [...track.children].forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });   // duplicate for a seamless loop
  sec.classList.add('is-marquee');

  let pos = 0, half = 0, goal = null, hover = false, drag = null, visible = true, last = 0;
  const SPEED = reduce ? 0 : 55;                                      
  const measure = () => { half = track.scrollWidth / 2; };
  measure(); addEventListener('resize', measure); addEventListener('load', measure);
  const stepPx = () => { const c = track.children[0]; return (c.offsetWidth + parseFloat(getComputedStyle(c).marginRight)) * 3; };   // 3 cards per click
  const wrap = () => {
    if (!half) return;
    while (pos >= half) { pos -= half; if (goal !== null) goal -= half; }
    while (pos < 0)     { pos += half; if (goal !== null) goal += half; }
  };

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden) return;
    if (drag) { }
    else if (goal !== null) {                                           
      pos = reduce ? goal : pos + (goal - pos) * Math.min(1, dt * 7);
      if (Math.abs(goal - pos) < .5) { pos = goal; goal = null; }
    } else if (!hover) pos += SPEED * dt;                             
    wrap();
    track.style.transform = 'translate3d(' + (-pos).toFixed(2) + 'px,0,0)';
  }
  requestAnimationFrame(t => { last = t; frame(t); });

  const go = dir => { goal = (goal !== null ? goal : pos) + dir * stepPx(); };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  vp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  vp.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });

  vp.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, p: pos }; goal = null; vp.classList.add('dragging'); vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener('pointermove', e => { if (drag) pos = drag.p - (e.clientX - drag.x); });
  const end = () => { drag = null; vp.classList.remove('dragging'); };
  vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);

  new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting), { threshold: 0 }).observe(vp);
})();


document.addEventListener("DOMContentLoaded", function () {

    const stage = document.getElementById("tmStage");
    const cards = document.querySelectorAll(".tm-card");
    const prevBtn = document.getElementById("tmPrev");
    const nextBtn = document.getElementById("tmNext");
    const dotsContainer = document.getElementById("tmDots");
    const section = document.getElementById("testimonials");
    const status = document.getElementById("tmStatus");

    if (!stage || cards.length === 0 || !dotsContainer) return;

    let currentIndex = 0;
    let autoSlide;
    const interval = 3000;

    dotsContainer.innerHTML = "";

    cards.forEach((card, index) => {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "tm-dot";
        dot.setAttribute("aria-label", `Go to testimonial ${index + 1}`);

        dot.addEventListener("click", () => {
            showSlide(index);
            restartAutoSlide();
        });

        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll(".tm-dot");

    function showSlide(index) {

        currentIndex = (index + cards.length) % cards.length;

        cards.forEach((card, i) => {
            card.classList.toggle("active", i === currentIndex);
            card.setAttribute("aria-hidden", i !== currentIndex);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === currentIndex);

            if (i === currentIndex) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }
        });

        if (status) {
            status.textContent =
                `Showing testimonial ${currentIndex + 1} of ${cards.length}`;
        }
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function previousSlide() {
        showSlide(currentIndex - 1);
    }

    function startAutoSlide() {
        stopAutoSlide();
        autoSlide = setInterval(nextSlide, interval);
    }

    function stopAutoSlide() {
        clearInterval(autoSlide);
    }

    function restartAutoSlide() {
        startAutoSlide();
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            nextSlide();
            restartAutoSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            previousSlide();
            restartAutoSlide();
        });
    }

    section.addEventListener("mouseenter", stopAutoSlide);
    section.addEventListener("mouseleave", startAutoSlide);

    section.addEventListener("focusin", stopAutoSlide);
    section.addEventListener("focusout", (event) => {
        if (!section.contains(event.relatedTarget)) {
            startAutoSlide();
        }
    });

    showSlide(0);
    startAutoSlide();

});
