/* ═══════════════════════════════════════════════════════════════
   MotoStorage — localStorage Data Layer
   Complete CRUD operations for Users, Events, Alerts, Locations,
   Friends, Messages, and Settings.
   ═══════════════════════════════════════════════════════════════ */

const MotoStorage = {

  // ─── Storage Keys ──────────────────────────────────────────
  KEYS: {
    USERS: 'moto_users',
    CURRENT_USER: 'moto_current_user',
    EVENTS: 'moto_events',
    ALERTS: 'moto_alerts',
    LOCATIONS: 'moto_locations',
    FRIENDS: 'moto_friends',
    MESSAGES: 'moto_messages',
    SETTINGS: 'moto_settings',
    INITIALIZED: 'moto_initialized'
  },

  // ─── Initialize ────────────────────────────────────────────
  init() {
    if (!localStorage.getItem(this.KEYS.INITIALIZED)) {
      this._seedDemoData();
      localStorage.setItem(this.KEYS.INITIALIZED, 'true');
    }
  },

  // ─── Private: Read / Write helpers ─────────────────────────
  _read(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`MotoStorage._read error for key "${key}":`, e);
      return null;
    }
  },

  _write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`MotoStorage._write error for key "${key}":`, e);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // USER CRUD
  // ═══════════════════════════════════════════════════════════

  getUsers() {
    return this._read(this.KEYS.USERS) || [];
  },

  getUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  },

  getUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createUser(userData) {
    const users = this.getUsers();
    const newUser = {
      id: this.generateId(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      birthdate: userData.birthdate || null,
      email: userData.email,
      phone: userData.phone || '',
      password: userData.password,
      motoBrand: userData.motoBrand || '',
      motoModel: userData.motoModel || '',
      motoCC: userData.motoCC || 0,
      avatar: userData.avatar || null,
      bio: userData.bio || '',
      role: (userData.email && userData.email.toLowerCase() === 'shahmuradovk@gmail.com') ? 'admin' : 'user',
      totalRides: 0,
      totalKm: 0,
      totalEvents: 0,
      rideHistory: [],
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true,
      settings: {
        notifications: true,
        locationSharing: true,
        darkMode: true,
        sounds: true
      }
    };
    users.push(newUser);
    this._write(this.KEYS.USERS, users);
    return newUser;
  },

  updateUser(id, data) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...data };
    this._write(this.KEYS.USERS, users);
    // Also update current user if it's the same
    const current = this.getCurrentUser();
    if (current && current.id === id) {
      this.setCurrentUser(users[index]);
    }
    return users[index];
  },

  getCurrentUser() {
    return this._read(this.KEYS.CURRENT_USER);
  },

  setCurrentUser(user) {
    this._write(this.KEYS.CURRENT_USER, user);
  },

  logout() {
    localStorage.removeItem(this.KEYS.CURRENT_USER);
  },

  // ═══════════════════════════════════════════════════════════
  // EVENTS CRUD
  // ═══════════════════════════════════════════════════════════

  getEvents() {
    return this._read(this.KEYS.EVENTS) || [];
  },

  getEventById(id) {
    const events = this.getEvents();
    return events.find(e => e.id === id) || null;
  },

  createEvent(eventData) {
    const events = this.getEvents();
    const currentUser = this.getCurrentUser();
    const newEvent = {
      id: this.generateId(),
      title: eventData.title,
      description: eventData.description || '',
      date: eventData.date,
      time: eventData.time,
      startLocation: eventData.startLocation,
      endLocation: eventData.endLocation || '',
      maxRiders: eventData.maxRiders || 0,
      createdBy: currentUser ? currentUser.id : eventData.createdBy,
      createdByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : eventData.createdByName || 'Anonim',
      participants: currentUser ? [currentUser.id] : (eventData.participants || []),
      createdAt: new Date().toISOString(),
      status: 'upcoming' // upcoming, active, completed, cancelled
    };
    events.push(newEvent);
    this._write(this.KEYS.EVENTS, events);
    return newEvent;
  },

  updateEvent(id, data) {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) return null;
    events[index] = { ...events[index], ...data };
    this._write(this.KEYS.EVENTS, events);
    return events[index];
  },

  deleteEvent(id) {
    let events = this.getEvents();
    events = events.filter(e => e.id !== id);
    this._write(this.KEYS.EVENTS, events);
  },

  joinEvent(eventId, userId) {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === eventId);
    if (index === -1) return null;
    if (!events[index].participants.includes(userId)) {
      // Check max riders
      if (events[index].maxRiders > 0 && events[index].participants.length >= events[index].maxRiders) {
        return null; // Full
      }
      events[index].participants.push(userId);
      this._write(this.KEYS.EVENTS, events);
    }
    return events[index];
  },

  leaveEvent(eventId, userId) {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === eventId);
    if (index === -1) return null;
    events[index].participants = events[index].participants.filter(id => id !== userId);
    this._write(this.KEYS.EVENTS, events);
    return events[index];
  },

  // ═══════════════════════════════════════════════════════════
  // ALERTS CRUD
  // ═══════════════════════════════════════════════════════════

  getAlerts() {
    return this._read(this.KEYS.ALERTS) || [];
  },

  createAlert(alertData) {
    const alerts = this.getAlerts();
    const currentUser = this.getCurrentUser();
    const newAlert = {
      id: this.generateId(),
      type: alertData.type, // accident, pothole, construction, police, oil, other
      title: alertData.title,
      description: alertData.description || '',
      location: alertData.location || '',
      lat: alertData.lat || null,
      lng: alertData.lng || null,
      reportedBy: currentUser ? currentUser.id : alertData.reportedBy,
      reportedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : alertData.reportedByName || 'Anonim',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      upvotes: alertData.upvotes || 0,
      upvotedBy: [],
      isActive: true
    };
    alerts.push(newAlert);
    this._write(this.KEYS.ALERTS, alerts);
    return newAlert;
  },

  deleteAlert(id) {
    let alerts = this.getAlerts();
    alerts = alerts.filter(a => a.id !== id);
    this._write(this.KEYS.ALERTS, alerts);
  },

  getActiveAlerts() {
    const alerts = this.getAlerts();
    const now = new Date();
    return alerts.filter(a => {
      if (!a.isActive) return false;
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;
      return true;
    });
  },

  upvoteAlert(alertId, userId) {
    const alerts = this.getAlerts();
    const index = alerts.findIndex(a => a.id === alertId);
    if (index === -1) return null;
    if (!alerts[index].upvotedBy.includes(userId)) {
      alerts[index].upvotedBy.push(userId);
      alerts[index].upvotes++;
      this._write(this.KEYS.ALERTS, alerts);
    }
    return alerts[index];
  },

  // ═══════════════════════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════════════════════

  getActiveLocations() {
    return this._read(this.KEYS.LOCATIONS) || [];
  },

  shareLocation(locationData) {
    const locations = this.getActiveLocations();
    // Remove existing entry for this user
    const filtered = locations.filter(l => l.userId !== locationData.userId);
    const newLocation = {
      userId: locationData.userId,
      userName: locationData.userName,
      lat: locationData.lat,
      lng: locationData.lng,
      message: locationData.message || '',
      shareMode: locationData.shareMode || 'community', // friends or community
      motoBrand: locationData.motoBrand || '',
      motoModel: locationData.motoModel || '',
      isRiding: locationData.isRiding || false,
      speed: locationData.speed || 0,
      sharedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    filtered.push(newLocation);
    this._write(this.KEYS.LOCATIONS, filtered);
    return newLocation;
  },

  stopSharing(userId) {
    let locations = this.getActiveLocations();
    locations = locations.filter(l => l.userId !== userId);
    this._write(this.KEYS.LOCATIONS, locations);
  },

  updateLocation(userId, coords) {
    const locations = this.getActiveLocations();
    const index = locations.findIndex(l => l.userId === userId);
    if (index === -1) return null;
    locations[index].lat = coords.lat;
    locations[index].lng = coords.lng;
    if (coords.speed !== undefined) locations[index].speed = coords.speed;
    locations[index].updatedAt = new Date().toISOString();
    this._write(this.KEYS.LOCATIONS, locations);
    return locations[index];
  },

  // ═══════════════════════════════════════════════════════════
  // FRIENDS
  // ═══════════════════════════════════════════════════════════

  _getFriendsData() {
    return this._read(this.KEYS.FRIENDS) || { friendships: [], requests: [] };
  },

  getFriends(userId) {
    const data = this._getFriendsData();
    const friendIds = [];
    data.friendships.forEach(f => {
      if (f.user1 === userId) friendIds.push(f.user2);
      else if (f.user2 === userId) friendIds.push(f.user1);
    });
    return friendIds.map(id => this.getUserById(id)).filter(Boolean);
  },

  sendFriendRequest(fromId, toId) {
    const data = this._getFriendsData();
    // Check if already friends
    const alreadyFriends = data.friendships.some(
      f => (f.user1 === fromId && f.user2 === toId) || (f.user1 === toId && f.user2 === fromId)
    );
    if (alreadyFriends) return null;
    // Check if request already exists
    const existingRequest = data.requests.find(
      r => (r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId)
    );
    if (existingRequest) return null;
    const request = {
      id: this.generateId(),
      from: fromId,
      to: toId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    data.requests.push(request);
    this._write(this.KEYS.FRIENDS, data);
    return request;
  },

  acceptFriendRequest(requestId) {
    const data = this._getFriendsData();
    const reqIndex = data.requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return null;
    const request = data.requests[reqIndex];
    // Create friendship
    data.friendships.push({
      id: this.generateId(),
      user1: request.from,
      user2: request.to,
      since: new Date().toISOString()
    });
    // Remove request
    data.requests.splice(reqIndex, 1);
    this._write(this.KEYS.FRIENDS, data);
    return true;
  },

  rejectFriendRequest(requestId) {
    const data = this._getFriendsData();
    data.requests = data.requests.filter(r => r.id !== requestId);
    this._write(this.KEYS.FRIENDS, data);
  },

  getFriendRequests(userId) {
    const data = this._getFriendsData();
    return data.requests
      .filter(r => r.to === userId && r.status === 'pending')
      .map(r => {
        const fromUser = this.getUserById(r.from);
        return { ...r, fromUser };
      });
  },

  getSentRequests(userId) {
    const data = this._getFriendsData();
    return data.requests.filter(r => r.from === userId && r.status === 'pending');
  },

  areFriends(userId1, userId2) {
    const data = this._getFriendsData();
    return data.friendships.some(
      f => (f.user1 === userId1 && f.user2 === userId2) || (f.user1 === userId2 && f.user2 === userId1)
    );
  },

  removeFriend(userId1, userId2) {
    const data = this._getFriendsData();
    data.friendships = data.friendships.filter(
      f => !((f.user1 === userId1 && f.user2 === userId2) || (f.user1 === userId2 && f.user2 === userId1))
    );
    this._write(this.KEYS.FRIENDS, data);
  },

  // ═══════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════

  getMessages(contextType, contextId) {
    const allMessages = this._read(this.KEYS.MESSAGES) || [];
    return allMessages.filter(m => m.contextType === contextType && m.contextId === contextId);
  },

  sendMessage(messageData) {
    const messages = this._read(this.KEYS.MESSAGES) || [];
    const newMessage = {
      id: this.generateId(),
      contextType: messageData.contextType, // 'event', 'direct', 'group'
      contextId: messageData.contextId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      text: messageData.text,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    this._write(this.KEYS.MESSAGES, messages);
    return newMessage;
  },

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  generateId() {
    return 'mr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  },

  getTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'indicə';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dəq əvvəl`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat əvvəl`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün əvvəl`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} həftə əvvəl`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ay əvvəl`;
    const years = Math.floor(days / 365);
    return `${years} il əvvəl`;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  },

  formatTime(timeStr) {
    return timeStr; // Already in HH:MM format
  },

  getInitials(firstName, lastName) {
    return ((firstName || '')[0] || '') + ((lastName || '')[0] || '');
  },

  // ═══════════════════════════════════════════════════════════
  // DEMO DATA SEEDING
  // ═══════════════════════════════════════════════════════════

  _seedDemoData() {
    // ─── Demo Users ──────────────────────────────────────
    const demoUsers = [
      {
        id: 'demo_user_001',
        firstName: 'Shah',
        lastName: 'Muradov',
        birthdate: '1998-01-01',
        email: 'shahmuradovk@gmail.com',
        phone: '+994 50 123 45 67',
        password: '123456',
        motoBrand: 'Yamaha',
        motoModel: 'MT-07',
        motoCC: 689,
        avatar: null,
        bio: 'MotoRiders Admin 🏍️',
        role: 'admin',
        totalRides: 42,
        totalKm: 1250,
        totalEvents: 12,
        rideHistory: [
          { date: '2026-06-15', distance: 45, duration: 65, route: 'Bakı → Mərdəkan' },
          { date: '2026-06-10', distance: 120, duration: 180, route: 'Bakı → Şamaxı' },
          { date: '2026-06-05', distance: 30, duration: 40, route: 'Sahil boyu sürüş' }
        ],
        joinedAt: '2025-01-15T10:00:00.000Z',
        lastSeen: new Date().toISOString(),
        isOnline: true,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_002',
        firstName: 'Tural',
        lastName: 'Məmmədov',
        birthdate: '1993-07-22',
        email: 'tural@motoriders.az',
        phone: '+994 51 222 33 44',
        password: 'demo123',
        motoBrand: 'Honda',
        motoModel: 'CB650R',
        motoCC: 649,
        avatar: null,
        bio: 'Yollar mənim evimdir 🛣️',
        totalRides: 38,
        totalKm: 2950,
        totalEvents: 8,
        rideHistory: [
          { date: '2026-06-14', distance: 60, duration: 90, route: 'Bakı → Bilgəh' }
        ],
        joinedAt: '2025-02-20T14:00:00.000Z',
        lastSeen: new Date(Date.now() - 30 * 60000).toISOString(),
        isOnline: true,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_003',
        firstName: 'Kamran',
        lastName: 'Əliyev',
        birthdate: '1990-11-08',
        email: 'kamran@motoriders.az',
        phone: '+994 55 333 44 55',
        password: 'demo123',
        motoBrand: 'BMW',
        motoModel: 'R1250GS',
        motoCC: 1254,
        avatar: null,
        bio: 'Adventure rider. Dağlar, serpantinlər, azadlıq! 🏔️',
        totalRides: 65,
        totalKm: 8400,
        totalEvents: 15,
        rideHistory: [
          { date: '2026-06-18', distance: 250, duration: 360, route: 'Bakı → Quba → Bakı' }
        ],
        joinedAt: '2024-11-05T09:00:00.000Z',
        lastSeen: new Date(Date.now() - 2 * 3600000).toISOString(),
        isOnline: false,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: false }
      },
      {
        id: 'demo_user_004',
        firstName: 'Nicat',
        lastName: 'Hüseynov',
        birthdate: '1997-05-30',
        email: 'nicat@motoriders.az',
        phone: '+994 70 444 55 66',
        password: 'demo123',
        motoBrand: 'Ducati',
        motoModel: 'Monster',
        motoCC: 937,
        avatar: null,
        bio: 'İtalyan ruhu, Bakı qanı 🇮🇹',
        totalRides: 29,
        totalKm: 2100,
        totalEvents: 6,
        rideHistory: [],
        joinedAt: '2025-04-12T16:00:00.000Z',
        lastSeen: new Date(Date.now() - 45 * 60000).toISOString(),
        isOnline: true,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_005',
        firstName: 'Orxan',
        lastName: 'Quliyev',
        birthdate: '1994-09-12',
        email: 'orxan@motoriders.az',
        phone: '+994 77 555 66 77',
        password: 'demo123',
        motoBrand: 'Kawasaki',
        motoModel: 'Z900',
        motoCC: 948,
        avatar: null,
        bio: 'Yaşıl maşın, yaşıl həyat 💚',
        totalRides: 52,
        totalKm: 4200,
        totalEvents: 10,
        rideHistory: [
          { date: '2026-06-20', distance: 80, duration: 110, route: 'Bakı → Novxanı' }
        ],
        joinedAt: '2025-01-28T11:00:00.000Z',
        lastSeen: new Date(Date.now() - 15 * 60000).toISOString(),
        isOnline: true,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_006',
        firstName: 'Fərid',
        lastName: 'Babayev',
        birthdate: '1999-01-25',
        email: 'ferid@motoriders.az',
        phone: '+994 50 666 77 88',
        password: 'demo123',
        motoBrand: 'KTM',
        motoModel: 'Duke 390',
        motoCC: 373,
        avatar: null,
        bio: 'Kiçik kubatur, böyük ürək 🧡',
        totalRides: 21,
        totalKm: 1500,
        totalEvents: 4,
        rideHistory: [],
        joinedAt: '2025-06-01T08:00:00.000Z',
        lastSeen: new Date(Date.now() - 5 * 3600000).toISOString(),
        isOnline: false,
        settings: { notifications: true, locationSharing: false, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_007',
        firstName: 'Rəşad',
        lastName: 'İsmayılov',
        birthdate: '1992-08-17',
        email: 'resad@motoriders.az',
        phone: '+994 51 777 88 99',
        password: 'demo123',
        motoBrand: 'Suzuki',
        motoModel: 'GSX-S750',
        motoCC: 749,
        avatar: null,
        bio: 'Sürət həyatdır, qalanı intizar ⚡',
        totalRides: 43,
        totalKm: 3600,
        totalEvents: 9,
        rideHistory: [
          { date: '2026-06-19', distance: 55, duration: 75, route: 'Bakı → Pirallahı' }
        ],
        joinedAt: '2025-03-10T13:00:00.000Z',
        lastSeen: new Date(Date.now() - 60 * 60000).toISOString(),
        isOnline: false,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: true }
      },
      {
        id: 'demo_user_008',
        firstName: 'Elvin',
        lastName: 'Nəsibov',
        birthdate: '1991-12-03',
        email: 'elvin@motoriders.az',
        phone: '+994 55 888 99 00',
        password: 'demo123',
        motoBrand: 'Harley-Davidson',
        motoModel: 'Iron 883',
        motoCC: 883,
        avatar: null,
        bio: 'Kruizer fəlsəfəsi. Yavaş sür, çox yaşa. 🤘',
        totalRides: 35,
        totalKm: 2800,
        totalEvents: 7,
        rideHistory: [],
        joinedAt: '2025-02-14T15:00:00.000Z',
        lastSeen: new Date(Date.now() - 3 * 3600000).toISOString(),
        isOnline: false,
        settings: { notifications: true, locationSharing: true, darkMode: true, sounds: false }
      }
    ];

    this._write(this.KEYS.USERS, demoUsers);

    // ─── Demo Events ─────────────────────────────────────
    const demoEvents = [
      {
        id: 'demo_event_001',
        title: 'Mərdəkana axşam sürüşü',
        description: 'Bakı mərkəzindən Mərdəkana qədər axşam sürüşü. Qrup halında, təhlükəsiz sürüş. Gəlişdə sahildə çay içirik.',
        date: '2026-06-25',
        time: '19:00',
        startLocation: '28 May metro, Bakı',
        endLocation: 'Mərdəkan çimərliyi',
        maxRiders: 15,
        createdBy: 'demo_user_001',
        createdByName: 'Əli Həsənov',
        participants: ['demo_user_001', 'demo_user_002', 'demo_user_004', 'demo_user_005'],
        createdAt: '2026-06-18T10:00:00.000Z',
        status: 'upcoming'
      },
      {
        id: 'demo_event_002',
        title: 'Şamaxı serpantini',
        description: 'Şamaxı dağ yolları ilə serpantin sürüşü. Təcrübəli sürücülər üçün. Minimum 400cc kubatur.',
        date: '2026-06-28',
        time: '08:00',
        startLocation: 'Koroğlu metro, Bakı',
        endLocation: 'Şamaxı şəhəri',
        maxRiders: 10,
        createdBy: 'demo_user_003',
        createdByName: 'Kamran Əliyev',
        participants: ['demo_user_003', 'demo_user_005', 'demo_user_007'],
        createdAt: '2026-06-19T14:00:00.000Z',
        status: 'upcoming'
      },
      {
        id: 'demo_event_003',
        title: 'Sahil boyunca kofe sürüşü',
        description: 'Dənizkənarı bulvardan Bilgəhə kimi rahat sürüş. Bilgəhdə kofe və söhbət. Hər kubatur üçün uyğundur.',
        date: '2026-07-01',
        time: '10:00',
        startLocation: 'Dənizkənarı Milli Park',
        endLocation: 'Bilgəh çimərliyi',
        maxRiders: 20,
        createdBy: 'demo_user_002',
        createdByName: 'Tural Məmmədov',
        participants: ['demo_user_002', 'demo_user_001', 'demo_user_006', 'demo_user_008'],
        createdAt: '2026-06-20T09:00:00.000Z',
        status: 'upcoming'
      },
      {
        id: 'demo_event_004',
        title: 'Quba macərası',
        description: 'İki günlük Quba turu! Birinci gün Bakıdan Qubaya, ikinci gün geri. Gecələmə Quba şəhərində. Təbiətin gözəlliyini birlikdə kəşf edək!',
        date: '2026-07-05',
        time: '07:00',
        startLocation: 'Həzi Aslanov metro, Bakı',
        endLocation: 'Quba şəhəri',
        maxRiders: 8,
        createdBy: 'demo_user_003',
        createdByName: 'Kamran Əliyev',
        participants: ['demo_user_003', 'demo_user_001', 'demo_user_007', 'demo_user_004', 'demo_user_005'],
        createdAt: '2026-06-20T16:00:00.000Z',
        status: 'upcoming'
      }
    ];

    this._write(this.KEYS.EVENTS, demoEvents);

    // ─── Demo Alerts ─────────────────────────────────────
    const demoAlerts = [
      {
        id: 'demo_alert_001',
        type: 'construction',
        title: 'Yol təmiri — Nərimanov metrosu yaxınlığı',
        description: 'Nərimanov metrosunun qarşısında yol təmiri gedir. Sağ zolaq bağlıdır. Ehtiyatlı olun.',
        location: 'Nərimanov metrosu, Bakı',
        lat: 40.4093,
        lng: 49.8671,
        reportedBy: 'demo_user_002',
        reportedByName: 'Tural Məmmədov',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(),
        upvotes: 5,
        upvotedBy: ['demo_user_001', 'demo_user_004', 'demo_user_005', 'demo_user_007', 'demo_user_008'],
        isActive: true
      },
      {
        id: 'demo_alert_002',
        type: 'pothole',
        title: 'Çuxur — Xətai prospekti',
        description: 'Xətai prospektində dərin çuxur var. Gecə xüsusilə təhlükəlidir.',
        location: 'Xətai prospekti, Bakı',
        lat: 40.3875,
        lng: 49.8528,
        reportedBy: 'demo_user_005',
        reportedByName: 'Orxan Quliyev',
        createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
        upvotes: 3,
        upvotedBy: ['demo_user_001', 'demo_user_002', 'demo_user_003'],
        isActive: true
      },
      {
        id: 'demo_alert_003',
        type: 'accident',
        title: 'Qəza — Bakı-Sumqayıt yolu',
        description: 'Bakı-Sumqayıt yolunda qəza baş verib. Tıxac var, alternativ yol istifadə edin.',
        location: 'Bakı-Sumqayıt şosse',
        lat: 40.4731,
        lng: 49.9086,
        reportedBy: 'demo_user_001',
        reportedByName: 'Əli Həsənov',
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
        expiresAt: new Date(Date.now() + 3 * 3600000).toISOString(),
        upvotes: 8,
        upvotedBy: ['demo_user_002', 'demo_user_003', 'demo_user_004', 'demo_user_005', 'demo_user_006', 'demo_user_007', 'demo_user_008', 'demo_user_001'],
        isActive: true
      }
    ];

    this._write(this.KEYS.ALERTS, demoAlerts);

    // ─── Demo Active Locations ───────────────────────────
    const demoLocations = [
      {
        userId: 'demo_user_001',
        userName: 'Əli Həsənov',
        lat: 40.4093,
        lng: 49.8671,
        message: 'Nərimanov metrosunda qəhvə içirəm ☕',
        shareMode: 'community',
        motoBrand: 'Yamaha',
        motoModel: 'MT-07',
        isRiding: false,
        speed: 0,
        sharedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60000).toISOString()
      },
      {
        userId: 'demo_user_002',
        userName: 'Tural Məmmədov',
        lat: 40.3725,
        lng: 49.8375,
        message: 'Sahil boyunca sürürəm 🏍️',
        shareMode: 'community',
        motoBrand: 'Honda',
        motoModel: 'CB650R',
        isRiding: true,
        speed: 45,
        sharedAt: new Date(Date.now() - 10 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60000).toISOString()
      },
      {
        userId: 'demo_user_004',
        userName: 'Nicat Hüseynov',
        lat: 40.4216,
        lng: 49.8506,
        message: 'Flame Towers qarşısında durmuşam',
        shareMode: 'friends',
        motoBrand: 'Ducati',
        motoModel: 'Monster',
        isRiding: false,
        speed: 0,
        sharedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 60000).toISOString()
      },
      {
        userId: 'demo_user_005',
        userName: 'Orxan Quliyev',
        lat: 40.3953,
        lng: 49.8822,
        message: 'Heydar Əliyev Mərkəzi ərazisindəyəm 📸',
        shareMode: 'community',
        motoBrand: 'Kawasaki',
        motoModel: 'Z900',
        isRiding: false,
        speed: 0,
        sharedAt: new Date(Date.now() - 35 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60000).toISOString()
      },
      {
        userId: 'demo_user_007',
        userName: 'Rəşad İsmayılov',
        lat: 40.4465,
        lng: 49.9351,
        message: 'Biləcəri yolundayam, sürət 60km/s 🚀',
        shareMode: 'community',
        motoBrand: 'Suzuki',
        motoModel: 'GSX-S750',
        isRiding: true,
        speed: 60,
        sharedAt: new Date(Date.now() - 8 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60000).toISOString()
      }
    ];

    this._write(this.KEYS.LOCATIONS, demoLocations);

    // ─── Demo Friendships ────────────────────────────────
    const demoFriends = {
      friendships: [
        { id: 'fs_001', user1: 'demo_user_001', user2: 'demo_user_002', since: '2025-02-20T14:00:00.000Z' },
        { id: 'fs_002', user1: 'demo_user_001', user2: 'demo_user_003', since: '2025-03-05T10:00:00.000Z' },
        { id: 'fs_003', user1: 'demo_user_001', user2: 'demo_user_005', since: '2025-04-10T16:00:00.000Z' },
        { id: 'fs_004', user1: 'demo_user_002', user2: 'demo_user_004', since: '2025-05-15T09:00:00.000Z' },
        { id: 'fs_005', user1: 'demo_user_003', user2: 'demo_user_007', since: '2025-03-20T11:00:00.000Z' },
        { id: 'fs_006', user1: 'demo_user_005', user2: 'demo_user_006', since: '2025-06-01T08:00:00.000Z' },
        { id: 'fs_007', user1: 'demo_user_004', user2: 'demo_user_008', since: '2025-04-25T13:00:00.000Z' }
      ],
      requests: []
    };

    this._write(this.KEYS.FRIENDS, demoFriends);

    // ─── Demo Messages ───────────────────────────────────
    const demoMessages = [
      {
        id: 'msg_001',
        contextType: 'event',
        contextId: 'demo_event_001',
        senderId: 'demo_user_001',
        senderName: 'Əli Həsənov',
        text: 'Hamı hazırdır? Saat 19:00-da 28 May metrosunda görüşürük! 🏍️',
        createdAt: '2026-06-19T10:00:00.000Z'
      },
      {
        id: 'msg_002',
        contextType: 'event',
        contextId: 'demo_event_001',
        senderId: 'demo_user_002',
        senderName: 'Tural Məmmədov',
        text: 'Hazıram! Yanacağı doldurub gəlirəm ⛽',
        createdAt: '2026-06-19T10:15:00.000Z'
      },
      {
        id: 'msg_003',
        contextType: 'event',
        contextId: 'demo_event_002',
        senderId: 'demo_user_003',
        senderName: 'Kamran Əliyev',
        text: 'Serpantin yollarına hazır olun! Təkərlərinizi yoxlayın.',
        createdAt: '2026-06-20T08:00:00.000Z'
      }
    ];

    this._write(this.KEYS.MESSAGES, demoMessages);

    // ─── Default Settings ────────────────────────────────
    this._write(this.KEYS.SETTINGS, {
      mapStyle: 'dark',
      language: 'az',
      distanceUnit: 'km',
      speedUnit: 'km/h'
    });
  }
};
