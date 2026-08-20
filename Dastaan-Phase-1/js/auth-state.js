// auth-state.js - Manages dynamic navbar login state
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('dastaanUser');
    if (user) {
        try {
            const userData = JSON.parse(user);
            const navRightLists = document.querySelectorAll('.header-actions, .nav-actions');
            
            navRightLists.forEach(navRight => {
                // Remove the sign-in button
                const signInBtn = navRight.querySelector('a[href*="signup.html"]');
                if (signInBtn) signInBtn.remove();
                
                // Check if profile already exists to prevent duplicates
                if (!navRight.querySelector('.user-profile-nav')) {
                    const profileHTML = `
                        <div class="user-profile-nav" style="display: flex; align-items: center; gap: 8px; color: var(--paper); cursor: pointer; padding: 0 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--gold); color: var(--primary-deep); display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: var(--font-sans);">
                                ${userData.name.charAt(0).toUpperCase()}
                            </div>
                            <span style="font-weight: 500; font-size: 0.9rem;">${userData.name}</span>
                        </div>
                    `;
                    navRight.insertAdjacentHTML('afterbegin', profileHTML);
                }
            });
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
});