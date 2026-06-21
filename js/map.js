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
  _fabBound: false,
  _controlsBound: false,

  /* Baku centre */
  BAKU_CENTER: [40.4093, 49.8671],
  DEFAULT_ZOOM: 13,
  DEMO_USERS: [],

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    console.log('🗺️ MotoMap: init başladı');
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
    console.log('🗺️ MotoMap: init tamamlandı');
  },

  /* ──────────────────────────────────────────────
     SAFE DISPLAY NAME — fixes "undefined" labels
  ────────────────────────────────────────────── */
  safeDisplayName(user) {
    if (!user) return 'Naməlum';
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    if (first || last) return `${first} ${last}`.trim();
    if (user.name) return user.name;
    if (user.email) return user.email;
    return 'Siz';
  },

  /* ──────────────────────────────────────────────
     MAP SETUP
  ────────────────────────────────────────────── */
  setupMap() {
    if (this.map) return;

    const container = document.getElementById('map-container');
    if (!container) {
      console.warn('⚠️ MotoMap: #map-container tapılmadı');
      return;
    }

    this.map = L.map(container, {
      center: this.BAKU_CENTER,
      zoom: this.DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(this.map);
    console.log('✅ Leaflet map yaradıldı');
  },

  /* ──────────────────────────────────────────────
     MAP CONTROLS — center, share, layer
  ────────────────────────────────────────────── */
  setupMapControls() {
    if (this._controlsBound) return;
    this._controlsBound = true;

    const centerBtn = document.getElementById('map-center-btn');
    const shareBtn = document.getElementById('map-share-toggle');
    const layerBtn = document.getElementById('map-layer-btn');

    if (centerBtn) {
      centerBtn.addEventListener('click', (e) => { e.stopPropagation(); this.centerOnUser(); });
      console.log('✅ Center location button bound');
    } else { console.warn('⚠️ Missing map button: map-center-btn'); }

    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleShareLocation(); });
      console.log('✅ Share location button bound');
    } else { console.warn('⚠️ Missing map button: map-share-toggle'); }

    if (layerBtn) {
      layerBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMapLayer(); });
      console.log('✅ Map layers button bound');
    } else { console.warn('⚠️ Missing map button: map-layer-btn'); }
  },

  toggleMapLayer() {
    MotoApp.showToast('Xəritə təbəqəsi tezliklə!', 'info');
  },

  toggleShareLocation() {
    const btn = document.getElementById('map-share-toggle');
    if (this.isSharing) {
      this.stopSharingLocation();
      if (btn) btn.classList.remove('active');
    } else {
      this.isSharing = true;
      this.startWatching();
      this.getCurrentLocation((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (typeof MotoStorage !== 'undefined') {
          const user = MotoStorage.getCurrentUser();
          if (user) {
            MotoStorage.shareLocation({
              userId: user.id,
              name: this.safeDisplayName(user),
              lat, lng,
              message: '',
              mode: 'community',
              timestamp: Date.now(),
            });
          }
        }
        this.updateUserMarker(lat, lng);
        this.updateRidersOnline();
      });
      if (btn) btn.classList.add('active');
      MotoApp.showToast('Yeriniz paylaşılır 📍', 'success');
    }
  },

  /* ──────────────────────────────────────────────
     EXPANDABLE FAB GROUP
  ────────────────────────────────────────────── */
  setupFAB() {
    if (this._fabBound) return;
    this._fabBound = true;

    const mainFab = document.getElementById('map-fab-main');
    const startRide = document.getElementById('fab-start-ride');
    const shareLocation = document.getElementById('fab-share-location');
    const reportDanger = document.getElementById('fab-report-danger');

    if (mainFab) {
      mainFab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFAB();
      });
      console.log('✅ Main FAB button bound');
    } else { console.warn('⚠️ Missing map button: map-fab-main'); }

    if (startRide) {
      startRide.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('🏍️ Start ride clicked');
        this.collapseFAB();
        this.showShareModeModal((mode) => this.startRiding(mode));
      });
      console.log('✅ Start ride button bound');
    } else { console.warn('⚠️ Missing map button: fab-start-ride'); }

    if (shareLocation) {
      shareLocation.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('📍 Share location clicked');
        this.collapseFAB();
        this.showShareModeModal((mode) => this.shareStaticLocation('', mode));
      });
      console.log('✅ Share location button bound');
    } else { console.warn('⚠️ Missing map button: fab-share-location'); }

    if (reportDanger) {
      reportDanger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('⚠️ Report danger clicked');
        this.collapseFAB();
        if (typeof MotoAlerts !== 'undefined') {
          MotoAlerts.showCreateForm();
        } else {
          MotoApp.showToast('Xəbərdarlıq modulu yüklənməyib', 'error');
        }
      });
      console.log('✅ Report alert button bound');
    } else { console.warn('⚠️ Missing map button: fab-report-danger'); }

    /* Close FAB when clicking outside */
    document.addEventListener('click', (e) => {
      if (this.fabExpanded) {
        const group = document.getElementById('map-fab-group');
        if (group && !group.contains(e.target)) {
          this.collapseFAB();
        }
      }
    });
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
      setTimeout(() => {
        w.style.display = 'flex';
        w.style.pointerEvents = 'auto';
      }, i * 60);
    });
  },

  collapseFAB() {
    this.fabExpanded = false;
    const group = document.getElementById('map-fab-group');
    const main = document.getElementById('map-fab-main');
    if (group) group.classList.remove('expanded');
    if (main) main.classList.remove('expanded');

    const wrappers = group ? group.querySelectorAll('.map-fab-mini-wrapper') : [];
    wrappers.forEach(w => {
      w.style.display = 'none';
      w.style.pointerEvents = '';
    });
  },

  /* ──────────────────────────────────────────────
     LEGEND TOGGLE
  ────────────────────────────────────────────── */
  setupLegend() {
    const toggle = document.getElementById('map-legend-toggle');
    const content = document.getElementById('map-legend-content');
    if (toggle && content) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        content.classList.toggle('hidden');
      });
    }
  },

  /* ──────────────────────────────────────────────
     MAP SEARCH (basic placeholder)
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

      if (!q) { results.classList.add('hidden'); return; }

      results.classList.remove('hidden');
      results.innerHTML = `
        <div style="padding:12px; text-align:center; color:#999; font-size:0.82rem;">
          🔍 "${q}" üçün axtarış tezliklə
        </div>
      `;
    });
  },

  /* ──────────────────────────────────────────────
     RIDERS ONLINE — real count only
  ────────────────────────────────────────────── */
  updateRidersOnline() {
    let count = Object.keys(this.markers).length;

    /* Also count shared locations */
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSharedLocations) {
      const shared = MotoStorage.getSharedLocations() || [];
      count = Math.max(count, shared.length);
    }

    /* Show/hide green badge on FAB button */
    const fab = document.getElementById('map-fab-main');
    if (!fab) return;
    let badge = fab.querySelector('.fab-rider-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'fab-rider-badge';
        fab.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  },

  /* ──────────────────────────────────────────────
     USER LOCATION
  ────────────────────────────────────────────── */
  getCurrentLocation(callback) {
    if (!navigator.geolocation) {
      callback({
        coords: { latitude: this.BAKU_CENTER[0], longitude: this.BAKU_CENTER[1], speed: 0 },
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      callback,
      () => {
        callback({
          coords: { latitude: this.BAKU_CENTER[0], longitude: this.BAKU_CENTER[1], speed: 0 },
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

          let speedKmh = (speed && speed > 0) ? speed * 3.6 : 0;
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

    let userName = 'Siz';
    let initials = 'S';
    if (typeof MotoStorage !== 'undefined') {
      const user = MotoStorage.getCurrentUser();
      if (user) {
        userName = this.safeDisplayName(user);
        initials = MotoStorage.getInitials ? MotoStorage.getInitials(user.firstName, user.lastName) : userName.charAt(0);
      }
    }

    const icon = L.divIcon({
      className: 'moto-rider-marker',
      html: `
        <div class="rider-marker-self">
          <div class="rider-pulse-ring" style="border-color: #ff6b35;"></div>
          <div class="rider-avatar" style="background: linear-gradient(135deg, #ff6b35, #ff8c42); border-color: #ff6b35;">
            <span>${initials}</span>
          </div>
          <div class="rider-name-tag">${userName}</div>
        </div>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 32],
      popupAnchor: [0, -36],
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
      this.userMarker.setIcon(icon);
    } else {
      this.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(this.map);
    }
    this.userMarker.unbindPopup();
    this.userMarker.bindPopup(`<div class="moto-popup"><strong>📍 ${userName}</strong><p style="font-size:0.75rem;color:#999;margin:2px 0 0;">Siz buradasınız</p></div>`);
  },

  centerOnUser() {
    if (this.userMarker) {
      this.map.setView(this.userMarker.getLatLng(), 15, { animate: true });
    } else {
      this.getCurrentLocation((pos) => {
        this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
        this.map.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
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
    this.rideTimer = setInterval(() => this.updateDashboard(), 1000);
    MotoApp.showToast('Sürüş başladı! 🏍️', 'success');
  },

  pauseRiding() {
    if (!this.isRiding || this.isPaused) return;
    this.isPaused = true;
    this.rideData.pauseStart = Date.now();
    this.stopWatching();

    const pauseBtn = document.getElementById('dash-pause-btn');
    if (pauseBtn) { pauseBtn.innerHTML = '▶️'; pauseBtn.title = 'Davam et'; pauseBtn.classList.add('active'); }
    const statusEl = document.getElementById('dash-status');
    if (statusEl) statusEl.textContent = 'FASILƏ';
    MotoApp.showToast('Sürüş fasiləyə alındı ⏸️', 'info');
  },

  resumeRiding() {
    if (!this.isRiding || !this.isPaused) return;
    this.isPaused = false;
    if (this.rideData.pauseStart) {
      this.rideData.pausedTime += Date.now() - this.rideData.pauseStart;
      this.rideData.pauseStart = null;
    }
    this.startWatching();

    const pauseBtn = document.getElementById('dash-pause-btn');
    if (pauseBtn) { pauseBtn.innerHTML = '⏸️'; pauseBtn.title = 'Fasilə'; pauseBtn.classList.remove('active'); }
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
    if (this.rideTimer) { clearInterval(this.rideTimer); this.rideTimer = null; }
    this.stopWatching();
    this.hideDashboard();
    this.showRideSummary();
  },

  /* ──────────────────────────────────────────────
     PREMIUM FLOATING DASHBOARD
  ────────────────────────────────────────────── */
  showDashboard() {
    const fabGroup = document.getElementById('map-fab-group');
    if (fabGroup) fabGroup.style.display = 'none';

    let panel = document.getElementById('ride-dashboard');
    if (panel) panel.remove();

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
        <div class="live-indicator"><span class="live-indicator-dot"></span><span id="dash-status">CANLI</span></div>
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
        <button class="map-fab-mini" id="dash-pause-btn" title="Fasilə" style="width: 48px; height: 48px; border-radius: 50%;" onclick="MotoMap.togglePause()">⏸️</button>
        <button style="flex: 1; padding: 14px; background: linear-gradient(135deg, #ff3333, #ff6b35); border: none; border-radius: 12px; color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(255,51,51,0.3);" onclick="MotoMap.stopRiding()">🛑 Sürüşü Bitir</button>
      </div>
    `;

    const mapPage = document.getElementById('page-map');
    if (mapPage) mapPage.appendChild(panel);
  },

  hideDashboard() {
    const panel = document.getElementById('ride-dashboard');
    if (panel) { panel.classList.remove('active'); setTimeout(() => panel.remove(), 400); }
    const fabGroup = document.getElementById('map-fab-group');
    if (fabGroup) fabGroup.style.display = '';
  },

  updateDashboard(currentSpeed) {
    if (!this.isRiding) return;

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
    let speedKmh = (currentSpeed && currentSpeed > 0) ? currentSpeed : 0;
    const avgSpeed = seconds > 0 ? ((this.rideData.distance / (elapsed / 3600000)) || 0).toFixed(0) : '0';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    set('dash-time', timeStr);
    set('dash-distance', `${distKm} <span class="unit">km</span>`);
    set('dash-speed', `${Math.round(speedKmh)} <span class="unit">km/s</span>`);
    set('dash-avg-speed', `${avgSpeed} <span class="unit">km/s</span>`);
    set('dash-max-speed', `${Math.round(this.rideData.maxSpeed)} <span class="unit">km/s</span>`);

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
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  showRideSummary() {
    const elapsed = Date.now() - (this.rideData.startTime || Date.now()) - (this.rideData.pausedTime || 0);
    const totalMin = (elapsed / 60000).toFixed(1);
    const totalKm = this.rideData.distance.toFixed(2);
    const avgSpeed = elapsed > 0 ? ((this.rideData.distance / (elapsed / 3600000)) || 0).toFixed(1) : '0';
    const maxSpeed = Math.round(this.rideData.maxSpeed);

    const html = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 8px;">🏁</div>
        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin-bottom: 20px;">Sürüş Tamamlandı!</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
          <div class="riding-stat"><span class="riding-stat-value">${totalKm}</span><span class="riding-stat-label">km Məsafə</span></div>
          <div class="riding-stat"><span class="riding-stat-value">${totalMin}</span><span class="riding-stat-label">dəq Vaxt</span></div>
          <div class="riding-stat"><span class="riding-stat-value">${avgSpeed}</span><span class="riding-stat-label">km/s Orta</span></div>
          <div class="riding-stat"><span class="riding-stat-value">${maxSpeed}</span><span class="riding-stat-label">km/s Maks</span></div>
        </div>
        <button class="p-edit-save" onclick="MotoApp.closeModal(); MotoMap.clearRoute();">Bağla</button>
      </div>
    `;
    MotoApp.openModal(html, 'Sürüş Xülasəsi');

    if (typeof MotoStorage !== 'undefined') {
      const cu = MotoStorage.getCurrentUser();
      MotoStorage.saveRide({
        id: 'ride_' + Date.now(),
        userId: cu ? cu.id : 'unknown',
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
            name: this.safeDisplayName(user),
            lat, lng,
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

  /* ──────────────────────────────────────────────
     HARADAYAM — show current location
  ────────────────────────────────────────────── */
  showMyLocation() {
    MotoApp.showToast('📍 Yer təyin olunur...', 'info');
    this.getCurrentLocation((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.updateUserMarker(lat, lng);
      this.map.setView([lat, lng], 16, { animate: true });

      /* Reverse geocode via Nominatim */
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=az`)
        .then(r => r.json())
        .then(data => {
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const short = (data.address && (data.address.road || data.address.neighbourhood || data.address.suburb)) || addr.split(',')[0];
          MotoApp.showToast(`📍 ${short}`, 'success');

          /* Show popup on marker */
          if (this.userMarker) {
            this.userMarker.unbindPopup();
            this.userMarker.bindPopup(`
              <div class="moto-popup">
                <strong>📍 Siz buradasınız</strong>
                <p style="font-size:0.8rem; color:#999; margin:4px 0 0;">${short}</p>
              </div>
            `).openPopup();
          }
        })
        .catch(() => {
          MotoApp.showToast(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
        });
    });
  },

  /* ──────────────────────────────────────────────
     TƏHLÜKƏ BİLDİR — danger report on map
  ────────────────────────────────────────────── */
  startDangerReport() {
    /* Open modal IMMEDIATELY — don't wait for GPS */
    const lat = this.BAKU_CENTER[0];
    const lng = this.BAKU_CENTER[1];

    const types = [
      { id: 'accident', icon: '💥', label: 'Qəza' },
      { id: 'pothole', icon: '🕳️', label: 'Çuxur' },
      { id: 'construction', icon: '🚧', label: 'Yol təmiri' },
      { id: 'traffic', icon: '🚗', label: 'Sıx trafik' },
      { id: 'danger', icon: '⚠️', label: 'Digər təhlükə' },
    ];

    let typeBtns = '';
    types.forEach(t => {
      typeBtns += `<button class="danger-type-btn" data-type="${t.id}" onclick="MotoMap._selectDangerType(this, '${t.id}')" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:12px; cursor:pointer; flex:1; min-width:60px;"><span style="font-size:1.5rem;">${t.icon}</span><span style="font-size:0.72rem; color:#999;">${t.label}</span></button>`;
    });

    const html = `
      <div id="danger-report-form">
        <p style="font-size:0.82rem; color:#999; margin-bottom:12px;" id="danger-location-text">📍 Yer təyin olunur...</p>
        <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">${typeBtns}</div>
        <input type="hidden" id="danger-type" value="" />
        <input type="hidden" id="danger-lat" value="${lat}" />
        <input type="hidden" id="danger-lng" value="${lng}" />
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:0.82rem; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">Təsvir *</label>
          <textarea id="danger-desc" style="width:100%; padding:12px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:#eee; font-size:0.9rem; resize:vertical; min-height:60px;" rows="2" placeholder="Nə baş verir? Təsvir edin..." maxlength="200"></textarea>
        </div>
        <button onclick="MotoMap._submitDangerReport()" style="width:100%; padding:14px; background:linear-gradient(135deg, #ff3333, #ff6b35); border:none; border-radius:12px; color:#fff; font-weight:700; font-size:0.95rem; cursor:pointer;">
          ⚠️ Təhlükəni Bildir
        </button>
      </div>
    `;

    MotoApp.openModal(html, '⚠️ Təhlükə Bildir');

    /* Get GPS in background — update hidden fields when ready */
    this.getCurrentLocation((pos) => {
      const gLat = pos.coords.latitude;
      const gLng = pos.coords.longitude;
      const latEl = document.getElementById('danger-lat');
      const lngEl = document.getElementById('danger-lng');
      const locText = document.getElementById('danger-location-text');
      if (latEl) latEl.value = gLat;
      if (lngEl) lngEl.value = gLng;
      if (locText) locText.textContent = `📍 Yer tapıldı: ${gLat.toFixed(4)}, ${gLng.toFixed(4)}`;
    });
  },

  _selectDangerType(btn, typeId) {
    document.querySelectorAll('.danger-type-btn').forEach(b => {
      b.style.borderColor = 'rgba(255,255,255,0.08)';
      b.style.background = 'rgba(26,26,46,0.6)';
    });
    btn.style.borderColor = '#ff6b35';
    btn.style.background = 'rgba(255,107,53,0.15)';
    document.getElementById('danger-type').value = typeId;
  },

  _submitDangerReport() {
    const type = document.getElementById('danger-type').value;
    const desc = document.getElementById('danger-desc').value.trim();
    const lat = parseFloat(document.getElementById('danger-lat').value);
    const lng = parseFloat(document.getElementById('danger-lng').value);

    if (!type) {
      MotoApp.showToast('Təhlükə növünü seçin', 'error');
      return;
    }
    if (!desc) {
      MotoApp.showToast('Təsvir yazın', 'error');
      return;
    }

    const alert = {
      id: 'alert_' + Date.now(),
      type: type,
      description: desc,
      lat: lat,
      lng: lng,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      userId: '',
      votes: { up: 0, down: 0 },
    };

    if (typeof MotoStorage !== 'undefined') {
      const user = MotoStorage.getCurrentUser();
      if (user) alert.userId = user.id;
      MotoStorage.createAlert(alert);
    }

    /* Add marker to map */
    this.addAlertMarker(alert);

    MotoApp.closeModal();
    MotoApp.showToast('Təhlükə bildirişi göndərildi! ⚠️', 'success');

    /* Refresh alerts page if visible */
    if (typeof MotoAlerts !== 'undefined') MotoAlerts.renderAlerts();
  },

  stopSharingLocation() {
    this.isSharing = false;
    if (typeof MotoStorage !== 'undefined') {
      const user = MotoStorage.getCurrentUser();
      if (user && MotoStorage.removeSharedLocation) {
        MotoStorage.removeSharedLocation(user.id);
      }
    }
    MotoApp.showToast('Yer paylaşımı dayandırıldı', 'info');
    this.updateRidersOnline();
  },

  /* ──────────────────────────────────────────────
     DISPLAY OTHER USERS — uses safeDisplayName
  ────────────────────────────────────────────── */
  loadActiveLocations() {
    Object.keys(this.markers).forEach((id) => this.removeUserMarker(id));

    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSharedLocations) {
      const shared = MotoStorage.getSharedLocations() || [];
      const currentUser = MotoStorage.getCurrentUser();
      const myId = currentUser ? currentUser.id : '';

      shared.forEach((loc) => {
        if (loc.userId !== myId && !this.markers[loc.userId]) {
          this.addUserMarker({
            id: loc.userId,
            name: loc.name || 'Sürücü',
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
    const safeName = userData.name || 'Sürücü';
    const initial = safeName.charAt(0).toUpperCase();
    const isRiding = userData.status === 'riding';
    const isOnline = userData.status === 'online' || isRiding;
    const color = isRiding ? '#ff6b35' : '#22c55e';

    const icon = L.divIcon({
      className: 'moto-rider-marker',
      html: `
        <div class="rider-marker-other">
          ${isOnline ? `<div class="rider-pulse-ring" style="border-color: ${color};"></div>` : ''}
          <div class="rider-avatar" style="background: ${isRiding ? 'linear-gradient(135deg, #ff6b35, #ff8c42)' : 'linear-gradient(135deg, #22c55e, #4ade80)'}; border-color: ${color};">
            <span>${initial}</span>
          </div>
          ${isOnline ? `<div class="rider-status-dot" style="background: ${color};"></div>` : ''}
          <div class="rider-name-tag">${safeName}</div>
        </div>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 32],
      popupAnchor: [0, -36],
    });

    const marker = L.marker(userData.coords, { icon }).addTo(this.map);
    marker.bindPopup(this.createUserPopup(userData));
    this.markers[userData.id] = marker;
  },

  removeUserMarker(userId) {
    if (this.markers[userId]) {
      this.map.removeLayer(this.markers[userId]);
      delete this.markers[userId];
    }
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
    const typeInfo = (typeof MotoAlerts !== 'undefined' ? MotoAlerts.alertTypes : []).find((t) => t.id === alertData.type) || { icon: '⚠️', color: '#ffaa00', label: 'Xəbərdarlıq' };
    const icon = L.divIcon({
      className: 'alert-map-marker',
      html: `<div class="alert-marker-wrapper" style="--alert-color: ${typeInfo.color}"><div class="alert-marker-pulse"></div><div class="alert-marker-icon">${typeInfo.icon}</div></div>`,
      iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -24],
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
      html: `<div class="event-marker-wrapper"><div class="event-marker-icon">🏁</div><div class="event-marker-label">${eventData.title ? eventData.title.substring(0, 12) : 'Tədbir'}</div></div>`,
      iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -50],
    });
    const marker = L.marker([eventData.lat, eventData.lng], { icon: icon }).addTo(this.map);
    marker.bindPopup(this.createEventPopup(eventData));
    this.eventMarkers[eventData.id] = marker;
  },

  /* ──────────────────────────────────────────────
     POPUPS — uses safeDisplayName
  ────────────────────────────────────────────── */
  createUserPopup(user) {
    const name = user.name || this.safeDisplayName(user);
    const statusText = user.status === 'riding' ? 'Sürüşdə 🏍️' : user.status === 'online' ? 'Onlayn 🟢' : 'Oflayn ⚫';
    return `<div class="moto-popup user-popup"><div class="popup-avatar">${user.avatar || '🏍️'}</div><strong class="popup-name">${name}</strong><div class="popup-moto">${user.moto || ''}</div><div class="popup-status" style="color:${user.color || '#ccc'}">${statusText}</div></div>`;
  },

  createAlertPopup(alert, typeInfo) {
    const timeAgo = this.formatTimeAgo(alert.timestamp || alert.createdAt);
    return `<div class="moto-popup alert-popup"><div class="popup-alert-icon" style="color:${typeInfo.color}">${typeInfo.icon}</div><strong>${typeInfo.label}</strong><p class="popup-desc">${alert.description || ''}</p><div class="popup-time">🕐 ${timeAgo}</div></div>`;
  },

  createEventPopup(event) {
    const date = event.date ? new Date(event.date).toLocaleDateString('az-AZ') : '';
    const count = event.participants ? event.participants.length : 0;
    return `<div class="moto-popup event-popup"><strong>🏁 ${event.title || 'Tədbir'}</strong><p class="popup-desc">${event.description || ''}</p><div class="popup-meta">📅 ${date} · 👥 ${count} iştirakçı</div><button class="popup-btn" onclick="MotoApp.navigateTo('events')">Ətraflı bax</button></div>`;
  },

  /* ──────────────────────────────────────────────
     SHARE MODE MODAL
  ────────────────────────────────────────────── */
  showShareModeModal(callback) {
    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button class="share-mode-btn" data-mode="friends" style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:14px; cursor:pointer; text-align:left;">
          <span style="font-size:1.6rem;">👥</span>
          <div><div style="font-weight:600; color:#ddd; font-size:0.9rem;">Dostlar</div><div style="font-size:0.75rem; color:#777; margin-top:2px;">Yalnız dostlarınız görəcək</div></div>
        </button>
        <button class="share-mode-btn" data-mode="community" style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(26,26,46,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:14px; cursor:pointer; text-align:left;">
          <span style="font-size:1.6rem;">🌍</span>
          <div><div style="font-weight:600; color:#ddd; font-size:0.9rem;">Bütün İcma</div><div style="font-size:0.75rem; color:#777; margin-top:2px;">Hər kəs görəcək</div></div>
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
      color: '#ff6b35', weight: 4, opacity: 0.8, smoothFactor: 1, lineJoin: 'round',
    }).addTo(this.map);
  },

  clearRoute() {
    if (this.routeLine) { this.map.removeLayer(this.routeLine); this.routeLine = null; }
  },

  /* ──────────────────────────────────────────────
     BACKWARD COMPAT
  ────────────────────────────────────────────── */
  showRidingPanel() { this.showDashboard(); },
  hideRidingPanel() { this.hideDashboard(); },
  updateRideStats(speed) { this.updateDashboard(speed); },
  showLocationSharePanel() { this.expandFAB(); },
  hideLocationSharePanel() { this.collapseFAB(); },
  startDemoAnimation() {},
  stopDemoAnimation() { if (this.demoAnimationId) { clearTimeout(this.demoAnimationId); this.demoAnimationId = null; } },

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
    return `${Math.floor(hrs / 24)} gün əvvəl`;
  },
};
