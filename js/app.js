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

    // ALWAYS hide splash after 2s, even if errors occur
    setTimeout(() => this.hideSplash(), 2000);

    try {
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

      console.log('🏍️ MotoApp: Hazırdır!');
    } catch (err) {
      console.error('❌ MotoApp init xətası:', err);
      // Still show auth if something crashes
      this.showAuth();
    }
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
      const initials = (user.firstName || '').charAt(0) + (user.lastName || '').charAt(0);
      headerInitials.textContent = initials.toUpperCase();
    }
    if (headerAvatar) {
      headerAvatar.style.background = user.avatarColor || 'var(--gradient-primary)';
    }

    // Profile hero
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    el('profile-name', `${user.firstName || ''} ${user.lastName || ''}`);
    el('profile-bike-text', `${user.motoBrand || ''} ${user.motoModel || ''} ${user.motoCC || user.motoCc || ''}cc`);
    el('profile-email', user.email || '');
    el('profile-bio', user.bio || '');

    const profileInitials = document.getElementById('profile-avatar-initials');
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileInitials) {
      profileInitials.textContent = ((user.firstName || '').charAt(0) + (user.lastName || '').charAt(0)).toUpperCase();
    }
    if (profileAvatar) {
      profileAvatar.style.background = user.avatarColor || 'var(--gradient-primary)';
    }

    // Motorcycle card
    el('profile-moto-name', `${user.motoBrand || '—'} ${user.motoModel || ''}`);
    el('profile-moto-cc', user.motoCC || user.motoCc ? `${user.motoCC || user.motoCc}cc` : '—');

    const motoDetail = document.getElementById('profile-moto-detail');
    if (motoDetail) {
      const joined = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' }) : '—';
      motoDetail.textContent = `Üzv: ${joined}`;
    }

    // Stats
    const statRides = document.getElementById('stat-rides');
    const statKm = document.getElementById('stat-km');
    const statEvents = document.getElementById('stat-events');
    const statFriends = document.getElementById('stat-friends');

    if (statRides) statRides.textContent = user.totalRides || 0;
    if (statKm) statKm.textContent = Math.round(user.totalKm || 0);
    if (statEvents) {
      const events = typeof MotoStorage !== 'undefined' ? MotoStorage.getEvents() : [];
      const myEvents = events.filter(e => e.creatorId === user.id || (e.participants && e.participants.includes(user.id)));
      statEvents.textContent = myEvents.length;
    }
    if (statFriends) {
      const friends = typeof MotoStorage !== 'undefined' ? MotoStorage.getFriends(user.id) : [];
      statFriends.textContent = friends.length;
    }

    // Achievements
    this.renderAchievements(user);

    // Ride History
    this.renderRideHistory(user);

    // Admin entry
    const adminSection = document.getElementById('admin-entry-section');
    if (adminSection) {
      const isAdmin = user.role === 'admin' || (user.email && user.email.toLowerCase() === 'shahmuradovk@gmail.com');
      adminSection.classList.toggle('hidden', !isAdmin);
    }

    // Profile edit button
    this.setupProfileEdit(user);

    // Admin entry button
    const adminBtn = document.getElementById('admin-entry-btn');
    if (adminBtn && !adminBtn._bound) {
      adminBtn.addEventListener('click', () => this.navigateTo('admin'));
      adminBtn._bound = true;
    }
  },

  renderAchievements(user) {
    const container = document.getElementById('profile-badges');
    if (!container) return;

    const friends = typeof MotoStorage !== 'undefined' ? MotoStorage.getFriends(user.id) : [];
    const events = typeof MotoStorage !== 'undefined' ? MotoStorage.getEvents() : [];
    const myEvents = events.filter(e => e.creatorId === user.id || (e.participants && e.participants.includes(user.id)));
    const monthsSinceJoin = user.joinedAt ? Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;

    const badges = [
      { emoji: '🏁', name: 'İlk Sürüş', earned: (user.totalRides || 0) >= 1 },
      { emoji: '🗺️', name: 'Yol Kəşfçisi', earned: (user.totalKm || 0) >= 100 },
      { emoji: '🏆', name: 'Maraton', earned: (user.totalKm || 0) >= 1000 },
      { emoji: '🦋', name: 'Sosial', earned: friends.length >= 5 },
      { emoji: '🎪', name: 'Tədbir Ustası', earned: myEvents.length >= 5 },
      { emoji: '⭐', name: 'Veteran', earned: monthsSinceJoin >= 6 }
    ];

    container.innerHTML = badges.map(b =>
      `<div class="p-badge ${b.earned ? 'earned' : 'locked'}"><span class="p-badge-emoji">${b.emoji}</span>${b.name}</div>`
    ).join('');
  },

  renderRideHistory(user) {
    const container = document.getElementById('ride-history-list');
    if (!container) return;

    const rides = user.rideHistory || [];
    if (!rides.length) {
      container.innerHTML = '<div class="p-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><p>Hələ sürüş tarixçəniz yoxdur</p></div>';
      return;
    }

    container.innerHTML = rides.slice(0, 5).map(r =>
      `<div class="p-ride-item">
        <div class="p-ride-dot"></div>
        <div class="p-ride-info">
          <div class="p-ride-route">${r.route || '—'}</div>
          <div class="p-ride-meta">${r.date || '—'} • ${r.duration || 0} dəq</div>
        </div>
        <div class="p-ride-km">${r.distance || 0} km</div>
      </div>`
    ).join('');
  },

  setupProfileEdit(user) {
    const editBtn = document.getElementById('profile-edit-btn');
    if (!editBtn || editBtn._bound) return;
    editBtn._bound = true;

    editBtn.addEventListener('click', () => {
      const html = `
        <div class="p-edit-form">
          <div class="p-edit-row">
            <div class="p-edit-group"><label class="p-edit-label">Ad</label><input class="p-edit-input" id="edit-firstname" value="${user.firstName || ''}"></div>
            <div class="p-edit-group"><label class="p-edit-label">Soyad</label><input class="p-edit-input" id="edit-lastname" value="${user.lastName || ''}"></div>
          </div>
          <div class="p-edit-group"><label class="p-edit-label">Bio</label><input class="p-edit-input" id="edit-bio" value="${user.bio || ''}" placeholder="Özün haqqında bir az yaz..."></div>
          <div class="p-edit-group"><label class="p-edit-label">Telefon</label><input class="p-edit-input" id="edit-phone" value="${user.phone || ''}"></div>
          <div class="p-edit-row">
            <div class="p-edit-group"><label class="p-edit-label">Moto Markası</label><input class="p-edit-input" id="edit-brand" value="${user.motoBrand || ''}"></div>
            <div class="p-edit-group"><label class="p-edit-label">Model</label><input class="p-edit-input" id="edit-model" value="${user.motoModel || ''}"></div>
          </div>
          <div class="p-edit-group"><label class="p-edit-label">Kubatur (CC)</label><input class="p-edit-input" id="edit-cc" type="number" value="${user.motoCC || user.motoCc || ''}"></div>
          <button class="p-edit-save" id="edit-save-btn">Yadda Saxla</button>
        </div>
      `;

      this.openModal(html, 'Profili Redaktə et');

      setTimeout(() => {
        const saveBtn = document.getElementById('edit-save-btn');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const updates = {
              firstName: document.getElementById('edit-firstname').value.trim(),
              lastName: document.getElementById('edit-lastname').value.trim(),
              bio: document.getElementById('edit-bio').value.trim(),
              phone: document.getElementById('edit-phone').value.trim(),
              motoBrand: document.getElementById('edit-brand').value.trim(),
              motoModel: document.getElementById('edit-model').value.trim(),
              motoCC: parseInt(document.getElementById('edit-cc').value) || 0
            };

            MotoStorage.updateUser(user.id, updates);
            if (typeof MotoNotifications !== 'undefined') MotoNotifications.show('Profil yeniləndi! ✅', 'success');
            this.closeModal();
            this.updateProfile();
          });
        }
      }, 100);
    });
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

    // Show/hide bottom nav (hidden for admin page)
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav && actualPage !== 'admin') {
      bottomNav.style.display = '';
    }

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
        if (typeof MotoFriends !== 'undefined') MotoFriends.renderFriendsList();
        break;
      case 'profile':
        this.updateProfile();
        break;
      case 'admin':
        if (typeof MotoAdmin !== 'undefined' && MotoAdmin.isAdmin()) {
          MotoAdmin.init();
          // Hide bottom nav on admin page
          const bottomNav = document.querySelector('.bottom-nav');
          if (bottomNav) bottomNav.style.display = 'none';
        } else {
          this.navigateTo('profile');
          return;
        }
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
