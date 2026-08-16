/**
 * Dastaan Itinerary Page (Page 3) Logic
 */

// 1. STATE & DATA
let dastaanTrip = null;

const mockItineraries = {
  'kyoto': {
    name: 'Kyoto', country: 'Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
    days: [
      [
        { time: '09:00', title: 'Fushimi Inari Shrine', desc: 'Beat the crowds and walk through the iconic thousands of vermilion torii gates.', cat: 'CULTURE' },
        { time: '13:00', title: 'Nishiki Market', desc: 'Explore the "Kitchen of Kyoto" and sample local delicacies.', cat: 'FOOD' },
        { time: '16:00', title: 'Gion District', desc: 'Evening stroll through the historic geisha district as the lanterns light up.', cat: 'HISTORY' }
      ],
      [
        { time: '08:30', title: 'Arashiyama Bamboo Grove', desc: 'Walk through the towering green stalks in the early morning light.', cat: 'NATURE' },
        { time: '12:00', title: 'Tenryu-ji Temple', desc: 'A UNESCO World Heritage site with a stunning Zen garden.', cat: 'CULTURE' },
        { time: '15:30', title: 'Okochi Sanso Garden', desc: 'Former estate of the samurai film star with matcha and panoramic views.', cat: 'RELAX' }
      ]
    ]
  },
  'new-delhi': {
    name: 'New Delhi', country: 'India',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1800&q=80',
    days: [
      [
        { time: '09:00', title: 'Humayun’s Tomb', desc: 'Morning visit to the magnificent Mughal garden tomb.', cat: 'HISTORY' },
        { time: '13:00', title: 'Chandni Chowk', desc: 'Dive into Old Delhi for street food and the spice market.', cat: 'FOOD' },
        { time: '17:00', title: 'India Gate & Rajpath', desc: 'Evening walk along the ceremonial axis of New Delhi.', cat: 'CULTURE' }
      ]
    ]
  },
  // Fallback for others
  'default': {
    name: 'Your Destination', country: 'World',
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80',
    days: [
      [
        { time: '10:00', title: 'City Center Exploration', desc: 'Get your bearings and see the main square.', cat: 'CULTURE' },
        { time: '13:30', title: 'Local Cuisine Lunch', desc: 'Taste the authentic flavors of the region.', cat: 'FOOD' },
        { time: '16:00', title: 'Museum or Gallery', desc: 'Dive into the local history and art.', cat: 'ART' }
      ]
    ]
  }
};

const interestExplanations = {
  'History': 'Historical sites, museums, and heritage walks have been prioritized in your daily schedule.',
  'Food': 'We have allocated extra time for local markets, renowned restaurants, and culinary exploration.',
  'Nature': 'Parks, scenic routes, and outdoor escapes have been woven into the itinerary.',
  'Culture': 'Local experiences, temples, and cultural performances are heavily featured.',
  'Shopping': 'Time has been carved out for local artisans, boutiques, and famous shopping districts.',
  'Art': 'Galleries, street art districts, and design hubs are included in your route.',
  'Adventure': 'More active and thrilling experiences have been selected for your days.',
  'Nightlife': 'Evening activities, local bars, and night markets have been added.'
};

// 2. DOM ELEMENTS
const elHeroBgImg = document.getElementById('hero-bg-img');
const elHeroDestName = document.getElementById('hero-dest-name');
const elHeroMeta = document.getElementById('hero-meta');
const elHeroDesc = document.getElementById('hero-desc');
const btnScrollDown = document.getElementById('btn-scroll-down');

const elGlanceDur = document.getElementById('glance-duration');
const elGlanceBud = document.getElementById('glance-budget');
const elGlanceIntCount = document.getElementById('glance-interests-count');
const elGlanceIntList = document.getElementById('glance-interests-list');
const elGlanceStyle = document.getElementById('glance-style');

const elItineraryTitle = document.getElementById('itinerary-title');
const elDaySelector = document.getElementById('day-selector');
const elTimelineContainer = document.getElementById('timeline-container');

const statPlaces = document.getElementById('stat-places');
const statMovement = document.getElementById('stat-movement');
const statSaved = document.getElementById('stat-saved');

const budgetTotal = document.getElementById('budget-total');
const budgetBar = document.getElementById('budget-bar');
const budgetLegend = document.getElementById('budget-legend');

const elInterestsBreakdown = document.getElementById('interests-breakdown');
const elFinalTags = document.getElementById('final-summary-tags');

const btnSave = document.getElementById('btn-save');
const btnEdit = document.getElementById('btn-edit');
const btnReset = document.getElementById('btn-reset');

// 3. INITIALIZATION
function init() {
  const saved = localStorage.getItem('dastaanTrip');
  if (!saved) {
    window.location.href = '../page2/page2.html';
    return;
  }
  
  try {
    dastaanTrip = JSON.parse(saved);
    if (!dastaanTrip.destination) throw new Error("No destination");
  } catch(e) {
    window.location.href = '../page2/page2.html';
    return;
  }
  
  renderAll();
  setupEvents();
}

function getItineraryData() {
  const id = dastaanTrip.destination.id || 'default';
  return mockItineraries[id] || mockItineraries['default'];
}

// 4. RENDERING
function renderAll() {
  const data = getItineraryData();
  
  // Hero
  elHeroBgImg.src = data.image || dastaanTrip.destination.image;
  elHeroDestName.textContent = dastaanTrip.destination.name;
  elHeroMeta.innerHTML = `${dastaanTrip.destination.country || data.country} &middot; ${dastaanTrip.duration} DAYS &middot; ?${dastaanTrip.budget.toLocaleString()}`;
  
  let descString = `A ${dastaanTrip.travelStyle.toLowerCase()} journey`;
  if (dastaanTrip.interests.length > 0) {
    descString += ` exploring ${dastaanTrip.interests.join(', ').toLowerCase()}`;
  }
  descString += ` in ${dastaanTrip.destination.name}.`;
  elHeroDesc.textContent = descString;

  // Glance
  elGlanceDur.textContent = `${dastaanTrip.duration} DAYS`;
  elGlanceBud.textContent = `?${dastaanTrip.budget.toLocaleString()}`;
  elGlanceIntCount.textContent = dastaanTrip.interests.length;
  elGlanceIntList.textContent = dastaanTrip.interests.length > 0 ? dastaanTrip.interests.join(' · ') : 'None';
  elGlanceStyle.textContent = dastaanTrip.travelStyle;

  // Itinerary Header
  elItineraryTitle.textContent = `YOUR JOURNEY THROUGH ${dastaanTrip.destination.name.toUpperCase()}`;

  // Build Day Selector
  elDaySelector.innerHTML = '';
  // Generate mock days up to duration
  const daysToRender = Math.min(dastaanTrip.duration, 7); // Cap for demo
  for(let i=1; i<=daysToRender; i++) {
    const btn = document.createElement('button');
    btn.className = `day-btn ${i===1 ? 'active':''}`;
    btn.textContent = `DAY ${String(i).padStart(2, '0')}`;
    btn.onclick = () => selectDay(i, data, btn);
    elDaySelector.appendChild(btn);
  }
  
  // Load Day 1
  selectDay(1, data, elDaySelector.firstChild);

  // Routing Stats (Mocked based on style/duration)
  const multiplier = dastaanTrip.travelStyle === 'Packed' ? 1.5 : (dastaanTrip.travelStyle === 'Relaxed' ? 0.7 : 1);
  statPlaces.textContent = Math.round(4 * multiplier * dastaanTrip.duration);
  statMovement.textContent = `${Math.round(3.5 * multiplier * dastaanTrip.duration)} km`;
  statSaved.textContent = `${Math.round(45 * multiplier)} min`;

  // Budget
  renderBudget();

  // Interests
  elInterestsBreakdown.innerHTML = '';
  if (dastaanTrip.interests.length === 0) {
    elInterestsBreakdown.innerHTML = '<p>No specific interests selected. We generated a balanced, general-purpose itinerary.</p>';
  } else {
    dastaanTrip.interests.forEach(int => {
      const div = document.createElement('div');
      div.className = 'interest-block';
      div.innerHTML = `<h4>${int}</h4><p>${interestExplanations[int] || 'Tailored to your preferences.'}</p>`;
      elInterestsBreakdown.appendChild(div);
    });
  }

  // Final Summary Tags
  elFinalTags.innerHTML = `
    <span class="final-tag">${dastaanTrip.destination.name}</span>
    <span class="final-tag">${dastaanTrip.duration} Days</span>
    <span class="final-tag">?${dastaanTrip.budget.toLocaleString()}</span>
    <span class="final-tag">${dastaanTrip.travelStyle} Pace</span>
  `;
}

function selectDay(dayNum, data, btnEl) {
  // Update buttons
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');

  // Get data (loop mock days if duration > mock data length)
  const sourceDays = data.days;
  const dayData = sourceDays[(dayNum - 1) % sourceDays.length];

  elTimelineContainer.innerHTML = '';
  
  dayData.forEach((act, idx) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.style.animationDelay = `${idx * 0.1}s`;
    
    item.innerHTML = `
      <div class="timeline-time">${act.time}</div>
      <div class="timeline-content">
        <h3>${act.title}</h3>
        <p class="timeline-desc">${act.desc}</p>
        <span class="timeline-cat">${act.cat}</span>
      </div>
    `;
    elTimelineContainer.appendChild(item);
  });
}

function renderBudget() {
  budgetTotal.textContent = `?${dastaanTrip.budget.toLocaleString()}`;
  
  // Fake breakdown percentages
  const breakdown = [
    { name: 'Accommodation', pct: 40, color: '#D6B56D' },
    { name: 'Food', pct: 25, color: '#C87955' },
    { name: 'Transport', pct: 15, color: '#F4EFE3' },
    { name: 'Activities', pct: 15, color: '#85968F' },
    { name: 'Buffer', pct: 5, color: 'rgba(244,239,227,0.2)' }
  ];

  budgetBar.innerHTML = '';
  budgetLegend.innerHTML = '';

  breakdown.forEach(item => {
    // Bar segment
    const seg = document.createElement('div');
    seg.className = 'budget-segment';
    seg.style.width = `${item.pct}%`;
    seg.style.backgroundColor = item.color;
    budgetBar.appendChild(seg);
    
    // Legend
    const val = Math.round(dastaanTrip.budget * (item.pct / 100));
    const leg = document.createElement('div');
    leg.className = 'legend-item';
    leg.innerHTML = `
      <div class="legend-color" style="background-color: ${item.color}"></div>
      <span>${item.name} &middot; ?${val.toLocaleString()}</span>
    `;
    budgetLegend.appendChild(leg);
  });
}

// 5. EVENTS
function setupEvents() {
  btnScrollDown.onclick = () => {
    document.getElementById('glance-section').scrollIntoView({ behavior: 'smooth' });
  };
  
  btnSave.onclick = () => {
    localStorage.setItem('dastaanSavedJourney', JSON.stringify(dastaanTrip));
    btnSave.textContent = "? SAVED TO MY JOURNEY";
    btnSave.style.background = "var(--paper)";
    btnSave.style.color = "var(--primary-deep)";
  };

  btnEdit.onclick = () => {
    // dastaanTrip remains in localStorage, page2 will pick it up
    window.location.href = '../page2/page2.html';
  };

  btnReset.onclick = () => {
    localStorage.removeItem('dastaanTrip');
    window.location.href = '../page2/page2.html';
  };
}

document.addEventListener('DOMContentLoaded', init);
