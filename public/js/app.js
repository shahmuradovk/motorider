/* ═══════════════════════════════════════════════════════════════
   MotoRide — App Core (SPA Router, API, Auth, State)
   ═══════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('motoride_token'),
  user: JSON.parse(localStorage.getItem('motoride_user') || 'null'),
  currentPage: 'map',
  drawerOpen: false,
  socket: null,
  map: null,
  riders: {},
  isSharingLocation: false,
  currentPosition: null,
  watchId: null,
};

const API = '/api';

// ── API Service ────────────────────────────────────────────────
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  try {
    const res = await fetch(`${API}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Xəta baş verdi');
    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch')) throw new Error('Serverlə əlaqə yoxdur');
    throw err;
  }
}

// ── Auth ───────────────────────────────────────────────────────
async function login(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('motoride_token', data.token);
  localStorage.setItem('motoride_user', JSON.stringify(data.user));
  return data;
}

async function register(formData) {
  const data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('motoride_token', data.token);
  localStorage.setItem('motoride_user', JSON.stringify(data.user));
  return data;
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('motoride_token');
  localStorage.removeItem('motoride_user');
  stopSharingLocation();
  if (state.socket) { state.socket.disconnect(); state.socket = null; }
  navigate('login');
}

async function checkAuth() {
  if (!state.token) return false;
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    localStorage.setItem('motoride_user', JSON.stringify(data.user));
    return true;
  } catch {
    logout();
    return false;
  }
}

// ── Socket.io ──────────────────────────────────────────────────
function connectSocket() {
  if (state.socket || !state.token) return;

  state.socket = io({ auth: { token: state.token }, transports: ['websocket'] });

  state.socket.on('connect', () => {
    console.log('🔌 Socket connected');
    state.socket.emit('location:get-nearby');
  });

  state.socket.on('location:nearby-riders', (data) => {
    state.riders = {};
    for (const r of data.riders) state.riders[r.userId] = r;
    renderRiders();
  });

  state.socket.on('location:rider-updated', (data) => {
    state.riders[data.userId] = data;
    renderRiders();
  });

  state.socket.on('location:rider-offline', (data) => {
    delete state.riders[data.userId];
    renderRiders();
  });

  state.socket.on('status:updated', (data) => {
    if (state.riders[data.userId]) {
      state.riders[data.userId].status = data.status;
      renderRiders();
    }
  });
}

// ── Geolocation ────────────────────────────────────────────────
function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.currentPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(state.currentPosition);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function startSharingLocation() {
  if (!navigator.geolocation) { showToast('Lokasiya dəstəklənmir', 'error'); return; }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.isSharingLocation = true;
      state.currentPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      emitLocation();
      updateLocationUI();

      // Continuous tracking
      state.watchId = navigator.geolocation.watchPosition(
        (p) => {
          state.currentPosition = { lat: p.coords.latitude, lng: p.coords.longitude };
          emitLocation();
          updateMyMarker();
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    },
    (err) => { showToast('Lokasiya alına bilmədi: ' + err.message, 'error'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function stopSharingLocation() {
  state.isSharingLocation = false;
  if (state.watchId) { navigator.geolocation.clearWatch(state.watchId); state.watchId = null; }
  if (state.socket) state.socket.emit('location:stop');
  updateLocationUI();
}

function emitLocation() {
  if (state.socket && state.currentPosition) {
    state.socket.emit('location:update', {
      lat: state.currentPosition.lat,
      lng: state.currentPosition.lng,
      status: '',
    });
  }
}

// ── SPA Router ─────────────────────────────────────────────────
const routes = {
  login: { page: 'login-page', auth: false },
  register: { page: 'register-page', auth: false },
  map: { page: 'map-page', auth: true },
  rides: { page: 'rides-page', auth: true, load: loadRides },
  events: { page: 'events-page', auth: true, load: loadEvents },
  track: { page: 'track-page', auth: true },
  profile: { page: 'profile-page', auth: true, load: loadProfile },
};

function navigate(page) {
  window.location.hash = '#' + page;
}

async function handleRoute() {
  const hash = window.location.hash.slice(1) || 'map';
  const route = routes[hash];
  if (!route) return navigate('map');

  // Auth check
  if (route.auth && !state.token) return navigate('login');
  if (!route.auth && state.token && (hash === 'login' || hash === 'register')) return navigate('map');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const page = document.getElementById(route.page);
  if (page) page.classList.add('active');

  // Update drawer
  state.currentPage = hash;
  updateDrawerActive();

  // Show/hide drawer tab
  const tab = document.getElementById('drawer-tab');
  if (tab) tab.classList.toggle('hidden', !route.auth);

  // Load data
  if (route.load) await route.load();

  // Init map if needed
  if (hash === 'map' && !state.map) {
    setTimeout(() => initMap(), 100);
  }
  if (hash === 'map' && state.map) {
    state.map.invalidateSize();
  }
}

// ── Drawer ─────────────────────────────────────────────────────
function toggleDrawer() {
  state.drawerOpen = !state.drawerOpen;
  document.getElementById('drawer').classList.toggle('open', state.drawerOpen);
  document.getElementById('drawer-overlay').classList.toggle('open', state.drawerOpen);
}

function closeDrawer() {
  state.drawerOpen = false;
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

function updateDrawerActive() {
  document.querySelectorAll('.drawer-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === state.currentPage);
  });
}

function updateDrawerUser() {
  const user = state.user;
  if (!user) return;
  const nameEl = document.getElementById('drawer-user-name');
  const bikeEl = document.getElementById('drawer-user-bike');
  const avatarEl = document.getElementById('drawer-avatar');
  if (nameEl) nameEl.textContent = user.name || 'İstifadəçi';
  if (bikeEl) bikeEl.textContent = '🏍️ ' + (user.motorcycle ? `${user.motorcycle.brand} ${user.motorcycle.model}` : 'Sürücü');
  if (avatarEl) avatarEl.textContent = (user.name || '?')[0].toUpperCase();
}

// ── Page Loaders ───────────────────────────────────────────────
async function loadRides() {
  try {
    const data = await api('/broadcasts');
    const list = data.broadcasts || [];
    const grid = document.getElementById('rides-grid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1">Hələ heç bir gəzinti yoxdur</div>';
      return;
    }

    grid.innerHTML = list.map(b => `
      <div class="content-card broadcast-card">
        <div class="broadcast-card-header">
          <div class="broadcast-card-avatar">${(b.creator?.name || '?')[0]}</div>
          <div class="broadcast-card-user">
            <div class="broadcast-card-name">${b.creator?.name || 'Naməlum'}</div>
            <div class="broadcast-card-bike">${b.creator?.motorcycle ? b.creator.motorcycle.brand + ' ' + b.creator.motorcycle.model : ''}</div>
          </div>
          <span class="broadcast-card-badge ${b.isActive ? 'badge-active' : 'badge-ended'}">${b.isActive ? 'Aktiv' : 'Bitib'}</span>
        </div>
        <div class="broadcast-card-title">${b.title || ''}</div>
        <div class="broadcast-card-desc">${b.description || ''}</div>
        <div class="broadcast-card-meta">👥 ${b.joinedUsers?.length || 0} müraciət</div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadEvents() {
  try {
    const data = await api('/events');
    const list = data.events || [];
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1">Hələ heç bir tədbir yoxdur</div>';
      return;
    }

    grid.innerHTML = list.map(e => {
      const date = e.date ? new Date(e.date).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="content-card event-card">
          <div class="event-card-banner">📅 ${e.eventType === 'group_ride' ? 'Qrup Sürüşü' : e.eventType === 'meetup' ? 'Görüş' : 'Tədbir'}</div>
          <div class="event-card-title">${e.title || ''}</div>
          <div class="event-card-desc">${e.description || ''}</div>
          <div class="event-card-info">
            <span><span class="icon">📅</span> <span class="date">${date}</span></span>
            <span><span class="icon">📍</span> <span class="location">${e.location?.address || ''}</span></span>
          </div>
          <div class="event-card-footer">
            <div class="event-card-stats">
              <span class="going">${e.attendees?.length || 0} gedəcək</span>
              <span class="interested">${e.interested?.length || 0} maraqlanır</span>
            </div>
            <button class="btn-sm" onclick="attendEvent('${e._id}')">Gedəcəm</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function attendEvent(id) {
  try {
    await api(`/events/${id}/attend`, { method: 'POST' });
    showToast('Qeydiyyat olundu! 🎉', 'success');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function loadProfile() {
  const u = state.user;
  if (!u) return;

  const el = (id) => document.getElementById(id);
  el('profile-avatar').textContent = (u.name || '?')[0].toUpperCase();
  el('profile-name').textContent = u.name || '';
  el('profile-role').textContent = u.userType === 'rider' ? '🏍️ Sürücü' : '👤 Sərnişin';
  el('profile-bio').textContent = u.bio || 'MotoRide üzvü';

  if (u.motorcycle) {
    el('profile-bike-name').textContent = `${u.motorcycle.brand} ${u.motorcycle.model}`;
    el('profile-bike-detail').textContent = `${u.motorcycle.cc || ''} cc • ${u.motorcycle.year || ''}`;
  }

  el('profile-email').textContent = u.email || '';
  el('profile-age').textContent = u.age || '-';
  el('profile-km').textContent = (u.totalKm || 0) + ' km';
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Location UI ────────────────────────────────────────────────
function updateLocationUI() {
  const btn = document.getElementById('btn-location');
  const badge = document.getElementById('live-badge');
  if (btn) {
    btn.classList.toggle('active', state.isSharingLocation);
    btn.innerHTML = state.isSharingLocation ? '📍' : '📍';
  }
  if (badge) badge.classList.toggle('show', state.isSharingLocation);
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Loading screen
  const loading = document.getElementById('loading-screen');

  // Check auth
  if (state.token) {
    const valid = await checkAuth();
    if (valid) {
      updateDrawerUser();
      connectSocket();
    }
  }

  // Remove loading
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }

  // Route
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // ── Event Listeners ────────────────────────────────
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const err = document.getElementById('login-error');
    btn.disabled = true;
    btn.textContent = 'Yüklənir...';
    err.classList.remove('show');

    try {
      await login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      updateDrawerUser();
      connectSocket();
      navigate('map');
    } catch (error) {
      err.textContent = error.message;
      err.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Daxil Ol';
    }
  });

  // Register form
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const err = document.getElementById('register-error');
    btn.disabled = true;
    err.classList.remove('show');

    try {
      await register({
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        userType: 'rider',
        age: parseInt(document.getElementById('reg-age').value) || 25,
      });
      updateDrawerUser();
      connectSocket();
      navigate('map');
    } catch (error) {
      err.textContent = error.message;
      err.classList.add('show');
    } finally {
      btn.disabled = false;
    }
  });

  // Drawer toggle
  document.getElementById('drawer-tab')?.addEventListener('click', toggleDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);

  // Drawer nav items
  document.querySelectorAll('.drawer-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigate(item.dataset.page);
      closeDrawer();
    });
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Location toggle
  document.getElementById('btn-location')?.addEventListener('click', () => {
    if (state.isSharingLocation) stopSharingLocation();
    else startSharingLocation();
  });

  // Status toggle
  document.getElementById('btn-status')?.addEventListener('click', () => {
    const bar = document.getElementById('status-bar');
    bar.classList.toggle('show');
  });

  // Status send
  document.getElementById('btn-send-status')?.addEventListener('click', () => {
    const input = document.getElementById('status-input');
    if (input.value.trim() && state.socket) {
      state.socket.emit('status:update', { status: input.value.trim() });
      showToast('Status paylaşıldı! 🏍️', 'success');
      input.value = '';
      document.getElementById('status-bar').classList.remove('show');
    }
  });

  // Zoom
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => { if (state.map) state.map.zoomIn(); });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => { if (state.map) state.map.zoomOut(); });
  document.getElementById('btn-my-location')?.addEventListener('click', async () => {
    const pos = state.currentPosition || await getCurrentLocation();
    if (pos && state.map) state.map.setView([pos.lat, pos.lng], 15);
    else if (state.map) state.map.setView([40.4093, 49.8671], 14);
  });
});
