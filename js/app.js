/* ================================================================
   MotoApp — Main Application Controller
   MotoRiders Community App (Baku, Azerbaijan)
   ================================================================ */

const MotoApp = {
  currentPage: 'map',
  isLoggedIn: false,
  splashTimeout: null,

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    // 1. Show splash
    this.showSplash();

    // 2. Initialize storage & seed demo data
    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.init();
    }

    // 3. Initialize notifications
    if (typeof MotoNotifications !== 'undefined') {
      MotoNotifications.init();
    }

    // 4. Build the bottom nav
    this.buildBottomNav();

    // 5. Build the modal container
    this.buildModalContainer();

    // 6. Check user session
    const hasSession =
      typeof MotoAuth !== 'undefined' && MotoAuth.checkSession();

    if (hasSession) {
      this.isLoggedIn = true;
      this.showMainApp();
      this.initAllModules();
    } else {
      this.showAuth();
      if (typeof MotoAuth !== 'undefined') {
        MotoAuth.init();
      }
    }

    // 7. Hide splash after 2 s
    this.splashTimeout = setTimeout(() => {
      this.hideSplash();
    }, 2000);
  },

  /* ──────────────────────────────────────────────
     SPLASH
  ────────────────────────────────────────────── */
  showSplash() {
    let splash = document.getElementById('splash-screen');
    if (!splash) {
      splash = document.createElement('div');
      splash.id = 'splash-screen';
      splash.innerHTML = `
        <div class="splash-content">
          <div class="splash-logo">🏍️</div>
          <h1 class="splash-title">MotoRiders</h1>
          <p class="splash-subtitle">Bakı Motosiklet İcması</p>
          <div class="splash-loader">
            <div class="splash-loader-bar"></div>
          </div>
        </div>
      `;
      document.body.appendChild(splash);
    }
    splash.classList.add('active');
  },

  hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.classList.remove('active', 'fade-out');
        splash.remove();
      }, 600);
    }
  },

  /* ──────────────────────────────────────────────
     AUTH / MAIN VIEW SWITCHING
  ────────────────────────────────────────────── */
  showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    if (authScreen) authScreen.classList.add('active');
    if (mainApp) mainApp.classList.remove('active');
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.classList.remove('active');
  },

  showMainApp() {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    if (authScreen) authScreen.classList.remove('active');
    if (mainApp) mainApp.classList.add('active');
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.classList.add('active');
    this.isLoggedIn = true;
    this.navigateTo('map');
  },

  /* ──────────────────────────────────────────────
     SPA ROUTING
  ────────────────────────────────────────────── */
  navigateTo(page) {
    /* 'live' is a variant of map that opens the live panel */
    const isLive = page === 'live';
    const actualPage = isLive ? 'map' : page;

    // Hide all pages
    const pages = document.querySelectorAll('.app-page');
    pages.forEach((p) => this.hidePage(p.id));

    // Show target page
    this.showPage(`page-${actualPage}`);
    this.currentPage = actualPage;
    this.updateBottomNav(page);

    // Run per-page hooks
    switch (actualPage) {
      case 'map':
        if (typeof MotoMap !== 'undefined') {
          MotoMap.map && MotoMap.map.invalidateSize();
          if (isLive) {
            MotoMap.showLocationSharePanel();
          }
        }
        break;
      case 'events':
        if (typeof MotoEvents !== 'undefined') MotoEvents.renderEvents();
        break;
      case 'alerts':
        if (typeof MotoAlerts !== 'undefined') MotoAlerts.renderAlerts();
        break;
      case 'friends':
        if (typeof MotoFriends !== 'undefined') MotoFriends.renderFriendsList();
        break;
      case 'profile':
        if (typeof MotoProfile !== 'undefined') MotoProfile.render();
        break;
    }
  },

  updateBottomNav(page) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach((item) => {
      if (item.dataset.page === page) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  showPage(pageId) {
    const el = document.getElementById(pageId);
    if (el) {
      el.classList.add('active');
      el.style.display = '';
    }
  },

  hidePage(pageId) {
    const el = document.getElementById(pageId);
    if (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    }
  },

  /* ──────────────────────────────────────────────
     BOTTOM NAV (built at runtime)
  ────────────────────────────────────────────── */
  buildBottomNav() {
    let nav = document.getElementById('bottom-nav');
    if (nav) return; // already exists

    nav = document.createElement('nav');
    nav.id = 'bottom-nav';
    nav.className = 'bottom-nav';

    const items = [
      { page: 'map', icon: '🗺️', label: 'Xəritə' },
      { page: 'live', icon: '📍', label: 'Canlı' },
      { page: 'events', icon: '🏍️', label: 'Tədbirlər' },
      { page: 'alerts', icon: '⚠️', label: 'Xəbərdarlıq' },
      { page: 'profile', icon: '👤', label: 'Profil' },
    ];

    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.page = item.page;
      btn.innerHTML = `
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      `;
      btn.addEventListener('click', () => {
        this.navigateTo(item.page);
      });
      nav.appendChild(btn);
    });

    document.body.appendChild(nav);
  },

  /* ──────────────────────────────────────────────
     MODAL SYSTEM
  ────────────────────────────────────────────── */
  buildModalContainer() {
    if (document.getElementById('app-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title"></h3>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // Close button
    document
      .getElementById('modal-close-btn')
      .addEventListener('click', () => this.closeModal());

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal(contentHtml, title) {
    const modal = document.getElementById('app-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody) return;

    modalTitle.textContent = title || '';
    modalBody.innerHTML = contentHtml;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
      const container = modal.querySelector('.modal-container');
      if (container) container.classList.add('show');
    });
  },

  closeModal() {
    const modal = document.getElementById('app-modal');
    if (!modal) return;
    const container = modal.querySelector('.modal-container');
    if (container) container.classList.remove('show');
    setTimeout(() => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }, 300);
  },

  /* ──────────────────────────────────────────────
     MODULE INITIALIZATION
  ────────────────────────────────────────────── */
  initAllModules() {
    if (typeof MotoMap !== 'undefined') MotoMap.init();
    if (typeof MotoEvents !== 'undefined') MotoEvents.init();
    if (typeof MotoAlerts !== 'undefined') MotoAlerts.init();
    if (typeof MotoFriends !== 'undefined') MotoFriends.init();
  },

  /* ──────────────────────────────────────────────
     GLOBAL REFRESH
  ────────────────────────────────────────────── */
  refreshAll() {
    if (typeof MotoMap !== 'undefined') {
      MotoMap.loadActiveLocations();
      MotoMap.loadAlerts();
      MotoMap.loadEvents();
    }
    if (typeof MotoEvents !== 'undefined') MotoEvents.renderEvents();
    if (typeof MotoAlerts !== 'undefined') MotoAlerts.renderAlerts();
    if (typeof MotoFriends !== 'undefined') MotoFriends.renderFriendsList();
  },

  /* ──────────────────────────────────────────────
     LOGIN CALLBACK (called by MotoAuth on success)
  ────────────────────────────────────────────── */
  onLogin() {
    this.isLoggedIn = true;
    this.showMainApp();
    this.initAllModules();
  },

  onLogout() {
    this.isLoggedIn = false;
    if (typeof MotoMap !== 'undefined') {
      MotoMap.stopWatching();
      MotoMap.stopRiding();
    }
    this.showAuth();
    if (typeof MotoAuth !== 'undefined') MotoAuth.init();
  },

  /* ──────────────────────────────────────────────
     TOAST NOTIFICATIONS (light helper)
  ────────────────────────────────────────────── */
  showToast(message, type) {
    // type = 'success' | 'error' | 'warning' | 'info'
    type = type || 'info';
    const colors = {
      success: '#22c55e',
      error: '#ff3333',
      warning: '#ffaa00',
      info: '#3b82f6',
    };
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.style.setProperty('--toast-color', colors[type] || colors.info);
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  },
};

/* ════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => MotoApp.init());
