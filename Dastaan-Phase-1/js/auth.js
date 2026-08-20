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

  const splitLayout = document.querySelector('.split-layout');
  let isTransitioning = false;

  // Measure and set panel heights for mobile transition variables
  function updateHeights() {
    if (window.innerWidth <= 900) {
      const visualCol = document.querySelector('.visual-column');
      const authCol = document.querySelector('.auth-column');
      if (visualCol && authCol) {
        document.documentElement.style.setProperty('--visual-height', `${visualCol.offsetHeight}px`);
        document.documentElement.style.setProperty('--auth-height', `${authCol.offsetHeight}px`);
      }
    }
  }

  function triggerTransition(direction) {
    isTransitioning = true;
    const animClass = `curtain-animating-${direction}`;
    splitLayout.classList.remove('curtain-animating-left', 'curtain-animating-right');
    // Force reflow
    void splitLayout.offsetWidth;
    splitLayout.classList.add(animClass);
    setTimeout(() => {
      splitLayout.classList.remove(animClass);
      isTransitioning = false;
    }, 1200); // Matches keyframe duration
  }

  // Toggling states and classes
  btnGoToSignup.addEventListener('click', () => {
    if (isTransitioning) return;
    triggerTransition('right');
    
    splitLayout.classList.add('signup-mode');
    splitLayout.classList.remove('login-mode');
    
    // Toggle form active states to trigger delayed transition
    loginView.classList.remove('active');
    signupView.classList.add('active');
    
    loginError.textContent = '';
    
    // Recalculate heights on view switch (since heights of login vs signup differ)
    setTimeout(updateHeights, 50);
  });

  btnGoToLogin.addEventListener('click', () => {
    if (isTransitioning) return;
    triggerTransition('left');
    
    splitLayout.classList.remove('signup-mode');
    splitLayout.classList.add('login-mode');
    
    signupView.classList.remove('active');
    loginView.classList.add('active');
    
    signupError.textContent = '';
    
    // Recalculate heights on view switch
    setTimeout(updateHeights, 50);
  });

  // Attach event listeners for measuring heights
  window.addEventListener('resize', updateHeights);
  window.addEventListener('load', updateHeights);
  // Run after DOM has settled
  setTimeout(updateHeights, 100);

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
    localStorage.setItem('dastaanUser', JSON.stringify({name: user.fullName || user.email.split('@')[0]})); window.location.href = 'page2/page2.html'; // Redirect to explore/plan page on success
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
