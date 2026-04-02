/* ═══════════════════════════════════════════════════════════════
   MotoRide — Leaflet Map Module
   Real-time location sharing with background tracking
   ═══════════════════════════════════════════════════════════════ */

let myMarker = null;
const riderMarkers = {};

function initMap() {
  if (state.map) {
    state.map.invalidateSize();
    return;
  }

  const defaultCenter = [40.4093, 49.8671]; // Bakı

  state.map = L.map('map', {
    center: defaultCenter,
    zoom: 12,
    zoomControl: false,
    attributionControl: false,
  });

  // Dark CartoDB tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(state.map);

  // Try get real location on init
  getCurrentLocation().then(pos => {
    if (pos) {
      state.map.setView([pos.lat, pos.lng], 14);
      addMyMarker(pos.lat, pos.lng);
    }
  });

  // Request nearby riders from server
  if (state.socket) {
    state.socket.emit('location:get-nearby');
  }

  // Re-render existing riders
  renderRiders();
}

// ── My Location Marker ─────────────────────────────────────────
function createMarkerIcon(isSharing) {
  const color = isSharing ? '#00E676' : '#FF6B00';
  const bg = isSharing ? 'rgba(0,230,118,0.12)' : 'rgba(255,107,0,0.12)';
  const glow = isSharing ? 'rgba(0,230,118,0.6)' : 'rgba(255,107,0,0.6)';

  return L.divIcon({
    className: 'my-location-marker',
    html: `<div style="
      width: 46px; height: 46px;
      border-radius: 50%;
      background: ${bg};
      border: 2px solid ${color};
      display: flex; align-items: center; justify-content: center;
      animation: ${isSharing ? 'myPulse 2s infinite' : 'none'};
    ">
      <div style="
        width: 16px; height: 16px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 12px ${glow};
      "></div>
    </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

function addMyMarker(lat, lng) {
  if (myMarker) {
    myMarker.setLatLng([lat, lng]);
    myMarker.setIcon(createMarkerIcon(state.isSharingLocation));
    return;
  }

  myMarker = L.marker([lat, lng], {
    icon: createMarkerIcon(state.isSharingLocation),
    zIndexOffset: 1000
  }).addTo(state.map);
}

function updateMyMarker() {
  if (!state.currentPosition) return;
  const { lat, lng } = state.currentPosition;

  if (myMarker) {
    myMarker.setLatLng([lat, lng]);
    myMarker.setIcon(createMarkerIcon(state.isSharingLocation));
  } else if (state.map) {
    addMyMarker(lat, lng);
  }
}

// ── Rider Markers ──────────────────────────────────────────────
function createRiderIcon(name) {
  const initial = (name || '?')[0].toUpperCase();
  return L.divIcon({
    className: 'rider-marker',
    html: `<div style="
      width: 42px; height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FF6B00, #FF9800);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 14px rgba(255,107,0,0.5);
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
      color: white;
      border: 2px solid rgba(255,255,255,0.2);
    ">${initial}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function renderRiders() {
  if (!state.map) return;

  const riders = state.riders;
  const riderIds = Object.keys(riders);

  // Remove stale markers
  Object.keys(riderMarkers).forEach(id => {
    if (!riders[id]) {
      state.map.removeLayer(riderMarkers[id]);
      delete riderMarkers[id];
    }
  });

  // Add/update markers
  riderIds.forEach(id => {
    const r = riders[id];
    const lat = r.location?.lat || r.lat;
    const lng = r.location?.lng || r.lng;
    if (!lat || !lng) return;

    if (riderMarkers[id]) {
      // Smooth move
      riderMarkers[id].setLatLng([lat, lng]);
    } else {
      riderMarkers[id] = L.marker([lat, lng], {
        icon: createRiderIcon(r.name)
      })
        .addTo(state.map)
        .on('click', () => showRiderPopup(r));
    }
  });

  // Update riders bar
  updateRidersBar(riderIds.map(id => riders[id]));

  // Update badge
  const badge = document.getElementById('riders-count');
  if (badge) badge.textContent = riderIds.length;
}

function updateRidersBar(riders) {
  const bar = document.getElementById('riders-bar');
  if (!bar) return;

  if (riders.length === 0) {
    bar.classList.remove('show');
    return;
  }

  bar.classList.add('show');
  bar.innerHTML = riders.map(r => {
    const name = r.name || 'Naməlum';
    const bike = r.motorcycle ? `${r.motorcycle.brand} ${r.motorcycle.model}` : '';
    const status = r.location?.status || r.status || '';
    return `
      <div class="rider-card" onclick="focusRider('${r.userId}')">
        <div class="rider-card-header">
          <div class="rider-card-avatar">${name[0]}</div>
          <div class="rider-card-name">${name}</div>
        </div>
        ${bike ? `<div class="rider-card-bike">${bike}</div>` : ''}
        ${status ? `<div class="rider-card-status">💬 ${status}</div>` : ''}
      </div>
    `;
  }).join('');
}

function focusRider(userId) {
  const r = state.riders[userId];
  if (!r || !state.map) return;
  const lat = r.location?.lat || r.lat;
  const lng = r.location?.lng || r.lng;
  if (lat && lng) state.map.setView([lat, lng], 16);
}

function showRiderPopup(rider) {
  if (!state.map) return;
  const name = rider.name || 'Naməlum';
  const bike = rider.motorcycle ? `${rider.motorcycle.brand} ${rider.motorcycle.model}` : '';
  const status = rider.location?.status || rider.status || '';
  const lat = rider.location?.lat || rider.lat;
  const lng = rider.location?.lng || rider.lng;

  L.popup({ className: 'rider-popup', maxWidth: 250 })
    .setLatLng([lat, lng])
    .setContent(`
      <div style="background:var(--card);padding:16px;border-radius:12px;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FF6B00,#FF9800);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white">${name[0]}</div>
          <div>
            <div style="font-weight:700;font-size:15px">${name}</div>
            <div style="font-size:11px;color:#FF9800">${rider.userType === 'rider' ? '🏍️ Sürücü' : '👤 Sərnişin'}</div>
          </div>
        </div>
        ${bike ? `<div style="padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:13px;margin-bottom:6px">🏍️ ${bike}</div>` : ''}
        ${status ? `<div style="font-size:12px;color:rgba(255,255,255,0.5)">💬 ${status}</div>` : ''}
      </div>
    `)
    .openOn(state.map);
}
