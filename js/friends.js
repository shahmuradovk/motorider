/* ================================================================
   MotoFriends — Friend System Module
   MotoRiders Community App (Baku, Azerbaijan)
   ================================================================ */

const MotoFriends = {
  searchDebounceTimer: null,

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init() {
    this.seedDemoFriends();
    this.renderFriendsList();
  },

  /* ──────────────────────────────────────────────
     SEED DEMO FRIENDS
     Auto-add 3 friends from demo users for the logged-in user
  ────────────────────────────────────────────── */
  seedDemoFriends() {
    if (typeof MotoStorage === 'undefined') return;

    const currentUser = MotoStorage.getCurrentUser();
    if (!currentUser) return;

    const friends = MotoStorage.getFriends
      ? MotoStorage.getFriends(currentUser.id)
      : [];

    /* Only seed if no friends exist yet */
    if (friends.length > 0) return;

    const demoFriendIds = ['user_2', 'user_3', 'user_4'];
    demoFriendIds.forEach((friendId) => {
      if (MotoStorage.addFriend) {
        MotoStorage.addFriend(currentUser.id, friendId);
      }
    });
  },

  /* ──────────────────────────────────────────────
     RENDER FRIENDS LIST
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

    let html = `
      <div class="friends-header">
        <h2 class="page-title">👥 Dostlar</h2>
        <button class="btn-icon" id="btn-search-friends" onclick="MotoFriends.showSearchBar()">
          🔍
        </button>
      </div>

      <div class="friends-search-bar hidden" id="friends-search-bar">
        <input type="text" id="friends-search-input" class="input-field"
               placeholder="İstifadəçi axtar..." maxlength="50"
               oninput="MotoFriends.handleSearch(event)" />
        <div id="search-results" class="search-results"></div>
      </div>
    `;

    /* Friend requests section */
    if (requests.length > 0) {
      html += `
        <div class="friends-section">
          <h3 class="section-title">📩 Dostluq İstəkləri (${requests.length})</h3>
          <div class="friends-grid">
      `;
      requests.forEach((req) => {
        html += this.renderFriendRequestCard(req);
      });
      html += '</div></div>';
    }

    /* Friends section */
    html += `
      <div class="friends-section">
        <h3 class="section-title">Dostlarım (${friends.length})</h3>
    `;

    if (friends.length === 0) {
      html += `
        <div class="empty-state small">
          <div class="empty-icon">👥</div>
          <p>Hələ ki dostun yoxdur</p>
          <button class="btn-primary btn-sm" onclick="MotoFriends.showSearchBar()">
            🔍 İstifadəçi Axtar
          </button>
        </div>
      `;
    } else {
      html += '<div class="friends-grid">';

      /* Sort: online first, then riding, then offline */
      const statusOrder = { riding: 0, online: 1, offline: 2 };
      friends.sort(
        (a, b) =>
          (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2)
      );

      friends.forEach((friend) => {
        html += this.renderFriendCard(friend);
      });
      html += '</div>';
    }

    html += '</div>';

    container.innerHTML = html;
  },

  /* ──────────────────────────────────────────────
     FRIEND CARD
  ────────────────────────────────────────────── */
  renderFriendCard(user) {
    const statusText =
      user.status === 'riding'
        ? 'Sürüşdə 🏍️'
        : user.status === 'online'
          ? 'Onlayn'
          : 'Oflayn';

    const statusColor =
      user.status === 'riding'
        ? '#ff6b35'
        : user.status === 'online'
          ? '#22c55e'
          : '#6b7280';

    const statusDotClass =
      user.status === 'riding'
        ? 'status-riding'
        : user.status === 'online'
          ? 'status-online'
          : 'status-offline';

    return `
      <div class="friend-card">
        <div class="friend-avatar-wrap">
          <span class="friend-avatar">${user.avatar || '👤'}</span>
          <span class="status-dot ${statusDotClass}"></span>
        </div>
        <div class="friend-info">
          <h4 class="friend-name">${this.escapeHtml(user.name)}</h4>
          <span class="friend-moto">${this.escapeHtml(user.motorcycle || user.moto || '')}</span>
          <span class="friend-status" style="color: ${statusColor}">${statusText}</span>
        </div>
        <div class="friend-actions">
          <button class="btn-icon-sm" onclick="MotoApp.showToast('Mesaj funksiyası tezliklə!', 'info')" title="Mesaj">
            💬
          </button>
          <button class="btn-icon-sm btn-danger-icon" onclick="MotoFriends.confirmRemove('${user.id}')" title="Sil">
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
    const user =
      typeof MotoStorage !== 'undefined' && MotoStorage.getUsers
        ? MotoStorage.getUsers().find((u) => u.id === request.fromUserId)
        : null;

    const name = user ? user.name : 'Naməlum';
    const avatar = user && user.avatar ? user.avatar : '👤';
    const moto = user ? user.motorcycle || user.moto || '' : '';

    return `
      <div class="friend-request-card">
        <div class="friend-avatar-wrap">
          <span class="friend-avatar">${avatar}</span>
        </div>
        <div class="friend-info">
          <h4 class="friend-name">${this.escapeHtml(name)}</h4>
          <span class="friend-moto">${this.escapeHtml(moto)}</span>
          <span class="request-label">Dostluq istəyi göndərib</span>
        </div>
        <div class="request-actions">
          <button class="btn-accept" onclick="MotoFriends.acceptRequest('${request.id}')">
            ✓ Qəbul
          </button>
          <button class="btn-reject" onclick="MotoFriends.rejectRequest('${request.id}')">
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
    const bar = document.getElementById('friends-search-bar');
    if (!bar) return;
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) {
      const input = document.getElementById('friends-search-input');
      if (input) input.focus();
    }
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
        (u.name.toLowerCase().includes(q) ||
          (u.motorcycle || u.moto || '').toLowerCase().includes(q))
    );
  },

  renderSearchResults(query) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const results = this.searchUsers(query);

    if (results.length === 0) {
      container.innerHTML = `<p class="search-empty">Nəticə tapılmadı</p>`;
      return;
    }

    const currentUser =
      typeof MotoStorage !== 'undefined'
        ? MotoStorage.getCurrentUser()
        : null;
    const userId = currentUser ? currentUser.id : '';

    /* Determine action type for each result */
    let friends = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getFriends) {
      friends = MotoStorage.getFriends(userId);
    }
    const friendIds = friends.map((f) => f.id);

    let pendingRequests = [];
    if (typeof MotoStorage !== 'undefined' && MotoStorage.getSentRequests) {
      pendingRequests = MotoStorage.getSentRequests(userId);
    }
    const pendingIds = pendingRequests.map((r) => r.toUserId);

    let html = '';
    results.forEach((user) => {
      let actionType = 'add';
      if (friendIds.includes(user.id)) {
        actionType = 'friend';
      } else if (pendingIds.includes(user.id)) {
        actionType = 'pending';
      }
      html += this.renderUserCard(user, actionType);
    });

    container.innerHTML = html;
  },

  renderUserCard(user, actionType) {
    let actionBtn = '';
    switch (actionType) {
      case 'add':
        actionBtn = `<button class="btn-add-friend" onclick="MotoFriends.sendRequest('${user.id}')">+ Dost əlavə et</button>`;
        break;
      case 'pending':
        actionBtn = `<button class="btn-pending" disabled>⏳ Göndərilib</button>`;
        break;
      case 'friend':
        actionBtn = `<button class="btn-is-friend" disabled>✓ Dost</button>`;
        break;
    }

    return `
      <div class="user-search-card">
        <span class="user-search-avatar">${user.avatar || '👤'}</span>
        <div class="user-search-info">
          <span class="user-search-name">${this.escapeHtml(user.name)}</span>
          <span class="user-search-moto">${this.escapeHtml(user.motorcycle || user.moto || '')}</span>
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

    /* Refresh search results if visible */
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
      <div class="confirm-dialog">
        <p>Bu istifadəçini dostlar siyahısından silmək istəyirsiniz?</p>
        <div class="confirm-actions">
          <button class="btn-danger" onclick="MotoFriends.removeFriend('${userId}'); MotoApp.closeModal();">
            Bəli, Sil
          </button>
          <button class="btn-ghost" onclick="MotoApp.closeModal()">
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
