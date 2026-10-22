/* ==========================================================================
   Samsul Hutha — Portfolio · interactions (vanilla JS, no dependencies)
   ========================================================================== */
(() => {
  'use strict';

  window.clearTimeout(window.__jsFallback);

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const raf = window.requestAnimationFrame.bind(window);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle (remembers the choice) ---------- */
  const themeBtn = $('.theme-toggle');
  const syncThemeButton = () => {
    if (!themeBtn) return;
    const dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  };
  syncThemeButton();
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('sh-theme', next); } catch (e) { /* storage unavailable */ }
      syncThemeButton();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  /* ---------- Header state + back-to-top progress ring ---------- */
  const header = $('.site-header');
  const toTop = $('.to-top');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) {
      const max = root.scrollHeight - window.innerHeight;
      toTop.style.setProperty('--p', max > 0 ? Math.min(100, (y / max) * 100).toFixed(1) : '0');
      toTop.classList.toggle('is-visible', y > 600);
    }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-toggle');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.toggleAttribute('inert', !open);
    document.body.classList.toggle('menu-open', open);
  };
  if (menuBtn && menu) {
    setMenu(false);
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealEls.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------- Home: work section tint + jump navigation ---------- */
  const work = $('[data-work]');
  if (work) {
    const projects = $$('.project', work);
    const jumps = $$('.work-jump a');
    let current = '';
    const setActive = (id) => {
      if (!id || id === current) return;
      current = id;
      work.dataset.active = id;
      jumps.forEach((a) => {
        const on = a.getAttribute('href') === '#project-' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    // The project nearest the middle of the viewport is the active one.
    const pickActive = () => {
      const mid = window.innerHeight / 2;
      let best = null, bestDist = Infinity;
      projects.forEach((p) => {
        const r = p.getBoundingClientRect();
        const dist = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (dist < bestDist) { bestDist = dist; best = p; }
      });
      if (best) setActive(best.dataset.project);
    };
    window.addEventListener('scroll', () => raf(pickActive), { passive: true });
    window.addEventListener('resize', pickActive);
    pickActive();
  }

  /* ---------- Case study: table of contents scroll-spy + progress ---------- */
  const toc = $('[data-toc]');
  if (toc && 'IntersectionObserver' in window) {
    const links = $$('a[href^="#"]', toc);
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const chapters = Array.from(byId.keys()).map((id) => document.getElementById(id)).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        const active = byId.get(en.target.id);
        if (active) { active.classList.add('is-active'); active.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-28% 0px -62% 0px' });
    chapters.forEach((c) => spy.observe(c));

    const story = $('[data-story]');
    const bar = $('.toc-progress i', toc);
    if (story && bar) {
      const update = () => {
        const rect = story.getBoundingClientRect();
        const total = rect.height - window.innerHeight * 0.4;
        const done = window.innerHeight * 0.35 - rect.top;
        bar.style.width = (total > 0 ? Math.min(Math.max(done / total, 0), 1) * 100 : 0).toFixed(1) + '%';
      };
      window.addEventListener('scroll', () => raf(update), { passive: true });
      window.addEventListener('resize', update);
      update();
    }
  }

  /* ---------- Lightbox for UI screens ---------- */
  const zoomables = $$('img[data-zoom]');
  if (zoomables.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image preview');
    box.innerHTML = '<button type="button" aria-label="Close preview">&times;</button><img alt="" hidden><p></p>';
    document.body.appendChild(box);
    const big = $('img', box);
    const cap = $('p', box);
    const closeBtn = $('button', box);
    let lastFocus = null;

    const open = (img) => {
      lastFocus = img;
      big.src = img.currentSrc || img.src;
      big.hidden = false;
      big.alt = img.alt;
      const fig = img.closest('figure');
      const text = fig && (fig.querySelector('figcaption span') || fig.querySelector('figcaption'));
      cap.textContent = text ? text.textContent.replace(/\s+/g, ' ').trim() : img.alt;
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };
    const close = () => {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    zoomables.forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'View larger: ' + img.alt);
      img.addEventListener('click', () => open(img));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
    box.addEventListener('click', (e) => { if (e.target !== big) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ---------- Hero: soft, flowing contour lines ---------- */
  const canvas = $('.hero-contours');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const rings = 20;
    const colors = { line: '#c4c1b7', accent: '#e0502e' };
    let w = 0, h = 0, t = 0, running = false, visible = true;
    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;

    const readColors = () => {
      const s = getComputedStyle(root);
      colors.line = s.getPropertyValue('--line-strong').trim() || colors.line;
      colors.accent = s.getPropertyValue('--accent').trim() || colors.accent;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * (0.74 + (mx - 0.5) * 0.05);
      const cy = h * (0.46 + (my - 0.5) * 0.06);
      const maxR = Math.max(w, h) * 0.6;
      for (let i = 1; i <= rings; i++) {
        const base = (i / rings) * maxR;
        const accent = i % 7 === 0;
        ctx.beginPath();
        const steps = 140;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const n = Math.sin(a * 3 + t * 0.00035 + i * 0.32) * 0.045
                  + Math.sin(a * 5 - t * 0.0005 + i * 0.5) * 0.028
                  + Math.sin(a * 2 + t * 0.0002) * 0.06;
          const r = base * (1 + n * (0.55 + i / rings));
          const x = cx + Math.cos(a) * r * 1.25;
          const y = cy + Math.sin(a) * r * 0.85;
          if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.globalAlpha = accent ? 0.6 : 0.42;
        ctx.strokeStyle = accent ? colors.accent : colors.line;
        ctx.lineWidth = accent ? 1.3 : 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const loop = (now) => {
      t = now;
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      draw();
      if (running) raf(loop);
    };
    const start = () => { if (!running && !reduceMotion && visible && !document.hidden) { running = true; raf(loop); } };
    const stop = () => { running = false; };

    readColors();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('themechange', () => { readColors(); draw(); });
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    }
    start();
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
