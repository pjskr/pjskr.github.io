/* ================================================
   pj.skr — Script
   anime.js animations, tab switching,
   cherry blossom canvas, dark/light toggle,
   GitHub API fetching for devices & stats
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // -------- LENIS SMOOTH SCROLL --------
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // -------- CONSTANTS --------
  const DEVICES_ORG = 'pjskr-Devices';
  const MAIN_ORG = 'pjskr';
  const GH_API = 'https://api.github.com';

  // -------- THEME TOGGLE --------
  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('pjskr-theme');
  if (stored) html.setAttribute('data-theme', stored);

  toggleBtn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('pjskr-theme', next);
  });

  // -------- TAB SWITCHING --------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  function switchTab(id) {
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id);
      b.setAttribute('aria-selected', b.dataset.tab === id);
    });
    panels.forEach(p => {
      const isActive = p.id === `panel-${id}`;
      p.classList.toggle('active', isActive);
      if (isActive) animateCards(p);
    });
    // Scroll to top of content
    window.scrollTo({ top: document.querySelector('.main-content').offsetTop - 80, behavior: 'smooth' });
  }

  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // data-goto links (buttons & footer)
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      switchTab(el.dataset.goto);
    });
  });

  // -------- HERO ENTRANCE (anime.js) --------
  const heroTL = anime.timeline({ easing: 'easeOutExpo' });

  heroTL
    .add({ targets: '.line-1', opacity: [0, 1], translateY: [40, 0], duration: 900 })
    .add({ targets: '.line-2', opacity: [0, 1], translateY: [40, 0], duration: 900 }, '-=600')
    .add({ targets: '.hero-sub', opacity: [0, 1], translateY: [20, 0], duration: 800 }, '-=500')
    .add({ targets: '.hero-actions', opacity: [0, 1], translateY: [20, 0], duration: 800 }, '-=500')
    .add({ targets: '.hero-stats', opacity: [0, 1], translateY: [20, 0], duration: 800 }, '-=500');

  // Logo float
  anime({
    targets: '#logo .logo-icon',
    translateY: [-3, 3],
    duration: 2200,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  // -------- CARD ENTRANCE ANIMATIONS --------
  function animateCards(container) {
    const cards = container.querySelectorAll('[data-anim="card"], [data-anim="step"]');
    if (!cards.length) return;
    anime({
      targets: cards,
      opacity: [0, 1],
      translateY: [24, 0],
      translateX: el => el.dataset.anim === 'step' ? [-20, 0] : [0, 0],
      delay: anime.stagger(80),
      duration: 650,
      easing: 'easeOutCubic'
    });
  }

  // Initial panel
  animateCards(document.querySelector('.tab-panel.active'));

  // -------- ANIMATE STAT NUMBER --------
  function animateStat(el, value) {
    el.dataset.count = value;
    anime({
      targets: el,
      innerHTML: [0, value],
      round: 1,
      duration: 1600,
      easing: 'easeOutExpo',
      update: () => { el.textContent = Math.round(+el.innerHTML); }
    });
  }

  // -------- GITHUB API: FETCH DEVICES --------
  async function fetchAllPages(url) {
    let results = [];
    let page = 1;
    while (true) {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}per_page=100&page=${page}`);
      if (!res.ok) break;
      const data = await res.json();
      if (!data.length) break;
      results = results.concat(data);
      if (data.length < 100) break;
      page++;
    }
    return results;
  }

  async function loadDevices() {
    const grid = document.getElementById('device-grid');
    const loading = document.getElementById('devices-loading');
    const empty = document.getElementById('devices-empty');

    // Fetch device list from pjskr/enu repo
    const DEVICE_JSON_URL = 'https://raw.githubusercontent.com/pjskr/enu/main/spdevice.json';

    try {
      const res = await fetch(DEVICE_JSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const devices = await res.json();

      // Update device stat
      animateStat(document.getElementById('stat-devices'), devices.length);

      if (loading) loading.remove();

      if (devices.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }

      devices.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.dataset.anim = 'card';

        const statusClass = device.status === 'official' ? 'badge-official' : 'badge-community';
        const statusLabel = device.status === 'official' ? 'Official' : 'Community';

        card.innerHTML = `
          <div class="device-brand">${device.brand || ''}</div>
          <h3>${device.name || device.codename}</h3>
          <span class="device-codename">${device.codename}</span>
          <span class="badge ${statusClass}">${statusLabel}</span>
          <div class="device-meta">
            ${device.maintainer ? `<span class="device-stars">👤 ${device.maintainer}</span>` : ''}
            ${device.download ? `<a href="${device.download}" target="_blank" rel="noopener" class="device-link">Download →</a>` : ''}
          </div>
        `;

        grid.appendChild(card);
      });

      // Animate if panel is currently visible
      if (document.getElementById('panel-devices').classList.contains('active')) {
        animateCards(document.getElementById('panel-devices'));
      }

    } catch (err) {
      console.error('Failed to fetch devices:', err);
      if (loading) loading.innerHTML = '<p>Failed to load devices. Check back later.</p>';
    }
  }

  // -------- GITHUB API: FETCH ORG STATS --------
  async function loadOrgStats() {
    try {
      // Fetch repos from main org
      const mainRepos = await fetchAllPages(`${GH_API}/orgs/${MAIN_ORG}/repos`);
      const deviceRepos = await fetchAllPages(`${GH_API}/orgs/${DEVICES_ORG}/repos`);

      const allRepos = [...mainRepos, ...deviceRepos];
      const totalRepos = allRepos.length;
      const totalStars = allRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);

      animateStat(document.getElementById('stat-repos'), totalRepos);
      animateStat(document.getElementById('stat-stars'), totalStars);

    } catch (err) {
      console.error('Failed to fetch org stats:', err);
      // Fallback — show dashes
      document.getElementById('stat-repos').textContent = '—';
      document.getElementById('stat-stars').textContent = '—';
    }
  }

  // Fire API calls
  loadDevices();
  loadOrgStats();

  // -------- CHERRY BLOSSOM CANVAS --------
  const canvas = document.getElementById('sakura-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Petal {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : -20;
      this.size = 8 + Math.random() * 10;
      this.speedY = 0.6 + Math.random() * 1.2;
      this.speedX = -0.3 + Math.random() * 0.6;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.opacity = 0.25 + Math.random() * 0.45;
      this.swingAmp = 30 + Math.random() * 40;
      this.swingFreq = 0.008 + Math.random() * 0.012;
      this.t = Math.random() * 1000;
      this.hue = 330 + Math.random() * 20;
      this.sat = 70 + Math.random() * 30;
      this.light = 70 + Math.random() * 20;
    }

    update() {
      this.t++;
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.t * this.swingFreq) * 0.5;
      this.rotation += this.rotSpeed;
      if (this.y > H + 20 || this.x < -30 || this.x > W + 30) this.reset();
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;

      ctx.beginPath();
      ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        this.size * 0.4, -this.size * 0.5,
        this.size, -this.size * 0.3,
        this.size * 0.5, this.size * 0.1
      );
      ctx.bezierCurveTo(
        this.size * 0.3, this.size * 0.5,
        -this.size * 0.1, this.size * 0.3,
        0, 0
      );
      ctx.fill();
      ctx.restore();
    }
  }

  const PETAL_COUNT = 35;
  const petals = Array.from({ length: PETAL_COUNT }, () => new Petal());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();

});
