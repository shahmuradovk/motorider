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
    console.log('🏍️ MotoApp: Başladılır...');

    // 1. Initialize storage & seed demo data
    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.init();
      console.log('✅ MotoStorage hazır');
    }

    // 2. Initialize API layer
    if (typeof MotoAPI !== 'undefined') {
      MotoAPI.init();
      console.log('✅ MotoAPI hazır');
    }

    // 3. Initialize notifications
    if (typeof MotoNotifications !== 'undefined') {
      MotoNotifications.init();
      console.log('✅ MotoNotifications hazır');
    }

    // 4. Setup bottom nav clicks
    this.setupBottomNav();

    // 5. Setup modal
    this.setupModal();

    // 6. Setup header buttons
    this.setupHeader();

    // 7. Check user session
    const hasSession = typeof MotoAuth !== 'undefined' && MotoAuth.checkSession();

    if (hasSession) {
      console.log('✅ Session tapıldı, əsas tətbiq göstərilir');
      this.isLoggedIn = true;
      this.showMainApp();
      this.initAllModules();
    } else {
      console.log('ℹ️ Session yoxdur, giriş forması göstərilir');
      this.showAuth();
      if (typeof MotoAuth !== 'undefined') {
        MotoAuth.init();
      }
    }

    // 8. Hide splash after 2s
    setTimeout(() => {
      this.hideSplash();
    }, 2000);

    console.log('🏍️ MotoApp: Hazırdır!');
  },

  /* ──────────────────────────────────────────────
     SPLASH
  ────────────────────────────────────────────── */
  hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 700);
    }
  },

  /* ──────────────────────────────────────────────
     AUTH / MAIN VIEW SWITCHING
  ────────────────────────────────────────────── */
  showAuth() {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const bottomNav = document.querySelector('.bottom-nav');

    if (authContainer) {
      authContainer.classList.remove('hidden');
      authContainer.style.display = '';
    }
    if (mainApp) {
      mainApp.classList.add('hidden');
      mainApp.style.display = 'none';
    }
    if (bottomNav) {
      bottomNav.style.display = 'none';
    }
    console.log('📋 Auth ekranı göstərildi');
  },

  showMainApp() {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const bottomNav = document.querySelector('.bottom-nav');

    if (authContainer) {
      authContainer.classList.add('hidden');
      authContainer.style.display = 'none';
    }
    if (mainApp) {
      mainApp.classList.remove('hidden');
      mainApp.style.display = '';
    }
    if (bottomNav) {
      bottomNav.style.display = '';
    }

    this.isLoggedIn = true;
    this.updateProfile();
    this.navigateTo('map');
    console.log('🗺️ Əsas tətbiq göstərildi');
  },

  /* ──────────────────────────────────────────────
     PROFILE UPDATE
  ────────────────────────────────────────────── */
  updateProfile() {
    const user = typeof MotoStorage !== 'undefined' ? MotoStorage.getCurrentUser() : null;
    if (!user) return;

    // Header avatar
    const headerInitials = document.getElementById('header-avatar-initials');
    const headerAvatar = document.getElementById('header-avatar');
    if (headerInitials) {
      const initials = (user.firstName || user.first_name || '').charAt(0) + (user.lastName || user.last_name || '').charAt(0);
      headerInitials.textContent = initials.toUpperCase();
    }
    if (headerAvatar) {
      headerAvatar.style.background = user.avatarColor || user.avatar_color || 'var(--gradient-primary)';
    }

    // Profile page
    const profileName = document.getElementById('profile-name');
    const profileBikeText = document.getElementById('profile-bike-text');
    const profileEmail = document.getElementById('profile-email');
    const profileInitials = document.getElementById('profile-avatar-initials');
    const profileAvatar = document.getElementById('profile-avatar');

    if (profileName) {
      profileName.textContent = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`;
    }
    if (profileBikeText) {
      profileBikeText.textContent = `${user.motoBrand || user.moto_brand || ''} ${user.motoModel || user.moto_model || ''} ${user.motoCc || user.moto_cc || ''}cc`;
    }
    if (profileEmail) {
      profileEmail.textContent = user.email || '';
    }
    if (profileInitials) {
      const initials = (user.firstName || user.first_name || '').charAt(0) + (user.lastName || user.last_name || '').charAt(0);
      profileInitials.textContent = initials.toUpperCase();
    }
    if (profileAvatar) {
      profileAvatar.style.background = user.avatarColor || user.avatar_color || 'var(--gradient-primary)';
    }

    // Stats
    const statRides = document.getElementById('stat-rides');
    const statKm = document.getElementById('stat-km');
    const statEvents = document.getElementById('stat-events');
    const statFriends = document.getElementById('stat-friends');

    if (statRides) statRides.textContent = user.totalRides || user.total_rides || 0;
    if (statKm) statKm.textContent = Math.round(user.totalKm || user.total_km || 0);
    if (statEvents) {
      const events = typeof MotoStorage !== 'undefined' ? MotoStorage.getEvents() : [];
      const myEvents = events.filter(e => e.creatorId === user.id || (e.participants && e.participants.includes(user.id)));
      statEvents.textContent = myEvents.length;
    }
    if (statFriends) {
      const friends = typeof MotoStorage !== 'undefined' ? MotoStorage.getFriends(user.id) : [];
      statFriends.textContent = friends.length;
    }
  },

  /* ──────────────────────────────────────────────
     SPA ROUTING
  ────────────────────────────────────────────── */
  navigateTo(page) {
    const isLive = page === 'live';
    const actualPage = isLive ? 'map' : page;

    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // Show target page
    const targetPage = document.getElementById(`page-${actualPage}`);
    if (targetPage) {
      targetPage.classList.add('active');
      targetPage.style.display = '';
    }

    this.currentPage = actualPage;
    this.updateBottomNav(page);

    // Run per-page hooks
    switch (actualPage) {
      case 'map':
        if (typeof MotoMap !== 'undefined') {
          if (MotoMap.map) {
            setTimeout(() => MotoMap.map.invalidateSize(), 100);
          }
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
        if (typeof MotoFriends !== 'undefined') MotoFriendsList ? MotoFriends.renderFriendsList() : null;
        break;
      case 'profile':
        this.updateProfile();
        break;
    }
  },

  updateBottomNav(page) {
    const items = document.querySelectorAll('.bottom-nav .nav-item');
    items.forEach(item => {
      if (item.dataset.page === page || (page === 'live' && item.dataset.page === 'map')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  /* ──────────────────────────────────────────────
     SETUP BOTTOM NAV
  ────────────────────────────────────────────── */
  setupBottomNav() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) this.navigateTo(page);
      });
    });
  },

  /* ──────────────────────────────────────────────
     SETUP HEADER
  ────────────────────────────────────────────── */
  setupHeader() {
    // Profile button -> navigate to profile
    const profileBtn = document.getElementById('header-profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.navigateTo('profile'));
    }

    // Notification button
    const notifBtn = document.getElementById('notification-btn');
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
          notifDropdown.classList.add('hidden');
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof MotoAuth !== 'undefined') {
          MotoAuth.logout();
        } else {
          MotoStorage.logout();
          this.onLogout();
        }
      });
    }
  },

  /* ──────────────────────────────────────────────
     SETUP MODAL
  ────────────────────────────────────────────── */
  setupModal() {
    const modalOverlay = document.getElementById('modal-container');
    const modalClose = document.getElementById('modal-close-btn');

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeModal();
      });
    }
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal(contentHtml, title) {
    const modal = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody) return;

    if (modalTitle) modalTitle.textContent = title || '';
    modalBody.innerHTML = contentHtml;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('modal-container');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  /* ──────────────────────────────────────────────
     MODULE INITIALIZATION
  ────────────────────────────────────────────── */
  initAllModules() {
    if (typeof MotoMap !== 'undefined') MotoMap.init();
    if (typeof MotoEvents !== 'undefined') MotoEvents.init();
    if (typeof MotoAlerts !== 'undefined') MotoAlerts.init();
    if (typeof MotoFriends !== 'undefined') MotoFriends.init();
    console.log('✅ Bütün modullar hazır');
  },

  /* ──────────────────────────────────────────────
     GLOBAL REFRESH
  ────────────────────────────────────────────── */
  refreshAll() {
    if (typeof MotoMap !== 'undefined') {
      MotoMap.loadActiveLocations();
      MotoMap.loadAlerts();
    }
    if (typeof MotoEvents !== 'undefined') MotoEvents.renderEvents();
    if (typeof MotoAlerts !== 'undefined') MotoAlerts.renderAlerts();
    if (typeof MotoFriends !== 'undefined') MotoFriends.renderFriendsList();
  },

  /* ──────────────────────────────────────────────
     LOGIN / LOGOUT CALLBACKS
  ────────────────────────────────────────────── */
  onLogin() {
    this.isLoggedIn = true;
    this.showMainApp();
    this.initAllModules();
  },

  onLogout() {
    this.isLoggedIn = false;
    if (typeof MotoMap !== 'undefined' && MotoMap.stopWatching) {
      MotoMap.stopWatching();
    }
    this.showAuth();
    if (typeof MotoAuth !== 'undefined') MotoAuth.init();
  },

  /* ──────────────────────────────────────────────
     TOAST HELPER
  ────────────────────────────────────────────── */
  showToast(message, type) {
    if (typeof MotoNotifications !== 'undefined') {
      MotoNotifications.show(message, type || 'info');
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
};

/* ════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => MotoApp.init());
