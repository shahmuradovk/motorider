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
    // Only seed if storage has never been set up (USERS key doesn't exist)
    if (localStorage.getItem(this.KEYS.USERS) === null) {
      this._seedDemoData();
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
    // No demo data — clean start
    this._write(this.KEYS.USERS, []);
    this._write(this.KEYS.EVENTS, []);
    this._write(this.KEYS.ALERTS, []);
    this._write(this.KEYS.LOCATIONS, []);
    this._write(this.KEYS.FRIENDS, { friendships: [], requests: [] });
    this._write(this.KEYS.MESSAGES, []);

    // Default Settings
    this._write(this.KEYS.SETTINGS, {
      mapStyle: 'dark',
      language: 'az',
      distanceUnit: 'km',
      speedUnit: 'km/h'
    });
  }
};
