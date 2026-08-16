document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginView = document.getElementById('login-view');
  const signupView = document.getElementById('signup-view');
  const btnGoToSignup = document.getElementById('go-to-signup');
  const btnGoToLogin = document.getElementById('go-to-login');
  const togglePasswordBtns = document.querySelectorAll('.toggle-password');
  
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');

  // 1. Form Switching (with animation)
  function switchView(hideView, showView) {
    hideView.style.opacity = '0';
    hideView.style.transform = 'translateY(16px)';
    
    setTimeout(() => {
      hideView.classList.remove('active');
      showView.classList.add('active');
      
      // small delay to allow display:block to apply before animating opacity
      setTimeout(() => {
        showView.style.opacity = '1';
        showView.style.transform = 'translateY(0)';
      }, 50);
    }, 400); // Wait for transition
  }

  btnGoToSignup.addEventListener('click', () => {
    switchView(loginView, signupView);
    loginError.textContent = '';
  });

  btnGoToLogin.addEventListener('click', () => {
    switchView(signupView, loginView);
    signupError.textContent = '';
  });

  // 2. Password Toggle
  togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const eyeIcon = btn.querySelector('.icon-eye');
      const eyeOffIcon = btn.querySelector('.icon-eye-off');
      
      if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.style.display = 'none';
        eyeOffIcon.style.display = 'block';
      } else {
        input.type = 'password';
        eyeIcon.style.display = 'block';
        eyeOffIcon.style.display = 'none';
      }
    });
  });

  // 3. Simple Hashing (Web Crypto API)
  async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 4. Data Storage Helpers
  function getUsers() {
    return JSON.parse(localStorage.getItem('dastaan_users') || '[]');
  }
  function setUsers(users) {
    localStorage.setItem('dastaan_users', JSON.stringify(users));
  }
  function createSession(user) {
    const session = {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem('dastaan_session', JSON.stringify(session));
    window.location.href = 'page2/page2.html'; // Redirect to explore/plan page on success
  }

  // 5. Signup Logic
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signupError.textContent = '';

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim().toLowerCase();
      const mobile = document.getElementById('signup-mobile').value.trim();
      const pass = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const style = document.getElementById('signup-style').value;

      if (pass !== confirm) {
        signupError.textContent = 'Passwords do not match.';
        return;
      }

      const users = getUsers();
      if (users.some(u => u.email === email)) {
        signupError.textContent = 'An account with this email already exists.';
        return;
      }

      const passwordHash = await hashPassword(pass);
      const newUser = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
        fullName: name,
        email: email,
        mobile: mobile,
        passwordHash: passwordHash,
        travelStyle: style,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      setUsers(users);
      createSession(newUser);
    });
  }

  // 6. Login Logic
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';

      const identifier = document.getElementById('login-email').value.trim().toLowerCase();
      const pass = document.getElementById('login-password').value;

      const users = getUsers();
      const user = users.find(u => u.email === identifier || u.mobile === identifier);

      if (!user) {
        loginError.textContent = 'No account found with that email or mobile number.';
        return;
      }

      const hash = await hashPassword(pass);
      if (user.passwordHash !== hash) {
        loginError.textContent = 'Incorrect password.';
        return;
      }

      createSession(user);
    });
  }
});
