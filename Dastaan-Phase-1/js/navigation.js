/* Dastaan Unified Mobile Menu JS Trigger */
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const siteHeader = document.querySelector('.site-header');
  
  if (mobileMenuToggle && siteHeader) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      siteHeader.classList.toggle('menu-open');
    });

    // Close menu when clicking outside of site-header
    document.addEventListener('click', (e) => {
      if (siteHeader.classList.contains('menu-open') && !siteHeader.contains(e.target)) {
        siteHeader.classList.remove('menu-open');
      }
    });
  }
});
