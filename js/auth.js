/* ═══════════════════════════════════════════════════════════════
   MotoAuth — Authentication Module
   Login, multi-step registration, email verification (simulated),
   password strength, session management.
   ═══════════════════════════════════════════════════════════════ */

const MotoAuth = {

  currentStep: 1,
  totalSteps: 4,
  verificationCode: null,
  resendTimerInterval: null,
  registrationData: {},

  // ─── Initialize ────────────────────────────────────────────
  init() {
    try {
      this._bindTabEvents();
      this._bindLoginEvents();
      this._bindRegisterEvents();
      this._bindPasswordToggles();
      this._bindVerificationInputs();
    } catch (err) {
      console.error('❌ MotoAuth init xətası:', err);
    }

    this.clearErrors();
  },

  // ═══════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════

  _bindTabEvents() {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target === 'login') this.showLogin();
        else this.showRegister();
      });
    });
  },

  showLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.auth-tab');
    const indicator = document.querySelector('.auth-tab-indicator');

    tabs.forEach(t => t.classList.remove('active'));
    tabs[0].classList.add('active');
    tabs[0].setAttribute('aria-selected', 'true');
    tabs[1].setAttribute('aria-selected', 'false');

    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');

    if (indicator) indicator.style.transform = 'translateX(0)';

    this.clearErrors();
    this._resetRegistration();
  },

  showRegister() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.auth-tab');
    const indicator = document.querySelector('.auth-tab-indicator');

    tabs.forEach(t => t.classList.remove('active'));
    tabs[1].classList.add('active');
    tabs[0].setAttribute('aria-selected', 'false');
    tabs[1].setAttribute('aria-selected', 'true');

    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');

    if (indicator) indicator.style.transform = 'translateX(100%)';

    this.clearErrors();
  },

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════

  _bindLoginEvents() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      this.handleLogin(email, password);
    });
  },

  handleLogin(email, password) {
    this.clearErrors();
    let valid = true;

    if (!email) {
      this.showError('login-email', 'Email daxil edin');
      valid = false;
    } else if (!this._isValidEmail(email)) {
      this.showError('login-email', 'Düzgün email ünvanı daxil edin');
      valid = false;
    }

    if (!password) {
      this.showError('login-password', 'Şifrə daxil edin');
      valid = false;
    }

    if (!valid) return;

    const loginBtn = document.getElementById('login-btn');
    this.setLoading(loginBtn, true);

    // Simulate network delay
    setTimeout(() => {
      const user = MotoStorage.getUserByEmail(email);

      if (!user) {
        this.showError('login-email', 'Bu email ilə istifadəçi tapılmadı');
        this.setLoading(loginBtn, false);
        return;
      }

      if (user.password !== password) {
        this.showError('login-password', 'Şifrə yanlışdır');
        this.setLoading(loginBtn, false);
        return;
      }

      // Success
      MotoStorage.setCurrentUser(user);
      MotoStorage.updateUser(user.id, { lastSeen: new Date().toISOString(), isOnline: true });

      this.setLoading(loginBtn, false);
      MotoNotifications.show('Xoş gəldiniz, ' + user.firstName + '! 🏍️', 'success');

      // Transition to main app
      if (typeof MotoApp !== 'undefined' && MotoApp.onLogin) {
        MotoApp.onLogin();
      }
    }, 800);
  },

  // ═══════════════════════════════════════════════════════════
  // MULTI-STEP REGISTRATION
  // ═══════════════════════════════════════════════════════════

  _bindRegisterEvents() {
    const nextBtn = document.getElementById('reg-next-btn');
    const prevBtn = document.getElementById('reg-prev-btn');

    if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());

    // Password strength
    const passwordInput = document.getElementById('reg-password');
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this.checkPasswordStrength(passwordInput.value);
      });
    }

    // Phone auto-prefix
    const phoneInput = document.getElementById('reg-phone');
    if (phoneInput) {
      phoneInput.addEventListener('focus', () => {
        if (!phoneInput.value) phoneInput.value = '+994 ';
      });
    }

    // Resend code
    const resendBtn = document.getElementById('resend-code-btn');
    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        if (!resendBtn.disabled) {
          this.sendVerificationCode();
        }
      });
    }
  },

  nextStep() {
    this.clearErrors();

    if (!this.validateStep(this.currentStep)) return;

    if (this.currentStep === 3) {
      // Gather data and send verification code before moving to step 4
      this._gatherRegistrationData();
      this.sendVerificationCode();
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateStepIndicator();
      this._showCurrentStep();
    } else {
      // Final step — verify and complete
      this._handleFinalStep();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.clearErrors();
      this.currentStep--;
      this.updateStepIndicator();
      this._showCurrentStep();
    }
  },

  updateStepIndicator() {
    const dots = document.querySelectorAll('.step-dot');
    const progressFill = document.querySelector('.step-progress-fill');
    const prevBtn = document.getElementById('reg-prev-btn');
    const nextBtn = document.getElementById('reg-next-btn');

    dots.forEach((dot, i) => {
      const step = i + 1;
      dot.classList.remove('active', 'completed');
      if (step === this.currentStep) dot.classList.add('active');
      else if (step < this.currentStep) dot.classList.add('completed');
    });

    if (progressFill) {
      progressFill.style.width = `${(this.currentStep / this.totalSteps) * 100}%`;
    }

    // Button visibility
    prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';

    if (this.currentStep === this.totalSteps) {
      nextBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Tamamla
      `;
    } else {
      nextBtn.innerHTML = `
        İrəli
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      `;
    }
  },

  _showCurrentStep() {
    const steps = document.querySelectorAll('.reg-step');
    steps.forEach(step => {
      step.classList.remove('active');
      if (parseInt(step.dataset.step) === this.currentStep) {
        step.classList.add('active');
      }
    });
  },

  // ═══════════════════════════════════════════════════════════
  // STEP VALIDATIONS
  // ═══════════════════════════════════════════════════════════

  validateStep(stepNum) {
    switch (stepNum) {
      case 1: return this.validatePersonalInfo();
      case 2: return this.validateMotoInfo();
      case 3: return this.validateContactInfo();
      case 4: return this.verifyCode();
      default: return true;
    }
  },

  validatePersonalInfo() {
    let valid = true;
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const birthdate = document.getElementById('reg-birthdate').value;

    if (!firstName) {
      this.showError('reg-firstname', 'Ad daxil edin');
      valid = false;
    } else if (firstName.length < 2) {
      this.showError('reg-firstname', 'Ad ən azı 2 hərf olmalıdır');
      valid = false;
    }

    if (!lastName) {
      this.showError('reg-lastname', 'Soyad daxil edin');
      valid = false;
    } else if (lastName.length < 2) {
      this.showError('reg-lastname', 'Soyad ən azı 2 hərf olmalıdır');
      valid = false;
    }

    if (!birthdate) {
      this.showError('reg-birthdate', 'Doğum tarixini seçin');
      valid = false;
    } else {
      const age = this._calculateAge(new Date(birthdate));
      if (age < 16) {
        this.showError('reg-birthdate', 'Minimum yaş 16 olmalıdır');
        valid = false;
      } else if (age > 80) {
        this.showError('reg-birthdate', 'Düzgün doğum tarixi daxil edin');
        valid = false;
      }
    }

    return valid;
  },

  validateMotoInfo() {
    let valid = true;
    const brand = document.getElementById('reg-brand').value;
    const model = document.getElementById('reg-model').value.trim();
    const cc = document.getElementById('reg-cc').value;

    if (!brand) {
      this.showError('reg-brand', 'Moto markası seçin');
      valid = false;
    }

    if (!model) {
      this.showError('reg-model', 'Model daxil edin');
      valid = false;
    }

    if (!cc) {
      this.showError('reg-cc', 'Kubatur daxil edin');
      valid = false;
    } else if (parseInt(cc) < 50 || parseInt(cc) > 3000) {
      this.showError('reg-cc', 'Kubatur 50-3000cc arasında olmalıdır');
      valid = false;
    }

    return valid;
  },

  validateContactInfo() {
    let valid = true;
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    // Email
    if (!email) {
      this.showError('reg-email', 'Email daxil edin');
      valid = false;
    } else if (!this._isValidEmail(email)) {
      this.showError('reg-email', 'Düzgün email ünvanı daxil edin');
      valid = false;
    } else {
      // Check if email is already taken
      const existing = MotoStorage.getUserByEmail(email);
      if (existing) {
        this.showError('reg-email', 'Bu email artıq istifadə olunur');
        valid = false;
      }
    }

    // Phone
    if (!phone) {
      this.showError('reg-phone', 'Telefon nömrəsi daxil edin');
      valid = false;
    } else if (!this._isValidPhone(phone)) {
      this.showError('reg-phone', 'Nömrə +994 ilə başlamalıdır');
      valid = false;
    }

    // Password
    if (!password) {
      this.showError('reg-password', 'Şifrə daxil edin');
      valid = false;
    } else if (password.length < 6) {
      this.showError('reg-password', 'Şifrə ən azı 6 simvol olmalıdır');
      valid = false;
    }

    // Password confirm
    if (!passwordConfirm) {
      this.showError('reg-password-confirm', 'Şifrəni təkrar daxil edin');
      valid = false;
    } else if (password !== passwordConfirm) {
      this.showError('reg-password-confirm', 'Şifrələr uyğun gəlmir');
      valid = false;
    }

    return valid;
  },

  // ═══════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ═══════════════════════════════════════════════════════════

  sendVerificationCode() {
    // Generate 6-digit code
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Display the email
    const emailDisplay = document.getElementById('verification-email-display');
    const email = document.getElementById('reg-email').value.trim();
    if (emailDisplay) {
      emailDisplay.textContent = email;
    }

    // Send real email via API
    fetch('/.netlify/functions/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: this.verificationCode })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (typeof MotoNotifications !== 'undefined') {
          MotoNotifications.show('📧 Təsdiq kodu emailinizə göndərildi!', 'success', 5000);
        }
      } else {
        console.error('Email göndərmə xətası:', data.error);
        if (typeof MotoNotifications !== 'undefined') {
          MotoNotifications.show('⚠️ Email göndərilə bilmədi. Kod: ' + this.verificationCode, 'warning', 15000);
        }
      }
    })
    .catch(err => {
      console.error('Email API xətası:', err);
      if (typeof MotoNotifications !== 'undefined') {
        MotoNotifications.show('⚠️ Email göndərilə bilmədi. Kod: ' + this.verificationCode, 'warning', 15000);
      }
    });

    // Start resend timer
    this.startResendTimer(60);

    // Clear existing code inputs
    const inputs = document.querySelectorAll('.code-input');
    inputs.forEach(input => {
      input.value = '';
      input.classList.remove('error', 'success');
    });
    if (inputs[0]) inputs[0].focus();
  },

  verifyCode() {
    const inputs = document.querySelectorAll('.code-input');
    let enteredCode = '';
    inputs.forEach(input => enteredCode += input.value);

    if (enteredCode.length < 6) {
      this.showError('verification-code', '6 rəqəmli kodu tam daxil edin');
      inputs.forEach(i => i.classList.add('error'));
      return false;
    }

    if (enteredCode !== this.verificationCode) {
      this.showError('verification-code', 'Kod yanlışdır. Yenidən cəhd edin.');
      inputs.forEach(i => i.classList.add('error'));
      // Shake animation
      const container = document.getElementById('verification-code-inputs');
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 500);
      return false;
    }

    // Code correct
    inputs.forEach(i => {
      i.classList.remove('error');
      i.classList.add('success');
    });
    return true;
  },

  _bindVerificationInputs() {
    const inputs = document.querySelectorAll('.code-input');

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        // Only allow digits
        e.target.value = value.replace(/[^0-9]/g, '');

        if (e.target.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        // Clear error state on input
        input.classList.remove('error');
        const errorEl = document.getElementById('verification-code-error');
        if (errorEl) errorEl.textContent = '';
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
        }
        if (e.key === 'ArrowLeft' && index > 0) {
          inputs[index - 1].focus();
        }
        if (e.key === 'ArrowRight' && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      // Handle paste
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        if (pastedData.length >= 6) {
          inputs.forEach((inp, i) => {
            inp.value = pastedData[i] || '';
          });
          inputs[Math.min(pastedData.length, inputs.length) - 1].focus();
        }
      });
    });
  },

  startResendTimer(seconds) {
    const resendBtn = document.getElementById('resend-code-btn');
    const timerEl = document.getElementById('resend-timer');
    let remaining = seconds;

    resendBtn.disabled = true;

    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);

    timerEl.textContent = `(${remaining}s)`;

    this.resendTimerInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = `(${remaining}s)`;

      if (remaining <= 0) {
        clearInterval(this.resendTimerInterval);
        resendBtn.disabled = false;
        timerEl.textContent = '';
      }
    }, 1000);
  },

  // ═══════════════════════════════════════════════════════════
  // COMPLETE REGISTRATION
  // ═══════════════════════════════════════════════════════════

  _gatherRegistrationData() {
    this.registrationData = {
      firstName: document.getElementById('reg-firstname').value.trim(),
      lastName: document.getElementById('reg-lastname').value.trim(),
      birthdate: document.getElementById('reg-birthdate').value,
      motoBrand: document.getElementById('reg-brand').value,
      motoModel: document.getElementById('reg-model').value.trim(),
      motoCC: parseInt(document.getElementById('reg-cc').value),
      email: document.getElementById('reg-email').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      password: document.getElementById('reg-password').value
    };
  },

  _handleFinalStep() {
    // Validate verification code
    if (!this.verifyCode()) return;

    this.completeRegistration();
  },

  completeRegistration() {
    const data = this.registrationData;
    const nextBtn = document.getElementById('reg-next-btn');
    this.setLoading(nextBtn, true);

    setTimeout(() => {
      // Create user
      const newUser = MotoStorage.createUser(data);

      // Set as current user
      MotoStorage.setCurrentUser(newUser);

      // Create some initial friend requests for demo purposes
      MotoStorage.sendFriendRequest('demo_user_001', newUser.id);
      MotoStorage.sendFriendRequest('demo_user_003', newUser.id);

      this.setLoading(nextBtn, false);

      if (typeof MotoNotifications !== 'undefined') {
        MotoNotifications.show(
          `Təbrik edirik, ${newUser.firstName}! MotoRiders ailəsinə xoş gəldiniz! 🎉🏍️`,
          'success',
          5000
        );
      }

      // Reset form
      this._resetRegistration();

      // Transition to main app
      if (typeof MotoApp !== 'undefined' && MotoApp.showMainApp) {
        MotoApp.showMainApp();
      }
    }, 1000);
  },

  _resetRegistration() {
    this.currentStep = 1;
    this.verificationCode = null;
    this.registrationData = {};

    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
      this.resendTimerInterval = null;
    }

    // Reset form fields
    const form = document.getElementById('register-form');
    if (form) form.reset();

    // Reset step indicator
    this.updateStepIndicator();
    this._showCurrentStep();
  },

  // ═══════════════════════════════════════════════════════════
  // SESSION
  // ═══════════════════════════════════════════════════════════

  checkSession() {
    const currentUser = MotoStorage.getCurrentUser();
    if (currentUser) {
      // Refresh user data from storage
      const freshUser = MotoStorage.getUserById(currentUser.id);
      if (freshUser) {
        MotoStorage.setCurrentUser(freshUser);
        MotoStorage.updateUser(freshUser.id, {
          lastSeen: new Date().toISOString(),
          isOnline: true
        });
        return true;
      }
    }
    return false;
  },

  logout() {
    const currentUser = MotoStorage.getCurrentUser();
    if (currentUser) {
      MotoStorage.updateUser(currentUser.id, {
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
      // Stop location sharing
      MotoStorage.stopSharing(currentUser.id);
    }

    MotoStorage.logout();

    if (typeof MotoNotifications !== 'undefined') {
      MotoNotifications.show('Hesabdan çıxış edildi', 'info');
    }

    if (typeof MotoApp !== 'undefined' && MotoApp.showAuth) {
      MotoApp.showAuth();
    }
  },

  // ═══════════════════════════════════════════════════════════
  // PASSWORD STRENGTH
  // ═══════════════════════════════════════════════════════════

  checkPasswordStrength(password) {
    const strengthEl = document.getElementById('password-strength');
    const fill = strengthEl.querySelector('.strength-fill');
    const text = strengthEl.querySelector('.strength-text');

    if (!password) {
      strengthEl.style.opacity = '0';
      return 'none';
    }

    strengthEl.style.opacity = '1';

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let strength, color, width;

    if (score <= 1) {
      strength = 'Zəif';
      color = '#ff3333';
      width = '25%';
    } else if (score <= 2) {
      strength = 'Orta';
      color = '#ffaa00';
      width = '50%';
    } else if (score <= 3) {
      strength = 'Yaxşı';
      color = '#4ecdc4';
      width = '75%';
    } else {
      strength = 'Güclü';
      color = '#22c55e';
      width = '100%';
    }

    fill.style.width = width;
    fill.style.backgroundColor = color;
    text.textContent = strength;
    text.style.color = color;

    return strength.toLowerCase();
  },

  // ═══════════════════════════════════════════════════════════
  // PASSWORD TOGGLES
  // ═══════════════════════════════════════════════════════════

  _bindPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input[type="password"], input[type="text"]');
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        btn.innerHTML = isPassword
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      });
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════

  showError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + '-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }

    const input = document.getElementById(fieldId);
    if (input) {
      input.classList.add('input-error');
      const wrapper = input.closest('.input-wrapper') || input.closest('.select-wrapper');
      if (wrapper) wrapper.classList.add('has-error');
    }
  },

  clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
    document.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
    });
    document.querySelectorAll('.has-error').forEach(el => {
      el.classList.remove('has-error');
    });
    document.querySelectorAll('.code-input').forEach(el => {
      el.classList.remove('error', 'success');
    });
  },

  setLoading(buttonEl, loading) {
    if (!buttonEl) return;

    if (loading) {
      buttonEl.disabled = true;
      buttonEl.classList.add('loading');
      const text = buttonEl.querySelector('.btn-text');
      const loader = buttonEl.querySelector('.btn-loader');
      if (text) text.classList.add('hidden');
      if (loader) loader.classList.remove('hidden');
      // If no text/loader spans, just dim the button
      if (!text && !loader) {
        buttonEl.style.opacity = '0.7';
        buttonEl.style.pointerEvents = 'none';
      }
    } else {
      buttonEl.disabled = false;
      buttonEl.classList.remove('loading');
      const text = buttonEl.querySelector('.btn-text');
      const loader = buttonEl.querySelector('.btn-loader');
      if (text) text.classList.remove('hidden');
      if (loader) loader.classList.add('hidden');
      buttonEl.style.opacity = '';
      buttonEl.style.pointerEvents = '';
    }
  },

  // ═══════════════════════════════════════════════════════════
  // PRIVATE VALIDATORS
  // ═══════════════════════════════════════════════════════════

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  _isValidPhone(phone) {
    // Must start with +994 and have reasonable length
    const cleaned = phone.replace(/\s/g, '');
    return /^\+994\d{9,10}$/.test(cleaned);
  },

  _calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
};
