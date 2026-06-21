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

  MONTHS_SHORT: ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'],

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
    } else if (this.currentFilter === 'past') {
      filtered = events.filter((e) => new Date(e.date).getTime() <= now);
    }

    /* Sort by date ascending */
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

    /* Build HTML — using events.css class names */
    let html = '';

    /* Filter tabs — events-tabs from events.css */
    html += `
      <div class="events-header">
        <h2 class="events-title">Tədbirlər</h2>
      </div>
      <div class="events-filters">
        <div class="events-tabs">
          <button class="events-tab ${this.currentFilter === 'all' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('all')">Hamısı <span class="tab-count">${events.length}</span></button>
          <button class="events-tab ${this.currentFilter === 'upcoming' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('upcoming')">Yaxınlaşan</button>
          <button class="events-tab ${this.currentFilter === 'mine' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('mine')">Mənimkilər</button>
          <button class="events-tab ${this.currentFilter === 'past' ? 'active' : ''}"
                  onclick="MotoEvents.setFilter('past')">Keçmiş</button>
        </div>
      </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Tədbir tapılmadı</h3>
          <p class="empty-state-text">İlk tədbiri sən yarat!</p>
        </div>
      `;
    } else {
      html += '<div class="events-list">';
      filtered.forEach((event, i) => {
        html += this.renderEventCard(event, i);
      });
      html += '</div>';
    }

    container.innerHTML = html;
    this.startCountdowns();
  },

  /* ──────────────────────────────────────────────
     EVENT CARD — matches events.css classes
  ────────────────────────────────────────────── */
  renderEventCard(event, index) {
    const date = new Date(event.date);
    const day = date.getDate();
    const monthShort = this.MONTHS_SHORT[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';
    const participants = event.participants || [];
    const isJoined = participants.includes(userId);
    const isPast = date.getTime() < Date.now();

    /* Countdown */
    const countdown = this.renderCountdown(event.date, isPast);

    /* Participant avatars */
    const participantHtml = this.renderParticipantAvatars(participants);

    /* Join button state */
    let joinBtn = '';
    if (isPast) {
      joinBtn = `<span class="event-join-btn full">Bitib</span>`;
    } else if (isJoined) {
      joinBtn = `<button class="event-join-btn joined" onclick="event.stopPropagation(); MotoEvents.handleLeave('${event.id}')">✓ Qoşulmusan</button>`;
    } else {
      joinBtn = `<button class="event-join-btn" onclick="event.stopPropagation(); MotoEvents.handleJoin('${event.id}')">Qoşul</button>`;
    }

    /* Animation delay */
    const delay = Math.min(index || 0, 5) * 60;

    return `
      <div class="event-card" style="animation-delay: ${delay}ms" onclick="MotoEvents.renderEventDetail('${event.id}')">
        <!-- Card Header with gradient bg -->
        <div class="event-card-header" style="background: linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,51,51,0.08) 50%, rgba(15,15,26,1) 100%);">
          <div class="event-date-badge">
            <span class="event-date-day">${day}</span>
            <span class="event-date-month">${monthShort}</span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="event-card-body">
          <h3 class="event-card-title">${this.escapeHtml(event.title)}</h3>
          ${event.description ? `<p class="event-card-description">${this.escapeHtml(event.description)}</p>` : ''}
          <div class="event-card-meta">
            <div class="event-card-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${hours}:${minutes}
            </div>
            <div class="event-card-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${this.escapeHtml(event.startLocation || 'Bakı')}${event.endLocation ? ' → ' + this.escapeHtml(event.endLocation) : ''}
            </div>
          </div>
          ${countdown}
        </div>

        <!-- Card Footer -->
        <div class="event-card-footer">
          <div class="event-participants">
            ${participantHtml}
            <span class="event-participants-count">${participants.length} nəfər</span>
          </div>
          ${joinBtn}
        </div>
      </div>
    `;
  },

  /* ── Countdown using events.css ── */
  renderCountdown(targetDate, isPast) {
    if (isPast) return '';

    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return '';

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;

    return `
      <div class="event-countdown" data-target="${targetDate}">
        ${days > 0 ? `
          <div class="event-countdown-item">
            <div class="event-countdown-value">${days}</div>
            <div class="event-countdown-label">Gün</div>
          </div>
          <span class="event-countdown-separator">:</span>
        ` : ''}
        <div class="event-countdown-item">
          <div class="event-countdown-value">${hours}</div>
          <div class="event-countdown-label">Saat</div>
        </div>
        <span class="event-countdown-separator">:</span>
        <div class="event-countdown-item">
          <div class="event-countdown-value">${mins}</div>
          <div class="event-countdown-label">Dəq</div>
        </div>
      </div>
    `;
  },

  /* ── Participant Avatars (overlapping) — events.css ── */
  renderParticipantAvatars(participantIds) {
    if (!participantIds || participantIds.length === 0) return '';

    const allUsers =
      typeof MotoStorage !== 'undefined' && MotoStorage.getUsers
        ? MotoStorage.getUsers()
        : [];

    const maxShow = 4;
    const shown = participantIds.slice(0, maxShow);
    const remaining = participantIds.length - maxShow;

    let html = '<div class="event-participants-avatars">';
    shown.forEach((pid) => {
      const user = allUsers.find((u) => u.id === pid);
      const initials = user
        ? MotoStorage.getInitials(user.firstName, user.lastName)
        : '?';
      html += `<div class="avatar">${initials}</div>`;
    });

    if (remaining > 0) {
      html += `<div class="avatar">+${remaining}</div>`;
    }
    html += '</div>';

    return html;
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
    const isPast = date.getTime() < Date.now();

    const currentUser = MotoStorage.getCurrentUser();
    const userId = currentUser ? currentUser.id : '';
    const participants = event.participants || [];
    const isJoined = participants.includes(userId);

    /* Get participant details */
    const allUsers = MotoStorage.getUsers ? MotoStorage.getUsers() : [];
    const participantDetails = participants.map((pid) => {
      const u = allUsers.find((usr) => usr.id === pid);
      return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Naməlum';
    });

    const commentsHtml = this.renderComments(eventId);

    const html = `
      <div class="event-detail">
        <div class="event-detail-header" style="margin-top: 0;">
          <h2 class="event-detail-title">${this.escapeHtml(event.title)}</h2>
          <div class="event-detail-meta">
            <div class="event-detail-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${day} ${month} ${year}
            </div>
            <div class="event-detail-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${hours}:${minutes}
            </div>
            <div class="event-detail-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${this.escapeHtml(event.startLocation || 'Bakı')}${event.endLocation ? ' → ' + this.escapeHtml(event.endLocation) : ''}
            </div>
          </div>
        </div>

        ${event.description ? `
          <div class="event-detail-description">${this.escapeHtml(event.description)}</div>
        ` : ''}

        <div class="event-participants-section">
          <div class="event-section-header">
            <span class="event-section-title">İştirakçılar</span>
            <span class="event-section-count">${participants.length} nəfər</span>
          </div>
          <div class="event-participant-list">
            ${participantDetails.map((name, i) => `
              <div class="event-participant-item">
                <div class="avatar">${name.charAt(0)}</div>
                <span class="event-participant-name">${this.escapeHtml(name)}</span>
                ${participants[i] === event.creatorId ? '<span class="event-participant-badge">Təşkilatçı</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 16px;">
          ${isPast ? '' : isJoined
            ? `<button class="event-join-btn joined" style="flex:1; padding: 14px;" onclick="MotoEvents.handleLeave('${event.id}'); MotoApp.closeModal();">Ayrıl</button>`
            : `<button class="event-join-btn" style="flex:1; padding: 14px;" onclick="MotoEvents.handleJoin('${event.id}'); MotoApp.closeModal();">Qoşul 🏍️</button>`
          }
        </div>

        <div class="event-comments" style="margin-top: 20px;">
          <div class="event-section-header">
            <span class="event-section-title">Şərhlər</span>
          </div>
          <div class="event-comments-list" id="event-comments-${event.id}">
            ${commentsHtml}
          </div>
          <div class="event-comment-input" style="display:flex; gap:8px;">
            <input type="text" id="comment-input-${event.id}" class="p-edit-input" style="flex:1;"
                   placeholder="Şərh yaz..." maxlength="200" />
            <button class="event-join-btn" style="padding: 10px 16px;" onclick="MotoEvents.handleAddComment('${event.id}', document.getElementById('comment-input-${event.id}').value)">
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
      <form class="p-edit-form" id="event-create-form" onsubmit="MotoEvents.handleCreateSubmit(event); return false;">
        <div class="p-edit-group">
          <label class="p-edit-label">Tədbir adı *</label>
          <input type="text" name="title" class="p-edit-input" required
                 placeholder="məs. Baku Night Ride" maxlength="60" />
        </div>
        <div class="p-edit-group">
          <label class="p-edit-label">Təsvir</label>
          <textarea name="description" class="p-edit-input" rows="3"
                    placeholder="Tədbir haqqında qısa məlumat..." maxlength="300" style="resize:vertical;"></textarea>
        </div>
        <div class="p-edit-group">
          <label class="p-edit-label">Tarix və vaxt *</label>
          <input type="datetime-local" name="date" class="p-edit-input" required
                 value="${dateStr}" />
        </div>
        <div class="p-edit-row">
          <div class="p-edit-group">
            <label class="p-edit-label">Başlanğıc *</label>
            <input type="text" name="startLocation" class="p-edit-input" required
                   placeholder="məs. Dənizkənarı Park" />
          </div>
          <div class="p-edit-group">
            <label class="p-edit-label">Son nöqtə *</label>
            <input type="text" name="endLocation" class="p-edit-input" required
                   placeholder="məs. Mərdəkan" />
          </div>
        </div>
        <button type="submit" class="p-edit-save">
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
      return '<p style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 16px;">Hələ şərh yoxdur</p>';
    }

    const allUsers = MotoStorage.getUsers ? MotoStorage.getUsers() : [];

    return event.comments
      .map((c) => {
        const user = allUsers.find((u) => u.id === c.userId);
        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Naməlum';
        const timeAgo = typeof MotoStorage !== 'undefined' ? MotoStorage.getTimeAgo(c.timestamp) : '';
        return `
          <div class="event-comment">
            <div class="avatar" style="width:32px; height:32px; font-size: 11px;">${name.charAt(0)}</div>
            <div class="event-comment-body">
              <div class="event-comment-header">
                <span class="event-comment-author">${this.escapeHtml(name)}</span>
                <span class="event-comment-time">${timeAgo}</span>
              </div>
              <div class="event-comment-text">${this.escapeHtml(c.text)}</div>
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
          el.innerHTML = '<span style="color: var(--text-muted); font-size: 0.75rem;">Başladı</span>';
        }
      });
    }, 30000);
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
