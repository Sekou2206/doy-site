(() => {
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMq = matchMedia('(max-width: 960px)');
  const media = name => `${name}.mp4`;
  const playSafe = v => { const p = v.play(); if (p) p.catch(() => {}); };

  const lenis = new Lenis({ duration: 1.2, smoothWheel: true, easing: t => 1 - Math.pow(1 - t, 4) });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  class Screen {
    constructor(el, { interval = 6000, delay = 0, stories = null, caption = null } = {}) {
      this.el = el;
      this.clips = el.dataset.clips.split('|');
      this.names = el.dataset.names.split('|');
      this.box = $('.screen__media', el);
      this.caption = caption || $('.screen__cap', el);
      this.interval = interval;
      this.delay = delay;
      this.stories = stories;
      this.index = 0;
      this.running = false;
      this.busy = false;
      this.current = this.make(this.clips[0]);
      this.box.appendChild(this.current);
      this.setCaption(0);
      if (stories) {
        stories.innerHTML = this.clips.map(() => '<span><i></i></span>').join('');
        this.bars = $$('i', stories);
      }
    }
    make(clip) {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.src = media(clip);
      return v;
    }
    setCaption(i) {
      if (!this.caption) return;
      $('b', this.caption).textContent = String(i + 1).padStart(2, '0');
      $('em', this.caption).textContent = this.names[i];
    }
    go(i) {
      if (this.busy) return;
      const n = this.clips.length;
      i = (i + n) % n;
      if (i === this.index) return;
      this.busy = true;
      const next = this.make(this.clips[i]);
      next.classList.add('is-next');
      this.box.appendChild(next);
      const reveal = () => {
        playSafe(next);
        gsap.fromTo(next, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.15 }, {
          clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.15, ease: 'expo.inOut',
          onComplete: () => {
            this.current.pause();
            this.current.remove();
            next.classList.remove('is-next');
            gsap.set(next, { clearProps: 'clipPath,scale' });
            this.current = next;
            this.busy = false;
          }
        });
        gsap.fromTo(this.current, { yPercent: 0 }, { yPercent: -18, duration: 1.15, ease: 'expo.inOut' });
        this.index = i;
        this.setCaption(i);
        if (this.bars) this.runBars();
      };
      if (next.readyState >= 2) reveal();
      else {
        let done = false;
        const once = () => { if (done) return; done = true; reveal(); };
        next.addEventListener('loadeddata', once, { once: true });
        next.addEventListener('error', once, { once: true });
        setTimeout(once, 2500);
      }
    }
    runBars() {
      if (this.barTween) this.barTween.kill();
      this.bars.forEach((b, k) => gsap.set(b, { scaleX: k < this.index ? 1 : 0 }));
      if (!this.running) return;
      this.barTween = gsap.to(this.bars[this.index], {
        scaleX: 1, duration: this.interval / 1000, ease: 'none',
        onComplete: () => this.go(this.index + 1)
      });
    }
    start() {
      if (this.running) return;
      this.running = true;
      playSafe(this.current);
      if (this.bars) { this.runBars(); return; }
      this.timer = setTimeout(() => {
        this.go(this.index + 1);
        this.loop = setInterval(() => this.go(this.index + 1), this.interval);
      }, this.delay);
    }
    stop() {
      this.running = false;
      clearTimeout(this.timer);
      clearInterval(this.loop);
      if (this.barTween) this.barTween.pause();
      this.current.pause();
    }
  }

  const tri = $$('.hero__tri .screen').map((el, i) => new Screen(el, { interval: 6600, delay: 2600 + i * 2200 }));
  const solo = new Screen($('.screen--solo'), { interval: 5200, stories: $('.stories'), caption: $('.hero__solocap') });
  $('.stories__zone--next').addEventListener('click', () => solo.go(solo.index + 1));
  $('.stories__zone--prev').addEventListener('click', () => solo.go(solo.index - 1));

  let heroVisible = true;
  let introDone = false;
  const syncHero = () => {
    if (!introDone) return;
    const m = mobileMq.matches;
    if (heroVisible && m) { solo.start(); tri.forEach(s => s.stop()); }
    else if (heroVisible) { tri.forEach(s => s.start()); solo.stop(); }
    else { solo.stop(); tri.forEach(s => s.stop()); }
  };
  mobileMq.addEventListener('change', syncHero);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncHero(); }).observe($('.hero'));

  $$('.hero__tri .screen').forEach(s => {
    s.addEventListener('mouseenter', () => { $$('.hero__tri .screen').forEach(o => o.classList.toggle('is-focus', o === s)); });
    s.addEventListener('mouseleave', () => s.classList.remove('is-focus'));
  });

  gsap.to('.hero__tri, .hero__solo', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.ht--1 > span', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.ht--2 > span', { xPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      const acc = v.closest('.acc__item');
      if (acc && !mobileMq.matches && !acc.classList.contains('is-open')) { v.pause(); return; }
      if (e.isIntersecting) playSafe(v); else v.pause();
    });
  }, { rootMargin: '100px' });
  $$('main video').forEach(v => {
    if (v.closest('.hero') || v.classList.contains('modal__video')) return;
    v.muted = true;
    videoObserver.observe(v);
  });

  const words = $$('.loader__words span');
  const bar = $('.loader__bar i');
  const num = $('.loader__num');
  const counter = { v: 0 };
  const first = tri.map(s => s.current).concat(solo.current);
  const ready = Promise.race([
    Promise.all(first.map(v => new Promise(r => { if (v.readyState > 2) r(); else { v.addEventListener('canplay', r, { once: true }); v.addEventListener('error', r, { once: true }); } }))),
    new Promise(r => setTimeout(r, 4000))
  ]);
  const intro = gsap.timeline({ paused: true });
  intro
    .to('.loader__words', { yPercent: -10, opacity: 0, duration: .7, ease: 'power3.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, '-=.2')
    .from('.hero__tri .screen, .hero__solo', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, stagger: .12, ease: 'expo.inOut' }, '-=1')
    .from('.ht > span', { yPercent: 110, duration: 1.4, stagger: .12, ease: 'expo.out' }, '-=.9')
    .from('.hero__meta, .hero__down, .screen__cap, .stories, .hero__solocap', { opacity: 0, y: 16, duration: 1, stagger: .05, ease: 'power3.out' }, '-=1')
    .from('.nav', { opacity: 0, duration: 1, ease: 'power3.out' }, '<')
    .add(() => {
      document.body.classList.remove('is-loading');
      $('.loader').style.display = 'none';
      lenis.start();
      introDone = true;
      syncHero();
      ScrollTrigger.refresh();
    });
  gsap.set('.loader', { clipPath: 'inset(0 0 0% 0)' });
  gsap.to(counter, {
    v: 100, duration: 2.1, ease: 'power2.inOut',
    onUpdate: () => {
      const p = counter.v / 100;
      num.textContent = String(Math.round(counter.v)).padStart(3, '0');
      bar.style.transform = `scaleX(${p})`;
      words.forEach((w, i) => { w.style.opacity = p > i / words.length + .08 ? 1 : .12; });
    },
    onComplete: () => ready.then(() => intro.play())
  });

  const manifest = $('.manifesto__text');
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName === 'EM') walk(ch);
    });
  };
  walk(manifest);
  const units = $$('.w, .pill', manifest);
  gsap.set($$('.pill', manifest), { scale: 0, opacity: 0 });
  let litCount = -1;
  ScrollTrigger.create({
    trigger: manifest, start: 'top 82%', end: 'bottom 50%', scrub: true,
    onUpdate: s => {
      const lit = Math.min(units.length, Math.floor(s.progress * units.length * 1.05));
      if (lit === litCount) return;
      litCount = lit;
      units.forEach((u, i) => {
        const on = i < lit;
        if (u.classList.contains('pill')) {
          if (u.dataset.on !== String(on)) {
            u.dataset.on = String(on);
            gsap.to(u, { scale: on ? 1 : 0, opacity: on ? 1 : 0, duration: .6, ease: 'expo.out', overwrite: true });
            const v = $('video', u); if (v) on ? playSafe(v) : v.pause();
          }
        } else u.style.opacity = on ? 1 : .12;
      });
    }
  });

  const crit = $$('.crit li');
  let cutCount = -1;
  ScrollTrigger.create({
    trigger: '.crit', start: 'top 70%', end: 'bottom 45%', scrub: true,
    onUpdate: s => {
      const cut = Math.round(s.progress * crit.length);
      if (cut === cutCount) return;
      cutCount = cut;
      crit.forEach((li, i) => {
        const on = i < cut;
        li.classList.toggle('is-cut', on);
        gsap.to($('i', li), { scaleX: on ? 1 : 0, duration: .7, ease: 'expo.out', overwrite: true });
      });
    }
  });
  gsap.from('.crit__end', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.crit__end', start: 'top 90%' } });

  const accItems = $$('.acc__item');
  const openAcc = item => {
    if (mobileMq.matches) return;
    accItems.forEach(a => {
      const v = $('video', a);
      if (a === item) { a.classList.add('is-open'); playSafe(v); }
      else { a.classList.remove('is-open'); v.pause(); }
    });
  };
  accItems.forEach(a => a.addEventListener('mouseenter', () => openAcc(a)));

  const track = $('.defile__track');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const horizontal = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.defile', pin: '.defile__pin', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
      onUpdate: s => gsap.set('.defile__progress span', { scaleX: s.progress })
    }
  });
  $$('.look img, .look video').forEach(m => {
    gsap.fromTo(m, { xPercent: -7 }, { xPercent: 7, ease: 'none',
      scrollTrigger: { trigger: m.parentElement, containerAnimation: horizontal, start: 'left right', end: 'right left', scrub: true } });
  });

  gsap.fromTo('.film__frame', { clipPath: () => mobileMq.matches ? 'inset(10% 6% 30% 6%)' : 'inset(14% 22% 14% 22%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: '.film', start: 'top 85%', end: 'top 5%', scrub: true, invalidateOnRefresh: true }
  });
  gsap.to('.film__bg', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.film', start: 'top bottom', end: 'bottom top', scrub: true } });

  const modal = $('.modal');
  const modalVideo = $('.modal__video');
  const openModal = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lenis.stop();
    modalVideo.muted = false;
    modalVideo.currentTime = 0;
    playSafe(modalVideo);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalVideo.pause();
    lenis.start();
  };
  $('.film').addEventListener('click', openModal);
  $('.modal__close').addEventListener('click', closeModal);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  if (fine) {
    const float = $('.city-float');
    const floatImg = $('img', float);
    let fx = innerWidth / 2, fy = innerHeight / 2, tx = fx, ty = fy;
    $$('.city').forEach(c => {
      c.addEventListener('mouseenter', () => { floatImg.src = c.dataset.img; float.classList.add('is-on'); });
      c.addEventListener('mouseleave', () => float.classList.remove('is-on'));
    });
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    gsap.ticker.add(() => {
      fx += (tx - fx) * .12; fy += (ty - fy) * .12;
      float.style.left = fx + 'px'; float.style.top = fy + 'px';
    });
  }
  $$('.city').forEach(c => gsap.from(c, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 95%' } }));

  const archiveItems = [
    ['look-01', 'Look 01'], ['backstage-01', 'Coulisses'], ['couture-02', 'Couture'], ['noir-02', 'Full black'],
    ['detail-02', 'Détail'], ['frontrow-01', 'Front row'], ['look-02', 'Look 05'], ['inclusive-01', 'Casting'],
    ['carpet-01', 'Dark carpet'], ['piece', 'Pièce aistilca'], ['runway-02', 'Look 06'], ['joseph', 'Joseph'],
    ['look-04', 'Look 02'], ['prada', 'Prada'], ['noir-01', 'Full black'], ['backstage-02', 'Coulisses'],
    ['detail-01', 'Détail'], ['couture-01', 'Couture'], ['frontrow-02', 'Front row'], ['look-03', 'Look 03'],
    ['carpet-02', 'Dark carpet'], ['inclusive-02', 'Casting'], ['runway-01', 'Look 04'], ['joseph', 'Mon identité']
  ];
  const view = $('.archive__view');
  const plane = $('.archive__plane');
  const cols = 6, rows = 4;
  let rnd = 7;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };
  const tiles = archiveItems.map(([file, cap], k) => {
    const t = document.createElement('div');
    t.className = 'tile';
    t.innerHTML = `<figure><img src="${file}.jpg" alt="${cap}" loading="lazy" draggable="false"></figure><span class="mono">${cap}</span>`;
    plane.appendChild(t);
    return { el: t, col: k % cols, row: Math.floor(k / cols), s: .62 + rand() * .38, jx: rand(), jy: rand(), x: 0, y: 0, w: 0 };
  });
  let cw, ch, gap, W, H;
  const layoutArchive = () => {
    const m = mobileMq.matches;
    cw = m ? innerWidth * .46 : Math.max(220, innerWidth * .19);
    ch = cw * 1.3;
    gap = m ? innerWidth * .06 : innerWidth * .035;
    W = cols * (cw + gap);
    H = rows * (ch + gap);
    tiles.forEach(t => {
      t.w = cw * t.s;
      t.el.style.width = t.w + 'px';
      t.el.style.height = t.w * 1.25 + 'px';
      t.x = t.col * (cw + gap) + (cw - t.w) * t.jx;
      t.y = t.row * (ch + gap) + (ch - t.w * 1.25) * t.jy;
    });
  };
  layoutArchive();
  addEventListener('resize', layoutArchive);
  let ox = 0, oy = 0, vx = 0, vy = 0, drag = false, lx = 0, ly = 0, touchDrag = false, archiveOn = false;
  new IntersectionObserver(([e]) => { archiveOn = e.isIntersecting; }).observe(view);
  view.addEventListener('pointerdown', e => { drag = true; touchDrag = e.pointerType !== 'mouse'; lx = e.clientX; ly = e.clientY; });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('pointercancel', () => { drag = false; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    vx = (e.clientX - lx) * .9;
    if (!touchDrag) vy = (e.clientY - ly) * .9;
    lx = e.clientX; ly = e.clientY;
  });
  const wrap = (v, m) => ((v % m) + m) % m;
  gsap.ticker.add(() => {
    if (!archiveOn) return;
    if (!drag) { vx *= .93; vy *= .93; }
    ox += vx + (reduce ? 0 : -.35);
    oy += vy + (reduce ? 0 : -.22);
    if (drag) { vx *= .5; vy *= .5; }
    tiles.forEach(t => {
      const px = wrap(t.x + ox, W) - (cw + gap);
      const py = wrap(t.y + oy, H) - (ch + gap);
      t.el.style.transform = `translate3d(${px}px,${py}px,0)`;
    });
  });
  lenis.on('scroll', ({ velocity }) => { if (archiveOn) vy -= velocity * .06; });

  $$('.sec-title, .founder__quote, .casting__title, .film__title').forEach(t => {
    gsap.from(t, { yPercent: 22, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 88%' } });
  });
  gsap.fromTo('.founder__img', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.founder', start: 'top 72%' } });
  gsap.to('.founder__img img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.founder', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.jcard').forEach((c, i) => {
    gsap.from(c, { y: 90, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 94%' } });
    gsap.to($('img', c), { yPercent: i % 2 ? -6 : 6, scale: 1.1, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.casting__media img').forEach((img, i) => {
    gsap.fromTo(img, { y: 60 * (i + 1) }, { y: -30 * (i + 1), ease: 'none', scrollTrigger: { trigger: '.casting', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.foot__giant span', { yPercent: 100, duration: 1.4, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.foot__giant', start: 'top 98%' } });

  $('.casting__form').addEventListener('submit', e => { e.preventDefault(); e.currentTarget.classList.add('is-sent'); });

  if (fine) {
    const cursor = $('.cursor');
    const dot = $('.cursor__dot', cursor);
    const ringEl = $('.cursor__ring', cursor);
    const label = $('.cursor__label', cursor);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; });
    gsap.ticker.add(() => {
      rx += (mx - rx) * .16; ry += (my - ry) * .16;
      ringEl.style.transform = `translate(${rx}px,${ry}px)`;
    });
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t && !e.target.closest('a, button, input')) { label.textContent = t.dataset.cursor; cursor.classList.add('has-label'); }
      else cursor.classList.remove('has-label');
    });
  }

  const nav = $('.nav');
  lenis.on('scroll', ({ scroll, direction }) => {
    if (document.body.classList.contains('menu-open')) return;
    nav.classList.toggle('is-hidden', direction === 1 && scroll > innerHeight * .5);
  });

  const toggleMenu = force => {
    const open = force ?? !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    $('.menu').setAttribute('aria-hidden', String(!open));
    nav.classList.remove('is-hidden');
    open ? lenis.stop() : lenis.start();
  };
  $('.nav__burger').addEventListener('click', () => toggleMenu());
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) toggleMenu(false);
    lenis.scrollTo(target, { duration: 1.6 });
  }));

  addEventListener('load', () => ScrollTrigger.refresh());
})();
