/* ================================================================
   MotoAlerts — Road Hazard Alerts Module
   MotoRiders Community App (Baku, Azerbaijan)
   ================================================================ */

const MotoAlerts = {
  alertTypes: [
    { id: 'construction', icon: '🚧', label: 'Yol təmiri', color: '#ffaa00' },
    { id: 'accident', icon: '💥', label: 'Qəza', color: '#ff3333' },
    { id: 'danger', icon: '⚠️', label: 'Təhlükə', color: '#ff6b35' },
    { id: 'traffic', icon: '🚗', label: 'Sıx trafik', color: '#3366ff' },
    { id: 'pothole', icon: '🕳️', label: 'Çuxur', color: '#9966ff' },
  ],

  currentFilter: 'all',
  expiryCheckInterval: null,
  ALERT_EXPIRY_MS: 2 * 60 * 60 * 1000, // 2 hours

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.renderAlerts();
    this.checkExpiry();
    this.expiryCheckInterval = setInterval(
      () => this.checkExpiry(),
      5 * 60 * 1000
    );
  },

  /* ──────────────────────────────────────────────
     RENDER ALERTS LIST — uses alerts.css classes
  ────────────────────────────────────────────── */
  renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    let alerts = [];
    if (typeof MotoStorage !== 'undefined') {
      alerts = MotoStorage.getAlerts() || [];
    }

    /* Filter */
    let filtered = alerts;
    if (this.currentFilter !== 'all') {
      filtered = alerts.filter(a => a.type === this.currentFilter);
    }

    /* Sort newest first */
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp || b.createdAt) -
        new Date(a.timestamp || a.createdAt)
    );

    let html = '';

    /* Header — alerts.css .alerts-header */
    html += `
      <div class="alerts-content">
        <div class="alerts-header">
          <h2 class="alerts-title">Xəbərdarlıqlar</h2>
        </div>

        <!-- Alert Type Selector — alerts.css .alert-type-selector -->
        <div class="alert-type-selector">
          <button class="alert-type-btn all ${this.currentFilter === 'all' ? 'active' : ''}"
                  onclick="MotoAlerts.setFilter('all')">
            <div class="alert-type-icon">📋</div>
            <span class="alert-type-label">Hamısı</span>
          </button>
    `;

    this.alertTypes.forEach(type => {
      html += `
          <button class="alert-type-btn ${type.id} ${this.currentFilter === type.id ? 'active' : ''}"
                  onclick="MotoAlerts.setFilter('${type.id}')">
            <div class="alert-type-icon">${type.icon}</div>
            <span class="alert-type-label">${type.label}</span>
          </button>
      `;
    });

    html += '</div>';

    /* Alert list */
    if (filtered.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Aktiv xəbərdarlıq yoxdur</h3>
          <p class="empty-state-text">Yolda problem gördün? Xəbər ver!</p>
        </div>
      `;
    } else {
      html += '<div class="alerts-list">';
      filtered.forEach((alert, i) => {
        html += this.renderAlertCard(alert, i);
      });
      html += '</div>';
    }

    html += '</div>'; // close alerts-content

    container.innerHTML = html;
  },

  /* ──────────────────────────────────────────────
     ALERT CARD — uses alerts.css classes
  ────────────────────────────────────────────── */
  renderAlertCard(alert, index) {
    const typeInfo = this.alertTypes.find((t) => t.id === alert.type) || {
      icon: '⚠️',
      label: 'Naməlum',
      color: '#ffaa00',
      id: 'danger',
    };
    const typeClass = typeInfo.id || alert.type || 'danger';
    const timeAgo =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getTimeAgo(alert.timestamp || alert.createdAt)
        : '';
    const remaining = this.getTimeRemaining(alert);

    /* Creator name */
    let creatorName = 'Naməlum';
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getUsers) {
      const users = MotoStorage.getUsers();
      const creator = users.find((u) => u.id === alert.creatorId);
      if (creator) creatorName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email;
    }

    const delay = Math.min(index || 0, 7) * 50;

    return `
      <div class="alert-card ${typeClass}" style="animation-delay: ${delay}ms">
        <div class="alert-card-icon">${typeInfo.icon}</div>
        <div class="alert-card-content">
          <div class="alert-card-header">
            <span class="alert-card-title">${this.escapeHtml(alert.description || typeInfo.label)}</span>
            <span class="alert-card-type">${typeInfo.label}</span>
          </div>
          <div class="alert-card-meta">
            <div class="alert-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="alert-time-ago">${timeAgo}</span>
            </div>
            <div class="alert-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${this.escapeHtml(creatorName)}
            </div>
            <div class="alert-expiry ${remaining === 'Vaxtı bitib' ? 'expired' : ''}">
              <svg class="alert-expiry-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${remaining}
            </div>
          </div>
          ${alert.lat && alert.lng ? `
            <div style="margin-top: 8px;">
              <button class="alert-card-vote-btn" onclick="event.stopPropagation(); MotoAlerts.showOnMap('${alert.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Xəritədə gör
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     FILTER
  ────────────────────────────────────────────── */
  setFilter(filter) {
    this.currentFilter = filter;
    this.renderAlerts();
  },

  /* ──────────────────────────────────────────────
     CREATE ALERT
  ────────────────────────────────────────────── */
  showCreateForm() {
    let html = `
      <div class="alert-create-flow" id="alert-create-flow">
        <div class="alert-step" id="alert-step-type">
          <h4 style="font-family: var(--font-heading); font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 14px;">Xəbərdarlıq növünü seçin</h4>
          <div class="alert-type-selector" style="margin-bottom: 0;">
    `;

    this.alertTypes.forEach((type) => {
      html += `
        <button class="alert-type-btn ${type.id}" data-type-id="${type.id}"
                onclick="MotoAlerts.selectAlertType('${type.id}')">
          <div class="alert-type-icon">${type.icon}</div>
          <span class="alert-type-label">${type.label}</span>
        </button>
      `;
    });

    html += `
          </div>
        </div>

        <div class="alert-step hidden" id="alert-step-details">
          <input type="hidden" id="alert-selected-type" value="" />
          <div class="p-edit-group" style="margin-top: 14px;">
            <label class="p-edit-label">Təsvir *</label>
            <textarea id="alert-description" class="p-edit-input" rows="3"
                      placeholder="Yol vəziyyətini təsvir edin..." maxlength="200" style="resize:vertical;"></textarea>
          </div>
          <div class="p-edit-group">
            <label class="p-edit-label">Yer</label>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button class="alert-card-vote-btn" style="flex:1;" id="btn-use-current-loc"
                      onclick="MotoAlerts.useCurrentLocation()">
                📍 Hazırkı yerim
              </button>
              <button class="alert-card-vote-btn" style="flex:1;" id="btn-pick-on-map"
                      onclick="MotoAlerts.pickOnMap()">
                🗺️ Xəritədən seç
              </button>
            </div>
            <input type="hidden" id="alert-lat" value="" />
            <input type="hidden" id="alert-lng" value="" />
            <div id="alert-location-status" style="font-size: 0.75rem; color: var(--text-muted);"></div>
          </div>
          <button class="p-edit-save" onclick="MotoAlerts.handleCreateSubmit()">
            ⚠️ Xəbərdarlıq Göndər
          </button>
        </div>
      </div>
    `;

    MotoApp.openModal(html, 'Yeni Xəbərdarlıq');
  },

  selectAlertType(typeId) {
    document.getElementById('alert-selected-type').value = typeId;

    document.querySelectorAll('.alert-type-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.typeId === typeId);
    });

    const step2 = document.getElementById('alert-step-details');
    if (step2) step2.classList.remove('hidden');

    this.useCurrentLocation();
  },

  useCurrentLocation() {
    const statusEl = document.getElementById('alert-location-status');
    if (statusEl) statusEl.textContent = 'Yer təyin olunur...';

    if (typeof MotoMap !== 'undefined') {
      MotoMap.getCurrentLocation((pos) => {
        document.getElementById('alert-lat').value = pos.coords.latitude;
        document.getElementById('alert-lng').value = pos.coords.longitude;
        if (statusEl) statusEl.textContent = '✅ Yer təyin olundu';
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('alert-lat').value = pos.coords.latitude;
          document.getElementById('alert-lng').value = pos.coords.longitude;
          if (statusEl) statusEl.textContent = '✅ Yer təyin olundu';
        },
        () => {
          document.getElementById('alert-lat').value = 40.4093;
          document.getElementById('alert-lng').value = 49.8671;
          if (statusEl)
            statusEl.textContent = '⚠️ Dəqiq yer tapılmadı, Bakı mərkəzi istifadə olunur';
        }
      );
    }
  },

  pickOnMap() {
    MotoApp.closeModal();
    MotoApp.navigateTo('map');

    MotoApp.showToast('Xəritədə yerə toxunun', 'info');

    if (typeof MotoMap !== 'undefined' && MotoMap.map) {
      const onMapClick = (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        MotoMap.map.off('click', onMapClick);
        this.showCreateForm();

        setTimeout(() => {
          document.getElementById('alert-lat').value = lat;
          document.getElementById('alert-lng').value = lng;
          const statusEl = document.getElementById('alert-location-status');
          if (statusEl)
            statusEl.textContent = `✅ Yer seçildi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }, 300);
      };

      MotoMap.map.on('click', onMapClick);
    }
  },

  handleCreateSubmit() {
    const typeId = document.getElementById('alert-selected-type').value;
    const description = document.getElementById('alert-description').value;
    const lat = parseFloat(document.getElementById('alert-lat').value);
    const lng = parseFloat(document.getElementById('alert-lng').value);

    if (!typeId) {
      MotoApp.showToast('Xəbərdarlıq növü seçin', 'error');
      return;
    }
    if (!description || !description.trim()) {
      MotoApp.showToast('Təsvir yazın', 'error');
      return;
    }

    this.handleCreate({
      type: typeId,
      description: description.trim(),
      lat: isNaN(lat) ? 40.4093 : lat,
      lng: isNaN(lng) ? 49.8671 : lng,
    });
  },

  handleCreate(formData) {
    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;

    const alert = {
      id: 'alert_' + Date.now(),
      type: formData.type,
      description: formData.description,
      lat: formData.lat,
      lng: formData.lng,
      creatorId: currentUser ? currentUser.id : 'user_1',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.saveAlert(alert);
    }

    MotoApp.closeModal();
    this.renderAlerts();
    this.notifyAllUsers(alert);

    if (typeof MotoMap !== 'undefined') {
      MotoMap.addAlertMarker(alert);
    }
  },

  /* ──────────────────────────────────────────────
     NOTIFICATIONS
  ────────────────────────────────────────────── */
  notifyAllUsers(alert) {
    const typeInfo = this.alertTypes.find((t) => t.id === alert.type) || {
      icon: '⚠️',
      label: 'Xəbərdarlıq',
    };

    MotoApp.showToast(
      `${typeInfo.icon} ${typeInfo.label}: ${alert.description.substring(0, 50)}`,
      'warning'
    );

    if (
      typeof MotoStorage !== 'undefined' &&
      MotoStorage.addNotification
    ) {
      MotoStorage.addNotification({
        id: 'notif_' + Date.now(),
        type: 'alert',
        title: typeInfo.label,
        message: alert.description,
        icon: typeInfo.icon,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  },

  /* ──────────────────────────────────────────────
     EXPIRY
  ────────────────────────────────────────────── */
  checkExpiry() {
    if (typeof MotoStorage === 'undefined') return;
    const alerts = MotoStorage.getAlerts() || [];
    const now = Date.now();
    let changed = false;

    const active = alerts.filter((a) => {
      const age = now - new Date(a.timestamp || a.createdAt).getTime();
      if (age > this.ALERT_EXPIRY_MS) {
        changed = true;
        if (typeof MotoMap !== 'undefined' && MotoMap.alertMarkers && MotoMap.alertMarkers[a.id]) {
          MotoMap.map.removeLayer(MotoMap.alertMarkers[a.id]);
          delete MotoMap.alertMarkers[a.id];
        }
        return false;
      }
      return true;
    });

    if (changed) {
      MotoStorage.setAlerts(active);
      this.renderAlerts();
    }
  },

  getTimeRemaining(alert) {
    const created = new Date(alert.timestamp || alert.createdAt).getTime();
    const expires = created + this.ALERT_EXPIRY_MS;
    const remaining = expires - Date.now();

    if (remaining <= 0) return 'Vaxtı bitib';

    const mins = Math.floor(remaining / 60000);
    const hrs = Math.floor(mins / 60);
    const rMins = mins % 60;

    if (hrs > 0) return `${hrs}s ${rMins}d qalıb`;
    return `${rMins}d qalıb`;
  },

  /* ──────────────────────────────────────────────
     MAP INTEGRATION
  ────────────────────────────────────────────── */
  showOnMap(alertId) {
    if (typeof MotoStorage === 'undefined') return;
    const alerts = MotoStorage.getAlerts() || [];
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert || !alert.lat || !alert.lng) return;

    MotoApp.navigateTo('map');

    setTimeout(() => {
      if (typeof MotoMap !== 'undefined' && MotoMap.map) {
        MotoMap.map.setView([alert.lat, alert.lng], 16, { animate: true });

        if (MotoMap.alertMarkers && MotoMap.alertMarkers[alert.id]) {
          MotoMap.alertMarkers[alert.id].openPopup();
        }
      }
    }, 300);
  },

  /* ──────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────── */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
