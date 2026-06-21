/* ═══════════════════════════════════════════════════════════
   MotoAdmin — Admin Panel Controller
   MotoRiders Community App
   ═══════════════════════════════════════════════════════════ */

const MotoAdmin = {
  currentTab: 'users',
  _initialized: false,

  init() {
    // Prevent double-binding event listeners
    if (!this._initialized) {
      this.bindTabs();
      this.bindBackButton();
      this._initialized = true;
    }
    this.renderDashboard();
    this.renderTab('users');
  },

  // ── Safe notification helper ──
  _notify(msg, type) {
    if (typeof MotoNotifications !== 'undefined') {
      MotoNotifications.show(msg, type || 'info');
    }
  },

  // ── Access Check ──
  isAdmin() {
    if (typeof MotoStorage === 'undefined') return false;
    const user = MotoStorage.getCurrentUser();
    return user && (user.role === 'admin' || (user.email && user.email.toLowerCase() === 'shahmuradovk@gmail.com'));
  },

  // ── Tab Navigation ──
  bindTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target) {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.currentTab = target;
          this.renderTab(target);
        }
      });
    });
  },

  bindBackButton() {
    const btn = document.getElementById('admin-back-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof MotoApp !== 'undefined') MotoApp.navigateTo('profile');
      });
    }
  },

  // ── Dashboard Stats ──
  renderDashboard() {
    if (typeof MotoStorage === 'undefined') return;
    const users = MotoStorage.getUsers() || [];
    const events = MotoStorage.getEvents() || [];
    const alerts = MotoStorage.getAlerts() || [];

    const totalRides = users.reduce((sum, u) => sum + (u.totalRides || 0), 0);

    const el = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    };

    el('admin-stat-users', users.length);
    el('admin-stat-rides', totalRides);
    el('admin-stat-events', events.length);
    el('admin-stat-alerts', alerts.length);
  },

  // ── Tab Renderer ──
  renderTab(tab) {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    switch (tab) {
      case 'users': content.innerHTML = this.renderUsers(); break;
      case 'events': content.innerHTML = this.renderEvents(); break;
      case 'alerts': content.innerHTML = this.renderAlerts(); break;
      case 'system': content.innerHTML = this.renderSystem(); break;
    }

    this.bindActions();
  },

  // ── Users Tab ──
  renderUsers() {
    if (typeof MotoStorage === 'undefined') return '<div class="admin-empty">Yüklənir...</div>';
    const users = MotoStorage.getUsers() || [];
    if (!users.length) return '<div class="admin-empty">İstifadəçi yoxdur</div>';

    return '<div class="admin-list">' + users.map(u => {
      const initials = (u.firstName || '').charAt(0) + (u.lastName || '').charAt(0);
      const role = u.role || 'user';
      const roleBadge = `<span class="admin-role-badge role-${role}">${role}</span>`;
      const online = u.isOnline ? '🟢' : '⚫';

      return `
        <div class="admin-list-item" data-id="${u.id}">
          <div class="admin-list-left">
            <div class="admin-list-avatar" style="background: var(--gradient-primary);">${initials.toUpperCase()}</div>
            <div class="admin-list-info">
              <div class="admin-list-name">${online} ${u.firstName || ''} ${u.lastName || ''} ${roleBadge}</div>
              <div class="admin-list-meta">${u.email || ''} • ${u.motoBrand || ''} ${u.motoModel || ''} • ${u.totalRides || 0} sürüş</div>
            </div>
          </div>
          <div class="admin-list-actions">
            ${role !== 'admin' ? `<button class="admin-btn-sm admin-btn-info" data-action="make-admin" data-id="${u.id}">Admin et</button>` : ''}
            ${role !== 'admin' ? `<button class="admin-btn-sm admin-btn-danger" data-action="delete-user" data-id="${u.id}">Sil</button>` : ''}
          </div>
        </div>
      `;
    }).join('') + '</div>';
  },

  // ── Events Tab ──
  renderEvents() {
    if (typeof MotoStorage === 'undefined') return '<div class="admin-empty">Yüklənir...</div>';
    const events = MotoStorage.getEvents() || [];
    if (!events.length) return '<div class="admin-empty">Tədbir yoxdur</div>';

    return '<div class="admin-list">' + events.map(e => `
      <div class="admin-list-item" data-id="${e.id}">
        <div class="admin-list-left">
          <div class="admin-list-avatar" style="background: linear-gradient(135deg, #a855f7, #c084fc);">📅</div>
          <div class="admin-list-info">
            <div class="admin-list-name">${e.title || ''}</div>
            <div class="admin-list-meta">${e.date || ''} ${e.time || ''} • ${e.participants ? e.participants.length : 0} iştirakçı • ${e.createdByName || 'Anonim'}</div>
          </div>
        </div>
        <div class="admin-list-actions">
          <button class="admin-btn-sm admin-btn-danger" data-action="delete-event" data-id="${e.id}">Sil</button>
        </div>
      </div>
    `).join('') + '</div>';
  },

  // ── Alerts Tab ──
  renderAlerts() {
    if (typeof MotoStorage === 'undefined') return '<div class="admin-empty">Yüklənir...</div>';
    const alerts = MotoStorage.getAlerts() || [];
    if (!alerts.length) return '<div class="admin-empty">Xəbərdarlıq yoxdur</div>';

    const typeEmoji = { accident: '🚨', pothole: '🕳️', construction: '🚧', police: '👮', oil: '🛢️', other: '⚠️' };

    return '<div class="admin-list">' + alerts.map(a => `
      <div class="admin-list-item" data-id="${a.id}">
        <div class="admin-list-left">
          <div class="admin-list-avatar" style="background: linear-gradient(135deg, #ff3333, #ff6b35);">${typeEmoji[a.type] || '⚠️'}</div>
          <div class="admin-list-info">
            <div class="admin-list-name">${a.title || ''}</div>
            <div class="admin-list-meta">${a.location || '—'} • ${a.reportedByName || 'Anonim'} • ${a.isActive ? '🟢 Aktiv' : '⚫ Deaktiv'}</div>
          </div>
        </div>
        <div class="admin-list-actions">
          <button class="admin-btn-sm admin-btn-danger" data-action="delete-alert" data-id="${a.id}">Sil</button>
        </div>
      </div>
    `).join('') + '</div>';
  },

  // ── System Tab ──
  renderSystem() {
    if (typeof MotoStorage === 'undefined') return '<div class="admin-empty">Yüklənir...</div>';
    const users = MotoStorage.getUsers() || [];
    const events = MotoStorage.getEvents() || [];
    const alerts = MotoStorage.getAlerts() || [];
    const totalKm = users.reduce((s, u) => s + (u.totalKm || 0), 0);

    let storageKB = '?';
    try {
      const storageUsed = new Blob(Object.values(localStorage)).size;
      storageKB = (storageUsed / 1024).toFixed(1);
    } catch (e) { storageKB = '0'; }

    return `
      <div class="admin-system-section">
        <div class="admin-system-item"><span class="admin-system-label">Ümumi istifadəçi</span><span class="admin-system-value">${users.length}</span></div>
        <div class="admin-system-item"><span class="admin-system-label">Ümumi sürüş məsafəsi</span><span class="admin-system-value">${totalKm.toLocaleString()} km</span></div>
        <div class="admin-system-item"><span class="admin-system-label">Aktiv tədbirlər</span><span class="admin-system-value">${events.filter(e => e.status === 'upcoming').length}</span></div>
        <div class="admin-system-item"><span class="admin-system-label">Aktiv xəbərdarlıqlar</span><span class="admin-system-value">${alerts.filter(a => a.isActive).length}</span></div>
        <div class="admin-system-item"><span class="admin-system-label">LocalStorage istifadəsi</span><span class="admin-system-value">${storageKB} KB</span></div>
        <div class="admin-system-item"><span class="admin-system-label">Versiya</span><span class="admin-system-value">v1.0.0</span></div>
        <div class="admin-system-item" style="border: none;"><span class="admin-system-label">Platform</span><span class="admin-system-value">Vanilla SPA</span></div>
      </div>
      <button class="admin-btn-sm admin-btn-danger" data-action="clear-storage" style="width: 100%; padding: 12px; margin-top: 8px; border-radius: 10px;">🗑️ Data-nı Sıfırla</button>
    `;
  },

  // ── Action Bindings ──
  bindActions() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
          case 'delete-user':
            if (confirm('Bu istifadəçini silmək istəyirsiniz?')) {
              this.deleteUser(id);
            }
            break;
          case 'make-admin':
            if (typeof MotoStorage !== 'undefined') MotoStorage.updateUser(id, { role: 'admin' });
            this._notify('İstifadəçi admin edildi', 'success');
            this.renderTab('users');
            this.renderDashboard();
            break;
          case 'delete-event':
            if (confirm('Bu tədbiri silmək istəyirsiniz?')) {
              if (typeof MotoStorage !== 'undefined') MotoStorage.deleteEvent(id);
              this._notify('Tədbir silindi', 'success');
              this.renderTab('events');
              this.renderDashboard();
            }
            break;
          case 'delete-alert':
            if (confirm('Bu xəbərdarlığı silmək istəyirsiniz?')) {
              if (typeof MotoStorage !== 'undefined') MotoStorage.deleteAlert(id);
              this._notify('Xəbərdarlıq silindi', 'success');
              this.renderTab('alerts');
              this.renderDashboard();
            }
            break;
          case 'clear-storage':
            if (confirm('Tədbirlər, xəbərdarlıqlar və məkan datası silinəcək. İstifadəçilər qalacaq. Əminsiniz?')) {
              if (typeof MotoStorage !== 'undefined') {
                localStorage.removeItem(MotoStorage.KEYS.EVENTS);
                localStorage.removeItem(MotoStorage.KEYS.ALERTS);
                localStorage.removeItem(MotoStorage.KEYS.LOCATIONS);
                localStorage.removeItem(MotoStorage.KEYS.FRIENDS);
                localStorage.removeItem(MotoStorage.KEYS.MESSAGES);
              }
              this._notify('Data sıfırlandı. Səhifə yenilənir...', 'info');
              setTimeout(() => location.reload(), 1500);
            }
            break;
        }
      });
    });
  },

  deleteUser(id) {
    if (typeof MotoStorage === 'undefined') return;
    let users = MotoStorage.getUsers() || [];
    users = users.filter(u => u.id !== id);
    MotoStorage._write(MotoStorage.KEYS.USERS, users);
    this._notify('İstifadəçi silindi', 'success');
    this.renderTab('users');
    this.renderDashboard();
  }
};
