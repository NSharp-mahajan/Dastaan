/**
 * Dastaan — Discover Page Logic
 * Handles state synchronization, LocalStorage, cinematic loader,
 * matching & ranking algorithms, scroll reveal animations, and dynamic templates.
 */

// --- 1. LOCAL DATA ---
const destinationsData = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    description: "Culture, food and nature come together in a slower-paced journey through Japan's historic heart.",
    budget: 30000,
    days: 5,
    interests: ["Culture", "Food", "Nature", "History"],
    styles: ["Balanced", "Relaxed"]
  },
  {
    id: "jaipur",
    name: "Jaipur",
    country: "India",
    image: "../images/jaipur/hawamahal.jpg",
    description: "The Pink City offers majestic forts, royal palaces, and vibrant bazaars full of life and color.",
    budget: 15000,
    days: 3,
    interests: ["History", "Culture", "Shopping", "Art"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "udaipur",
    name: "Udaipur",
    country: "India",
    image: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1200&q=80",
    description: "Known as the City of Lakes, offering a romantic, serene, and historically rich escape.",
    budget: 20000,
    days: 4,
    interests: ["Nature", "Culture", "History", "Food"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description: "Where East meets West—a bustling metropolis of bazaars, mosques, and incredible street food.",
    budget: 25000,
    days: 5,
    interests: ["History", "Food", "Culture", "Shopping"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "rishikesh",
    name: "Rishikesh",
    country: "India",
    image: "https://images.unsplash.com/photo-1545203144-79397492b239?auto=format&fit=crop&w=1200&q=80",
    description: "The Yoga Capital of the World, sitting on the banks of the Ganges, offering peace and adventure.",
    budget: 12000,
    days: 3,
    interests: ["Nature", "Adventure", "Culture"],
    styles: ["Relaxed", "Balanced"]
  }
];

// --- 2. STATE ---
const state = {
  durationRange: null, // "2-3", "4-6", "6-7", "8+"
  budgetChoice: null,  // Numeric budget limit
  isCustomBudget: false,
  interests: [],       // Selected experiences
  travelStyle: "Balanced",
  results: [],         // Ranked results
  sortType: "match"    // 'match', 'budget', 'duration'
};

const STORAGE_KEY = "dastaan_discover_state";

// --- 3. DOM ELEMENTS ---
let elTimeOptions, elBudgetOptions, elBudgetNumeric, elInterestsOptions;
let elInterestsCount, elStyleCards, btnFind, validationMsg;
let resultsSection, resultsContainer, emptyState, resultsCount, sortSelect;

// --- 4. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initElements();
  loadState();
  setupEvents();
  setupScrollAnimations();
  syncUIWithState();
});

function initElements() {
  elTimeOptions = document.querySelectorAll('#time-options .select-card');
  elBudgetOptions = document.querySelectorAll('#budget-options .select-card');
  elBudgetNumeric = document.getElementById('budget-numeric');
  elInterestsOptions = document.querySelectorAll('#interests-options .exp-card');
  elInterestsCount = document.getElementById('interests-count');
  elStyleCards = document.querySelectorAll('#style-options .pace-card');
  
  btnFind = document.getElementById('btn-find-destinations');
  validationMsg = document.getElementById('validation-msg');

  resultsSection = document.getElementById('results-section');
  resultsContainer = document.getElementById('results-container');
  emptyState = document.getElementById('empty-state');
  resultsCount = document.getElementById('results-count');
  sortSelect = document.getElementById('sort-select');
}

// --- 5. EVENT LISTENERS ---
function setupEvents() {
  // Time Selections
  elTimeOptions.forEach(btn => {
    btn.onclick = () => {
      elTimeOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.durationRange = btn.dataset.time;
      saveState();
      updateSummary();
    };
  });

  // Budget Choices
  elBudgetOptions.forEach(btn => {
    btn.onclick = () => {
      elBudgetOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.budgetChoice = parseInt(btn.dataset.budget);
      state.isCustomBudget = false;
      elBudgetNumeric.value = ''; // clear custom numeric
      saveState();
      updateSummary();
    };
  });

  // Budget Custom Input
  elBudgetNumeric.oninput = (e) => {
    const val = e.target.value.trim();
    if (val) {
      state.budgetChoice = parseInt(val);
      state.isCustomBudget = true;
      elBudgetOptions.forEach(b => b.classList.remove('active'));
    } else {
      state.budgetChoice = null;
      state.isCustomBudget = false;
    }
    saveState();
    updateSummary();
  };

  // Experiences Multi-selection
  elInterestsOptions.forEach(tile => {
    tile.onclick = () => {
      const interest = tile.dataset.interest;
      if (state.interests.includes(interest)) {
        state.interests = state.interests.filter(i => i !== interest);
        tile.classList.remove('active');
      } else {
        state.interests.push(interest);
        tile.classList.add('active');
      }
      elInterestsCount.textContent = `${state.interests.length} SELECTED`;
      saveState();
      updateSummary();
    };
  });

  // Travel Styles (Pace)
  elStyleCards.forEach(card => {
    card.onclick = () => {
      elStyleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.travelStyle = card.dataset.style;
      saveState();
      updateSummary();
    };
  });

  // Primary Discover Action with cinematic transition
  btnFind.onclick = () => {
    if (validateSelections()) {
      runCinematicLoader(() => {
        calculateAndRender();
      });
    }
  };

  // Adjust preferences empty action
  if (document.getElementById('btn-adjust-prefs')) {
    document.getElementById('btn-adjust-prefs').onclick = () => {
      document.getElementById('sec-01').scrollIntoView({ behavior: 'smooth' });
    };
  }

  // Force show closest matches empty action
  if (document.getElementById('btn-show-closest')) {
    document.getElementById('btn-show-closest').onclick = () => {
      calculateAndRender(true);
    };
  }

  // Sorting Handler
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      state.sortType = e.target.value;
      renderResults();
    };
  }

  // Not sure where to start action
  const guideMeBtn = document.getElementById('btn-guide-me');
  if (guideMeBtn) {
    guideMeBtn.onclick = () => {
      document.getElementById('sec-01').scrollIntoView({ behavior: 'smooth' });
    };
  }

  // Progress steps clicks
  document.querySelectorAll('.progress-steps .step').forEach(stepBtn => {
    stepBtn.onclick = () => {
      const targetId = stepBtn.dataset.target;
      const targetSec = document.getElementById(targetId);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  });
}

// --- 6. CINEMATIC LOADER ---
function runCinematicLoader(callback) {
  const loader = document.getElementById('cinematic-loader');
  const messageEl = document.getElementById('loader-message');
  
  if (!loader) {
    callback();
    return;
  }

  loader.style.display = 'flex';
  messageEl.textContent = "UNDERSTANDING YOUR JOURNEY...";

  setTimeout(() => {
    messageEl.textContent = "FINDING PLACES THAT FIT...";
  }, 500);

  setTimeout(() => {
    loader.style.display = 'none';
    callback();
  }, 1000);
}

// --- 7. SCROLL-LINKED ANIMATIONS & PROGRESS FILL ---
function setupScrollAnimations() {
  const sections = document.querySelectorAll('.form-section');
  const progressLine = document.getElementById('progress-line-fill');
  const stepButtons = document.querySelectorAll('.progress-steps .step');

  // 1. Intersection Observer for Chapters Active State
  const chapterObserverOptions = {
    root: null,
    rootMargin: '-25% 0px -35% 0px',
    threshold: 0
  };

  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const stepId = id.replace('sec-', 'step-');
        
        // Highlight active step
        stepButtons.forEach(btn => {
          if (btn.id === stepId) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        // Fill progress track line
        const stepIndex = parseInt(id.replace('sec-0', ''));
        if (progressLine) {
          progressLine.style.height = `${((stepIndex - 1) / 3) * 100}%`;
        }
      }
    });
  }, chapterObserverOptions);

  sections.forEach(sec => chapterObserver.observe(sec));

  // 2. Intersection Observer for Editorial Scroll Reveals
  const revealObserverOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.05
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target); // trigger once
      }
    });
  }, revealObserverOptions);

  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));
}

// --- 8. STATE SYNCING & LOCALSTORAGE ---
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch (e) {
      console.error("Error loading saved Discover state:", e);
    }
  }
}

function syncUIWithState() {
  // Sync duration buttons
  if (state.durationRange) {
    const activeBtn = document.querySelector(`#time-options .select-card[data-time="${state.durationRange}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Sync budget buttons & custom numeric inputs
  if (state.budgetChoice) {
    if (state.isCustomBudget) {
      elBudgetNumeric.value = state.budgetChoice;
    } else {
      const activeBtn = document.querySelector(`#budget-options .select-card[data-budget="${state.budgetChoice}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  }

  // Sync experiences multi-select
  if (state.interests && state.interests.length > 0) {
    state.interests.forEach(interest => {
      const activeTile = document.querySelector(`#interests-options .exp-card[data-interest="${interest}"]`);
      if (activeTile) activeTile.classList.add('active');
    });
    elInterestsCount.textContent = `${state.interests.length} SELECTED`;
  }

  // Sync styles (pace)
  if (state.travelStyle) {
    elStyleCards.forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector(`#style-options .pace-card[data-style="${state.travelStyle}"]`);
    if (activeCard) activeCard.classList.add('active');
  }

  updateSummary();
}

function updateSummary() {
  // 1. Time string
  const timeVal = state.durationRange;
  document.getElementById('sum-time').textContent = timeVal ? `${timeVal.replace('-', '–')} Days`.toUpperCase() : "NOT SELECTED";

  // 2. Budget string formatting
  let budgetStr = "NOT SELECTED";
  if (state.budgetChoice) {
    if (state.isCustomBudget) {
      budgetStr = `₹${state.budgetChoice.toLocaleString('en-IN')}`;
    } else {
      if (state.budgetChoice === 10000) budgetStr = "UNDER ₹10K";
      else if (state.budgetChoice === 20000) budgetStr = "₹10K–₹20K";
      else if (state.budgetChoice === 40000) budgetStr = "₹20K–₹40K";
      else if (state.budgetChoice === 40001) budgetStr = "₹40K+";
    }
  }
  document.getElementById('sum-budget').textContent = budgetStr.toUpperCase();

  // 3. Experience string formatting
  const expVal = state.interests.length > 0 ? state.interests.join(' &middot; ').toUpperCase() : "NOT SELECTED";
  document.getElementById('sum-exp').innerHTML = expVal;

  // 4. Pace string formatting
  document.getElementById('sum-pace').textContent = state.travelStyle ? state.travelStyle.toUpperCase() : "NOT SELECTED";
}

// --- 9. MATCHING ALGORITHM ---
function calculateMatch(dest, prefs) {
  let score = 0;
  const reasons = [];

  // A. Budget (Max 30%)
  if (prefs.budgetChoice) {
    if (dest.budget <= prefs.budgetChoice) {
      score += 30;
      reasons.push(`Comfortably fits your budget (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    } else if (dest.budget <= prefs.budgetChoice * 1.25) {
      score += 15; // slightly over
      reasons.push(`Slightly over your budget choice (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    } else {
      score += 5;
      reasons.push(`Exceeds your preferred budget (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    }
  } else {
    score += 30; // no budget preference
  }

  // B. Duration (Max 25%)
  if (prefs.durationRange) {
    let minD = 0, maxD = 99;
    if (prefs.durationRange === "2-3") { minD = 2; maxD = 3; }
    else if (prefs.durationRange === "4-6") { minD = 4; maxD = 6; }
    else if (prefs.durationRange === "6-7") { minD = 6; maxD = 7; }
    else if (prefs.durationRange === "8+") { minD = 8; maxD = 99; }

    if (dest.days >= minD && dest.days <= maxD) {
      score += 25;
      reasons.push(`Fits your timeframe perfectly (${dest.days} days recommended)`);
    } else if (Math.abs(dest.days - minD) <= 1 || Math.abs(dest.days - maxD) <= 1) {
      score += 12; // close
      reasons.push(`Close to your preferred duration`);
    } else {
      reasons.push(`Requires ${dest.days} days, outside your timeframe`);
    }
  } else {
    score += 25;
  }

  // C. Experiences/Interests (Max 30%)
  if (prefs.interests && prefs.interests.length > 0) {
    const matchCount = prefs.interests.filter(i => dest.interests.includes(i)).length;
    const ratio = matchCount / prefs.interests.length;
    score += Math.round(ratio * 30);
    
    if (matchCount > 0) {
      reasons.push(`Matches ${matchCount} of your chosen experiences`);
    }
  } else {
    score += 30; // fallback
  }

  // D. Travel Style / Pace (Max 15%)
  if (dest.styles.includes(prefs.travelStyle)) {
    score += 15;
    reasons.push(`Matches your preference for a ${prefs.travelStyle.toLowerCase()} pace`);
  } else {
    score += 5;
  }

  return {
    score: Math.max(10, Math.min(100, score)),
    reasons
  };
}

function calculateAndRender(showAllClosest = false) {
  // Compute rankings
  state.results = destinationsData.map(dest => {
    const matchData = calculateMatch(dest, state);
    return { ...dest, score: matchData.score, reasons: matchData.reasons };
  });

  resultsSection.style.display = 'block';
  renderResults(showAllClosest);

  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// --- 10. RENDERING ---
function renderResults(forceShow = false) {
  if (state.results.length === 0) return;
  
  if (state.sortType === 'match') {
    state.results.sort((a, b) => b.score - a.score);
  } else if (state.sortType === 'budget') {
    state.results.sort((a, b) => a.budget - b.budget);
  } else if (state.sortType === 'duration') {
    state.results.sort((a, b) => a.days - b.days);
  }

  // Filter out low scores unless forceShow is checked
  const filtered = forceShow ? state.results : state.results.filter(r => r.score >= 45);
  const savedList = getSavedDestinations();

  resultsContainer.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    resultsCount.textContent = '0 destinations found';
    return;
  }

  emptyState.style.display = 'none';
  resultsCount.textContent = `${filtered.length} destination${filtered.length > 1 ? 's' : ''} found`;

  // Render Top Match (Featured Asymmetric Card Layout)
  const featured = filtered[0];
  const featuredScoreText = getFitLabel(featured.score);
  
  const featuredHTML = `
    <div class="featured-card reveal-on-scroll revealed">
      <div class="featured-image-wrap">
        <span class="match-score">${featured.score}% ${featuredScoreText}</span>
        <img class="destination-image" src="${featured.image}" alt="${featured.name}" />
      </div>
      <div class="featured-content">
        <h3>${featured.name}</h3>
        <span class="dest-country">${featured.country}</span>
        <p class="dest-desc">${featured.description}</p>
        
        <div class="dest-why">
          <strong>Why it fits:</strong> Fits your timeframe, matching your travel pace and experience preference.
        </div>
        
        <div class="experience-tags">
          ${featured.interests.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>

        <div class="dest-meta">
          <div class="meta-item">
            <span class="meta-label">Estimated Budget</span>
            <span class="meta-val">₹${featured.budget.toLocaleString('en-IN')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Recommended Time</span>
            <span class="meta-val">${featured.days} Days</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-primary" onclick="planTrip('${featured.id}')">PLAN THIS JOURNEY &rarr;</button>
          <button class="btn-outline save-btn ${savedList.includes(featured.id) ? 'saved' : ''}" onclick="toggleSave('${featured.id}', this)">
            ${savedList.includes(featured.id) ? '✓ SAVED' : 'SAVE JOURNEY'}
          </button>
        </div>
      </div>
    </div>
  `;

  // Render Secondary Cards (Magazine-style columns)
  let secondaryHTML = '';
  if (filtered.length > 1) {
    secondaryHTML += `<div class="secondary-grid">`;
    for (let i = 1; i < filtered.length; i++) {
      const dest = filtered[i];
      const scoreText = getFitLabel(dest.score);
      secondaryHTML += `
        <div class="secondary-card reveal-on-scroll revealed">
          <div class="secondary-image-wrap">
            <span class="match-score">${dest.score}% ${scoreText}</span>
            <img class="destination-image" src="${dest.image}" alt="${dest.name}" />
          </div>
          <div class="secondary-content">
            <h4>${dest.name}</h4>
            <span class="dest-country">${dest.country}</span>
            <p class="dest-desc">${dest.description}</p>
            
            <div class="dest-why">
              <strong>Why it fits:</strong> Tailored to your pace preference and cultural expectations.
            </div>

            <div class="experience-tags">
              ${dest.interests.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>

            <div class="dest-meta">
              <div class="meta-item">
                <span class="meta-label">Estimated Budget</span>
                <span class="meta-val">₹${dest.budget.toLocaleString('en-IN')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Duration</span>
                <span class="meta-val">${dest.days} Days</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn-primary" onclick="planTrip('${dest.id}')">PLAN THIS JOURNEY &rarr;</button>
              <button class="btn-outline save-btn ${savedList.includes(dest.id) ? 'saved' : ''}" onclick="toggleSave('${dest.id}', this)">
                ${savedList.includes(dest.id) ? '✓ SAVED' : 'SAVE JOURNEY'}
              </button>
            </div>
          </div>
        </div>
      `;
    }
    secondaryHTML += `</div>`;
  }

  resultsContainer.innerHTML = featuredHTML + secondaryHTML;
}

function getFitLabel(score) {
  if (score >= 80) return "GREAT FIT";
  if (score >= 60) return "STRONG FIT";
  return "GOOD FIT";
}

// --- 11. ACTIONS & SAVES ---
function getSavedDestinations() {
  const saved = localStorage.getItem('dastaanSaved');
  return saved ? JSON.parse(saved) : [];
}

window.toggleSave = function(id, btnEl) {
  let saved = getSavedDestinations();
  if (saved.includes(id)) {
    saved = saved.filter(s => s !== id);
    btnEl.innerHTML = 'SAVE JOURNEY';
    btnEl.classList.remove('saved');
  } else {
    saved.push(id);
    btnEl.innerHTML = '✓ SAVED';
    btnEl.classList.add('saved');
  }
  localStorage.setItem('dastaanSaved', JSON.stringify(saved));
};

window.planTrip = function(id) {
  const destData = destinationsData.find(d => d.id === id);
  if (!destData) return;

  const tripPayload = {
    destination: {
      id: destData.id,
      name: destData.name,
      country: destData.country,
      image: destData.image,
      defaultDur: destData.days,
      defaultBud: destData.budget
    },
    duration: destData.days,
    budget: state.budgetChoice || destData.budget,
    interests: state.interests,
    travelStyle: state.travelStyle
  };

  localStorage.setItem('dastaanTrip', JSON.stringify(tripPayload));
  window.location.href = '../page2/page2.html';
};

// --- 12. VALIDATION ---
function validateSelections() {
  if (validationMsg) {
    validationMsg.textContent = "";
    validationMsg.style.display = "none";
  }

  const missing = [];
  if (!state.durationRange) missing.push("time");
  if (!state.budgetChoice) missing.push("budget");
  if (!state.interests || state.interests.length === 0) missing.push("experiences");
  if (!state.travelStyle) missing.push("pace");

  if (missing.length > 0) {
    if (validationMsg) {
      validationMsg.textContent = `Please select your preferred ${missing.join(", ")} before continuing.`;
      validationMsg.style.display = "block";
      validationMsg.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return false;
  }

  return true;
}
