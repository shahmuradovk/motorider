/* ================================================================
   MotoMap — Map & Live Location Module (Leaflet.js)
   MotoRiders Community App (Baku, Azerbaijan)
   ================================================================ */

const MotoMap = {
  map: null,
  userMarker: null,
  watchId: null,
  isRiding: false,
  isSharing: false,
  rideData: { path: [], startTime: null, distance: 0 },
  markers: {},
  alertMarkers: {},
  eventMarkers: {},
  routeLine: null,
  rideTimer: null,
  demoAnimationId: null,

  /* Baku centre */
  BAKU_CENTER: [40.4093, 49.8671],
  DEFAULT_ZOOM: 13,

  /* Demo users at Baku landmarks */
  DEMO_USERS: [
    {
      id: 'demo_1',
      name: 'Rəşad',
      moto: 'Honda CB650R',
      avatar: '🧔',
      coords: [40.3594, 49.8214],
      status: 'riding',
      color: '#ff6b35',
    },
    {
      id: 'demo_2',
      name: 'Nicat',
      moto: 'Yamaha MT-07',
      avatar: '👨',
      coords: [40.3663, 49.8372],
      status: 'online',
      color: '#22c55e',
    },
    {
      id: 'demo_3',
      name: 'Elvin',
      moto: 'Kawasaki Z900',
      avatar: '🧑',
      coords: [40.3616, 49.8445],
      status: 'riding',
      color: '#ff6b35',
    },
    {
      id: 'demo_4',
      name: 'Tural',
      moto: 'BMW R1250GS',
      avatar: '👦',
      coords: [40.4097, 49.8672],
      status: 'online',
      color: '#22c55e',
    },
    {
      id: 'demo_5',
      name: 'Sənan',
      moto: 'Ducati Monster',
      avatar: '🧔‍♂️',
      coords: [40.3761, 49.8445],
      status: 'riding',
      color: '#ff6b35',
    },
    {
      id: 'demo_6',
      name: 'Kamran',
      moto: 'KTM Duke 390',
      avatar: '👤',
      coords: [40.3873, 49.858],
      status: 'offline',
      color: '#6b7280',
    },
    {
      id: 'demo_7',
      name: 'Vüqar',
      moto: 'Suzuki GSX-R',
      avatar: '🙎‍♂️',
      coords: [40.4143, 49.8747],
      status: 'online',
      color: '#22c55e',
    },
    {
      id: 'demo_8',
      name: 'Əli',
      moto: 'Harley Iron 883',
      avatar: '🧑‍🦱',
      coords: [40.3567, 49.8394],
      status: 'riding',
      color: '#ff6b35',
    },
  ],

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.setupMap();
    this.addMapControls();
    this.loadActiveLocations();
    this.loadAlerts();
    this.loadEvents();
    this.startDemoAnimation();

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

  addMapControls() {
    if (!this.map) return;

    /* Custom zoom control */
    const zoomControl = L.control({ position: 'topright' });
    zoomControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'moto-map-controls');
      div.innerHTML = `
        <button class="map-ctrl-btn" id="map-zoom-in" title="Yaxınlaşdır">+</button>
        <button class="map-ctrl-btn" id="map-zoom-out" title="Uzaqlaşdır">−</button>
        <button class="map-ctrl-btn" id="map-locate" title="Mənim yerim">📍</button>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    zoomControl.addTo(this.map);

    /* Bind control buttons after a tick (DOM needs to render) */
    setTimeout(() => {
      const zoomIn = document.getElementById('map-zoom-in');
      const zoomOut = document.getElementById('map-zoom-out');
      const locate = document.getElementById('map-locate');
      if (zoomIn) zoomIn.addEventListener('click', () => this.map.zoomIn());
      if (zoomOut) zoomOut.addEventListener('click', () => this.map.zoomOut());
      if (locate) locate.addEventListener('click', () => this.centerOnUser());
    }, 100);
  },

  /* ──────────────────────────────────────────────
     USER LOCATION
  ────────────────────────────────────────────── */
  getCurrentLocation(callback) {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using Baku center');
      /* Fake position for demo */
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
        /* On error fallback to Baku center */
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
        const speed = pos.coords.speed; // m/s or null

        this.updateUserMarker(lat, lng);

        if (this.isRiding) {
          const path = this.rideData.path;
          if (path.length > 0) {
            const last = path[path.length - 1];
            const seg = this.calculateDistance(
              last[0],
              last[1],
              lat,
              lng
            );
            this.rideData.distance += seg;
          }
          path.push([lat, lng]);
          this.drawRoute(path);
          this.updateRideStats(speed);
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
    this.isSharing = shareMode === 'community' || shareMode === 'friends';
    this.rideData = { path: [], startTime: Date.now(), distance: 0 };

    this.startWatching();
    this.showRidingPanel();

    /* Timer updates every second */
    this.rideTimer = setInterval(() => this.updateRideStats(), 1000);

    if (typeof MotoApp !== 'undefined') {
      MotoApp.showToast('Sürüş başladı! 🏍️', 'success');
    }
  },

  stopRiding() {
    if (!this.isRiding) return;
    this.isRiding = false;
    this.isSharing = false;

    if (this.rideTimer) {
      clearInterval(this.rideTimer);
      this.rideTimer = null;
    }
    this.stopWatching();
    this.hideRidingPanel();
    this.showRideSummary();
  },

  updateRideStats(currentSpeed) {
    const elapsed = Date.now() - (this.rideData.startTime || Date.now());
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const rMins = mins % 60;

    const timeStr =
      hrs > 0
        ? `${hrs}:${String(rMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(rMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const distKm = this.rideData.distance.toFixed(2);

    /* Speed: use geolocation speed if available, else calc from distance/time */
    let speedKmh = 0;
    if (currentSpeed && currentSpeed > 0) {
      speedKmh = (currentSpeed * 3.6).toFixed(0); // m/s → km/h
    } else if (seconds > 0) {
      speedKmh = ((this.rideData.distance / (seconds / 3600)) || 0).toFixed(0);
    }

    const timeEl = document.getElementById('ride-time');
    const distEl = document.getElementById('ride-distance');
    const speedEl = document.getElementById('ride-speed');

    if (timeEl) timeEl.textContent = timeStr;
    if (distEl) distEl.textContent = `${distKm} km`;
    if (speedEl) speedEl.textContent = `${speedKmh} km/s`;
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
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
    const elapsed = Date.now() - (this.rideData.startTime || Date.now());
    const totalMin = (elapsed / 60000).toFixed(1);
    const totalKm = this.rideData.distance.toFixed(2);
    const avgSpeed =
      elapsed > 0
        ? ((this.rideData.distance / (elapsed / 3600000)) || 0).toFixed(1)
        : '0';

    const html = `
      <div class="ride-summary">
        <div class="ride-summary-icon">🏁</div>
        <h3 class="ride-summary-title">Sürüş Tamamlandı!</h3>

        <div class="ride-summary-stats">
          <div class="summary-stat">
            <span class="summary-stat-value">${totalKm}</span>
            <span class="summary-stat-label">km Məsafə</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value">${totalMin}</span>
            <span class="summary-stat-label">dəqiqə Vaxt</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value">${avgSpeed}</span>
            <span class="summary-stat-label">km/s Orta Sürət</span>
          </div>
        </div>

        <button class="btn-primary" onclick="MotoApp.closeModal(); MotoMap.clearRoute();">
          Bağla
        </button>
      </div>
    `;

    if (typeof MotoApp !== 'undefined') {
      MotoApp.openModal(html, 'Sürüş Xülasəsi');
    }

    /* Save ride to storage */
    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.saveRide({
        id: 'ride_' + Date.now(),
        userId:
          MotoStorage.getCurrentUser()
            ? MotoStorage.getCurrentUser().id
            : 'unknown',
        distance: parseFloat(totalKm),
        duration: parseFloat(totalMin),
        avgSpeed: parseFloat(avgSpeed),
        path: this.rideData.path,
        date: new Date().toISOString(),
      });
    }
  },

  /* ──────────────────────────────────────────────
     STATIC LOCATION SHARING  (Haradayam)
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
            name: user.name,
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

      if (typeof MotoApp !== 'undefined') {
        MotoApp.showToast('Yeriniz paylaşıldı! 📍', 'success');
      }
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
    this.hideLocationSharePanel();
    if (typeof MotoApp !== 'undefined') {
      MotoApp.showToast('Yer paylaşımı dayandırıldı', 'info');
    }
  },

  /* ──────────────────────────────────────────────
     DISPLAY OTHER USERS
  ────────────────────────────────────────────── */
  loadActiveLocations() {
    /* Clear old markers */
    Object.keys(this.markers).forEach((id) => this.removeUserMarker(id));

    /* Demo users */
    this.DEMO_USERS.forEach((u) => this.addUserMarker(u));

    /* Shared locations from storage */
    if (typeof MotoStorage !== 'undefined') {
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
    /* Clear old */
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

    const marker = L.marker([alertData.lat, alertData.lng], { icon: icon }).addTo(
      this.map
    );
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

    const marker = L.marker([eventData.lat, eventData.lng], { icon: icon }).addTo(
      this.map
    );
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
        <button class="popup-btn" onclick="MotoApp.showToast('Mesaj funksiyası tezliklə!', 'info')">
          💬 Mesaj
        </button>
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
      <div class="share-mode-options">
        <button class="share-mode-btn" data-mode="friends">
          <span class="share-mode-icon">👥</span>
          <span class="share-mode-label">Dostlar</span>
          <span class="share-mode-desc">Yalnız dostlarınız görəcək</span>
        </button>
        <button class="share-mode-btn" data-mode="community">
          <span class="share-mode-icon">🌍</span>
          <span class="share-mode-label">Bütün İcma</span>
          <span class="share-mode-desc">Hər kəs görəcək</span>
        </button>
      </div>
    `;

    if (typeof MotoApp !== 'undefined') {
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
    }
  },

  /* ──────────────────────────────────────────────
     RIDING PANEL
  ────────────────────────────────────────────── */
  showRidingPanel() {
    let panel = document.getElementById('riding-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'riding-panel';
      panel.className = 'riding-panel';
      panel.innerHTML = `
        <div class="riding-stats">
          <div class="riding-stat">
            <span class="riding-stat-icon">⏱️</span>
            <span class="riding-stat-label">Vaxt</span>
            <span class="riding-stat-value" id="ride-time">00:00</span>
          </div>
          <div class="riding-stat">
            <span class="riding-stat-icon">📏</span>
            <span class="riding-stat-label">Məsafə</span>
            <span class="riding-stat-value" id="ride-distance">0.00 km</span>
          </div>
          <div class="riding-stat">
            <span class="riding-stat-icon">🏎️</span>
            <span class="riding-stat-label">Sürət</span>
            <span class="riding-stat-value" id="ride-speed">0 km/s</span>
          </div>
        </div>
        <button class="btn-danger ride-stop-btn" id="ride-stop-btn">
          🛑 Bitir
        </button>
      `;
      const mapPage = document.getElementById('page-map');
      if (mapPage) {
        mapPage.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }

      document
        .getElementById('ride-stop-btn')
        .addEventListener('click', () => this.stopRiding());
    }
    panel.classList.add('active');
  },

  hideRidingPanel() {
    const panel = document.getElementById('riding-panel');
    if (panel) panel.classList.remove('active');
  },

  /* ──────────────────────────────────────────────
     LOCATION SHARE PANEL
  ────────────────────────────────────────────── */
  showLocationSharePanel() {
    let panel = document.getElementById('location-share-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'location-share-panel';
      panel.className = 'location-share-panel';
      panel.innerHTML = `
        <h3 class="share-panel-title">📍 Canlı Yer Paylaşımı</h3>
        <div class="share-panel-actions">
          <button class="btn-primary share-action-btn" id="btn-start-ride">
            🏍️ Sürüşə Başla
          </button>
          <button class="btn-secondary share-action-btn" id="btn-share-location">
            📌 Haradayam Paylaş
          </button>
        </div>
        <div class="share-panel-input" id="share-msg-container" style="display:none;">
          <input type="text" id="share-message-input" class="input-field"
                 placeholder="Mesaj əlavə et (istəyə bağlı)..." maxlength="100" />
          <div class="share-panel-row">
            <button class="btn-primary btn-sm" id="btn-send-share">Paylaş</button>
            <button class="btn-ghost btn-sm" id="btn-cancel-share">Ləğv et</button>
          </div>
        </div>
      `;
      const mapPage = document.getElementById('page-map');
      if (mapPage) {
        mapPage.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }

      /* Bind buttons */
      document.getElementById('btn-start-ride').addEventListener('click', () => {
        this.hideLocationSharePanel();
        this.showShareModeModal((mode) => this.startRiding(mode));
      });

      document
        .getElementById('btn-share-location')
        .addEventListener('click', () => {
          document.getElementById('share-msg-container').style.display = 'block';
        });

      document.getElementById('btn-send-share').addEventListener('click', () => {
        const msg = document.getElementById('share-message-input').value;
        this.hideLocationSharePanel();
        this.showShareModeModal((mode) => this.shareStaticLocation(msg, mode));
      });

      document
        .getElementById('btn-cancel-share')
        .addEventListener('click', () => {
          document.getElementById('share-msg-container').style.display = 'none';
        });
    }
    panel.classList.add('active');
  },

  hideLocationSharePanel() {
    const panel = document.getElementById('location-share-panel');
    if (panel) panel.classList.remove('active');
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
     DEMO ANIMATION (simulate moving users)
  ────────────────────────────────────────────── */
  startDemoAnimation() {
    const offsets = this.DEMO_USERS.map(() => ({
      latOff: 0,
      lngOff: 0,
      dLat: (Math.random() - 0.5) * 0.0004,
      dLng: (Math.random() - 0.5) * 0.0004,
    }));

    const animate = () => {
      this.DEMO_USERS.forEach((user, i) => {
        if (user.status !== 'riding') return;
        const m = this.markers[user.id];
        if (!m) return;

        offsets[i].latOff += offsets[i].dLat;
        offsets[i].lngOff += offsets[i].dLng;

        /* Reverse direction when drifted too far */
        if (Math.abs(offsets[i].latOff) > 0.005) offsets[i].dLat *= -1;
        if (Math.abs(offsets[i].lngOff) > 0.005) offsets[i].dLng *= -1;

        const newLat = user.coords[0] + offsets[i].latOff;
        const newLng = user.coords[1] + offsets[i].lngOff;
        m.setLatLng([newLat, newLng]);
      });

      this.demoAnimationId = setTimeout(animate, 3000);
    };

    this.demoAnimationId = setTimeout(animate, 5000);
  },

  stopDemoAnimation() {
    if (this.demoAnimationId) {
      clearTimeout(this.demoAnimationId);
      this.demoAnimationId = null;
    }
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
