/* ============================================
   MotoAPI — Cloud API Client Layer
   Wraps Netlify Functions with localStorage fallback
   ============================================ */

const MotoAPI = {
  BASE_URL: '/api',
  token: null,
  useLocalStorage: false, // Will fallback to localStorage if API unavailable

  // ─── Init ──────────────────────────────────────
  init() {
    this.token = localStorage.getItem('moto_token');
    // Check if API is available
    this.checkAPIAvailability();
  },

  async checkAPIAvailability() {
    try {
      const response = await fetch(`${this.BASE_URL}/alerts-list`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok || response.status === 401) {
        this.useLocalStorage = false;
        console.log('☁️ MotoAPI: Cloud mode aktiv');
      } else {
        throw new Error('API unavailable');
      }
    } catch (e) {
      this.useLocalStorage = true;
      console.log('💾 MotoAPI: Offline/Demo mode (localStorage)');
    }
  },

  // ─── Headers ───────────────────────────────────
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },

  // ─── Generic Fetch ─────────────────────────────
  async request(endpoint, method = 'GET', body = null) {
    // If using localStorage fallback, delegate to MotoStorage
    if (this.useLocalStorage && typeof MotoStorage !== 'undefined') {
      return this.localStorageFallback(endpoint, method, body);
    }

    try {
      const options = {
        method,
        headers: this.getHeaders()
      };
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const url = method === 'GET' && body
        ? `${this.BASE_URL}/${endpoint}?${new URLSearchParams(body)}`
        : `${this.BASE_URL}/${endpoint}`;

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Xəta baş verdi');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      // Fallback to localStorage on network error
      if (err.name === 'TypeError' && typeof MotoStorage !== 'undefined') {
        console.log('⚠️ API əlçatmazdır, localStorage istifadə olunur');
        this.useLocalStorage = true;
        return this.localStorageFallback(endpoint, method, body);
      }
      throw err;
    }
  },

  // ─── Auth ──────────────────────────────────────
  async login(email, password) {
    if (this.useLocalStorage) {
      return this.localStorageFallback('auth-login', 'POST', { email, password });
    }
    const data = await this.request('auth-login', 'POST', { email, password });
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('moto_token', data.token);
      localStorage.setItem('moto_current_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(userData) {
    if (this.useLocalStorage) {
      return this.localStorageFallback('auth-register', 'POST', userData);
    }
    return await this.request('auth-register', 'POST', userData);
  },

  async verify(userId, code) {
    if (this.useLocalStorage) {
      return this.localStorageFallback('auth-verify', 'POST', { userId, code });
    }
    const data = await this.request('auth-verify', 'POST', { userId, code });
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('moto_token', data.token);
      localStorage.setItem('moto_current_user', JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser() {
    const cached = localStorage.getItem('moto_current_user');
    return cached ? JSON.parse(cached) : null;
  },

  isLoggedIn() {
    return !!this.token && !!this.getCurrentUser();
  },

  logout() {
    this.token = null;
    localStorage.removeItem('moto_token');
    localStorage.removeItem('moto_current_user');
    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.logout();
    }
  },

  // ─── Users ─────────────────────────────────────
  async getMe() {
    if (this.useLocalStorage) {
      return { user: MotoStorage.getCurrentUser() };
    }
    const data = await this.request('users-me');
    if (data.user) {
      localStorage.setItem('moto_current_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getUsers(query = '') {
    if (this.useLocalStorage) {
      const users = MotoStorage.getUsers().filter(u =>
        !query || u.firstName.toLowerCase().includes(query.toLowerCase()) ||
        u.lastName.toLowerCase().includes(query.toLowerCase())
      );
      return { users };
    }
    return await this.request(`users-list${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  },

  // ─── Events ────────────────────────────────────
  async getEvents(filter = 'all') {
    if (this.useLocalStorage) {
      let events = MotoStorage.getEvents();
      const currentUser = MotoStorage.getCurrentUser();
      if (filter === 'mine' && currentUser) {
        events = events.filter(e => e.creatorId === currentUser.id ||
          (e.participants && e.participants.includes(currentUser.id)));
      } else if (filter === 'upcoming') {
        events = events.filter(e => new Date(e.date) > new Date());
      }
      return { events };
    }
    return await this.request(`events-list?filter=${filter}`);
  },

  async createEvent(eventData) {
    if (this.useLocalStorage) {
      const event = MotoStorage.createEvent(eventData);
      return { event, message: 'Tədbir yaradıldı!' };
    }
    return await this.request('events-create', 'POST', eventData);
  },

  async joinEvent(eventId, action = 'join', comment = null) {
    if (this.useLocalStorage) {
      const currentUser = MotoStorage.getCurrentUser();
      if (action === 'join') {
        MotoStorage.joinEvent(eventId, currentUser.id);
      } else if (action === 'leave') {
        MotoStorage.leaveEvent(eventId, currentUser.id);
      } else if (action === 'comment' && comment) {
        MotoStorage.sendMessage({ senderId: currentUser.id, contextType: 'event', contextId: eventId, content: comment });
      }
      return { message: 'Uğurlu!' };
    }
    return await this.request('events-join', 'POST', { eventId, action, comment });
  },

  // ─── Alerts ────────────────────────────────────
  async getAlerts() {
    if (this.useLocalStorage) {
      return { alerts: MotoStorage.getActiveAlerts() };
    }
    return await this.request('alerts-list');
  },

  async createAlert(alertData) {
    if (this.useLocalStorage) {
      const alert = MotoStorage.createAlert(alertData);
      return { alert, message: 'Xəbərdarlıq yaradıldı!' };
    }
    return await this.request('alerts-create', 'POST', alertData);
  },

  // ─── Locations ─────────────────────────────────
  async getActiveLocations() {
    if (this.useLocalStorage) {
      return { locations: MotoStorage.getActiveLocations() };
    }
    return await this.request('locations-active');
  },

  async shareLocation(locationData) {
    if (this.useLocalStorage) {
      MotoStorage.shareLocation(locationData);
      return { message: 'Lokasiya paylaşıldı' };
    }
    return await this.request('locations-share', 'POST', locationData);
  },

  async updateLocation(lat, lng, distanceKm, speed, routeData) {
    if (this.useLocalStorage) {
      const currentUser = MotoStorage.getCurrentUser();
      if (currentUser) {
        MotoStorage.updateLocation(currentUser.id, { lat, lng });
      }
      return { message: 'Yeniləndi' };
    }
    return await this.request('locations-share', 'POST', {
      action: 'update', lat, lng, distanceKm, speed, routeData
    });
  },

  async stopSharing() {
    if (this.useLocalStorage) {
      const currentUser = MotoStorage.getCurrentUser();
      if (currentUser) MotoStorage.stopSharing(currentUser.id);
      return { message: 'Dayandırıldı' };
    }
    return await this.request('locations-share', 'POST', { action: 'stop' });
  },

  // ─── Friends ───────────────────────────────────
  async getFriends() {
    if (this.useLocalStorage) {
      const currentUser = MotoStorage.getCurrentUser();
      if (!currentUser) return { friends: [], requests: [] };
      const friends = MotoStorage.getFriends(currentUser.id);
      const requests = MotoStorage.getFriendRequests(currentUser.id);
      return { friends, requests };
    }
    return await this.request('friends-list');
  },

  async sendFriendRequest(friendId) {
    if (this.useLocalStorage) {
      const currentUser = MotoStorage.getCurrentUser();
      MotoStorage.sendFriendRequest(currentUser.id, friendId);
      return { message: 'Sorğu göndərildi' };
    }
    return await this.request('friends-request', 'POST', { friendId });
  },

  async respondFriendRequest(requestId, action) {
    if (this.useLocalStorage) {
      if (action === 'accept') {
        MotoStorage.acceptFriendRequest(requestId);
      }
      return { message: action === 'accept' ? 'Qəbul edildi' : 'Rədd edildi' };
    }
    return await this.request('friends-accept', 'POST', { requestId, action });
  },

  // ─── localStorage Fallback Router ──────────────
  localStorageFallback(endpoint, method, body) {
    // Route API calls to MotoStorage methods
    if (typeof MotoStorage === 'undefined') {
      throw new Error('MotoStorage mövcud deyil');
    }

    switch (endpoint) {
      case 'auth-login': {
        const user = MotoStorage.getUserByEmail(body.email);
        if (!user) throw new Error('Email və ya şifrə yanlışdır');
        if (user.password !== body.password) throw new Error('Email və ya şifrə yanlışdır');
        MotoStorage.setCurrentUser(user);
        const fakeToken = 'local_' + MotoStorage.generateId();
        this.token = fakeToken;
        localStorage.setItem('moto_token', fakeToken);
        localStorage.setItem('moto_current_user', JSON.stringify(user));
        return { token: fakeToken, user };
      }

      case 'auth-register': {
        const existingUser = MotoStorage.getUserByEmail(body.email);
        if (existingUser) throw new Error('Bu email artıq qeydiyyatdan keçib');
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const newUser = MotoStorage.createUser({
          ...body,
          verificationCode: code,
          isVerified: false
        });
        return { userId: newUser.id, verificationCode: code, message: 'Qeydiyyat uğurlu' };
      }

      case 'auth-verify': {
        const verifyUser = MotoStorage.getUserById(body.userId);
        if (!verifyUser || verifyUser.verificationCode !== body.code) {
          throw new Error('Yanlış təsdiq kodu');
        }
        MotoStorage.updateUser(verifyUser.id, { isVerified: true, verificationCode: null });
        const updatedUser = MotoStorage.getUserById(verifyUser.id);
        MotoStorage.setCurrentUser(updatedUser);
        const token = 'local_' + MotoStorage.generateId();
        this.token = token;
        localStorage.setItem('moto_token', token);
        localStorage.setItem('moto_current_user', JSON.stringify(updatedUser));
        return { token, user: updatedUser, message: 'Email təsdiqləndi!' };
      }

      default:
        console.warn('Unhandled localStorage fallback:', endpoint);
        return {};
    }
  },

  // ─── Utility ───────────────────────────────────
  getTimeAgo(date) {
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getTimeAgo) {
      return MotoStorage.getTimeAgo(date);
    }
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'indicə';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dəq əvvəl`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat əvvəl`;
    return `${Math.floor(seconds / 86400)} gün əvvəl`;
  }
};
