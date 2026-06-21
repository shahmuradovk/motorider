/* ================================================================
   MotoMap — Map & Live Location Module (Leaflet.js)
   MotoRiders Community App (Baku, Azerbaijan)
   Phase 1: Premium Map UI + Floating Dashboard
   ================================================================ */

const MotoMap = {
  map: null,
  userMarker: null,
  watchId: null,
  isRiding: false,
  isPaused: false,
  isSharing: false,
  rideData: { path: [], startTime: null, distance: 0, maxSpeed: 0, pausedTime: 0, pauseStart: null },
  markers: {},
  alertMarkers: {},
  eventMarkers: {},
  routeLine: null,
  rideTimer: null,
  demoAnimationId: null,
  fabExpanded: false,

  /* Baku centre */
  BAKU_CENTER: [40.4093, 49.8671],
  DEFAULT_ZOOM: 13,
  DEMO_USERS: [],

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.setupMap();
    this.setupFAB();
    this.setupMapControls();
    this.setupLegend();
    this.setupSearch();
    this.loadActiveLocations();
    this.loadAlerts();
    this.loadEvents();
    this.updateRidersOnline();

    /* Try to get user location once */
    this.getCurrentLocation((pos) => {
      this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
      this.map.setView(
        [pos.coords.latitude, pos.coords.longitude],
        this.DEFAULT_ZOOM
      );
    });
  },

  /* ──────────────────────────────────────────────
     MAP SETUP
  ────────────────────────────────────────────── */
  setupMap() {
    if (this.map) return;

    const container = document.getElementById('map-container');
    if (!container) return;

    this.map = L.map(container, {
      center: this.BAKU_CENTER,
      zoom: this.DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(this.map);
  },

  /* ──────────────────────────────────────────────
     MAP CONTROLS (center + layer)
  ────────────────────────────────────────────── */
  setupMapControls() {
    const centerBtn = document.getElementById('map-center-btn');
    const layerBtn = document.getElementById('map-layer-btn');

    if (centerBtn) centerBtn.addEventListener('click', () => this.centerOnUser());
    if (layerBtn) layerBtn.addEventListener('click', () => this.toggleMapLayer());
  },

  toggleMapLayer() {
    MotoApp.showToast('Xəritə təbəqəsi tezliklə!', 'info');
  },

  /* ──────────────────────────────────────────────
     EXPANDABLE FAB GROUP
  ────────────────────────────────────────────── */
  setupFAB() {
    const mainFab = document.getElementById('map-fab-main');
    const fabGroup = document.getElementById('map-fab-group');
    const startRide = document.getElementById('fab-start-ride');
    const shareLocation = document.getElementById('fab-share-location');
    const reportDanger = document.getElementById('fab-report-danger');

    if (mainFab) {
      mainFab.addEventListener('click', () => this.toggleFAB());
    }

    if (startRide) {
      startRide.addEventListener('click', () => {
        this.collapseFAB();
        this.showShareModeModal((mode) => this.startRiding(mode));
      });
    }

    if (shareLocation) {
      shareLocation.addEventListener('click', () => {
        this.collapseFAB();
        this.showShareModeModal((mode) => this.shareStaticLocation('', mode));
      });
    }

    if (reportDanger) {
      reportDanger.addEventListener('click', () => {
        this.collapseFAB();
        if (typeof MotoAlerts !== 'undefined') {
          MotoAlerts.showCreateForm();
        }
      });
    }
  },

  toggleFAB() {
    this.fabExpanded ? this.collapseFAB() : this.expandFAB();
  },

  expandFAB() {
    this.fabExpanded = true;
    const group = document.getElementById('map-fab-group');
    const main = document.getElementById('map-fab-main');
    if (group) group.classList.add('expanded');
    if (main) main.classList.add('expanded');

    /* Show mini wrappers with stagger */
    const wrappers = group ? group.querySelectorAll('.map-fab-mini-wrapper') : [];
    wrappers.forEach((w, i) => {
      setTimeout(() => { w.style.display = 'flex'; }, i * 50);
    });
  },

  collapseFAB() {
    this.fabExpanded = false;
    const group = document.getElementById('map-fab-group');
    const main = document.getElementById('map-fab-main');
    if (group) group.classList.remove('expanded');
    if (main) main.classList.remove('expanded');

    const wrappers = group ? group.querySelectorAll('.map-fab-mini-wrapper') : [];
    wrappers.forEach(w => { w.style.display = 'none'; });
  },

  /* ──────────────────────────────────────────────
     LEGEND TOGGLE
  ────────────────────────────────────────────── */
  setupLegend() {
    const toggle = document.getElementById('map-legend-toggle');
    const content = document.getElementById('map-legend-content');
    if (toggle && content) {
      toggle.addEventListener('click', () => content.classList.toggle('hidden'));
    }
  },

  /* ──────────────────────────────────────────────
     MAP SEARCH (basic — shows placeholder)
  ────────────────────────────────────────────── */
  setupSearch() {
    const input = document.getElementById('map-search-input');
    if (!input) return;

    input.addEventListener('focus', () => {
      const results = document.getElementById('map-search-results');
      if (results && !input.value.trim()) {
        results.classList.add('hidden');
      }
    });

    input.addEventListener('input', () => {
      const q = input.value.trim();
      const results = document.getElementById('map-search-results');
      if (!results) return;

      if (!q) {
        results.classList.add('hidden');
        return;
      }

      results.classList.remove('hidden');
      results.innerHTML = `
        <div class="map-search-result" onclick="MotoApp.showToast('Axtarış funksiyası tezliklə!', 'info')">
          <div class="map-search-result-icon">🔍</div>
          <div class="map-search-result-text">
            <div class="map-search-result-name">"${q}" üçün axtarış</div>
            <div class="map-search-result-address">Tezliklə...</div>
          </div>
        </div>
      `;
    });
  },

  /* ──────────────────────────────────────────────
     RIDERS ONLINE COUNT
  ────────────────────────────────────────────── */
  updateRidersOnline() {
    let count = Object.keys(this.markers).length;

    /* Add shared locations */
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSharedLocations) {
      const shared = MotoStorage.getSharedLocations() || [];
      count = Math.max(count, shared.length);
    }

    /* Always show at least 1 (the user) */
    count = Math.max(count, 1);

    const el = document.getElementById('riders-online-count');
    if (el) el.textContent = count;
  },

  /* ──────────────────────────────────────────────
     USER LOCATION
  ────────────────────────────────────────────── */
  getCurrentLocation(callback) {
    if (!navigator.geolocation) {
      callback({
        coords: {
          latitude: this.BAKU_CENTER[0],
          longitude: this.BAKU_CENTER[1],
          speed: 0,
        },
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      callback,
      () => {
        callback({
          coords: {
            latitude: this.BAKU_CENTER[0],
            longitude: this.BAKU_CENTER[1],
            speed: 0,
          },
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  },

  startWatching() {
    if (this.watchId !== null) return;
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed;

        this.updateUserMarker(lat, lng);

        if (this.isRiding && !this.isPaused) {
          const path = this.rideData.path;
          if (path.length > 0) {
            const last = path[path.length - 1];
            const seg = this.calculateDistance(last[0], last[1], lat, lng);
            this.rideData.distance += seg;
          }
          path.push([lat, lng]);
          this.drawRoute(path);

          /* Track max speed */
          let speedKmh = 0;
          if (speed && speed > 0) {
            speedKmh = speed * 3.6;
          }
          if (speedKmh > this.rideData.maxSpeed) {
            this.rideData.maxSpeed = speedKmh;
          }

          this.updateDashboard(speedKmh);
        }

        /* Save to storage for sharing */
        if (this.isSharing && typeof MotoStorage !== 'undefined') {
          const user = MotoStorage.getCurrentUser();
          if (user) {
            MotoStorage.updateUserLocation(user.id, lat, lng);
          }
        }
      },
      (err) => console.warn('Watch error', err),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  },

  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  updateUserMarker(lat, lng) {
    if (!this.map) return;
    const icon = L.divIcon({
      className: 'user-marker-icon',
      html: `
        <div class="user-marker-pulse"></div>
        <div class="user-marker-dot"></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    } else {
      this.userMarker = L.marker([lat, lng], { icon: icon }).addTo(this.map);
      this.userMarker.bindPopup(
        '<div class="moto-popup"><strong>Sən buradasən</strong></div>'
      );
    }
  },

  centerOnUser() {
    if (this.userMarker) {
      this.map.setView(this.userMarker.getLatLng(), 15, { animate: true });
    } else {
      this.getCurrentLocation((pos) => {
        this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
        this.map.setView(
          [pos.coords.latitude, pos.coords.longitude],
          15,
          { animate: true }
        );
      });
    }
  },

  /* ──────────────────────────────────────────────
     LIVE RIDING MODE
  ────────────────────────────────────────────── */
  startRiding(shareMode) {
    if (this.isRiding) return;
    this.isRiding = true;
    this.isPaused = false;
    this.isSharing = shareMode === 'community' || shareMode === 'friends';
    this.rideData = { path: [], startTime: Date.now(), distance: 0, maxSpeed: 0, pausedTime: 0, pauseStart: null };

    this.startWatching();
    this.showDashboard();

    /* Timer updates every second */
    this.rideTimer = setInterval(() => this.updateDashboard(), 1000);

    MotoApp.showToast('Sürüş başladı! 🏍️', 'success');
  },

  pauseRiding() {
    if (!this.isRiding || this.isPaused) return;
    this.isPaused = true;
    this.rideData.pauseStart = Date.now();
    this.stopWatching();

    /* Update pause button */
    const pauseBtn = document.getElementById('dash-pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '▶️';
      pauseBtn.title = 'Davam et';
      pauseBtn.classList.add('active');
    }
    const statusEl = document.getElementById('dash-status');
    if (statusEl) statusEl.textContent = 'FASILƏ';

    MotoApp.showToast('Sürüş fasiləyə alındı ⏸️', 'info');
  },

  resumeRiding() {
    if (!this.isRiding || !this.isPaused) return;
    this.isPaused = false;

    /* Calculate total paused time */
    if (this.rideData.pauseStart) {
      this.rideData.pausedTime += Date.now() - this.rideData.pauseStart;
      this.rideData.pauseStart = null;
    }

    this.startWatching();

    const pauseBtn = document.getElementById('dash-pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '⏸️';
      pauseBtn.title = 'Fasilə';
      pauseBtn.classList.remove('active');
    }
    const statusEl = document.getElementById('dash-status');
    if (statusEl) statusEl.textContent = 'CANLI';

    MotoApp.showToast('Sürüş davam edir! 🏍️', 'success');
  },

  togglePause() {
    this.isPaused ? this.resumeRiding() : this.pauseRiding();
  },

  stopRiding() {
    if (!this.isRiding) return;
    this.isRiding = false;
    this.isPaused = false;
    this.isSharing = false;

    if (this.rideTimer) {
      clearInterval(this.rideTimer);
      this.rideTimer = null;
    }
    this.stopWatching();
    this.hideDashboard();
    this.showRideSummary();
  },

  /* ──────────────────────────────────────────────
     PREMIUM FLOATING DASHBOARD
  ────────────────────────────────────────────── */
  showDashboard() {
    /* Hide FAB group during ride */
    const fabGroup = document.getElementById('map-fab-group');
    if (fabGroup) fabGroup.style.display = 'none';

    let panel = document.getElementById('ride-dashboard');
    if (panel) { panel.remove(); }

    panel = document.createElement('div');
    panel.id = 'ride-dashboard';
    panel.className = 'live-panel active';
    panel.innerHTML = `
      <div class="live-panel-handle"></div>
      <div class="live-panel-header">
        <div class="live-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Sürüş
        </div>
        <div class="live-indicator">
          <span class="live-indicator-dot"></span>
          <span id="dash-status">CANLI</span>
        </div>
      </div>

      <div class="riding-stats">
        <div class="riding-stat speed">
          <span class="riding-stat-label">Sürət</span>
          <span class="riding-stat-value" id="dash-speed">0 <span class="unit">km/s</span></span>
        </div>
        <div class="riding-stat">
          <span class="riding-stat-label">Məsafə</span>
          <span class="riding-stat-value" id="dash-distance">0.00 <span class="unit">km</span></span>
        </div>
        <div class="riding-stat">
          <span class="riding-stat-label">Vaxt</span>
          <span class="riding-stat-value" id="dash-time">00:00</span>
        </div>
      </div>

      <div class="riding-stats" style="margin-bottom: 12px;">
        <div class="riding-stat">
          <span class="riding-stat-label">Orta Sürət</span>
          <span class="riding-stat-value" id="dash-avg-speed">0 <span class="unit">km/s</span></span>
        </div>
        <div class="riding-stat">
          <span class="riding-stat-label">Maks Sürət</span>
          <span class="riding-stat-value" id="dash-max-speed">0 <span class="unit">km/s</span></span>
        </div>
        <div class="riding-stat">
          <span class="riding-stat-label">GPS</span>
          <span class="riding-stat-value" id="dash-gps" style="color: var(--accent-success);">●</span>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="map-fab-mini" id="dash-pause-btn" title="Fasilə" style="width: 48px; height: 48px; border-radius: 50%;" onclick="MotoMap.togglePause()">
          ⏸️
        </button>
        <button style="flex: 1; padding: 14px; background: linear-gradient(135deg, #ff3333, #ff6b35); border: none; border-radius: 12px; color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 16px rgba(255,51,51,0.3);" onclick="MotoMap.stopRiding()" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          🛑 Sürüşü Bitir
        </button>
      </div>
    `;

    const mapPage = document.getElementById('page-map');
    if (mapPage) {
      mapPage.appendChild(panel);
    }
  },

  hideDashboard() {
    const panel = document.getElementById('ride-dashboard');
    if (panel) {
      panel.classList.remove('active');
      setTimeout(() => panel.remove(), 400);
    }

    /* Show FAB group again */
    const fabGroup = document.getElementById('map-fab-group');
    if (fabGroup) fabGroup.style.display = '';
  },

  updateDashboard(currentSpeed) {
    if (!this.isRiding) return;

    /* Time calculation (subtract paused time) */
    let elapsed = Date.now() - (this.rideData.startTime || Date.now()) - (this.rideData.pausedTime || 0);
    if (this.isPaused && this.rideData.pauseStart) {
      elapsed -= (Date.now() - this.rideData.pauseStart);
    }
    if (elapsed < 0) elapsed = 0;

    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const rMins = mins % 60;

    const timeStr = hrs > 0
      ? `${hrs}:${String(rMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(rMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const distKm = this.rideData.distance.toFixed(2);

    /* Speed */
    let speedKmh = 0;
    if (currentSpeed && currentSpeed > 0) {
      speedKmh = currentSpeed;
    } else if (seconds > 0) {
      speedKmh = (this.rideData.distance / (seconds / 3600)) || 0;
    }

    /* Average speed */
    const avgSpeed = seconds > 0
      ? ((this.rideData.distance / (elapsed / 3600000)) || 0).toFixed(0)
      : '0';

    /* Update DOM elements safely */
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    set('dash-time', timeStr);
    set('dash-distance', `${distKm} <span class="unit">km</span>`);
    set('dash-speed', `${Math.round(speedKmh)} <span class="unit">km/s</span>`);
    set('dash-avg-speed', `${avgSpeed} <span class="unit">km/s</span>`);
    set('dash-max-speed', `${Math.round(this.rideData.maxSpeed)} <span class="unit">km/s</span>`);

    /* GPS indicator */
    const gpsEl = document.getElementById('dash-gps');
    if (gpsEl) {
      gpsEl.style.color = this.watchId !== null ? 'var(--accent-success)' : 'var(--text-muted)';
      gpsEl.innerHTML = this.watchId !== null ? '●' : '○';
    }
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  showRideSummary() {
    const elapsed = Date.now() - (this.rideData.startTime || Date.now()) - (this.rideData.pausedTime || 0);
    const totalMin = (elapsed / 60000).toFixed(1);
    const totalKm = this.rideData.distance.toFixed(2);
    const avgSpeed = elapsed > 0
      ? ((this.rideData.distance / (elapsed / 3600000)) || 0).toFixed(1)
      : '0';
    const maxSpeed = Math.round(this.rideData.maxSpeed);

    const html = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 8px;">🏁</div>
        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin-bottom: 20px;">Sürüş Tamamlandı!</h3>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
          <div class="riding-stat">
            <span class="riding-stat-value">${totalKm}</span>
            <span class="riding-stat-label">km Məsafə</span>
          </div>
          <div class="riding-stat">
            <span class="riding-stat-value">${totalMin}</span>
            <span class="riding-stat-label">dəq Vaxt</span>
          </div>
          <div class="riding-stat">
            <span class="riding-stat-value">${avgSpeed}</span>
            <span class="riding-stat-label">km/s Orta</span>
          </div>
          <div class="riding-stat">
            <span class="riding-stat-value">${maxSpeed}</span>
            <span class="riding-stat-label">km/s Maks</span>
          </div>
        </div>

        <button class="p-edit-save" onclick="MotoApp.closeModal(); MotoMap.clearRoute();">
          Bağla
        </button>
      </div>
    `;

    MotoApp.openModal(html, 'Sürüş Xülasəsi');

    /* Save ride to storage */
    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.saveRide({
        id: 'ride_' + Date.now(),
        userId: MotoStorage.getCurrentUser() ? MotoStorage.getCurrentUser().id : 'unknown',
        distance: parseFloat(totalKm),
        duration: parseFloat(totalMin),
        avgSpeed: parseFloat(avgSpeed),
        maxSpeed: maxSpeed,
        path: this.rideData.path,
        date: new Date().toISOString(),
      });
    }
  },

  /* ──────────────────────────────────────────────
     STATIC LOCATION SHARING
  ────────────────────────────────────────────── */
  shareStaticLocation(message, shareMode) {
    this.isSharing = true;
    this.getCurrentLocation((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (typeof MotoStorage !== 'undefined') {
        const user = MotoStorage.getCurrentUser();
        if (user) {
          MotoStorage.shareLocation({
            userId: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            lat: lat,
            lng: lng,
            message: message || '',
            mode: shareMode || 'friends',
            timestamp: Date.now(),
          });
        }
      }

      this.updateUserMarker(lat, lng);
      this.map.setView([lat, lng], 15, { animate: true });
      MotoApp.showToast('Yeriniz paylaşıldı! 📍', 'success');
      this.updateRidersOnline();
    });
  },

  stopSharingLocation() {
    this.isSharing = false;
    if (typeof MotoStorage !== 'undefined') {
      const user = MotoStorage.getCurrentUser();
      if (user) {
        MotoStorage.removeSharedLocation(user.id);
      }
    }
    MotoApp.showToast('Yer paylaşımı dayandırıldı', 'info');
    this.updateRidersOnline();
  },

  /* ──────────────────────────────────────────────
     DISPLAY OTHER USERS
  ────────────────────────────────────────────── */
  loadActiveLocations() {
    Object.keys(this.markers).forEach((id) => this.removeUserMarker(id));

    this.DEMO_USERS.forEach((u) => this.addUserMarker(u));

    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSharedLocations) {
      const shared = MotoStorage.getSharedLocations() || [];
      shared.forEach((loc) => {
        if (!this.markers[loc.userId]) {
          this.addUserMarker({
            id: loc.userId,
            name: loc.name,
            coords: [loc.lat, loc.lng],
            status: 'online',
            avatar: '🏍️',
            moto: '',
            color: '#22c55e',
          });
        }
      });
    }

    this.updateRidersOnline();
  },

  addUserMarker(userData) {
    if (!this.map || !userData.coords) return;
    const icon = this.createCustomIcon(userData);
    const marker = L.marker(userData.coords, { icon: icon }).addTo(this.map);
    marker.bindPopup(this.createUserPopup(userData));
    this.markers[userData.id] = marker;
  },

  removeUserMarker(userId) {
    if (this.markers[userId]) {
      this.map.removeLayer(this.markers[userId]);
      delete this.markers[userId];
    }
  },

  createCustomIcon(user) {
    const statusClass =
      user.status === 'riding'
        ? 'marker-riding'
        : user.status === 'online'
          ? 'marker-online'
          : 'marker-offline';

    return L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="marker-wrapper ${statusClass}">
          ${user.status === 'riding' ? '<div class="marker-pulse-ring"></div>' : ''}
          <div class="marker-avatar" style="border-color: ${user.color || '#ff6b35'}">
            <span>${user.avatar || '🏍️'}</span>
          </div>
          <div class="marker-name-tag">${user.name}</div>
        </div>
      `,
      iconSize: [48, 60],
      iconAnchor: [24, 60],
      popupAnchor: [0, -60],
    });
  },

  /* ──────────────────────────────────────────────
     DISPLAY ALERTS ON MAP
  ────────────────────────────────────────────── */
  loadAlerts() {
    Object.keys(this.alertMarkers).forEach((id) => {
      this.map.removeLayer(this.alertMarkers[id]);
      delete this.alertMarkers[id];
    });

    if (typeof MotoStorage !== 'undefined') {
      const alerts = MotoStorage.getAlerts() || [];
      alerts.forEach((a) => this.addAlertMarker(a));
    }
  },

  addAlertMarker(alertData) {
    if (!this.map || !alertData.lat || !alertData.lng) return;

    const typeInfo = (typeof MotoAlerts !== 'undefined'
      ? MotoAlerts.alertTypes
      : []
    ).find((t) => t.id === alertData.type) || {
      icon: '⚠️',
      color: '#ffaa00',
      label: 'Xəbərdarlıq',
    };

    const icon = L.divIcon({
      className: 'alert-map-marker',
      html: `
        <div class="alert-marker-wrapper" style="--alert-color: ${typeInfo.color}">
          <div class="alert-marker-pulse"></div>
          <div class="alert-marker-icon">${typeInfo.icon}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -24],
    });

    const marker = L.marker([alertData.lat, alertData.lng], { icon: icon }).addTo(this.map);
    marker.bindPopup(this.createAlertPopup(alertData, typeInfo));
    this.alertMarkers[alertData.id] = marker;
  },

  /* ──────────────────────────────────────────────
     DISPLAY EVENTS ON MAP
  ────────────────────────────────────────────── */
  loadEvents() {
    Object.keys(this.eventMarkers).forEach((id) => {
      this.map.removeLayer(this.eventMarkers[id]);
      delete this.eventMarkers[id];
    });

    if (typeof MotoStorage !== 'undefined') {
      const events = MotoStorage.getEvents() || [];
      events.forEach((ev) => this.addEventMarker(ev));
    }
  },

  addEventMarker(eventData) {
    if (!this.map || !eventData.lat || !eventData.lng) return;

    const icon = L.divIcon({
      className: 'event-map-marker',
      html: `
        <div class="event-marker-wrapper">
          <div class="event-marker-icon">🏁</div>
          <div class="event-marker-label">${eventData.title ? eventData.title.substring(0, 12) : 'Tədbir'}</div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50],
    });

    const marker = L.marker([eventData.lat, eventData.lng], { icon: icon }).addTo(this.map);
    marker.bindPopup(this.createEventPopup(eventData));
    this.eventMarkers[eventData.id] = marker;
  },

  /* ──────────────────────────────────────────────
     POPUPS
  ────────────────────────────────────────────── */
  createUserPopup(user) {
    const statusText =
      user.status === 'riding'
        ? 'Sürüşdə 🏍️'
        : user.status === 'online'
          ? 'Onlayn 🟢'
          : 'Oflayn ⚫';
    return `
      <div class="moto-popup user-popup">
        <div class="popup-avatar">${user.avatar || '🏍️'}</div>
        <strong class="popup-name">${user.name}</strong>
        <div class="popup-moto">${user.moto || ''}</div>
        <div class="popup-status" style="color:${user.color || '#ccc'}">${statusText}</div>
      </div>
    `;
  },

  createAlertPopup(alert, typeInfo) {
    const timeAgo = this.formatTimeAgo(alert.timestamp || alert.createdAt);
    return `
      <div class="moto-popup alert-popup">
        <div class="popup-alert-icon" style="color:${typeInfo.color}">${typeInfo.icon}</div>
        <strong>${typeInfo.label}</strong>
        <p class="popup-desc">${alert.description || ''}</p>
        <div class="popup-time">🕐 ${timeAgo}</div>
      </div>
    `;
  },

  createEventPopup(event) {
    const date = event.date
      ? new Date(event.date).toLocaleDateString('az-AZ')
      : '';
    const count = event.participants ? event.participants.length : 0;
    return `
      <div class="moto-popup event-popup">
        <strong>🏁 ${event.title || 'Tədbir'}</strong>
        <p class="popup-desc">${event.description || ''}</p>
        <div class="popup-meta">📅 ${date} · 👥 ${count} iştirakçı</div>
        <button class="popup-btn" onclick="MotoApp.navigateTo('events')">
          Ətraflı bax
        </button>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     SHARE MODE MODAL
  ────────────────────────────────────────────── */
  showShareModeModal(callback) {
    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button class="share-mode-btn" data-mode="friends" style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:14px; cursor:pointer; transition: all 0.2s; text-align:left;" onmouseover="this.style.borderColor='rgba(255,107,53,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
          <span style="font-size:1.6rem;">👥</span>
          <div>
            <div style="font-weight:600; color:#ddd; font-size:0.9rem;">Dostlar</div>
            <div style="font-size:0.75rem; color:#777; margin-top:2px;">Yalnız dostlarınız görəcək</div>
          </div>
        </button>
        <button class="share-mode-btn" data-mode="community" style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:14px; cursor:pointer; transition: all 0.2s; text-align:left;" onmouseover="this.style.borderColor='rgba(255,107,53,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
          <span style="font-size:1.6rem;">🌍</span>
          <div>
            <div style="font-weight:600; color:#ddd; font-size:0.9rem;">Bütün İcma</div>
            <div style="font-size:0.75rem; color:#777; margin-top:2px;">Hər kəs görəcək</div>
          </div>
        </button>
      </div>
    `;

    MotoApp.openModal(html, 'Paylaşım Rejimi');

    setTimeout(() => {
      document.querySelectorAll('.share-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          MotoApp.closeModal();
          if (callback) callback(mode);
        });
      });
    }, 100);
  },

  /* ──────────────────────────────────────────────
     ROUTE DRAWING
  ────────────────────────────────────────────── */
  drawRoute(coordinates) {
    if (!this.map || !coordinates || coordinates.length < 2) return;
    this.clearRoute();
    this.routeLine = L.polyline(coordinates, {
      color: '#ff6b35',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1,
      lineJoin: 'round',
    }).addTo(this.map);
  },

  clearRoute() {
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
  },

  /* ──────────────────────────────────────────────
     DEMO ANIMATION (no demo users)
  ────────────────────────────────────────────── */
  startDemoAnimation() { /* No demo users */ },
  stopDemoAnimation() {
    if (this.demoAnimationId) {
      clearTimeout(this.demoAnimationId);
      this.demoAnimationId = null;
    }
  },

  /* ──────────────────────────────────────────────
     BACKWARD COMPAT — old panel methods
  ────────────────────────────────────────────── */
  showRidingPanel() { this.showDashboard(); },
  hideRidingPanel() { this.hideDashboard(); },
  updateRideStats(speed) { this.updateDashboard(speed); },
  showLocationSharePanel() {
    this.expandFAB();
  },
  hideLocationSharePanel() {
    this.collapseFAB();
  },

  /* ──────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────── */
  formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'İndicə';
    if (mins < 60) return `${mins} dəq əvvəl`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} saat əvvəl`;
    const days = Math.floor(hrs / 24);
    return `${days} gün əvvəl`;
  },
};
