/**
 * Dastaan - Discover Page Logic
 */

// --- 1. LOCAL DATA (Phase 1) ---
const destinationsData = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    image: "../images/kyoto.jpg",
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
    image: "../images/jaipur.jpg",
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
    image: "../images/udaipur.jpg",
    description: "Known as the City of Lakes, offering a romantic, serene, and historically rich escape.",
    budget: 20000,
    days: 4,
    interests: ["Nature", "Culture", "Relaxation", "History"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    image: "../images/istanbul.jpg",
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
    image: "../images/rishikesh.jpg",
    description: "The Yoga Capital of the World, sitting on the banks of the Ganges, offering peace and adventure.",
    budget: 12000,
    days: 3,
    interests: ["Nature", "Adventure", "Culture"],
    styles: ["Relaxed", "Balanced"]
  }
];

// --- 2. STATE ---
const state = {
  durationRange: null, // "2-3", "4-5", "6-7", "8+"
  budgetChoice: null, // Numeric value or null
  interests: [],
  travelStyle: "Balanced",
  results: [], // Ranked destinations
  sortType: "match" // 'match', 'budget', 'duration'
};


// --- 3. DOM ELEMENTS ---
const elTimeOptions = document.querySelectorAll('#time-options .filter-option');
const elBudgetOptions = document.querySelectorAll('#budget-options .filter-option');
const elBudgetNumeric = document.getElementById('budget-numeric');
const elInterestsOptions = document.querySelectorAll('#interests-options .interest-tile');
const elInterestsCount = document.getElementById('interests-count');
const elStyleCards = document.querySelectorAll('#style-options .style-card');

const btnFind = document.getElementById('btn-find-destinations');
const validationMsg = document.getElementById('validation-msg');

const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const sortSelect = document.getElementById('sort-select');


// --- 4. EVENT LISTENERS ---
function setupEvents() {
  // Time
  elTimeOptions.forEach(btn => {
    btn.onclick = () => {
      elTimeOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.durationRange = btn.dataset.time;
    };
  });

  // Budget Options
  elBudgetOptions.forEach(btn => {
    btn.onclick = () => {
      elBudgetOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.budgetChoice = parseInt(btn.dataset.budget);
      elBudgetNumeric.value = ''; // clear numeric if preset clicked
    };
  });

  // Budget Numeric Input
  elBudgetNumeric.oninput = (e) => {
    if (e.target.value) {
      state.budgetChoice = parseInt(e.target.value);
      elBudgetOptions.forEach(b => b.classList.remove('active'));
    } else {
      state.budgetChoice = null; // revert if cleared
    }
  };

  // Interests
  elInterestsOptions.forEach(tile => {
    tile.onclick = () => {
      const intVal = tile.dataset.interest;
      if (state.interests.includes(intVal)) {
        state.interests = state.interests.filter(i => i !== intVal);
        tile.classList.remove('active');
      } else {
        state.interests.push(intVal);
        tile.classList.add('active');
      }
      elInterestsCount.textContent = `${state.interests.length} SELECTED`;
    };
  });

  // Travel Style
  elStyleCards.forEach(card => {
    card.onclick = () => {
      elStyleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.travelStyle = card.dataset.style;
    };
  });

  // Find Action
  btnFind.onclick = handleFindDestinations;

  // Sorting
  sortSelect.onchange = (e) => {
    state.sortType = e.target.value;
    renderResults();
  };

  // Empty State Actions
  document.getElementById('btn-adjust-prefs').onclick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  document.getElementById('btn-show-closest').onclick = () => {
    // Render ignoring low scores
    renderResults(true);
  };
}


// --- 5. MATCHING LOGIC ---
function calculateMatch(dest, prefs) {
  let score = 0;
  const reasons = [];

  // Budget (30%)
  if (prefs.budgetChoice) {
    if (dest.budget <= prefs.budgetChoice) {
      score += 30;
      reasons.push(`? Comfortably fits your ?${prefs.budgetChoice.toLocaleString()} budget (est. ?${dest.budget.toLocaleString()})`);
    } else if (dest.budget <= prefs.budgetChoice * 1.2) {
      score += 15; // slightly over
      reasons.push(`! Slightly over your budget (est. ?${dest.budget.toLocaleString()})`);
    }
  } else {
    score += 30; // no budget limit set
  }

  // Duration (25%)
  if (prefs.durationRange) {
    let minD = 0, maxD = 99;
    if (prefs.durationRange === "2-3") { minD = 2; maxD = 3; }
    if (prefs.durationRange === "4-5") { minD = 4; maxD = 5; }
    if (prefs.durationRange === "6-7") { minD = 6; maxD = 7; }
    if (prefs.durationRange === "8+") { minD = 8; maxD = 99; }
    
    if (dest.days >= minD && dest.days <= maxD) {
      score += 25;
      reasons.push(`? Ideal for a ${prefs.durationRange} day trip`);
    } else if (Math.abs(dest.days - minD) <= 1 || Math.abs(dest.days - maxD) <= 1) {
      score += 12; // close
    }
  } else {
    score += 25;
  }

  // Interests (30%)
  if (prefs.interests.length > 0) {
    const matchCount = prefs.interests.filter(i => dest.interests.includes(i)).length;
    const intPct = matchCount / prefs.interests.length;
    score += (intPct * 30);
    if (matchCount > 0) {
      reasons.push(`? Matches ${matchCount} of your interests`);
    }
  } else {
    score += 30; // no specific interests
  }

  // Travel Style (15%)
  if (dest.styles.includes(prefs.travelStyle)) {
    score += 15;
    reasons.push(`? Works well with a ${prefs.travelStyle.toLowerCase()} travel style`);
  }

  return {
    score: Math.round(score),
    reasons
  };
}


function handleFindDestinations() {
  if (!state.durationRange || !state.budgetChoice) {
    validationMsg.textContent = "Please select your time and budget to continue.";
    return;
  }
  validationMsg.textContent = "";
  
  // Calculate matches
  state.results = destinationsData.map(dest => {
    const matchData = calculateMatch(dest, state);
    return { ...dest, score: matchData.score, reasons: matchData.reasons };
  });

  renderResults(false);
  resultsSection.style.display = 'block';
  
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}


// --- 6. RENDERING ---
function renderResults(forceShow = false) {
  // Sort
  if (state.sortType === 'match') {
    state.results.sort((a, b) => b.score - a.score);
  } else if (state.sortType === 'budget') {
    state.results.sort((a, b) => a.budget - b.budget);
  } else if (state.sortType === 'duration') {
    state.results.sort((a, b) => a.days - b.days);
  }

  const validResults = forceShow ? state.results : state.results.filter(r => r.score >= 50);

  if (validResults.length === 0) {
    emptyState.style.display = 'block';
    resultsContainer.innerHTML = '';
    resultsCount.textContent = '0 destinations found';
    return;
  }

  emptyState.style.display = 'none';
  resultsCount.textContent = `${validResults.length} destinations found`;
  resultsContainer.innerHTML = '';

  const savedList = getSavedDestinations();

  // Render Top Match (Featured)
  const featured = validResults[0];
  const featHTML = `
    <div class="featured-card">
      <div class="featured-image-wrap">
        <div class="image-placeholder">${featured.name.toUpperCase()} IMAGE</div>
        <img class="destination-image" src="${featured.image}" alt="${featured.name}" onerror="this.style.display='none'" />
      </div>
      <div class="featured-content">
        <span class="match-score">${featured.score}% MATCH</span>
        <h3>${featured.name}</h3>
        <span class="dest-country">${featured.country}</span>
        <p class="dest-desc">${featured.description}</p>
        
        <div class="dest-meta">
          <div class="meta-item">
            <span class="meta-label">Estimated</span>
            <span class="meta-val">?${featured.budget.toLocaleString()}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Recommended</span>
            <span class="meta-val">${featured.days} Days</span>
          </div>
        </div>
        
        <ul class="match-reasons">
          ${featured.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
        
        <div class="card-actions">
          <button class="btn-primary" onclick="planTrip('${featured.id}')">PLAN THIS TRIP &rarr;</button>
          <button class="save-btn ${savedList.includes(featured.id) ? 'saved' : ''}" onclick="toggleSave('${featured.id}', this)">
            ${savedList.includes(featured.id) ? '? SAVED' : '? SAVE'}
          </button>
        </div>
      </div>
    </div>
  `;

  // Render Secondary Cards
  let secHTML = '<div class="secondary-grid">';
  for (let i = 1; i < validResults.length; i++) {
    const dest = validResults[i];
    secHTML += `
      <div class="secondary-card">
        <div class="secondary-image-wrap">
          <div class="image-placeholder">${dest.name.toUpperCase()} IMAGE</div>
          <img class="destination-image" src="${dest.image}" alt="${dest.name}" onerror="this.style.display='none'" />
        </div>
        <div class="secondary-content">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="match-score">${dest.score}% Match</span>
          </div>
          <h4>${dest.name}</h4>
          <span class="dest-country">${dest.country}</span>
          
          <div class="dest-meta">
            <div class="meta-item">
              <span class="meta-label">Budget</span>
              <span class="meta-val">?${dest.budget.toLocaleString()}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Duration</span>
              <span class="meta-val">${dest.days} Days</span>
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-outline" onclick="planTrip('${dest.id}')">PLAN TRIP &rarr;</button>
            <button class="save-btn ${savedList.includes(dest.id) ? 'saved' : ''}" onclick="toggleSave('${dest.id}', this)">
              ${savedList.includes(dest.id) ? '? SAVED' : '? SAVE'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  secHTML += '</div>';

  resultsContainer.innerHTML = featHTML + (validResults.length > 1 ? secHTML : '');
}


// --- 7. ACTION HANDLING ---

function getSavedDestinations() {
  const saved = localStorage.getItem('dastaanSaved');
  return saved ? JSON.parse(saved) : [];
}

window.toggleSave = function(id, btnEl) {
  let saved = getSavedDestinations();
  if (saved.includes(id)) {
    saved = saved.filter(s => s !== id);
    btnEl.innerHTML = '? SAVE';
    btnEl.classList.remove('saved');
  } else {
    saved.push(id);
    btnEl.innerHTML = '? SAVED';
    btnEl.classList.add('saved');
  }
  localStorage.setItem('dastaanSaved', JSON.stringify(saved));
};

window.planTrip = function(id) {
  const destData = destinationsData.find(d => d.id === id);
  if (!destData) return;

  // Build the state object expected by page2 Trip Planner
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
  
  // Redirect to planner
  window.location.href = '../page2/page2.html';
};


// Boot
document.addEventListener('DOMContentLoaded', setupEvents);
