/* ==========================================================================
   DASTAAN — PAGE 3 (PLACE DISCOVERY) CORE SCRIPTS
   PART 3 — YOUR STORY + FINAL TRANSITION + FOOTER
   ========================================================================== */

// 01 — CURATED LANDMARKS PLACE DATA
const places = [
  {
    id: "stari-most",
    number: "01",
    name: "Stari Most",
    category: "Historic Landmark",
    rating: 4.8,
    duration: 45, // in minutes
    cost: 0, // in EUR
    location: "Dastaan Old Town",
    image: "../images/image2.jpg",
    description: "The stone bridge that became the defining symbol of Dastaan, rebuilt to its 16th-century Ottoman glory.",
    compositionClass: "comp-stari-most",
    revealDirection: "masked-vertical",
    speed: 0.06
  },
  {
    id: "old-bazaar",
    number: "02",
    name: "Old Bazaar",
    category: "Cultural District",
    rating: 4.7,
    duration: 60,
    cost: 0,
    location: "Dastaan Old Town",
    image: "../images/image3.jpg",
    description: "A maze of stone lanes, craft shops and quiet corners where the old city's coppersmith heritage still feels alive.",
    compositionClass: "comp-old-bazaar",
    revealDirection: "masked-horizontal",
    speed: 0.08
  },
  {
    id: "koski-mosque",
    number: "03",
    name: "Koski Mehmed Pasha Mosque",
    category: "Heritage Site",
    rating: 4.7,
    duration: 30,
    cost: 2,
    location: "Neretva Riverbank",
    image: "../images/image4.jpg",
    description: "A quiet historic landmark offering panoramic architectural vistas of the Old Bridge from its minaret overlooking the river.",
    compositionClass: "comp-koski-mosque",
    revealDirection: "masked-diagonal",
    speed: 0.05
  },
  {
    id: "blagaj-tekija",
    number: "04",
    name: "Blagaj Tekija",
    category: "Spiritual Heritage",
    rating: 4.8,
    duration: 90,
    cost: 3,
    location: "Buna River Spring",
    image: "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1200&q=80",
    description: "A mystical 15th-century Dervish monastery built into a towering cliff face at the source of the Buna River.",
    compositionClass: "comp-blagaj-tekija",
    revealDirection: "masked-vertical",
    speed: 0.03
  },
  {
    id: "kravica-waterfalls",
    number: "05",
    name: "Kravica Waterfalls",
    category: "Natural Landmark",
    rating: 4.9,
    duration: 120,
    cost: 10,
    location: "Trebižat River",
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
    description: "A dramatic natural escape surrounded by limestone cliffs, cascading waterfalls and emerald pools.",
    compositionClass: "comp-kravica",
    revealDirection: "masked-horizontal",
    speed: 0.07
  },
  {
    id: "biscevic-house",
    number: "06",
    name: "Biscevic House",
    category: "Historic House",
    rating: 4.6,
    duration: 45,
    cost: 2,
    location: "Dastaan Old Town",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    description: "A preserved Ottoman-era residence featuring detailed wooden lattice screens and quiet pebble-stone courtyards.",
    compositionClass: "comp-biscevic",
    revealDirection: "masked-diagonal",
    speed: 0.06
  },
  {
    id: "old-bridge-museum",
    number: "07",
    name: "Old Bridge Museum",
    category: "History",
    rating: 4.5,
    duration: 30,
    cost: 4,
    location: "Tara Tower",
    image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80",
    secondaryImage: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80",
    description: "A compact museum exploring the archaeological excavation and reconstruction stories of Dastaan's iconic stone arch.",
    compositionClass: "comp-bridge-museum",
    revealDirection: "masked-vertical",
    speed: 0.05
  }
];

// 02 — APPLICATION STATE
const getLocalStorageItem = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.warn(`Error parsing localStorage key "${key}":`, e);
    return fallback;
  }
};

const state = {
  selectedPlaces: getLocalStorageItem('dastaanSelectedPlaces', getLocalStorageItem('selectedPlaces', [])),
  preferences: getLocalStorageItem('tripPreferences', {
    destination: "Dastaan, Bosnia",
    days: 3,
    interests: ["Culture", "History"],
    travelStyle: "Walking"
  })
};

// DOM Elements
let discoveryRig, floatingBadge, badgeCount, storyPreviewScene;
let navJourneyBtn, navCounter, footerJourneyLink;
let drawerOverlay, drawerCloseBtn, drawerListContainer, drawerTotalTime, drawerTotalCost, drawerEditBtn;
let transitionWipeOverlay;

document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  renderPlacesGrid();
  setupRevealObserver();
  setupScrollEffects();
  setupSelectionHandlers();
  setupDrawerHandlers();
  setupNavigationTransition();
  updateItineraryState();
});

// Cache DOM Elements
function cacheDOM() {
  discoveryRig = document.getElementById('discovery-rig');
  floatingBadge = document.getElementById('floating-story-badge');
  badgeCount = document.getElementById('badge-count');
  storyPreviewScene = document.getElementById('story-preview-scene');
  
  // Navigation elements
  navJourneyBtn = document.getElementById('nav-journey-btn');
  navCounter = document.getElementById('nav-counter');
  footerJourneyLink = document.getElementById('footer-journey-link');
  
  // Drawer elements
  drawerOverlay = document.getElementById('journey-drawer-overlay');
  drawerCloseBtn = document.getElementById('drawer-close-btn');
  drawerListContainer = document.getElementById('drawer-list-container');
  drawerTotalTime = document.getElementById('drawer-total-time');
  drawerTotalCost = document.getElementById('drawer-total-cost');
  drawerEditBtn = document.getElementById('drawer-edit-btn');
  
  // Transition elements
  transitionWipeOverlay = document.getElementById('transition-wipe-overlay');
}

// 03 — DYNAMIC PLACE RENDERER
function renderPlacesGrid() {
  if (!discoveryRig) return;

  discoveryRig.innerHTML = '';
  
  places.forEach((place) => {
    const isSelected = state.selectedPlaces.includes(place.id);
    
    // Create section element
    const section = document.createElement('section');
    section.className = `section-place ${place.compositionClass} ${isSelected ? 'selected-place' : ''}`;
    section.id = `place-${place.id}`;

    // Handle secondary image layout if defined
    let secondaryImageHTML = '';
    if (place.secondaryImage) {
      secondaryImageHTML = `
        <div class="place-image-secondary-wrapper parallax-container" data-speed="0.08">
          <div class="place-image-secondary-clip reveal-image masked-vertical">
            <img src="${place.secondaryImage}" alt="${place.name} detail view" class="place-secondary-image" loading="lazy" />
          </div>
        </div>
      `;
    }

    section.innerHTML = `
      <div class="place-layout">
        <!-- Asymmetric Number -->
        <span class="place-number reveal-text">${place.number}</span>

        <!-- Title Block -->
        <h2 class="place-title reveal-text">
          <span>${place.name.split(' ').slice(0, -1).join(' ')}</span><br/>
          <span class="indent-title">${place.name.split(' ').slice(-1)}</span>
        </h2>

        <!-- Image Container with Custom masked reveal and speed tags -->
        <div class="place-image-container parallax-container" data-speed="${place.speed}">
          <div class="place-image-clip reveal-image ${place.revealDirection}">
            <img src="${place.image}" alt="${place.name}" class="place-image" loading="lazy" />
          </div>
          ${secondaryImageHTML}
        </div>

        <!-- Place Text & Metadata Column -->
        <div class="place-content-block">
          <div class="place-metadata reveal-text">
            <span class="meta-tag">${place.category}</span>
            <span class="meta-divider"></span>
            <span class="meta-stat">★ ${place.rating}</span>
            <span class="meta-divider"></span>
            <span class="meta-stat">${place.duration} MIN</span>
            <span class="meta-divider"></span>
            <span class="meta-stat">${place.cost === 0 ? 'FREE' : '€' + place.cost}</span>
            <span class="meta-divider"></span>
            <span class="meta-location">${place.location}</span>
          </div>

          <p class="place-description reveal-text">${place.description}</p>

          <div class="place-actions reveal-text">
            <button 
              type="button" 
              class="btn-story-select ${isSelected ? 'selected' : ''}" 
              data-id="${place.id}" 
              aria-pressed="${isSelected ? 'true' : 'false'}"
              aria-label="Toggle ${place.name} in my story"
            >
              <span class="btn-icon">+</span> 
              <span class="btn-label-text">${isSelected ? '✓ PART OF MY STORY' : '+ ADD TO MY STORY'}</span>
            </button>
          </div>
        </div>

      </div>
    `;

    discoveryRig.appendChild(section);
  });
}

// 04 — INTERSECTION OBSERVER REVEALS (Fades and clip-masks)
function setupRevealObserver() {
  const targets = document.querySelectorAll('.reveal-text, .reveal-image');

  // Fallback for browsers/environments where IntersectionObserver is missing or restricted
  if (!window.IntersectionObserver) {
    targets.forEach(target => target.classList.add('revealed'));
    return;
  }

  const options = {
    root: null,
    rootMargin: '0px 0px 200px 0px', // Reveal elements 200px before entering viewport
    threshold: 0.01
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, options);

  targets.forEach(target => observer.observe(target));
}

// 05 — SCROLL PHYSICS (Parallax / breathing scale loops)
function setupScrollEffects() {
  const scrollPrompt = document.querySelector('.scroll-prompt');
  let ticking = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScrollDynamics();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  function updateScrollDynamics() {
    const scrollY = window.scrollY;

    // Toggle scroll prompts and floating badge visibility
    if (scrollPrompt) {
      if (scrollY > 120) {
        scrollPrompt.classList.add('hide-prompt');
      } else {
        scrollPrompt.classList.remove('hide-prompt');
      }
    }

    if (floatingBadge) {
      if (scrollY > 300) {
        floatingBadge.classList.add('badge-visible');
      } else {
        floatingBadge.classList.remove('badge-visible');
      }
    }

    if (reduceMotion) return;

    // Run parallax translation calculations
    const containers = document.querySelectorAll('.parallax-container');
    containers.forEach(container => {
      const rect = container.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const img = container.querySelector('img');
      if (!img) return;

      const speed = parseFloat(container.getAttribute('data-speed')) || 0.05;
      const centerDiff = (rect.top + rect.height / 2) - (window.innerHeight / 2);
      
      const yOffset = centerDiff * speed;
      const scrollProgress = Math.abs(centerDiff) / (window.innerHeight / 2 + rect.height / 2);
      const scaleVal = 1.02 + (scrollProgress * 0.02); // subtle breathe range: 1.02 -> 1.04

      img.style.transform = `translate3d(0, ${yOffset.toFixed(2)}px, 0) scale(${scaleVal.toFixed(4)})`;
    });
  }

  updateScrollDynamics();
}

// 06 — SELECTION STATE TOGGLES
function setupSelectionHandlers() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-story-select');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    togglePlaceSelection(id);
  });
}

function togglePlaceSelection(id) {
  const index = state.selectedPlaces.indexOf(id);
  const isSelected = index === -1;
  const btn = document.querySelector(`.btn-story-select[data-id="${id}"]`);
  const section = document.getElementById(`place-${id}`);

  if (isSelected) {
    state.selectedPlaces.push(id);
    if (btn) {
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('.btn-label-text').textContent = '✓ PART OF MY STORY';
    }
    if (section) section.classList.add('selected-place');
  } else {
    state.selectedPlaces.splice(index, 1);
    if (btn) {
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
      btn.querySelector('.btn-label-text').textContent = '+ ADD TO MY STORY';
    }
    if (section) section.classList.remove('selected-place');
  }

  // Save Selection
  localStorage.setItem('dastaanSelectedPlaces', JSON.stringify(state.selectedPlaces));
  localStorage.setItem('selectedPlaces', JSON.stringify(state.selectedPlaces));

  // Update Floating status pill & Story Preview Block & Drawer
  updateItineraryState();
}

// 07 — MY JOURNEY OVERLAY DRAWER FUNCTIONALITY
function setupDrawerHandlers() {
  if (!drawerOverlay) return;

  const openDrawer = () => {
    renderDrawerItems();
    drawerOverlay.classList.add('drawer-open');
    drawerOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  };

  const closeDrawer = () => {
    drawerOverlay.classList.remove('drawer-open');
    drawerOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Unlock background scroll
  };

  // Click events to open
  if (navJourneyBtn) {
    navJourneyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  if (footerJourneyLink) {
    footerJourneyLink.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  if (floatingBadge) {
    floatingBadge.addEventListener('click', () => {
      openDrawer();
    });
    // Add visual click pointer events to badge
    floatingBadge.style.pointerEvents = 'auto';
    floatingBadge.style.cursor = 'pointer';
  }

  // Click events to close
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  const backdrop = document.getElementById('drawer-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  // Escape key close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOverlay.classList.contains('drawer-open')) {
      closeDrawer();
    }
  });

  // Edit My Story button from within drawer
  if (drawerEditBtn) {
    drawerEditBtn.addEventListener('click', () => {
      closeDrawer();
      scrollToDiscovery();
    });
  }

  // Handle removals directly from within the drawer
  if (drawerListContainer) {
    drawerListContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.drawer-item-remove-btn');
      if (!removeBtn) return;
      
      const id = removeBtn.getAttribute('data-id');
      togglePlaceSelection(id);
      renderDrawerItems(); // re-render list items
    });
  }
}

// Render dynamic items inside navigation drawer
function renderDrawerItems() {
  if (!drawerListContainer) return;

  const count = state.selectedPlaces.length;

  if (count === 0) {
    drawerListContainer.innerHTML = `<p class="drawer-empty-msg">Your journey has no chapters selected yet.</p>`;
    if (drawerTotalTime) drawerTotalTime.textContent = '00H 00M';
    if (drawerTotalCost) drawerTotalCost.textContent = '€0';
    return;
  }

  let listHTML = '';
  let totalMins = 0;
  let totalCost = 0;

  state.selectedPlaces.forEach((id, idx) => {
    const item = places.find(p => p.id === id);
    if (item) {
      totalMins += item.duration;
      totalCost += item.cost;
      listHTML += `
        <div class="drawer-item">
          <div class="drawer-item-title-block">
            <span class="drawer-item-num">${String(idx + 1).padStart(2, '0')}</span>
            <h4 class="drawer-item-name">${item.name}</h4>
            <span class="drawer-item-cat">${item.category}</span>
          </div>
          <button type="button" class="drawer-item-remove-btn" data-id="${item.id}" aria-label="Remove ${item.name}">&times;</button>
        </div>
      `;
    }
  });

  drawerListContainer.innerHTML = listHTML;

  // Render totals inside drawer
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (drawerTotalTime) drawerTotalTime.textContent = `${String(hours).padStart(2, '0')}H ${String(mins).padStart(2, '0')}M`;
  if (drawerTotalCost) drawerTotalCost.textContent = `€${totalCost}`;
}

// Smooth scroll utility back to discovery catalog
function scrollToDiscovery() {
  if (discoveryRig) {
    discoveryRig.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 08 — NAVIGATION TRANSITION & DATA HANDOFF TO PAGE 4
function setupNavigationTransition() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-build-itinerary');
    if (!btn) return;

    e.preventDefault();

    // Check selection size
    if (state.selectedPlaces.length === 0) {
      alert("Please select at least one landmark to build your story.");
      return;
    }

    // Trigger visual overlay wipe transition
    if (transitionWipeOverlay) {
      // Close overlay drawer if open
      if (drawerOverlay) {
        drawerOverlay.classList.remove('drawer-open');
      }
      document.body.style.overflow = 'hidden';

      transitionWipeOverlay.classList.add('wipe-active');

      // Navigate after transition completes (600ms)
      setTimeout(() => {
        window.location.href = '../page4/page4.html';
      }, 700);
    } else {
      window.location.href = '../page4/page4.html';
    }
  });
}

// 09 — UPDATE STATE (Floating badge, Navbar label, final visualization)
function updateItineraryState() {
  const count = state.selectedPlaces.length;
  const countStr = String(count).padStart(2, '0');

  // Update floating badge count
  if (badgeCount) {
    badgeCount.textContent = countStr;
    if (count > 0) {
      floatingBadge.classList.add('has-selections');
    } else {
      floatingBadge.classList.remove('has-selections');
    }
  }

  // Update Navbar menu label counter
  if (navCounter) {
    navCounter.textContent = `· ${countStr}`;
  }

  // Calculate dynamic metrics
  let totalMins = 0;
  let totalCost = 0;

  state.selectedPlaces.forEach(id => {
    const item = places.find(p => p.id === id);
    if (item) {
      totalMins += item.duration;
      totalCost += item.cost;
    }
  });

  // Calculate duration string formatting
  let timeStr = '00M';
  if (totalMins > 0) {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
      timeStr = `${hours}H${mins > 0 ? ' ' + mins + 'M' : ''}`;
    } else {
      timeStr = `${mins} MIN`;
    }
  }
  const costStr = `€${totalCost}`;

  // Render Visual Scrapbook Preview Section (Scene 08 / Your Story Preview)
  renderVisualPreview(count, countStr, timeStr, costStr);
}

// Renders the editorial collection nodes at the bottom of the page (Part 3 dynamic rendering)
function renderVisualPreview(count, countStr, timeStr, costStr) {
  if (!storyPreviewScene) return;

  if (count === 0) {
    storyPreviewScene.innerHTML = `
      <span class="preview-subtitle reveal-text">YOUR STORY</span>
      <h3 class="preview-title reveal-text">NOTHING HAS BEEN CHOSEN YET.</h3>
      <p class="preview-empty-message reveal-text">Some journeys begin with a single place. Scroll back and select moments to build your story outline.</p>
      
      <div class="reveal-text">
        <button type="button" class="btn-explore-back" id="btn-empty-explore-back">
          EXPLORE PLACES &rarr;
        </button>
      </div>

      <div class="preview-totals reveal-text">
        <div class="preview-stat">
          <span class="preview-stat-val">00</span>
          <span class="preview-stat-label">PLACES</span>
        </div>
        <div class="preview-stat">
          <span class="preview-stat-val">00H 00M</span>
          <span class="preview-stat-label">EXPLORATION</span>
        </div>
        <div class="preview-stat">
          <span class="preview-stat-val">€0</span>
          <span class="preview-stat-label">ESTIMATED ENTRY</span>
        </div>
      </div>
    `;

    // Bind scroll back action to empty state explore button
    const emptyBackBtn = document.getElementById('btn-empty-explore-back');
    if (emptyBackBtn) {
      emptyBackBtn.addEventListener('click', () => {
        scrollToDiscovery();
      });
    }

    setupRevealObserver(); // Refresh intersection targets
    return;
  }

  // Render dynamic scrapbook nodes
  let scrapbookHTML = '';
  state.selectedPlaces.forEach((id) => {
    const item = places.find(p => p.id === id);
    if (item) {
      scrapbookHTML += `
        <div class="scrapbook-item reveal-text" data-id="${item.id}">
          <div class="scrapbook-item-image-wrapper">
            <img src="${item.image}" alt="${item.name}" loading="lazy" />
          </div>
          <h4 class="scrapbook-item-title">${item.name}</h4>
          <span class="scrapbook-item-meta">${item.category} &middot; ${item.location}</span>
        </div>
      `;
    }
  });

  storyPreviewScene.innerHTML = `
    <span class="preview-subtitle reveal-text">YOUR STORY</span>
    <h3 class="preview-title reveal-text">THE PLACES<br/>YOU CHOSE.</h3>
    <p class="preview-empty-message reveal-text">A journey is made from the moments you decide to keep.</p>
    
    <div class="scrapbook-grid">
      ${scrapbookHTML}
    </div>

    <div class="preview-totals reveal-text">
      <div class="preview-stat">
        <span class="preview-stat-val">${countStr}</span>
        <span class="preview-stat-label">PLACES</span>
      </div>
      <div class="preview-stat">
        <span class="preview-stat-val">${timeStr}</span>
        <span class="preview-stat-label">EXPLORATION</span>
      </div>
      <div class="preview-stat">
        <span class="preview-stat-val">${costStr}</span>
        <span class="preview-stat-label">ESTIMATED ENTRY</span>
      </div>
    </div>

    <!-- Final Payoff CTA Block -->
    <h3 class="story-ready-title reveal-text">
      <span>YOUR STORY</span><br/>
      <span class="indent-ready">IS READY.</span>
    </h3>
    <p class="story-ready-desc reveal-text">The places are chosen. Let Dastaan shape them into a journey.</p>
    
    <div class="story-payoff-actions reveal-text">
      <button type="button" class="btn-primary btn-build-itinerary" aria-label="Build my itinerary and navigate to planner">
        BUILD MY ITINERARY &rarr;
      </button>
      <button type="button" class="btn-story-edit-link" id="btn-story-edit-link" aria-label="Scroll back to discovery section">
        EDIT MY STORY
      </button>
    </div>
  `;

  // Bind scroll back actions
  const editLinkBtn = document.getElementById('btn-story-edit-link');
  if (editLinkBtn) {
    editLinkBtn.addEventListener('click', () => {
      scrollToDiscovery();
    });
  }

  // Trigger IntersectionObserver on newly injected elements
  setupRevealObserver();
}
