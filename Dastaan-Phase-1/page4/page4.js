/* ==========================================================================
   DASTAAN — PAGE 3 (PLACE DISCOVERY) CORE SCRIPTS
   ========================================================================== */

// 01 — LANDMARK PLACE DATA (6-8 Destination Places)
const places = [
  {
    id: "stari-most",
    number: "01",
    name: "Stari Most",
    category: "Historic Landmark",
    rating: 4.8,
    duration: 45, // in minutes
    cost: 0, // in EUR (0 = Free)
    location: "Mostar Old Town",
    image: "https://images.unsplash.com/photo-1561571434-ccc000c2f17d?auto=format&fit=crop&w=1200&q=80",
    description: "The stone bridge that has become the defining symbol of Mostar, rebuilt to its 16th-century glory.",
    composition: "comp-center",
    x: 0,
    y: 0,
    z: -1800
  },
  {
    id: "old-bazaar",
    number: "02",
    name: "Old Bazaar",
    category: "Cultural District",
    rating: 4.7,
    duration: 60,
    cost: 0,
    location: "Kujundziluk",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
    description: "Step into a sensory journey of copper crafts, vintage carpets, and the rich aroma of traditional Bosnian coffee.",
    composition: "comp-left-img",
    x: 200,
    y: -40,
    z: -3600
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
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
    description: "A quiet historic landmark offering panoramic vistas of the Old Bridge from its minaret over the Neretva river.",
    composition: "comp-right-img",
    x: -240,
    y: 50,
    z: -5400
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
    composition: "comp-environmental",
    x: 0,
    y: -60,
    z: -7200
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
    description: "An amphitheater of cascading waterfalls surrounded by lush greenery, forming a natural emerald swimming pool.",
    composition: "comp-center",
    x: 0,
    y: 40,
    z: -9000
  },
  {
    id: "biscevic-house",
    number: "06",
    name: "Biscevic House",
    category: "Ottoman Residential",
    rating: 4.6,
    duration: 40,
    cost: 2,
    location: "Mostar Old Town",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    description: "One of the most preserved Ottoman residential buildings in Mostar, featuring original wooden screens and quiet courtyards.",
    composition: "comp-left-img",
    x: 220,
    y: -30,
    z: -10800
  },
  {
    id: "old-bridge-museum",
    number: "07",
    name: "Old Bridge Museum",
    category: "History & Archives",
    rating: 4.5,
    duration: 50,
    cost: 3,
    location: "Tara Tower",
    image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80",
    description: "Explore the rich history of Stari Most through archaeological finds, architectural blueprints, and high-altitude bridge views.",
    composition: "comp-right-img",
    x: -200,
    y: 30,
    z: -12600
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
  selectedPlaces: getLocalStorageItem('selectedPlaces', []),
  preferences: getLocalStorageItem('tripPreferences', {
    destination: "Mostar, Bosnia",
    days: 3,
    interests: ["Culture", "History"],
    travelStyle: "Walking"
  }),
  targetScroll: 0,
  smoothScroll: 0,
  mouseX: 0,
  mouseY: 0,
  targetMouseX: 0,
  targetMouseY: 0,
  activeSceneIndex: 0,
  isMobile: false,
  reduceMotion: false
};

// Scroll metrics setup
const SCROLL_STEP = 1600; // Scroll distance in pixels to travel 1 chapter spacing
const sceneZSpacing = 1800; // Physical Z depth coordinate spacing
const arrivalZ = 0;
const finalZ = -(places.length + 1) * sceneZSpacing; // e.g. -14400 for 7 places

// Path coordinates for 3D Camera panning (Winding drone camera path)
const sceneCoordinates = [
  { x: 0, y: 0, z: arrivalZ }, // Scene 0: Arrival
  ...places.map(p => ({ x: p.x, y: p.y, z: p.z })), // Scenes 1-7: Places
  { x: 0, y: 0, z: finalZ } // Scene 8: Final Story
];

// DOM Selectors
let scrollContainer, viewportStage, cameraRig, progressList;
let navCounter, floatingCount, floatingCard;
let drawerOverlay, drawerList, drawerTime, drawerCost;

// Helpers
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  checkEnvironment();
  renderPlacesInRig();
  renderProgressList();
  setupPreferencesDisplay();
  setupEventListeners();
  updateItineraryState();
  
  // Set scroll wrapper height based on scene count
  const totalSteps = places.length + 2; // arrival + places + final
  if (!state.isMobile && !state.reduceMotion) {
    scrollContainer.style.height = `${(totalSteps - 1) * SCROLL_STEP + window.innerHeight}px`;
  } else {
    scrollContainer.style.height = 'auto';
  }

  // Trigger animation loop
  requestAnimationFrame(updateLoop);
});

// Cache DOM Elements
function cacheDOM() {
  scrollContainer = document.getElementById('scroll-container');
  viewportStage = document.getElementById('viewport-stage');
  cameraRig = document.getElementById('camera-rig');
  progressList = document.getElementById('progress-list');
  navCounter = document.getElementById('nav-counter');
  floatingCount = document.getElementById('floating-count');
  floatingCard = document.getElementById('floating-story-card');
  
  drawerOverlay = document.getElementById('journey-drawer-overlay');
  drawerList = document.getElementById('drawer-list-container');
  drawerTime = document.getElementById('drawer-total-time');
  drawerCost = document.getElementById('drawer-total-cost');
}

// Environmental checks
function checkEnvironment() {
  state.isMobile = window.innerWidth <= 991;
  state.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  window.addEventListener('resize', () => {
    const wasMobile = state.isMobile;
    state.isMobile = window.innerWidth <= 991;
    if (wasMobile !== state.isMobile) {
      // Re-trigger layout bounds recalculations if screen sizes flip
      location.reload();
    }
  });
}

// Setup User preferences (from page 2)
function setupPreferencesDisplay() {
  const displays = document.querySelectorAll('.pref-days-display');
  displays.forEach(el => el.textContent = String(state.preferences.days).padStart(2, '0'));
  
  const styleDisplay = document.querySelector('.pref-style-display');
  if (styleDisplay) {
    const interests = state.preferences.interests || [];
    const style = state.preferences.travelStyle || 'Walking';
    // Uppercase individual tags first, then join with Unicode bullet to avoid entity breaking
    const tagString = [...interests, style].map(t => t.toUpperCase()).join(' • ');
    styleDisplay.innerHTML = tagString || 'CULTURE • HISTORY • WALKING';
  }

  // Update arrival dest title if set to something else
  const arrivalTitle = document.getElementById('arrival-dest-title');
  if (arrivalTitle && state.preferences.destination) {
    // Strip country suffix for short title (e.g. "Mostar, Bosnia" -> "MOSTAR")
    const destName = state.preferences.destination.split(',')[0].trim().toUpperCase();
    // Respect the user's name change to DASTAAN if it's set to Mostar or Dastaan
    if (destName === "MOSTAR" || destName === "DASTAAN") {
      arrivalTitle.textContent = "DASTAAN";
    } else {
      arrivalTitle.textContent = destName;
    }
  }
}

// 03 — DYNAMIC PLACE SCENE GENERATION
function renderPlacesInRig() {
  const finalSceneEl = document.getElementById('scene-final');
  
  places.forEach((place, index) => {
    const isSelected = state.selectedPlaces.includes(place.id);
    
    // Create section element
    const section = document.createElement('section');
    section.className = `scene scene-place ${place.composition}`;
    section.id = `scene-${place.id}`;
    section.style.transform = `translate3d(${place.x}px, ${place.y}px, ${place.z}px)`;
    
    // Structure scene contents
    section.innerHTML = `
      <div class="scene-content">
        <!-- Colored ambient backdrop blur -->
        <div class="scene-ambient-backdrop" style="background-color: ${index % 2 === 0 ? 'var(--primary)' : 'var(--accent)'};"></div>
        
        <!-- Spatial Photo (Layer 04) -->
        <div class="layer layer-image place-photo-container ${isSelected ? 'selected-place-border' : ''}">
          <div class="selection-ribbon">ADDED</div>
          <img src="${place.image}" alt="${place.name}" class="place-image" loading="lazy" />
        </div>
        
        <!-- Interactive Information (Layer 05) -->
        <div class="layer layer-content place-text-block">
          <span class="place-num">${place.number}</span>
          <div class="place-header-group">
            <h2 class="place-title">${place.name.toUpperCase()}</h2>
            <div class="place-meta">
              <span class="place-cat">${place.category}</span>
              <span class="place-divider-dot"></span>
              <span class="place-location">${place.location}</span>
            </div>
          </div>
          
          <div class="place-details-stats">
            <div class="stat-block">
              <span class="stat-block-label">RATING</span>
              <span class="stat-block-val rating-star">★ ${place.rating}</span>
            </div>
            <div class="stat-block">
              <span class="stat-block-label">DURATION</span>
              <span class="stat-block-val">${place.duration} MIN</span>
            </div>
            <div class="stat-block">
              <span class="stat-block-label">ENTRY COST</span>
              <span class="stat-block-val">${place.cost === 0 ? 'FREE' : '€' + place.cost}</span>
            </div>
          </div>
          
          <p class="place-desc">${place.description}</p>
          
          <button type="button" class="btn-story-select ${isSelected ? 'selected' : ''}" data-id="${place.id}" aria-label="Add ${place.name} to my story">
            <span class="icon-plus">+ ADD TO MY STORY</span>
            <span class="icon-check">✓ ADDED TO MY STORY</span>
          </button>
        </div>
      </div>
    `;
    
    // Insert programmatically before final scene
    cameraRig.insertBefore(section, finalSceneEl);
  });
}

// 04 — PROGRESS INDICATOR DYNAMIC POPULATION
function renderProgressList() {
  const arrivalItem = progressList.querySelector('li[data-scene="0"]');
  const finalItem = progressList.querySelector('li[data-scene="8"]');
  
  // Clear list except the static arrival
  progressList.innerHTML = '';
  progressList.appendChild(arrivalItem);
  
  // Add places
  places.forEach((place, idx) => {
    const li = document.createElement('li');
    li.className = 'progress-item';
    li.setAttribute('data-scene', idx + 1);
    li.innerHTML = `
      <span class="chapter-number">${String(idx + 2).padStart(2, '0')}</span>
      <span class="chapter-name">${place.name}</span>
    `;
    progressList.appendChild(li);
  });
  
  // Add static final back
  progressList.appendChild(finalItem);
  
  // Progress item click-to-scroll handler
  const items = progressList.querySelectorAll('.progress-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-scene'));
      if (state.isMobile || state.reduceMotion) {
        // Find scene element top and scroll to it
        const targetSceneEl = document.querySelectorAll('.scene')[idx];
        if (targetSceneEl) {
          targetSceneEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Calculate raw scroll target for the corresponding scene
        const targetScrollVal = idx * SCROLL_STEP;
        window.scrollTo({
          top: targetScrollVal,
          behavior: 'smooth'
        });
      }
    });
  });
}

// 05 — EVENT LISTENERS SETUP
function setupEventListeners() {
  // Capture Mouse moves for camera panning / tilting
  window.addEventListener('mousemove', (e) => {
    state.targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    state.targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  // Scroll bindings
  window.addEventListener('scroll', () => {
    state.targetScroll = window.scrollY;
  });

  // Add to story button handlers
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-story-select');
    if (btn) {
      const placeId = btn.getAttribute('data-id');
      togglePlaceSelection(placeId);
    }
  });

  // Drawer toggles
  const navJourneyBtn = document.getElementById('nav-journey-btn');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

  const openDrawer = () => {
    drawerOverlay.classList.add('drawer-open');
    drawerOverlay.setAttribute('aria-hidden', 'false');
    renderDrawerItems();
  };

  const closeDrawer = () => {
    drawerOverlay.classList.remove('drawer-open');
    drawerOverlay.setAttribute('aria-hidden', 'true');
  };

  if (navJourneyBtn) navJourneyBtn.addEventListener('click', openDrawer);
  if (floatingCard) floatingCard.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // Link inside drawer to jump to the path screen
  const drawerViewPath = document.getElementById('drawer-view-path-btn');
  if (drawerViewPath) {
    drawerViewPath.addEventListener('click', () => {
      closeDrawer();
      const finalSceneIndex = places.length + 1;
      if (state.isMobile || state.reduceMotion) {
        document.getElementById('scene-final').scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({
          top: finalSceneIndex * SCROLL_STEP,
          behavior: 'smooth'
        });
      }
    });
  }

  // Remove place from within drawer/list
  drawerOverlay.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.drawer-item-remove-btn');
    if (removeBtn) {
      const id = removeBtn.getAttribute('data-id');
      togglePlaceSelection(id);
      renderDrawerItems(); // re-render drawer
    }
  });

  // Remove place from final story path
  const finalStoryPath = document.getElementById('final-story-path');
  if (finalStoryPath) {
    finalStoryPath.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.path-node-remove-btn');
      if (removeBtn) {
        const id = removeBtn.getAttribute('data-id');
        togglePlaceSelection(id);
      }
    });
  }

  // Final CTA button proceed simulation
  const proceedBtn = document.getElementById('final-proceed-btn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      if (state.selectedPlaces.length === 0) {
        alert("Please select at least one landmark to begin your story.");
        return;
      }
      
      // Animate transition and log final selected places
      alert(`Proceeding with your curated itinerary! Selected Chapters:\n${state.selectedPlaces.map(id => places.find(p => p.id === id).name).join('\n')}`);
    });
  }
}

// 06 — STATE MUTATIONS (SELECT / DESELECT)
function togglePlaceSelection(placeId) {
  const index = state.selectedPlaces.indexOf(placeId);
  
  if (index === -1) {
    // Add to selection
    state.selectedPlaces.push(placeId);
  } else {
    // Remove from selection
    state.selectedPlaces.splice(index, 1);
  }

  // Persist selections
  localStorage.setItem('selectedPlaces', JSON.stringify(state.selectedPlaces));

  // Sync scene buttons and images immediately
  updateSceneSelectionVisuals(placeId);
  
  // Sync overall badge counts and paths
  updateItineraryState();
}

// Refresh active select state visuals in the scene
function updateSceneSelectionVisuals(placeId) {
  const placeScene = document.getElementById(`scene-${placeId}`);
  if (placeScene) {
    const btn = placeScene.querySelector('.btn-story-select');
    const photoContainer = placeScene.querySelector('.place-photo-container');
    
    const isSelected = state.selectedPlaces.includes(placeId);
    
    if (isSelected) {
      btn.classList.add('selected');
      photoContainer.classList.add('selected-place-border');
    } else {
      btn.classList.remove('selected');
      photoContainer.classList.remove('selected-place-border');
    }
  }
}

// Update counters, labels, final story page, and totals
function updateItineraryState() {
  const selectedCount = state.selectedPlaces.length;
  const countStr = String(selectedCount).padStart(2, '0');
  
  // Update header count and floating counters
  if (navCounter) navCounter.textContent = countStr;
  if (floatingCount) floatingCount.textContent = `${countStr} ${selectedCount === 1 ? 'PLACE' : 'PLACES'}`;
  
  // Highlight floating card if selections > 0
  if (selectedCount > 0) {
    floatingCard.style.borderColor = 'var(--gold)';
  } else {
    floatingCard.style.borderColor = 'rgba(232, 220, 199, 0.15)';
  }

  // Calculate totals
  let totalMinutes = 0;
  let totalCost = 0;

  state.selectedPlaces.forEach(id => {
    const item = places.find(p => p.id === id);
    if (item) {
      totalMinutes += item.duration;
      totalCost += item.cost;
    }
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = `${hours}H ${String(mins).padStart(2, '0')}M`;
  const costStr = `€${totalCost}`;

  // Update Drawer totals
  if (drawerTime) drawerTime.textContent = timeStr;
  if (drawerCost) drawerCost.textContent = costStr;

  // Render final scene (Scene 09) elements
  renderFinalSceneItinerary(selectedCount, timeStr, costStr);
}

// 07 — DRAW ITEMS RENDERING
function renderDrawerItems() {
  if (state.selectedPlaces.length === 0) {
    drawerList.innerHTML = `<p class="drawer-empty-text">Your story is currently empty. Scroll through Mostar to discover and add landmarks to your journey.</p>`;
    return;
  }

  drawerList.innerHTML = '';
  state.selectedPlaces.forEach(id => {
    const item = places.find(p => p.id === id);
    if (item) {
      const itemEl = document.createElement('div');
      itemEl.className = 'drawer-item';
      itemEl.innerHTML = `
        <div class="drawer-item-img-wrapper">
          <img src="${item.image}" alt="${item.name}" class="drawer-item-img" />
        </div>
        <div class="drawer-item-info">
          <h4 class="drawer-item-name">${item.name}</h4>
          <span class="drawer-item-meta">${item.category} &bull; ${item.duration}m</span>
        </div>
        <button type="button" class="drawer-item-remove-btn" data-id="${item.id}" aria-label="Remove place">&times;</button>
      `;
      drawerList.appendChild(itemEl);
    }
  });
}

// 08 — FINAL SCENE ITINERARY PATH RENDER
function renderFinalSceneItinerary(count, timeStr, costStr) {
  const heading = document.getElementById('final-count-heading');
  const statsSub = document.getElementById('final-stats-sub');
  const pathContainer = document.getElementById('final-story-path');

  if (!heading) return;

  if (count === 0) {
    heading.textContent = "NO PLACES SELECTED.";
    statsSub.textContent = "0 places · 0h 0m · €0 estimated entry";
    pathContainer.innerHTML = `<p class="empty-path-message">Go back and add places to your story to view your path.</p>`;
    return;
  }

  // Pluralization
  const headingText = count === 1 ? "ONE PLACE. ONE JOURNEY." : 
                       count === 2 ? "TWO PLACES. ONE JOURNEY." :
                       count === 3 ? "THREE PLACES. ONE JOURNEY." :
                       count === 4 ? "FOUR PLACES. ONE JOURNEY." :
                       count === 5 ? "FIVE PLACES. ONE JOURNEY." :
                       count === 6 ? "SIX PLACES. ONE JOURNEY." :
                       count === 7 ? "SEVEN PLACES. ONE JOURNEY." :
                       `${count} PLACES. ONE JOURNEY.`;

  heading.textContent = headingText;
  statsSub.innerHTML = `${String(count).padStart(2, '0')} PLACES &bull; ${timeStr} &bull; ${costStr} ESTIMATED ENTRY`;

  // Draw node items
  pathContainer.innerHTML = '';
  state.selectedPlaces.forEach((id, idx) => {
    const item = places.find(p => p.id === id);
    if (item) {
      const node = document.createElement('div');
      node.className = 'path-node';
      node.innerHTML = `
        <div class="path-node-num-wrapper">${String(idx + 1).padStart(2, '0')}</div>
        <div class="path-node-image-wrapper">
          <img src="${item.image}" alt="${item.name}" class="path-node-image" />
        </div>
        <div class="path-node-info">
          <h4 class="path-node-name">${item.name}</h4>
          <span class="path-node-meta">${item.category} &middot; ${item.duration} MIN &middot; ${item.cost === 0 ? 'FREE' : '€' + item.cost}</span>
        </div>
        <button type="button" class="path-node-remove-btn" data-id="${item.id}" aria-label="Remove item">REMOVE</button>
      `;
      pathContainer.appendChild(node);
    }
  });
}

// 09 — CORE INTERPOLATION & 3D TRANSFORM LOOP
function updateLoop() {
  // LERP scroll and mouse inputs for smooth cinematic dynamics
  if (state.isMobile || state.reduceMotion) {
    state.smoothScroll = state.targetScroll;
  } else {
    state.smoothScroll = lerp(state.smoothScroll, state.targetScroll, 0.08);
    // Snaps if extremely close to target
    if (Math.abs(state.smoothScroll - state.targetScroll) < 0.05) {
      state.smoothScroll = state.targetScroll;
    }
  }

  state.mouseX = lerp(state.mouseX, state.targetMouseX, 0.08);
  state.mouseY = lerp(state.mouseY, state.targetMouseY, 0.08);

  // Compute active scene page index based on scroll distance
  const scrollRange = (places.length + 1) * SCROLL_STEP;
  const progress = clamp(state.smoothScroll / scrollRange);
  
  const rawSceneIdx = state.smoothScroll / SCROLL_STEP;
  state.activeSceneIndex = clamp(Math.round(rawSceneIdx), 0, places.length + 1);

  // Update vertical progress active dots
  const items = progressList.querySelectorAll('.progress-item');
  items.forEach((item, index) => {
    if (index === state.activeSceneIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Calculate 3D camera transforms (only when on desktop and motion enabled)
  if (!state.isMobile && !state.reduceMotion) {
    const totalScenes = sceneCoordinates.length;
    
    // Find matching coordinates by checking Z boundaries
    const rawStep = state.smoothScroll / SCROLL_STEP;
    const lowerIdx = clamp(Math.floor(rawStep), 0, totalScenes - 1);
    const upperIdx = clamp(lowerIdx + 1, 0, totalScenes - 1);
    const stepProgress = rawStep - lowerIdx;

    // Glide target positions for panning
    const targetCamX = -lerp(sceneCoordinates[lowerIdx].x, sceneCoordinates[upperIdx].x, stepProgress);
    const targetCamY = -lerp(sceneCoordinates[lowerIdx].y, sceneCoordinates[upperIdx].y, stepProgress);
    
    // Translate Z goes deeper as scroll progresses
    const targetCamZ = -rawStep * sceneZSpacing;

    // Apply mouse drift offsets (subtle tilt and offset)
    const tiltRX = -state.mouseY * 4.0; // max 4 degrees tilt
    const tiltRY = state.mouseX * 6.0;  // max 6 degrees tilt
    const driftX = state.mouseX * -40;  // offset translation
    const driftY = state.mouseY * -20;

    // Set camera rig transform
    cameraRig.style.transform = `
      translate3d(${targetCamX + driftX}px, ${targetCamY + driftY}px, ${-targetCamZ}px) 
      rotateX(${tiltRX}deg) 
      rotateY(${tiltRY}deg)
    `;

    // Dynamic visibility, pointer-events & opacity controller for each scene
    const sceneElements = document.querySelectorAll('.scene');
    sceneElements.forEach((sceneEl, idx) => {
      const coord = sceneCoordinates[idx];
      const relZ = coord.z - targetCamZ; // distance from scene node to camera
      
      // Calculate opacity and visibility
      if (relZ < -sceneZSpacing || relZ > 400) {
        // Far ahead or passed far behind: hide to save CPU drawing cost
        sceneEl.classList.remove('scene-visible');
        sceneEl.classList.remove('scene-interactive');
      } else {
        sceneEl.classList.add('scene-visible');
        
        // Fading calculations
        let opacity = 1.0;
        if (relZ < 0) {
          // Approaching: fade in from -1200px to 0px
          opacity = clamp((relZ + 1200) / 1000);
        } else {
          // Receding: fade out from 0px to 400px
          opacity = clamp(1.0 - (relZ / 400));
        }
        
        sceneEl.style.opacity = opacity.toFixed(4);
        
        // Active pointer events only when extremely close to the scene camera focus
        if (Math.abs(relZ) < 300) {
          sceneEl.classList.add('scene-interactive');
        } else {
          sceneEl.classList.remove('scene-interactive');
        }
      }
    });

    // Make viewport sticky active
    viewportStage.style.position = 'sticky';
  } else {
    // If mobile layout, reset transform states to regular display blocks
    cameraRig.style.transform = 'none';
    const sceneElements = document.querySelectorAll('.scene');
    sceneElements.forEach(sceneEl => {
      sceneEl.style.opacity = '1';
      sceneEl.style.transform = 'none';
    });
  }

  // Continue the ticking loop
  requestAnimationFrame(updateLoop);
}
