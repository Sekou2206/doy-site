(() => {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

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
      this.current = null;
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
      v.poster = `${clip}.jpg`;
      v.src = media(clip);
      return v;
    }
    prime() {
      if (this.current) return this.current;
      this.current = this.make(this.clips[0]);
      this.box.appendChild(this.current);
      return this.current;
    }
    setCaption(i) {
      if (!this.caption) return;
      $('b', this.caption).textContent = String(i + 1).padStart(2, '0');
      $('em', this.caption).textContent = this.names[i];
    }
    go(i) {
      if (this.busy || !this.current) return;
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
      this.prime();
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
      if (this.current) this.current.pause();
    }
  }

  const tri = $$('.hero__tri .screen').map((el, i) => new Screen(el, { interval: 6600, delay: 2600 + i * 2200 }));
  const solo = new Screen($('.screen--solo'), { interval: 5200, stories: $('.stories'), caption: $('.hero__solocap') });
  $('.stories__zone--next').addEventListener('click', () => solo.go(solo.index + 1));
  $('.stories__zone--prev').addEventListener('click', () => solo.go(solo.index - 1));

  let heroVisible = true;
  let introDone = false;
  let overlay = false;
  const syncHero = () => {
    if (!introDone) return;
    if (overlay) { solo.stop(); tri.forEach(s => s.stop()); return; }
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
  }, { rootMargin: '400px 0px' });
  $$('main video').forEach(v => {
    if (v.closest('.hero') || v.classList.contains('modal__video')) return;
    v.muted = true;
    videoObserver.observe(v);
  });

  const words = $$('.loader__words span');
  const bar = $('.loader__bar i');
  const num = $('.loader__num');
  const counter = { v: 0 };
  const first = (mobileMq.matches ? [solo] : tri).map(s => s.prime());
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
  if (!mobileMq.matches) $$('.look img, .look video').forEach(m => {
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
  const setOverlay = on => {
    overlay = on;
    document.body.classList.toggle('has-overlay', on);
    $$('main video').forEach(v => { if (on && !v.paused && !v.closest('.modal')) { v.dataset.resume = '1'; v.pause(); } else if (!on && v.dataset.resume) { delete v.dataset.resume; playSafe(v); } });
    syncHero();
  };
  const openModal = () => {
    setOverlay(true);
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
    setOverlay(false);
  };
  $('.film').addEventListener('click', openModal);
  $('.modal__close').addEventListener('click', closeModal);
  addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  if (fine) {
    const float = $('.city-float');
    const floatImg = $('img', float);
    let fx = innerWidth / 2, fy = innerHeight / 2, tx = fx, ty = fy, floatOn = false;
    $$('.city').forEach(c => {
      c.addEventListener('mouseenter', () => { floatImg.src = c.dataset.img; float.classList.add('is-on'); floatOn = true; document.body.classList.add('on-city'); });
      c.addEventListener('mouseleave', () => { float.classList.remove('is-on'); document.body.classList.remove('on-city'); setTimeout(() => { if (!float.classList.contains('is-on')) floatOn = false; }, 600); });
    });
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      if (!floatOn) { fx = tx; fy = ty; return; }
      fx += (tx - fx) * .12; fy += (ty - fy) * .12;
      float.style.translate = `${fx}px ${fy}px`;
    });
  }
  $$('.city').forEach(c => gsap.from(c, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 95%' } }));


  $$('.sec-title, .founder__quote, .casting__title, .film__title').forEach(t => {
    gsap.from(t, { yPercent: 22, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 88%' } });
  });
  gsap.fromTo('.founder__img', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.founder', start: 'top 72%' } });
  gsap.to('.founder__img img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.founder', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.casting__media img').forEach((img, i) => {
    gsap.fromTo(img, { y: 60 * (i + 1) }, { y: -30 * (i + 1), ease: 'none', scrollTrigger: { trigger: '.casting', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.foot__giant span', { yPercent: 100, duration: 1.4, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.foot__giant', start: 'top 98%' } });

  gsap.from('.doyq__lead, .doyq__grid', { y: 60, opacity: 0, duration: 1.3, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.doyq', start: 'top 80%' } });
  gsap.from('.doyq__list li', { y: 20, opacity: 0, duration: .9, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.doyq__list', start: 'top 90%' } });
  $$('.ed, .offer').forEach(r => gsap.from(r, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 95%' } }));

  const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);
  const galleries = {
    alien: { title: 'Défilé V · Alien', meta: '27.04.25 · Planétarium de Lyon', items: ['look-01', 'look-04', 'look-03', 'runway-01', 'look-02', 'runway-02', 'detail-01', 'detail-02', 'piece', 'backstage-01', 'backstage-02', 'frontrow-01', 'frontrow-02', 'carpet-01', 'carpet-02', 'noir-01', 'noir-02'] },
    halloween: { title: 'Halloween Glamour', meta: 'Couture Runway · The Village', items: ['couture-01', 'couture-02'] },
    c260701: { title: 'Séance casting', meta: '01.07.26 · Casting DOY', items: range('cast-260701', 3) },
    c260319: { title: 'Séance casting', meta: '19.03.26 · Casting DOY', items: range('cast-260319', 8) },
    c241116: { title: 'Séance casting', meta: '16.11.24 · Casting DOY', items: range('cast-241116', 8) }
  };
  const gal = $('.gal');
  const galGrid = $('.gal__grid');
  const galView = $('.gal__view');
  const galImg = $('img', galView);
  let galItems = [], galIndex = 0, galLast = null;
  const showPhoto = i => {
    galIndex = (i + galItems.length) % galItems.length;
    galImg.src = `${galItems[galIndex]}.jpg`;
    $('.gal__count').textContent = `${String(galIndex + 1).padStart(2, '0')} / ${String(galItems.length).padStart(2, '0')}`;
    galView.classList.add('is-open');
    galView.setAttribute('aria-hidden', 'false');
  };
  const hidePhoto = () => { galView.classList.remove('is-open'); galView.setAttribute('aria-hidden', 'true'); };
  const openGal = key => {
    const g = galleries[key];
    if (!g) return;
    galLast = document.activeElement;
    galItems = g.items;
    $('.gal__title').textContent = g.title;
    $('.gal__meta').textContent = `${g.meta} · ${g.items.length} photo${g.items.length > 1 ? 's' : ''}`;
    galGrid.innerHTML = g.items.map((f, i) => `<button type="button" data-i="${i}" aria-label="Agrandir la photo ${i + 1}"><img src="${f}.jpg" alt="${g.title}, photo ${i + 1}" loading="lazy" decoding="async"></button>`).join('');
    $$('img', galGrid).forEach(img => { const on = () => img.classList.add('is-in'); img.complete ? on() : img.addEventListener('load', on, { once: true }); });
    hidePhoto();
    gal.scrollTop = 0;
    gal.classList.add('is-open');
    gal.setAttribute('aria-hidden', 'false');
    lenis.stop();
    setOverlay(true);
    $('.gal__close').focus({ preventScroll: true });
  };
  const closeGal = () => {
    if (!gal.classList.contains('is-open')) return;
    hidePhoto();
    gal.classList.remove('is-open');
    gal.setAttribute('aria-hidden', 'true');
    lenis.start();
    setOverlay(false);
    if (galLast) galLast.focus({ preventScroll: true });
  };
  galGrid.addEventListener('click', e => { const b = e.target.closest('button'); if (b) showPhoto(+b.dataset.i); });
  $('.gal__close').addEventListener('click', closeGal);
  $('.gal__back').addEventListener('click', hidePhoto);
  $('.gal__nav--prev').addEventListener('click', () => showPhoto(galIndex - 1));
  $('.gal__nav--next').addEventListener('click', () => showPhoto(galIndex + 1));
  galView.addEventListener('click', e => { if (e.target === galView) hidePhoto(); });
  let gx = 0;
  galView.addEventListener('touchstart', e => { gx = e.touches[0].clientX; }, { passive: true });
  galView.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - gx; if (Math.abs(dx) > 50) showPhoto(galIndex + (dx < 0 ? 1 : -1)); });
  addEventListener('keydown', e => {
    if (!gal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { galView.classList.contains('is-open') ? hidePhoto() : closeGal(); }
    if (galView.classList.contains('is-open') && e.key === 'ArrowRight') showPhoto(galIndex + 1);
    if (galView.classList.contains('is-open') && e.key === 'ArrowLeft') showPhoto(galIndex - 1);
  });
  $$('[data-gal]').forEach(el => {
    el.addEventListener('click', () => openGal(el.dataset.gal));
    if (el.tagName === 'LI') el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGal(el.dataset.gal); } });
  });
  gsap.from('.tour__goal', { y: 50, opacity: 0, duration: 1.2, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.tour__about', start: 'top 80%' } });
  gsap.from('.session', { y: 70, opacity: 0, duration: 1.3, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.sessions__list', start: 'top 85%' } });

  const apply = $('.apply');
  apply.addEventListener('submit', e => {
    e.preventDefault();
    const f = apply.elements;
    const need = [f.prenom, f.nom, f.email];
    need.forEach(i => i.classList.toggle('is-bad', !i.checkValidity() || !i.value.trim()));
    const bad = need.find(i => i.classList.contains('is-bad'));
    if (bad) { bad.focus(); return; }
    const role = f.role.value;
    const subject = `Candidature DOY : ${role} · ${f.prenom.value.trim()} ${f.nom.value.trim()}`;
    const body = [
      `Prénom : ${f.prenom.value.trim()}`,
      `Nom : ${f.nom.value.trim()}`,
      `Email : ${f.email.value.trim()}`,
      `Téléphone : ${f.tel.value.trim()}`,
      `Instagram : ${f.insta.value.trim()}`,
      `Je viens pour : ${role}`,
      '',
      'Quelques mots sur moi :',
      ''
    ].join('\n');
    location.href = `mailto:castingdoy@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  $$('input', apply).forEach(i => i.addEventListener('input', () => i.classList.remove('is-bad')));

  const legalBtn = $('.foot__legalbtn');
  legalBtn.addEventListener('click', () => {
    const legal = $('#legal');
    legal.hidden = !legal.hidden;
    legalBtn.setAttribute('aria-expanded', String(!legal.hidden));
    ScrollTrigger.refresh();
    if (!legal.hidden) lenis.scrollTo(legal, { offset: -40, duration: 1.2 });
  });

  if (fine) {
    const cursor = $('.cursor');
    const dot = $('.cursor__dot', cursor);
    const ringEl = $('.cursor__ring', cursor);
    const label = $('.cursor__label', cursor);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; }, { passive: true });
    gsap.ticker.add(() => {
      rx += (mx - rx) * .16; ry += (my - ry) * .16;
      if (Math.abs(mx - rx) < .1 && Math.abs(my - ry) < .1) return;
      ringEl.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    });
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t && !e.target.closest('a, button, input')) { label.textContent = t.dataset.cursor; cursor.classList.add('has-label'); }
      else cursor.classList.remove('has-label');
    });
  }

  const nav = $('.nav');
  let navHidden = false;
  lenis.on('scroll', ({ scroll, direction }) => {
    if (document.body.classList.contains('menu-open')) return;
    const h = direction === 1 && scroll > innerHeight * .5;
    if (h !== navHidden) { navHidden = h; nav.classList.toggle('is-hidden', h); }
  });

  ScrollTrigger.create({ trigger: '.foot', start: 'top 60px', end: 'bottom top', onToggle: st => { nav.classList.toggle('is-light', st.isActive); document.body.classList.toggle('on-light', st.isActive); } });

  const playing = new Set();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      $$('video').forEach(v => { if (!v.paused) { playing.add(v); v.pause(); } });
    } else {
      playing.forEach(v => playSafe(v));
      playing.clear();
    }
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

  const liveIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '100px 0px' });
  $$('.alien, .tour__stat b, .ed:first-child .ed__name').forEach(el => liveIO.observe(el));

  addEventListener('load', () => ScrollTrigger.refresh());
})();
