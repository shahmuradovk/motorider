/* ═══════════════════════════════════════════════════════════════
   MotoNotifications — Toast & Notification Center
   Slide-in toasts with auto-dismiss, notification center with
   badge count and read/unread tracking.
   ═══════════════════════════════════════════════════════════════ */

const MotoNotifications = {

  notifications: [],
  toastCounter: 0,

  // ─── Initialize ────────────────────────────────────────────
  init() {
    this._loadNotifications();
    this._bindEvents();
    this.updateBadge();
  },

  _loadNotifications() {
    try {
      const stored = localStorage.getItem('moto_notifications');
      this.notifications = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.notifications = [];
    }
  },

  _saveNotifications() {
    try {
      localStorage.setItem('moto_notifications', JSON.stringify(this.notifications));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  },

  _bindEvents() {
    // Notification bell toggle
    const notifBtn = document.getElementById('notification-btn');
    const dropdown = document.getElementById('notification-dropdown');

    if (notifBtn && dropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
          this.renderNotificationList();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !notifBtn.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }

    // Mark all as read
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllRead());
    }
  },

  // ═══════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════

  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    this.toastCounter++;
    const toastId = `toast-${this.toastCounter}`;

    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" aria-label="Bağla">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="toast-progress">
        <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
      </div>
    `;

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this._dismissToast(toast));

    // Prepend to stack (newest on top)
    container.prepend(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-enter');
    });

    // Auto-dismiss
    const timeoutId = setTimeout(() => this._dismissToast(toast), duration);
    toast._timeoutId = timeoutId;

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      clearTimeout(toast._timeoutId);
      const progressBar = toast.querySelector('.toast-progress-bar');
      if (progressBar) progressBar.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const progressBar = toast.querySelector('.toast-progress-bar');
      if (progressBar) progressBar.style.animationPlayState = 'running';
      toast._timeoutId = setTimeout(() => this._dismissToast(toast), 2000);
    });

    // Limit visible toasts to 5
    const toasts = container.querySelectorAll('.toast');
    if (toasts.length > 5) {
      this._dismissToast(toasts[toasts.length - 1]);
    }

    return toastId;
  },

  _dismissToast(toastEl) {
    if (!toastEl || toastEl._dismissing) return;
    toastEl._dismissing = true;

    clearTimeout(toastEl._timeoutId);
    toastEl.classList.add('toast-exit');

    toastEl.addEventListener('animationend', () => {
      toastEl.remove();
    }, { once: true });

    // Fallback removal
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 400);
  },

  showAlert(alertData) {
    const typeLabels = {
      accident: '🚨 Qəza',
      pothole: '🕳️ Çuxur',
      construction: '🚧 Yol təmiri',
      police: '👮 Polis',
      oil: '🛢️ Yağ ləkəsi',
      other: '⚠️ Xəbərdarlıq'
    };

    const label = typeLabels[alertData.type] || typeLabels.other;
    const message = `${label}: ${alertData.title}${alertData.location ? ' — ' + alertData.location : ''}`;

    this.show(message, 'warning', 6000);

    // Add to notification center
    this.addNotification({
      type: 'alert',
      title: label,
      message: alertData.title,
      icon: alertData.type,
      relatedId: alertData.id
    });
  },

  // ═══════════════════════════════════════════════════════════
  // NOTIFICATION CENTER
  // ═══════════════════════════════════════════════════════════

  addNotification(data) {
    const notification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: data.type || 'general', // alert, event, friend, system, general
      title: data.title || '',
      message: data.message || '',
      icon: data.icon || 'info',
      relatedId: data.relatedId || null,
      read: false,
      createdAt: new Date().toISOString()
    };

    this.notifications.unshift(notification);

    // Keep max 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this._saveNotifications();
    this.updateBadge();
    this.renderNotificationList();

    return notification;
  },

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  },

  markAsRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this._saveNotifications();
      this.updateBadge();
      this.renderNotificationList();
    }
  },

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this._saveNotifications();
    this.updateBadge();
    this.renderNotificationList();
  },

  deleteNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this._saveNotifications();
    this.updateBadge();
    this.renderNotificationList();
  },

  // ─── Badge Update ─────────────────────────────────────────
  updateBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const count = this.getUnreadCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  // ─── Render Notification List ──────────────────────────────
  renderNotificationList() {
    const listEl = document.getElementById('notification-list');
    if (!listEl) return;

    if (this.notifications.length === 0) {
      listEl.innerHTML = `
        <div class="notification-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <p>Bildiriş yoxdur</p>
        </div>
      `;
      return;
    }

    const typeIcons = {
      alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff3333" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      event: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      friend: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      system: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
      general: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffaa00" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
    };

    let html = '';
    this.notifications.slice(0, 20).forEach(notif => {
      const icon = typeIcons[notif.type] || typeIcons.general;
      const timeAgo = MotoStorage.getTimeAgo(notif.createdAt);
      const unreadClass = notif.read ? '' : 'unread';

      html += `
        <div class="notification-item ${unreadClass}" data-id="${notif.id}">
          <div class="notification-item-icon">${icon}</div>
          <div class="notification-item-body">
            <p class="notification-item-title">${notif.title}</p>
            <p class="notification-item-message">${notif.message}</p>
            <span class="notification-item-time">${timeAgo}</span>
          </div>
          <button class="notification-item-dismiss" data-dismiss="${notif.id}" aria-label="Sil">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    });

    listEl.innerHTML = html;

    // Bind click events
    listEl.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.notification-item-dismiss')) return;
        this.markAsRead(item.dataset.id);
      });
    });

    listEl.querySelectorAll('.notification-item-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNotification(btn.dataset.dismiss);
      });
    });
  }
};
