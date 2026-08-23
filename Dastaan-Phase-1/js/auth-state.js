// auth-state.js - Manages dynamic navbar login state
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('dastaanUser');
    if (user) {
        try {
            const userData = JSON.parse(user);
            const navRightLists = document.querySelectorAll('.header-actions, .nav-actions');
            const homeLink = document.querySelector('.site-logo')?.getAttribute('href') || 'index.html';
            
            navRightLists.forEach(navRight => {
                // Remove the sign-in button
                const signInBtn = navRight.querySelector('a[href*="signup.html"]');
                if (signInBtn) signInBtn.remove();
                
                // Check if profile already exists to prevent duplicates
                if (!navRight.querySelector('.user-profile-nav')) {
                    const profileHTML = `
                        <div class="user-profile-nav">
                            <div class="user-avatar" aria-hidden="true"></div>
                            <span class="user-name"></span>
                        </div>
                        <a class="nav-link home-link" href="${homeLink}">Home</a>
                        <button type="button" class="nav-link logout-button">Log out</button>
                    `;
                    navRight.insertAdjacentHTML('afterbegin', profileHTML);

                    const profile = navRight.querySelector('.user-profile-nav');
                    const userName = profile.querySelector('.user-name');
                    userName.textContent = userData.name;
                    profile.querySelector('.user-avatar').textContent = userData.name.charAt(0).toUpperCase();

                    navRight.querySelector('.logout-button').addEventListener('click', () => {
                        localStorage.removeItem('dastaanUser');
                        sessionStorage.removeItem('dastaan_session');
                        window.location.href = homeLink; 
                    });
                }
            });
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
});