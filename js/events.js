/* ================================================================
   MotoEvents — Ride Events Module
   MotoRiders Community App (Baku, Azerbaijan)
   ================================================================ */

const MotoEvents = {
  currentFilter: 'all',
  countdownInterval: null,

  MONTHS_AZ: [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ],

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.renderEvents();
    this.startCountdowns();
  },

  /* ──────────────────────────────────────────────
     RENDER EVENTS LIST
  ────────────────────────────────────────────── */
  renderEvents(filter) {
    if (filter) this.currentFilter = filter;

    const container = document.getElementById('events-list');
    if (!container) return;

    let events = [];
    if (typeof MotoStorage !== 'undefined') {
      events = MotoStorage.getEvents() || [];
    }

    /* Apply filter */
    const now = Date.now();
    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';

    let filtered = events;
    if (this.currentFilter === 'mine') {
      filtered = events.filter(
        (e) =>
          e.creatorId === userId ||
          (e.participants && e.participants.includes(userId))
      );
    } else if (this.currentFilter === 'upcoming') {
      filtered = events.filter((e) => new Date(e.date).getTime() > now);
    }

    /* Sort by date ascending */
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

    /* Build HTML */
    let html = '';

    /* Filter tabs */
    html += `
      <div class="events-header">
        <h2 class="page-title">🏍️ Tədbirlər</h2>
        <div class="filter-tabs">
          <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('all')">Hamısı</button>
          <button class="filter-tab ${this.currentFilter === 'mine' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('mine')">Mənimkilər</button>
          <button class="filter-tab ${this.currentFilter === 'upcoming' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('upcoming')">Gələn</button>
        </div>
      </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-icon">🏍️</div>
          <p>Hələ ki, tədbir yoxdur</p>
          <button class="btn-primary" onclick="MotoEvents.showCreateForm()">
            + Tədbir Yarat
          </button>
        </div>
      `;
    } else {
      html += '<div class="events-grid">';
      filtered.forEach((event) => {
        html += this.renderEventCard(event);
      });
      html += '</div>';
    }

    /* FAB for creating event */
    html += `
      <button class="fab-btn" id="fab-create-event" onclick="MotoEvents.showCreateForm()">
        <span>+</span>
      </button>
    `;

    container.innerHTML = html;
    this.startCountdowns();
  },

  /* ──────────────────────────────────────────────
     EVENT CARD
  ────────────────────────────────────────────── */
  renderEventCard(event) {
    const date = new Date(event.date);
    const day = date.getDate();
    const month = this.MONTHS_AZ[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';
    const participants = event.participants || [];
    const isJoined = participants.includes(userId);
    const countdown = this.formatCountdown(event.date);
    const isPast = new Date(event.date).getTime() < Date.now();

    /* Participant avatars */
    const participantHtml = this.renderParticipants(participants);

    return `
      <div class="event-card ${isPast ? 'past' : ''}" data-event-id="${event.id}">
        <div class="event-card-top" onclick="MotoEvents.renderEventDetail('${event.id}')">
          <div class="event-date-badge">
            <span class="event-day">${day}</span>
            <span class="event-month">${month}</span>
          </div>
          <div class="event-info">
            <h3 class="event-title">${this.escapeHtml(event.title)}</h3>
            <p class="event-desc">${this.escapeHtml((event.description || '').substring(0, 80))}${(event.description || '').length > 80 ? '...' : ''}</p>
            <div class="event-time">🕐 ${hours}:${minutes}</div>
          </div>
        </div>

        <div class="event-card-route">
          <span class="route-start">📍 ${this.escapeHtml(event.startLocation || 'Bakı')}</span>
          <span class="route-arrow">→</span>
          <span class="route-end">🏁 ${this.escapeHtml(event.endLocation || 'Bakı')}</span>
        </div>

        <div class="event-card-bottom">
          <div class="event-participants">
            ${participantHtml}
          </div>
          <div class="event-countdown" data-target="${event.date}">
            ${isPast ? '<span class="past-badge">Keçmiş</span>' : countdown}
          </div>
          ${
            isPast
              ? ''
              : isJoined
                ? `<button class="btn-joined" onclick="event.stopPropagation(); MotoEvents.handleLeave('${event.id}')">Qoşulmusan ✓</button>`
                : `<button class="btn-join" onclick="event.stopPropagation(); MotoEvents.handleJoin('${event.id}')">Qoşul</button>`
          }
        </div>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     EVENT DETAIL (modal)
  ────────────────────────────────────────────── */
  renderEventDetail(eventId) {
    if (typeof MotoStorage === 'undefined') return;
    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const date = new Date(event.date);
    const day = date.getDate();
    const month = this.MONTHS_AZ[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const countdown = this.formatCountdown(event.date);
    const isPast = date.getTime() < Date.now();

    const currentUser = MotoStorage.getCurrentUser();
    const userId = currentUser ? currentUser.id : '';
    const participants = event.participants || [];
    const isJoined = participants.includes(userId);
    const isCreator = event.creatorId === userId;

    /* Get participant names */
    const allUsers = MotoStorage.getUsers ? MotoStorage.getUsers() : [];
    const participantNames = participants.map((pid) => {
      const u = allUsers.find((usr) => usr.id === pid);
      return u ? u.name : 'Naməlum';
    });

    const commentsHtml = this.renderComments(eventId);

    const html = `
      <div class="event-detail">
        <div class="event-detail-header">
          <div class="event-date-badge large">
            <span class="event-day">${day}</span>
            <span class="event-month">${month}</span>
            <span class="event-year">${year}</span>
          </div>
          <div class="event-detail-meta">
            <h2>${this.escapeHtml(event.title)}</h2>
            <div class="event-time-detail">🕐 ${hours}:${minutes}</div>
            ${isPast ? '<span class="past-badge">Keçmiş tədbir</span>' : `<span class="countdown-badge">${countdown}</span>`}
          </div>
        </div>

        <div class="event-detail-route">
          <div class="route-point start">
            <span class="route-dot"></span>
            <span>📍 ${this.escapeHtml(event.startLocation || 'Bakı')}</span>
          </div>
          <div class="route-line-v"></div>
          <div class="route-point end">
            <span class="route-dot end-dot"></span>
            <span>🏁 ${this.escapeHtml(event.endLocation || 'Bakı')}</span>
          </div>
        </div>

        <div class="event-detail-desc">
          <h4>Təsvir</h4>
          <p>${this.escapeHtml(event.description || 'Təsvir yoxdur')}</p>
        </div>

        <div class="event-detail-participants">
          <h4>👥 İştirakçılar (${participants.length})</h4>
          <div class="participant-list">
            ${participantNames.map((name) => `<span class="participant-chip">${this.escapeHtml(name)}</span>`).join('')}
          </div>
        </div>

        <div class="event-detail-actions">
          ${
            isPast
              ? ''
              : isJoined
                ? `<button class="btn-joined btn-lg" onclick="MotoEvents.handleLeave('${event.id}'); MotoApp.closeModal();">Ayrıl</button>`
                : `<button class="btn-primary btn-lg" onclick="MotoEvents.handleJoin('${event.id}'); MotoApp.closeModal();">Qoşul 🏍️</button>`
          }
          ${event.lat && event.lng ? `<button class="btn-secondary btn-lg" onclick="MotoApp.closeModal(); MotoApp.navigateTo('map'); setTimeout(() => MotoMap.map.setView([${event.lat},${event.lng}], 15), 300);">🗺️ Xəritədə Gör</button>` : ''}
        </div>

        <div class="event-comments-section">
          <h4>💬 Şərhlər</h4>
          <div id="event-comments-${event.id}">
            ${commentsHtml}
          </div>
          <div class="comment-input-row">
            <input type="text" id="comment-input-${event.id}" class="input-field"
                   placeholder="Şərh yaz..." maxlength="200" />
            <button class="btn-primary btn-sm" onclick="MotoEvents.handleAddComment('${event.id}', document.getElementById('comment-input-${event.id}').value)">
              Göndər
            </button>
          </div>
        </div>
      </div>
    `;

    MotoApp.openModal(html, event.title);
  },

  /* ──────────────────────────────────────────────
     CRUD
  ────────────────────────────────────────────── */
  showCreateForm() {
    const now = new Date();
    const defaultDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dateStr = defaultDate.toISOString().slice(0, 16);

    const html = `
      <form class="event-form" id="event-create-form" onsubmit="MotoEvents.handleCreateSubmit(event); return false;">
        <div class="form-group">
          <label class="form-label">Tədbir adı *</label>
          <input type="text" name="title" class="input-field" required
                 placeholder="məs. Baku Night Ride" maxlength="60" />
        </div>
        <div class="form-group">
          <label class="form-label">Təsvir</label>
          <textarea name="description" class="input-field textarea" rows="3"
                    placeholder="Tədbir haqqında qısa məlumat..." maxlength="300"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Tarix və vaxt *</label>
          <input type="datetime-local" name="date" class="input-field" required
                 value="${dateStr}" />
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Başlanğıc yeri *</label>
            <input type="text" name="startLocation" class="input-field" required
                   placeholder="məs. Dənizkənarı Park" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Son nöqtə *</label>
            <input type="text" name="endLocation" class="input-field" required
                   placeholder="məs. Mərdəkan" />
          </div>
        </div>
        <button type="submit" class="btn-primary btn-lg full-width">
          🏍️ Tədbir Yarat
        </button>
      </form>
    `;

    MotoApp.openModal(html, 'Yeni Tədbir');
  },

  handleCreateSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('event-create-form');
    if (!form) return;

    const data = new FormData(form);
    this.handleCreate({
      title: data.get('title'),
      description: data.get('description'),
      date: data.get('date'),
      startLocation: data.get('startLocation'),
      endLocation: data.get('endLocation'),
    });
  },

  handleCreate(formData) {
    if (!formData.title || !formData.date || !formData.startLocation || !formData.endLocation) {
      MotoApp.showToast('Zəhmət olmasa bütün sahələri doldurun', 'error');
      return;
    }

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;

    const event = {
      id: 'event_' + Date.now(),
      title: formData.title.trim(),
      description: (formData.description || '').trim(),
      date: new Date(formData.date).toISOString(),
      startLocation: formData.startLocation.trim(),
      endLocation: formData.endLocation.trim(),
      creatorId: currentUser ? currentUser.id : 'user_1',
      participants: [currentUser ? currentUser.id : 'user_1'],
      comments: [],
      lat: 40.4093 + (Math.random() - 0.5) * 0.04,
      lng: 49.8671 + (Math.random() - 0.5) * 0.04,
      createdAt: new Date().toISOString(),
    };

    if (typeof MotoStorage !== 'undefined') {
      MotoStorage.saveEvent(event);
    }

    MotoApp.closeModal();
    this.renderEvents();
    MotoApp.showToast('Tədbir yaradıldı! 🏍️', 'success');

    /* Add to map */
    if (typeof MotoMap !== 'undefined') {
      MotoMap.addEventMarker(event);
    }
  },

  handleJoin(eventId) {
    if (typeof MotoStorage === 'undefined') return;
    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    if (!event.participants) event.participants = [];
    if (event.participants.includes(currentUser.id)) return;

    event.participants.push(currentUser.id);
    MotoStorage.updateEvent(event);
    this.renderEvents();
    MotoApp.showToast('Tədbirə qoşuldun! 🎉', 'success');
  },

  handleLeave(eventId) {
    if (typeof MotoStorage === 'undefined') return;
    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event || !event.participants) return;

    event.participants = event.participants.filter(
      (id) => id !== currentUser.id
    );
    MotoStorage.updateEvent(event);
    this.renderEvents();
    MotoApp.showToast('Tədbiirdən ayrıldın', 'info');
  },

  /* ──────────────────────────────────────────────
     FILTERS
  ────────────────────────────────────────────── */
  setFilter(filter) {
    this.currentFilter = filter;
    this.renderEvents();
  },

  /* ──────────────────────────────────────────────
     COMMENTS
  ────────────────────────────────────────────── */
  renderComments(eventId) {
    if (typeof MotoStorage === 'undefined') return '';
    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event || !event.comments || event.comments.length === 0) {
      return '<p class="no-comments">Hələ şərh yoxdur</p>';
    }

    const allUsers = MotoStorage.getUsers ? MotoStorage.getUsers() : [];

    return event.comments
      .map((c) => {
        const user = allUsers.find((u) => u.id === c.userId);
        const name = user ? user.name : 'Naməlum';
        const timeAgo = MotoMap.formatTimeAgo
          ? MotoMap.formatTimeAgo(c.timestamp)
          : '';
        return `
          <div class="comment-item">
            <div class="comment-avatar">${user && user.avatar ? user.avatar : '👤'}</div>
            <div class="comment-body">
              <span class="comment-author">${this.escapeHtml(name)}</span>
              <span class="comment-time">${timeAgo}</span>
              <p class="comment-text">${this.escapeHtml(c.text)}</p>
            </div>
          </div>
        `;
      })
      .join('');
  },

  handleAddComment(eventId, text) {
    if (!text || !text.trim()) return;
    if (typeof MotoStorage === 'undefined') return;

    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    if (!event.comments) event.comments = [];
    event.comments.push({
      id: 'comment_' + Date.now(),
      userId: currentUser.id,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });

    MotoStorage.updateEvent(event);

    /* Refresh comments in modal */
    const commentsEl = document.getElementById(`event-comments-${eventId}`);
    if (commentsEl) {
      commentsEl.innerHTML = this.renderComments(eventId);
    }
    const input = document.getElementById(`comment-input-${eventId}`);
    if (input) input.value = '';

    MotoApp.showToast('Şərh əlavə edildi', 'success');
  },

  /* ──────────────────────────────────────────────
     COUNTDOWN
  ────────────────────────────────────────────── */
  formatCountdown(targetDate) {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return 'Başladı';

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;

    if (days > 0) return `${days} gün ${hours} saat`;
    if (hours > 0) return `${hours} saat ${mins} dəq`;
    return `${mins} dəq`;
  },

  startCountdowns() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      const els = document.querySelectorAll('.event-countdown[data-target]');
      els.forEach((el) => {
        const target = el.dataset.target;
        if (!target) return;
        const isPast = new Date(target).getTime() < Date.now();
        if (isPast) {
          el.innerHTML = '<span class="past-badge">Keçmiş</span>';
        } else {
          el.textContent = this.formatCountdown(target);
        }
      });
    }, 30000);
  },

  /* ──────────────────────────────────────────────
     PARTICIPANTS (overlapping avatars)
  ────────────────────────────────────────────── */
  renderParticipants(participantIds) {
    if (!participantIds || participantIds.length === 0) {
      return '<span class="no-participants">Hələ iştirakçı yoxdur</span>';
    }

    const allUsers =
      typeof MotoStorage !== 'undefined' && MotoStorage.getUsers
        ? MotoStorage.getUsers()
        : [];

    const maxShow = 5;
    const shown = participantIds.slice(0, maxShow);
    const remaining = participantIds.length - maxShow;

    let html = '<div class="avatar-stack">';
    shown.forEach((pid, i) => {
      const user = allUsers.find((u) => u.id === pid);
      const avatar = user && user.avatar ? user.avatar : '👤';
      html += `<span class="avatar-chip" style="z-index:${maxShow - i}">${avatar}</span>`;
    });

    if (remaining > 0) {
      html += `<span class="avatar-chip more">+${remaining}</span>`;
    }
    html += '</div>';

    return html;
  },

  /* ──────────────────────────────────────────────
     SHARE EVENT
  ────────────────────────────────────────────── */
  shareEvent(eventId, mode) {
    if (typeof MotoStorage === 'undefined') return;
    const events = MotoStorage.getEvents() || [];
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const msg = `🏍️ ${event.title} — ${new Date(event.date).toLocaleDateString('az-AZ')}`;

    if (navigator.share) {
      navigator.share({ title: event.title, text: msg }).catch(() => {});
    } else {
      /* Copy to clipboard */
      navigator.clipboard.writeText(msg).then(
        () => MotoApp.showToast('Kopyalandı!', 'success'),
        () => MotoApp.showToast('Paylaşma xətası', 'error')
      );
    }
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
