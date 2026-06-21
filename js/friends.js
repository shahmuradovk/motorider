/* ================================================================
   MotoFriends — Friend System Module
   MotoRiders Community App (Baku, Azerbaijan)
   Uses reusable classes from profile.css (p-card, p-section, etc.)
   ================================================================ */

const MotoFriends = {
  searchDebounceTimer: null,

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.renderFriendsList();
  },

  /* ──────────────────────────────────────────────
     RENDER FRIENDS LIST — uses profile.css reusable classes
  ────────────────────────────────────────────── */
  renderFriendsList() {
    const container = document.getElementById('friends-list');
    if (!container) return;

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';

    let friends = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getFriends) {
      friends = MotoStorage.getFriends(userId);
    }

    /* Get friend requests */
    let requests = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getFriendRequests) {
      requests = MotoStorage.getFriendRequests(userId);
    }

    let html = '';

    /* Search bar — p-card style */
    html += `
      <div class="p-section">
        <div class="p-card" style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="friends-search-input" class="p-edit-input" style="border:none; background:none; padding: 0; flex:1;"
                   placeholder="İstifadəçi axtar..." maxlength="50"
                   oninput="MotoFriends.handleSearch(event)" />
          </div>
          <div id="search-results"></div>
        </div>
      </div>
    `;

    /* Friend requests section */
    if (requests.length > 0) {
      html += `
        <div class="p-section">
          <div class="p-section-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <h3>Dostluq İstəkləri (${requests.length})</h3>
          </div>
          <div class="p-card" style="padding: 0;">
      `;
      requests.forEach((req) => {
        html += this.renderFriendRequestCard(req);
      });
      html += '</div></div>';
    }

    /* Friends section */
    html += `
      <div class="p-section">
        <div class="p-section-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          <h3>Dostlarım (${friends.length})</h3>
        </div>
    `;

    if (friends.length === 0) {
      html += `
        <div class="p-empty">
          <span style="font-size: 2rem;">👥</span>
          <span>Hələ ki dostun yoxdur</span>
          <span style="font-size: 0.72rem; color: #555;">Yuxarıdakı axtarışdan istifadəçi tap və ya aşağıdakı icma üzvlərinə dostluq göndər</span>
        </div>
      `;
    } else {
      html += '<div class="p-card" style="padding: 0;">';
      friends.forEach((friend) => {
        html += this.renderFriendCard(friend);
      });
      html += '</div>';
    }

    html += '</div>';

    /* Sent requests section */
    let sentRequests = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSentRequests) {
      sentRequests = MotoStorage.getSentRequests(userId);
    }

    if (sentRequests.length > 0) {
      html += `
        <div class="p-section">
          <div class="p-section-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            <h3>Göndərilən İstəklər (${sentRequests.length})</h3>
          </div>
          <div class="p-card" style="padding: 0;">
      `;
      sentRequests.forEach(req => {
        const toUser = typeof MotoStorage !== 'undefined' && MotoStorage.getUserById
          ? MotoStorage.getUserById(req.to) : null;
        const name = toUser ? `${toUser.firstName || ''} ${toUser.lastName || ''}`.trim() || toUser.email : 'Naməlum';
        const initials = toUser && typeof MotoStorage !== 'undefined'
          ? MotoStorage.getInitials(toUser.firstName, toUser.lastName)
          : name.charAt(0);
        const bike = toUser && toUser.motoBrand ? `${toUser.motoBrand} ${toUser.motoModel || ''}` : '';

        html += `
          <div class="p-setting" style="gap: 12px;">
            <div class="p-setting-left" style="flex: 1; min-width: 0;">
              <div class="avatar" style="width: 40px; height: 40px; font-size: 0.8rem;">${initials}</div>
              <div style="min-width: 0;">
                <span class="p-setting-name">${this.escapeHtml(name)}</span>
                <span class="p-setting-desc">${this.escapeHtml(bike)}${bike ? ' · ' : ''}Cavab gözlənilir...</span>
              </div>
            </div>
            <span style="font-size: 0.72rem; color: #ffaa00; padding: 6px 12px; background: rgba(255,170,0,0.08); border-radius: 20px;">⏳ Gözləyir</span>
          </div>
        `;
      });
      html += '</div></div>';
    }

    container.innerHTML = html;
  },

  /* ──────────────────────────────────────────────
     FRIEND CARD — uses p-setting style layout
  ────────────────────────────────────────────── */
  renderFriendCard(user) {
    const isOnline = user.isOnline || user.status === 'online' || user.status === 'riding';
    const isRiding = user.status === 'riding';
    const statusText = isRiding ? 'Sürüşdə' : isOnline ? 'Onlayn' : 'Oflayn';
    const statusColor = isRiding ? '#ff6b35' : isOnline ? '#22c55e' : '#555';

    const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Naməlum';
    const initials = typeof MotoStorage !== 'undefined'
      ? MotoStorage.getInitials(user.firstName, user.lastName)
      : name.charAt(0);
    const bike = user.motorcycle || user.moto || (user.motoBrand ? `${user.motoBrand} ${user.motoModel || ''}` : '');

    return `
      <div class="p-setting" style="gap: 12px;">
        <div class="p-setting-left" style="flex: 1; min-width: 0;">
          <div style="position: relative;">
            <div class="avatar" style="width: 40px; height: 40px; font-size: 0.8rem;">${initials}</div>
            <span style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: ${statusColor}; border: 2px solid #0a0a0f; border-radius: 50%;"></span>
          </div>
          <div style="min-width: 0;">
            <span class="p-setting-name">${this.escapeHtml(name)}</span>
            <span class="p-setting-desc">${this.escapeHtml(bike)}${bike && statusText ? ' · ' : ''}${statusText}</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button class="p-edit-btn" style="margin:0; padding: 6px 10px; font-size: 0.72rem;"
                  onclick="event.stopPropagation(); MotoApp.showToast('Mesaj funksiyası tezliklə!', 'info')">
            💬
          </button>
          <button style="background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.15); color: #ff4444; border-radius: 20px; padding: 6px 10px; font-size: 0.72rem; cursor: pointer; transition: all 0.2s;"
                  onclick="event.stopPropagation(); MotoFriends.confirmRemove('${user.id}')">
            ✕
          </button>
        </div>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     FRIEND REQUEST CARD
  ────────────────────────────────────────────── */
  renderFriendRequestCard(request) {
    const user = request.fromUser || (
      typeof MotoStorage !== 'undefined' && MotoStorage.getUserById
        ? MotoStorage.getUserById(request.from)
        : null
    );

    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Naməlum';
    const initials = user && typeof MotoStorage !== 'undefined'
      ? MotoStorage.getInitials(user.firstName, user.lastName)
      : name.charAt(0);
    const bike = user ? (user.motoBrand ? `${user.motoBrand} ${user.motoModel || ''}` : '') : '';

    return `
      <div class="p-setting" style="gap: 12px;">
        <div class="p-setting-left" style="flex: 1; min-width: 0;">
          <div class="avatar" style="width: 40px; height: 40px; font-size: 0.8rem;">${initials}</div>
          <div style="min-width: 0;">
            <span class="p-setting-name">${this.escapeHtml(name)}</span>
            <span class="p-setting-desc">${this.escapeHtml(bike)}${bike ? ' · ' : ''}Dostluq istəyi</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button class="p-edit-btn" style="margin:0; padding: 6px 14px; font-size: 0.72rem; background: rgba(34,197,94,0.1); color: #22c55e; border-color: rgba(34,197,94,0.2);"
                  onclick="event.stopPropagation(); MotoFriends.acceptRequest('${request.id}')">
            ✓ Qəbul
          </button>
          <button style="background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.15); color: #ff4444; border-radius: 20px; padding: 6px 10px; font-size: 0.72rem; cursor: pointer; transition: all 0.2s;"
                  onclick="event.stopPropagation(); MotoFriends.rejectRequest('${request.id}')">
            ✕
          </button>
        </div>
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     SEARCH
  ────────────────────────────────────────────── */
  showSearchBar() {
    const input = document.getElementById('friends-search-input');
    if (input) input.focus();
  },

  handleSearch(e) {
    const query = e.target.value.trim();
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);

    if (!query) {
      const results = document.getElementById('search-results');
      if (results) results.innerHTML = '';
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.renderSearchResults(query);
    }, 300);
  },

  searchUsers(query) {
    if (typeof MotoStorage === 'undefined' || !MotoStorage.getUsers) return [];
    const allUsers = MotoStorage.getUsers();
    const currentUser = MotoStorage.getCurrentUser();
    const userId = currentUser ? currentUser.id : '';
    const q = query.toLowerCase();

    return allUsers.filter(
      (u) =>
        u.id !== userId &&
        ((u.firstName || '').toLowerCase().includes(q) ||
         (u.lastName || '').toLowerCase().includes(q) ||
         (u.email || '').toLowerCase().includes(q) ||
         (u.motoBrand || '').toLowerCase().includes(q))
    );
  },

  renderSearchResults(query) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const results = this.searchUsers(query);

    if (results.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 12px;">Nəticə tapılmadı</p>`;
      return;
    }

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';

    let friends = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getFriends) {
      friends = MotoStorage.getFriends(userId);
    }
    const friendIds = friends.map((f) => f.id);

    let pendingRequests = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSentRequests) {
      pendingRequests = MotoStorage.getSentRequests(userId);
    }
    const pendingIds = pendingRequests.map((r) => r.to || r.toUserId);

    let html = '<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">';
    results.forEach((user) => {
      let actionType = 'add';
      if (friendIds.includes(user.id)) {
        actionType = 'friend';
      } else if (pendingIds.includes(user.id)) {
        actionType = 'pending';
      }
      html += this.renderSearchUserCard(user, actionType);
    });
    html += '</div>';

    container.innerHTML = html;
  },

  renderSearchUserCard(user, actionType) {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Naməlum';
    const initials = typeof MotoStorage !== 'undefined'
      ? MotoStorage.getInitials(user.firstName, user.lastName)
      : name.charAt(0);
    const bike = user.motoBrand ? `${user.motoBrand} ${user.motoModel || ''}` : '';

    let actionBtn = '';
    switch (actionType) {
      case 'add':
        actionBtn = `<button class="p-edit-btn" style="margin:0; padding: 6px 14px; font-size: 0.72rem;"
                      onclick="event.stopPropagation(); MotoFriends.sendRequest('${user.id}')">+ Əlavə et</button>`;
        break;
      case 'pending':
        actionBtn = `<span style="font-size: 0.72rem; color: var(--text-muted); padding: 6px 14px;">⏳ Göndərilib</span>`;
        break;
      case 'friend':
        actionBtn = `<span style="font-size: 0.72rem; color: #22c55e; padding: 6px 14px;">✓ Dost</span>`;
        break;
    }

    return `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
        <div class="avatar" style="width: 36px; height: 36px; font-size: 0.75rem; flex-shrink: 0;">${initials}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #ddd;">${this.escapeHtml(name)}</div>
          ${bike ? `<div style="font-size: 0.72rem; color: #666;">${this.escapeHtml(bike)}</div>` : ''}
        </div>
        ${actionBtn}
      </div>
    `;
  },

  /* ──────────────────────────────────────────────
     ACTIONS
  ────────────────────────────────────────────── */
  sendRequest(targetUserId) {
    if (typeof MotoStorage === 'undefined') return;
    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    if (MotoStorage.sendFriendRequest) {
      MotoStorage.sendFriendRequest(currentUser.id, targetUserId);
    }

    MotoApp.showToast('Dostluq istəyi göndərildi!', 'success');

    const input = document.getElementById('friends-search-input');
    if (input && input.value.trim()) {
      this.renderSearchResults(input.value.trim());
    }
  },

  acceptRequest(requestId) {
    if (typeof MotoStorage === 'undefined') return;

    if (MotoStorage.acceptFriendRequest) {
      MotoStorage.acceptFriendRequest(requestId);
    }

    MotoApp.showToast('Dostluq istəyi qəbul edildi! 🎉', 'success');
    this.renderFriendsList();
  },

  rejectRequest(requestId) {
    if (typeof MotoStorage === 'undefined') return;

    if (MotoStorage.rejectFriendRequest) {
      MotoStorage.rejectFriendRequest(requestId);
    }

    MotoApp.showToast('Dostluq istəyi rədd edildi', 'info');
    this.renderFriendsList();
  },

  confirmRemove(userId) {
    const html = `
      <div style="text-align: center; padding: 8px 0;">
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">Bu istifadəçini dostlar siyahısından silmək istəyirsiniz?</p>
        <div style="display: flex; gap: 10px;">
          <button class="p-edit-save" style="flex: 1; background: linear-gradient(135deg, #ff4444, #ff2222);"
                  onclick="MotoFriends.removeFriend('${userId}'); MotoApp.closeModal();">
            Bəli, Sil
          </button>
          <button class="p-edit-btn" style="flex: 1; margin: 0; padding: 13px; justify-content: center;"
                  onclick="MotoApp.closeModal()">
            Ləğv et
          </button>
        </div>
      </div>
    `;
    MotoApp.openModal(html, 'Dostu Sil?');
  },

  removeFriend(userId) {
    if (typeof MotoStorage === 'undefined') return;
    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    if (MotoStorage.removeFriend) {
      MotoStorage.removeFriend(currentUser.id, userId);
    }

    MotoApp.showToast('Dost silindi', 'info');
    this.renderFriendsList();
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
