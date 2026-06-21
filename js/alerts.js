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

  expiryCheckInterval: null,
  ALERT_EXPIRY_MS: 2 * 60 * 60 * 1000, // 2 hours

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.renderAlerts();
    this.checkExpiry();
    /* Check expiry every 5 minutes */
    this.expiryCheckInterval = setInterval(
      () => this.checkExpiry(),
      5 * 60 * 1000
    );
  },

  /* ──────────────────────────────────────────────
     RENDER ALERTS LIST
  ────────────────────────────────────────────── */
  renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    let alerts = [];
    if (typeof MotoStorage !== 'undefined') {
      alerts = MotoStorage.getAlerts() || [];
    }

    /* Sort newest first */
    alerts.sort(
      (a, b) =>
        new Date(b.timestamp || b.createdAt) -
        new Date(a.timestamp || a.createdAt)
    );

    let html = `
      <div class="alerts-header">
        <h2 class="page-title">⚠️ Xəbərdarlıqlar</h2>
        <p class="page-subtitle">Yol vəziyyəti haqqında real-vaxt məlumatlar</p>
      </div>
    `;

    if (alerts.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>Hazırda aktiv xəbərdarlıq yoxdur</p>
          <p class="empty-sub">Yolda problem gördün? Xəbər ver!</p>
          <button class="btn-primary" onclick="MotoAlerts.showCreateForm()">
            + Xəbərdarlıq Yarat
          </button>
        </div>
      `;
    } else {
      html += '<div class="alerts-grid">';
      alerts.forEach((alert) => {
        html += this.renderAlertCard(alert);
      });
      html += '</div>';
    }

    /* FAB */
    html += `
      <button class="fab-btn fab-alert" id="fab-create-alert" onclick="MotoAlerts.showCreateForm()">
        <span>+</span>
      </button>
    `;

    container.innerHTML = html;
  },

  /* ──────────────────────────────────────────────
     ALERT CARD
  ────────────────────────────────────────────── */
  renderAlertCard(alert) {
    const typeInfo = this.alertTypes.find((t) => t.id === alert.type) || {
      icon: '⚠️',
      label: 'Naməlum',
      color: '#ffaa00',
    };
    const timeAgo =
      typeof MotoMap !== 'undefined'
        ? MotoMap.formatTimeAgo(alert.timestamp || alert.createdAt)
        : '';
    const remaining = this.getTimeRemaining(alert);

    /* Creator name */
    let creatorName = 'Naməlum';
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getUsers) {
      const users = MotoStorage.getUsers();
      const creator = users.find((u) => u.id === alert.creatorId);
      if (creator) creatorName = creator.name;
    }

    return `
      <div class="alert-card" style="--alert-border-color: ${typeInfo.color}">
        <div class="alert-card-left" style="background: ${typeInfo.color}20">
          <span class="alert-card-icon">${typeInfo.icon}</span>
        </div>
        <div class="alert-card-content">
          <div class="alert-card-header">
            <span class="alert-type-label" style="color: ${typeInfo.color}">${typeInfo.label}</span>
            <span class="alert-time">${timeAgo}</span>
          </div>
          <p class="alert-description">${this.escapeHtml(alert.description || '')}</p>
          <div class="alert-card-footer">
            <span class="alert-creator">👤 ${this.escapeHtml(creatorName)}</span>
            <span class="alert-remaining">⏳ ${remaining}</span>
            ${
              alert.lat && alert.lng
                ? `<button class="btn-ghost btn-xs" onclick="MotoAlerts.showOnMap('${alert.id}')">🗺️ Xəritədə gör</button>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     CREATE ALERT
  ────────────────────────────────────────────── */
  showCreateForm() {
    /* Step 1: Type selection */
    let html = `
      <div class="alert-create-flow" id="alert-create-flow">
        <div class="alert-step" id="alert-step-type">
          <h4 class="step-label">Xəbərdarlıq növünü seçin</h4>
          <div class="alert-type-grid">
    `;

    this.alertTypes.forEach((type) => {
      html += `
        <button class="alert-type-btn" data-type-id="${type.id}"
                style="--type-color: ${type.color}"
                onclick="MotoAlerts.selectAlertType('${type.id}')">
          <span class="alert-type-btn-icon">${type.icon}</span>
          <span class="alert-type-btn-label">${type.label}</span>
        </button>
      `;
    });

    html += `
          </div>
        </div>

        <div class="alert-step hidden" id="alert-step-details">
          <h4 class="step-label">Ətraflı məlumat</h4>
          <input type="hidden" id="alert-selected-type" value="" />
          <div class="form-group">
            <label class="form-label">Təsvir *</label>
            <textarea id="alert-description" class="input-field textarea" rows="3"
                      placeholder="Yol vəziyyətini təsvir edin..." maxlength="200"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Yer</label>
            <div class="location-options">
              <button class="btn-secondary btn-sm active" id="btn-use-current-loc"
                      onclick="MotoAlerts.useCurrentLocation()">
                📍 Hazırkı yerim
              </button>
              <button class="btn-secondary btn-sm" id="btn-pick-on-map"
                      onclick="MotoAlerts.pickOnMap()">
                🗺️ Xəritədən seç
              </button>
            </div>
            <input type="hidden" id="alert-lat" value="" />
            <input type="hidden" id="alert-lng" value="" />
            <div id="alert-location-status" class="location-status"></div>
          </div>
          <button class="btn-primary btn-lg full-width" onclick="MotoAlerts.handleCreateSubmit()">
            ⚠️ Xəbərdarlıq Göndər
          </button>
        </div>
      </div>
    `;

    MotoApp.openModal(html, 'Yeni Xəbərdarlıq');
  },

  selectAlertType(typeId) {
    document.getElementById('alert-selected-type').value = typeId;

    /* Highlight selected button */
    document.querySelectorAll('.alert-type-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.typeId === typeId);
    });

    /* Show step 2 */
    const step2 = document.getElementById('alert-step-details');
    if (step2) step2.classList.remove('hidden');

    /* Auto-get current location */
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
          /* Fallback to Baku center */
          document.getElementById('alert-lat').value = 40.4093;
          document.getElementById('alert-lng').value = 49.8671;
          if (statusEl)
            statusEl.textContent = '⚠️ Dəqiq yer tapılmadı, Bakı mərkəzi istifadə olunur';
        }
      );
    }

    /* Toggle button styles */
    const btnCurrent = document.getElementById('btn-use-current-loc');
    const btnMap = document.getElementById('btn-pick-on-map');
    if (btnCurrent) btnCurrent.classList.add('active');
    if (btnMap) btnMap.classList.remove('active');
  },

  pickOnMap() {
    MotoApp.closeModal();
    MotoApp.navigateTo('map');

    MotoApp.showToast('Xəritədə yerə toxunun', 'info');

    /* Set up a one-time click listener on the map */
    if (typeof MotoMap !== 'undefined' && MotoMap.map) {
      const onMapClick = (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        MotoMap.map.off('click', onMapClick);

        /* Re-open the create form with location filled in */
        this.showCreateForm();

        setTimeout(() => {
          document.getElementById('alert-lat').value = lat;
          document.getElementById('alert-lng').value = lng;
          const statusEl = document.getElementById('alert-location-status');
          if (statusEl)
            statusEl.textContent = `✅ Yer seçildi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

          const btnCurrent = document.getElementById('btn-use-current-loc');
          const btnMap = document.getElementById('btn-pick-on-map');
          if (btnCurrent) btnCurrent.classList.remove('active');
          if (btnMap) btnMap.classList.add('active');
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

    /* Add to map */
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

    /* Save to notification storage */
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
        /* Remove from map */
        if (typeof MotoMap !== 'undefined' && MotoMap.alertMarkers[a.id]) {
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

    if (hrs > 0) return `${hrs} saat ${rMins} dəq qalıb`;
    return `${rMins} dəq qalıb`;
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

        /* Open popup if marker exists */
        if (MotoMap.alertMarkers[alert.id]) {
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
