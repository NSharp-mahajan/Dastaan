/**
 * Dastaan Trip Planner (Page 2) Logic
 */

const destinations = [
  { id: 'mostar', name: 'Mostar', country: 'Bosnia', image: 'https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80', defaultDur: 2, defaultBud: 5000 },
  { id: 'new-delhi', name: 'New Delhi', country: 'India', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1800&q=80', defaultDur: 3, defaultBud: 8000 },
  { id: 'kyoto', name: 'Kyoto', country: 'Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80', defaultDur: 5, defaultBud: 30000 },
  { id: 'florence', name: 'Florence', country: 'Italy', image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 25000 },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 15000 },
  { id: 'jaipur', name: 'Jaipur', country: 'India', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1800&q=80', defaultDur: 3, defaultBud: 10000 },
];

const availableInterests = ['History', 'Food', 'Nature', 'Culture', 'Shopping', 'Art', 'Adventure', 'Nightlife'];

// Default state
let dastaanTrip = {
  destination: null, // object ref
  duration: 3,
  budget: 8000,
  interests: [],
  travelStyle: 'Balanced'
};

// DOM Elements
const elSearch = document.getElementById('dest-search');
const elDestTags = document.getElementById('dest-tags');
const elBgImage = document.getElementById('dest-bg-image');
const elDestPreview = document.getElementById('dest-preview');
const elPreviewName = document.getElementById('preview-name');
const elPreviewCountry = document.getElementById('preview-country');
const elPreviewMeta = document.getElementById('preview-meta');
const elPreviewDuration = document.getElementById('preview-duration');
const elPreviewBudget = document.getElementById('preview-budget');

const elDurMinus = document.getElementById('btn-dur-minus');
const elDurPlus = document.getElementById('btn-dur-plus');
const elDurVal = document.getElementById('dur-val');
const elDurPills = document.querySelectorAll('.duration-col .preset-pill');

const elBudgetInput = document.getElementById('budget-input');
const elBudgetPills = document.querySelectorAll('.budget-col .preset-pill');

const elInterestsGrid = document.getElementById('interests-grid');
const elInterestsCount = document.getElementById('interests-count');

const elStyleCards = document.querySelectorAll('.style-card');

// Summary elements
const sumDest = document.getElementById('sum-dest');
const sumDur = document.getElementById('sum-dur');
const sumBudget = document.getElementById('sum-budget');
const sumInterests = document.getElementById('sum-interests');
const sumStyle = document.getElementById('sum-style');

const btnBuild = document.getElementById('btn-build');
const validationMsg = document.getElementById('validation-msg');

// Initialize
function init() {
  loadState();
  renderDestTags();
  renderInterests();
  updateUI();
  setupEventListeners();
}

function loadState() {
  const saved = localStorage.getItem('dastaanTrip');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        dastaanTrip = { ...dastaanTrip, ...parsed };
      }
    } catch(e) { console.error('Error loading state', e); }
  }
}

function saveState() {
  localStorage.setItem('dastaanTrip', JSON.stringify(dastaanTrip));
  updateSummary();
}

function renderDestTags() {
  elDestTags.innerHTML = '';
  destinations.forEach(dest => {
    const btn = document.createElement('button');
    btn.className = `dest-tag ${dastaanTrip.destination?.id === dest.id ? 'active' : ''}`;
    btn.textContent = dest.name;
    btn.onclick = () => selectDestination(dest);
    elDestTags.appendChild(btn);
  });
}

function selectDestination(dest) {
  dastaanTrip.destination = dest;
  elSearch.value = dest.name;
  
  // Image crossfade effect
  elBgImage.style.opacity = '0';
  setTimeout(() => {
    elBgImage.src = dest.image;
    elBgImage.onload = () => { elBgImage.style.opacity = '1'; };
  }, 400);

  // Update preview card
  elPreviewName.textContent = dest.name;
  elPreviewCountry.textContent = dest.country;
  elPreviewDuration.textContent = `~${dest.defaultDur} days`;
  elPreviewBudget.textContent = `~?${dest.defaultBud}`;
  elPreviewMeta.style.display = 'block';

  renderDestTags();
  saveState();
  validationMsg.textContent = ''; // clear error
}

// Search functionality (simple case-insensitive match)
elSearch.addEventListener('input', (e) => {
  const val = e.target.value.toLowerCase();
  const found = destinations.find(d => d.name.toLowerCase().includes(val));
  if (found && val.length > 2) {
    selectDestination(found);
  }
});

// Duration
function setDuration(val) {
  let num = parseInt(val);
  if (num < 1) num = 1;
  if (num > 60) num = 60;
  dastaanTrip.duration = num;
  elDurVal.textContent = num;
  
  elDurPills.forEach(p => p.classList.remove('active'));
  const match = Array.from(elDurPills).find(p => p.dataset.dur == num);
  if (match) match.classList.add('active');
  
  saveState();
}
elDurMinus.onclick = () => setDuration(dastaanTrip.duration - 1);
elDurPlus.onclick = () => setDuration(dastaanTrip.duration + 1);
elDurPills.forEach(pill => {
  pill.onclick = () => setDuration(pill.dataset.dur);
});

// Budget
function setBudget(val) {
  let num = parseInt(val) || 0;
  if (num < 1000) num = 1000;
  dastaanTrip.budget = num;
  elBudgetInput.value = num;
  
  elBudgetPills.forEach(p => p.classList.remove('active'));
  const match = Array.from(elBudgetPills).find(p => p.dataset.budget == num);
  if (match) match.classList.add('active');
  
  saveState();
}
elBudgetInput.onchange = (e) => setBudget(e.target.value);
elBudgetPills.forEach(pill => {
  pill.onclick = () => setBudget(pill.dataset.budget);
});

// Interests
function renderInterests() {
  elInterestsGrid.innerHTML = '';
  availableInterests.forEach(interest => {
    const isSelected = dastaanTrip.interests.includes(interest);
    const div = document.createElement('div');
    div.className = `interest-tile ${isSelected ? 'selected' : ''}`;
    div.innerHTML = `<span>${interest}</span>`;
    div.onclick = () => toggleInterest(interest, div);
    elInterestsGrid.appendChild(div);
  });
  elInterestsCount.textContent = `${dastaanTrip.interests.length} SELECTED`;
}
function toggleInterest(interest, el) {
  const idx = dastaanTrip.interests.indexOf(interest);
  if (idx > -1) {
    dastaanTrip.interests.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    dastaanTrip.interests.push(interest);
    el.classList.add('selected');
  }
  elInterestsCount.textContent = `${dastaanTrip.interests.length} SELECTED`;
  saveState();
}

// Style
elStyleCards.forEach(card => {
  card.onclick = () => {
    elStyleCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    dastaanTrip.travelStyle = card.dataset.style;
    saveState();
  };
});

// Summary
function updateSummary() {
  if (dastaanTrip.destination) {
    sumDest.textContent = `${dastaanTrip.destination.name}, ${dastaanTrip.destination.country}`;
  } else {
    sumDest.textContent = 'Not selected';
  }
  
  sumDur.textContent = `${dastaanTrip.duration} Days`;
  sumBudget.textContent = `?${dastaanTrip.budget.toLocaleString()}`;
  
  if (dastaanTrip.interests.length > 0) {
    sumInterests.textContent = dastaanTrip.interests.join(' · ');
  } else {
    sumInterests.textContent = 'None';
  }
  
  sumStyle.textContent = dastaanTrip.travelStyle;
}

// Initial UI Sync
function updateUI() {
  if (dastaanTrip.destination) selectDestination(dastaanTrip.destination);
  setDuration(dastaanTrip.duration);
  setBudget(dastaanTrip.budget);
  
  elStyleCards.forEach(c => {
    if (c.dataset.style === dastaanTrip.travelStyle) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });
  
  updateSummary();
}

function setupEventListeners() {}

// Validation and Submission
btnBuild.onclick = () => {
  if (!dastaanTrip.destination) {
    validationMsg.textContent = "Please select a destination to continue.";
    // smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  
  validationMsg.textContent = "";
  btnBuild.textContent = "BUILDING...";
  
  // Simulate slight delay for premium feel
  setTimeout(() => {
    window.location.href = '../page3/page3.html';
  }, 600);
};

// Boot
document.addEventListener('DOMContentLoaded', init);
