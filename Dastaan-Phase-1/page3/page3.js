/**
 * DASTAAN - ITINERARY PAGE (PAGE 3) LOGIC V2
 * Premium Travel Journal Experience
 */

let dastaanTrip = null;

// IMAGE MAPPING DICTIONARY FOR LOCAL ASSETS
const localImageMap = {
  // Destinations
  "manali": "../images/manali/rohtangpass.jpg",
  "new delhi": "../images/newdelhi/indiagate.jpg",
  "new-delhi": "../images/newdelhi/indiagate.jpg",
  "jaipur": "../images/jaipur/amerfortandasheeshmahal.jpg",
  "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80",
  "mostar": "https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80",
  "florence": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80",
  "istanbul": "https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80",

  // New Delhi Activities
  "humayun's tomb": "../images/newdelhi/Humayun's Tomb.jpg",
  "humayun tomb": "../images/newdelhi/Humayun's Tomb.jpg",
  "chandni chowk food walk": "../images/newdelhi/chandnichowkfood.jpg",
  "chandni chowk": "../images/newdelhi/chandnichowkfood.jpg",
  "india gate & kartavya path": "../images/newdelhi/indiagate.jpg",
  "india gate": "../images/newdelhi/indiagate.jpg",
  "qutub minar complex": "../images/newdelhi/qutubminar.jpg",
  "qutub minar": "../images/newdelhi/qutubminar.jpg",
  "lodhi art district": "../images/newdelhi/lodhiart.jpg",
  "lodhi art": "../images/newdelhi/lodhiart.jpg",
  "hauz khas village sunset": "../images/newdelhi/sunsethauzkhas.jpg",
  "hauz khas": "../images/newdelhi/sunsethauzkhas.jpg",

  // Jaipur Activities
  "amer fort & sheesh mahal": "../images/jaipur/amerfortandasheeshmahal.jpg",
  "amer fort": "../images/jaipur/amerfortandasheeshmahal.jpg",
  "hawa mahal (palace of winds)": "../images/jaipur/hawamahal.jpg",
  "hawa mahal": "../images/jaipur/hawamahal.jpg",
  "johari bazaar crafts": "../images/jaipur/joharibazaar.jpg",
  "johari bazaar": "../images/jaipur/joharibazaar.jpg",
  "jal mahal (water palace)": "../images/jaipur/jalmahal.jpg",
  "jal mahal": "../images/jaipur/jalmahal.jpg",
  "albert hall museum": "../images/jaipur/albert museum.jpg",
  "albert museum": "../images/jaipur/albert museum.jpg",
  "nahargarh fort sunset": "../images/jaipur/nahargarhfort.jpg",
  "nahargarh fort": "../images/jaipur/nahargarhfort.jpg",

  // Manali Activities
  "hadimba temple": "../images/manali/hadimbatemple.jpg",
  "jogini waterfall trek": "../images/manali/joginiwaterfall.jpg",
  "jogini waterfall": "../images/manali/joginiwaterfall.jpg",
  "mall road exploration": "../images/manali/mallroad.jpg",
  "mall road": "../images/manali/mallroad.jpg",
  "solang valley": "../images/manali/sollangvalley.jpg",
  "rohtang pass": "../images/manali/rohtangpass.jpg",
  "manikaran hot springs": "../images/manali/manikaran.jpg",
  "manikaran": "../images/manali/manikaran.jpg"
};

const interestImages = {
  'History': "../images/newdelhi/Humayun's Tomb.jpg",
  'Food': "../images/newdelhi/chandnichowkfood.jpg",
  'Culture': "../images/jaipur/hawamahal.jpg",
  'Art': "../images/newdelhi/lodhiart.jpg",
  'Nature': "../images/manali/joginiwaterfall.jpg",
  'Shopping': "../images/jaipur/joharibazaar.jpg",
  'Adventure': "../images/manali/sollangvalley.jpg",
  'Nightlife': "../images/newdelhi/sunsethauzkhas.jpg"
};

// CURATED DESTINATION & ITINERARY DATASET
const mockItineraries = {
  'manali': {
    name: 'Manali',
    country: 'India',
    image: '../images/manali/rohtangpass.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'SACRED FORESTS & MOUNTAIN TRAILS',
        activities: [
          { time: '09:00', title: 'Hadimba Temple', desc: 'Visit the ancient pagoda-style wooden temple sheltered among towering cedar pine forests.', cat: 'CULTURE', imageLabel: 'HADIMBA TEMPLE · CULTURE', image: '../images/manali/hadimbatemple.jpg', layout: 'image-right' },
          { time: '12:30', title: 'Jogini Waterfall Trek', desc: 'Scenic trek through pine trails to sacred cascading mountain waterfalls.', cat: 'NATURE', imageLabel: 'JOGINI WATERFALL · NATURE', image: '../images/manali/joginiwaterfall.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Mall Road Exploration', desc: 'Stroll through the lively street market for Kullu shawls, local cafes, and hot street food.', cat: 'SHOPPING', imageLabel: 'MALL ROAD · SHOPPING', image: '../images/manali/mallroad.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'HIGH PASS ADVENTURES & SPRINGS',
        activities: [
          { time: '09:00', title: 'Solang Valley', desc: 'Experience thrilling paragliding, ropeway rides, and snow valley panoramas.', cat: 'ADVENTURE', imageLabel: 'SOLANG VALLEY · ADVENTURE', image: '../images/manali/sollangvalley.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Rohtang Pass', desc: 'Ascend 13,000 ft to breathtaking glacier vistas and snow-capped Himalayan peaks.', cat: 'NATURE', imageLabel: 'ROHTANG PASS · NATURE', image: '../images/manali/rohtangpass.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Manikaran Hot Springs', desc: 'Rejuvenate in natural thermal hot springs beside the rushing Parvati River.', cat: 'RELAX', imageLabel: 'MANIKARAN HOT SPRINGS · RELAX', image: '../images/manali/manikaran.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'new-delhi': {
    name: 'New Delhi',
    country: 'India',
    image: '../images/newdelhi/indiagate.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'MUGHAL HERITAGE & IMPERIAL AXIS',
        activities: [
          { time: '09:00', title: "Humayun's Tomb", desc: 'Explore the grand red sandstone Mughal garden tomb that inspired the Taj Mahal.', cat: 'CULTURE', imageLabel: "HUMAYUN TOMB · CULTURE", image: "../images/newdelhi/Humayun's Tomb.jpg", layout: 'image-right' },
          { time: '13:00', title: 'Chandni Chowk Food Walk', desc: 'Dive into Old Delhi\'s bustling lanes for legendary paranthas, jalebis, chaat, and spices.', cat: 'FOOD', imageLabel: 'CHANDNI CHOWK · FOOD', image: '../images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '17:00', title: 'India Gate & Kartavya Path', desc: 'Evening stroll along the ceremonial boulevard under warm golden floodlights.', cat: 'CULTURE', imageLabel: 'INDIA GATE · CULTURE', image: '../images/newdelhi/indiagate.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'ANCIENT SANCTUARIES & MODERN ART',
        activities: [
          { time: '09:30', title: 'Qutub Minar Complex', desc: 'Walk among ancient 12th-century stone minarets and intricate carved sandstone pillars.', cat: 'HISTORY', imageLabel: 'QUTUB MINAR · HISTORY', image: '../images/newdelhi/qutubminar.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Lodhi Art District', desc: 'Discover vibrant open-air street murals created by global urban artists.', cat: 'ART', imageLabel: 'LODHI ART DISTRICT · ART', image: '../images/newdelhi/lodhiart.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Hauz Khas Village Sunset', desc: 'Relax by medieval reservoir ruins surrounded by trendy boutiques and rooftop cafes.', cat: 'RELAX', imageLabel: 'HAUZ KHAS LAKE · RELAX', image: '../images/newdelhi/sunsethauzkhas.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'jaipur': {
    name: 'Jaipur',
    country: 'India',
    image: '../images/jaipur/amerfortandasheeshmahal.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'ROYAL PALACES & PINK CITY BAZAARS',
        activities: [
          { time: '09:00', title: 'Amer Fort & Sheesh Mahal', desc: 'Ascend the hilltop fortress to admire mirror palace craft and royal courtyards.', cat: 'HISTORY', imageLabel: 'AMER FORT · HISTORY', image: '../images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Hawa Mahal (Palace of Winds)', desc: 'Marvel at the 953 honeycomb lattice windows designed for royal court ladies.', cat: 'CULTURE', imageLabel: 'HAWA MAHAL · CULTURE', image: '../images/jaipur/hawamahal.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Johari Bazaar Crafts', desc: 'Shop traditional block-printed textiles, silver jewelry, and famous Jaipur handicrafts.', cat: 'SHOPPING', imageLabel: 'JOHARI BAZAAR · SHOPPING', image: '../images/jaipur/joharibazaar.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'FORTRESS VISTAS & HERITAGE MUSEUMS',
        activities: [
          { time: '09:00', title: 'Jal Mahal (Water Palace)', desc: 'Admire the peaceful palace floating gracefully in the middle of Man Sagar Lake.', cat: 'CULTURE', imageLabel: 'JAL MAHAL · CULTURE', image: '../images/jaipur/jalmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Albert Hall Museum', desc: 'Explore Indo-Saracenic architecture showcasing ancient Rajasthani artifacts and paintings.', cat: 'ART', imageLabel: 'ALBERT HALL · ART', image: '../images/jaipur/albert museum.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Nahargarh Fort Sunset', desc: 'Watch the golden sun dip below the Aravalli hills with panoramic views over the Pink City.', cat: 'RELAX', imageLabel: 'NAHARGARH FORT · RELAX', image: '../images/jaipur/nahargarhfort.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'kyoto': {
    name: 'Kyoto',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'ARRIVAL & OLD KYOTO',
        activities: [
          { time: '09:00', title: 'Fushimi Inari Shrine', desc: 'Walk through the iconic thousands of vermilion torii gates before the crowds arrive.', cat: 'CULTURE', imageLabel: 'FUSHIMI INARI SHRINE · CULTURE', image: '../images/image1.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Nishiki Market', desc: 'Explore Kyoto\'s historic kitchen market and sample fresh local delicacies and street food.', cat: 'FOOD', imageLabel: 'NISHIKI MARKET · FOOD', image: '../images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Gion District', desc: 'Stroll through preserved wooden machiya houses as traditional lanterns illuminate the streets.', cat: 'HISTORY', imageLabel: 'GION HISTORIC DISTRICT · HISTORY', image: '../images/image2.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'BAMBOO GROVES & ZEN GARDENS',
        activities: [
          { time: '08:30', title: 'Arashiyama Bamboo Grove', desc: 'Immerse in the towering green stalks of Arashiyama in the quiet morning light.', cat: 'NATURE', imageLabel: 'ARASHIYAMA BAMBOO GROVE · NATURE', image: '../images/image3.jpg', layout: 'image-right' },
          { time: '12:00', title: 'Tenryu-ji Temple', desc: 'Marvel at UNESCO World Heritage Zen landscaping framed by mountain silhouettes.', cat: 'CULTURE', imageLabel: 'TENRYU-JI TEMPLE · CULTURE', image: '../images/image4.jpg', layout: 'image-left' },
          { time: '15:30', title: 'Okochi Sanso Villa', desc: 'Relax at a samurai actor\'s estate with hot ceremonial matcha and panoramic valley views.', cat: 'RELAX', imageLabel: 'OKOCHI SANSO VILLA · RELAX', image: '../images/manali/sollangvalley.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'mostar': {
    name: 'Mostar',
    country: 'Bosnia & Herzegovina',
    image: 'https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'OLD BRIDGE & BAZAAR',
        activities: [
          { time: '09:30', title: 'Stari Most (Old Bridge)', desc: 'Witness the iconic Ottoman arch bridge spanning the turquoise Neretva River.', cat: 'HISTORY', imageLabel: 'STARI MOST · HISTORY', image: '../images/image4.jpg', layout: 'image-right' },
          { time: '12:30', title: 'Kujundziluk Old Bazaar', desc: 'Browse handcrafted copperware, traditional lamps, and authentic Bosnian coffee sets.', cat: 'SHOPPING', imageLabel: 'OLD BAZAAR · SHOPPING', image: '../images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Koski Mehmed Pasha Mosque', desc: 'Climb the minaret for breathtaking panoramic vistas over Mostar\'s stone rooftops.', cat: 'CULTURE', imageLabel: 'KOSKI MOSQUE · CULTURE', image: '../images/image2.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'florence': {
    name: 'Florence',
    country: 'Italy',
    image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'RENAISSANCE MASTERPIECES',
        activities: [
          { time: '09:00', title: 'Duomo di Milano & Brunelleschi Dome', desc: 'Ascend the terracotta dome for unrivaled views over Tuscan red tile roofs.', cat: 'CULTURE', imageLabel: 'FLORENCE DUOMO · CULTURE', image: '../images/image3.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Mercato Centrale Lunch', desc: 'Savor fresh truffle pasta, artisanal cheeses, and Tuscan Chianti wines.', cat: 'FOOD', imageLabel: 'MERCATO CENTRALE · FOOD', image: '../images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Uffizi Gallery Exploration', desc: 'Admire iconic Renaissance masterpieces by Botticelli, da Vinci, and Michelangelo.', cat: 'ART', imageLabel: 'UFFIZI GALLERY · ART', image: '../images/newdelhi/lodhiart.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'istanbul': {
    name: 'Istanbul',
    country: 'Turkey',
    image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'TWO CONTINENTS & EMPIRES',
        activities: [
          { time: '09:00', title: 'Hagia Sophia & Blue Mosque', desc: 'Step inside timeless Byzantine domes and magnificent Iznik tile sanctuary walls.', cat: 'HISTORY', imageLabel: 'HAGIA SOPHIA · HISTORY', image: '../images/image4.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Grand Bazaar & Spice Market', desc: 'Immense sensory journey through aromatic spices, Turkish delight, and ceramics.', cat: 'SHOPPING', imageLabel: 'GRAND BAZAAR · SHOPPING', image: '../images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Bosphorus Sunset Cruise', desc: 'Sail between Europe and Asia as palaces and minarets glow against the sunset skyline.', cat: 'CULTURE', imageLabel: 'BOSPHORUS CRUISE · CULTURE', image: '../images/image2.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'default': {
    name: 'Destination Escapes',
    country: 'World',
    image: '../images/newdelhi/indiagate.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'HISTORIC CENTER & FLAVORS',
        activities: [
          { time: '09:30', title: 'Historic Old Town Walk', desc: 'Discover central architectural monuments, cobblestone plazas, and local heritage.', cat: 'CULTURE', imageLabel: 'OLD TOWN WALK · CULTURE', image: '../images/newdelhi/Humayun\'s Tomb.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Artisanal Culinary Tasting', desc: 'Sample regional culinary specialties and handcrafted traditional dishes.', cat: 'FOOD', imageLabel: 'CULINARY TASTING · FOOD', image: '../images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Scenic Outlook & Sunset', desc: 'Unwind with panoramic city views as evening lights illuminate the horizon.', cat: 'NATURE', imageLabel: 'SCENIC OUTLOOK · NATURE', image: '../images/manali/sollangvalley.jpg', layout: 'image-right' }
        ]
      }
    ]
  }
};

const interestExplanations = {
  'History': 'Historic districts, UNESCO heritage sites, and centuries-old landmarks have been prioritized in your daily route.',
  'Food': 'Authentic street markets, local culinary workshops, and renowned dining spots are woven into your schedule.',
  'Nature': 'Botanical gardens, scenic lookouts, and tranquil outdoor escapes offer peaceful breaks throughout your journey.',
  'Culture': 'Local artisan workshops, traditional performances, and sacred architecture are central to your daily path.',
  'Shopping': 'Boutique artisan alleys, craft bazaars, and local designer markets are allocated dedicated exploration time.',
  'Art': 'Contemporary art galleries, open-air street murals, and design hubs enrich your sightseeing schedule.',
  'Adventure': 'Active walking routes, panoramic climbs, and exhilarating outdoor pursuits keep your journey dynamic.',
  'Nightlife': 'Illuminated night markets, atmospheric riverfront lounges, and evening strolls complete your nights.'
};

// DOM ELEMENTS
const elHeroBgImg = document.getElementById('hero-bg-img');
const elHeroPlaceholderBadge = document.getElementById('hero-placeholder-badge');
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
const elJournalDayNum = document.getElementById('journal-day-num');
const elJournalDayTitle = document.getElementById('journal-day-title');
const elTimelineContainer = document.getElementById('timeline-container');

const statPlaces = document.getElementById('stat-places');
const statMovement = document.getElementById('stat-movement');
const statSaved = document.getElementById('stat-saved');
const routeSvgCanvas = document.getElementById('route-svg-canvas');

const budgetTotal = document.getElementById('budget-total');
const budgetBar = document.getElementById('budget-bar');
const budgetTooltip = document.getElementById('budget-tooltip');
const budgetGrid = document.getElementById('budget-grid');
const budgetInsightText = document.getElementById('budget-insight-text');

const elInterestsBreakdown = document.getElementById('interests-breakdown');
const elPersonalizationBadges = document.getElementById('personalization-badges');

const elFinalBgImg = document.getElementById('final-bg-img');
const elFinalPlaceholderBadge = document.getElementById('final-placeholder-badge');
const elFinalDestSummary = document.getElementById('final-dest-summary');
const btnSave = document.getElementById('btn-save');
const btnEdit = document.getElementById('btn-edit');
const btnReset = document.getElementById('btn-reset');
const saveToast = document.getElementById('save-toast');

// LIGHTBOX MODAL ELEMENTS
const elLightboxModal = document.getElementById('lightbox-modal');
const elLightboxBackdrop = document.getElementById('lightbox-backdrop');
const elLightboxClose = document.getElementById('lightbox-close');
const elLightboxImg = document.getElementById('lightbox-img');
const elLightboxPlaceholder = document.getElementById('lightbox-placeholder');
const elLightboxPlaceholderText = document.getElementById('lightbox-placeholder-text');
const elLightboxCat = document.getElementById('lightbox-cat');
const elLightboxDestBadge = document.getElementById('lightbox-dest-badge');
const elLightboxTitle = document.getElementById('lightbox-title');
const elLightboxDesc = document.getElementById('lightbox-desc');

// INITIALIZATION
function init() {
  const saved = localStorage.getItem('dastaanTrip');
  if (!saved) {
    window.location.href = '../page2/page2.html';
    return;
  }
  
  try {
    dastaanTrip = JSON.parse(saved);
    if (!dastaanTrip.destination) throw new Error("No destination in dastaanTrip");
  } catch(e) {
    window.location.href = '../page2/page2.html';
    return;
  }
  
  renderAll();
  setupEvents();
  setupScrollReveals();
}

function getItineraryData() {
  const destId = dastaanTrip.destination.id || 'default';
  return mockItineraries[destId] || mockItineraries['default'];
}

function getResolvedImage(keyOrTitle, providedImage) {
  const k = (keyOrTitle || '').toLowerCase().trim();
  if (localImageMap[k]) {
    return localImageMap[k];
  }
  if (providedImage && (providedImage.startsWith('../images/') || providedImage.startsWith('images/'))) {
    return providedImage;
  }
  return providedImage || '';
}

// LIGHTBOX FUNCTIONS
function openLightbox(title, desc, cat, imgSrc, imgLabel) {
  elLightboxTitle.textContent = title;
  elLightboxDesc.textContent = desc || '';
  elLightboxCat.textContent = cat || 'EXPLORE';
  elLightboxDestBadge.textContent = dastaanTrip.destination ? dastaanTrip.destination.name.toUpperCase() : 'DESTINATION';

  if (imgSrc) {
    elLightboxImg.src = imgSrc;
    elLightboxImg.style.display = 'block';
    elLightboxPlaceholder.style.display = 'none';
  } else {
    elLightboxImg.style.display = 'none';
    elLightboxPlaceholder.style.display = 'flex';
    elLightboxPlaceholderText.textContent = `[ ${imgLabel || title.toUpperCase()} ]`;
  }

  elLightboxModal.classList.add('active');
  elLightboxModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  elLightboxModal.classList.remove('active');
  elLightboxModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function setImgSrcWithLoadedCheck(imgEl, src) {
  if (!imgEl || !src) return;
  imgEl.src = src;
  if (imgEl.complete && imgEl.naturalWidth > 0) {
    imgEl.classList.add('loaded');
  } else {
    imgEl.onload = () => imgEl.classList.add('loaded');
  }
}

// RENDER ALL SECTIONS
function renderAll() {
  const data = getItineraryData();
  const destName = dastaanTrip.destination.name.toUpperCase();
  const destId = (dastaanTrip.destination.id || '').toLowerCase();
  const countryName = (dastaanTrip.destination.country || data.country || 'India').toUpperCase();
  const formattedBudget = '&#8377;' + dastaanTrip.budget.toLocaleString();

  // 1. HERO
  elHeroDestName.textContent = destName;
  elHeroMeta.innerHTML = countryName + ' &bull; ' + dastaanTrip.duration + ' DAYS &bull; ' + formattedBudget;
  elHeroPlaceholderBadge.textContent = '[ ' + destName + ' DESTINATION IMAGE ]';
  
  const heroImgSrc = getResolvedImage(destId, getResolvedImage(destName, dastaanTrip.destination.image || data.image));
  if (heroImgSrc) {
    setImgSrcWithLoadedCheck(elHeroBgImg, heroImgSrc);
  }

  // Dynamic Tagline
  let tagline = 'A ' + dastaanTrip.travelStyle.toLowerCase() + ' journey';
  if (dastaanTrip.interests.length > 0) {
    tagline += ' through ' + dastaanTrip.destination.name + '\'s ' + dastaanTrip.interests.join(', ').toLowerCase();
  } else {
    tagline += ' through ' + dastaanTrip.destination.name + '\'s cultural landmarks and local escapes';
  }
  tagline += '.';
  elHeroDesc.textContent = '"' + tagline + '"';

  // 2. TRIP AT A GLANCE
  elGlanceDur.textContent = String(dastaanTrip.duration).padStart(2, '0');
  elGlanceBud.innerHTML = formattedBudget;
  elGlanceIntCount.textContent = String(dastaanTrip.interests.length).padStart(2, '0');
  elGlanceStyle.textContent = dastaanTrip.travelStyle.toUpperCase();
  
  if (dastaanTrip.interests.length > 0) {
    elGlanceIntList.innerHTML = dastaanTrip.interests.map(i => i.toUpperCase()).join(' &bull; ');
  } else {
    elGlanceIntList.innerHTML = 'BALANCED &bull; CURATED &bull; PERSONALIZED';
  }

  // 3. ITINERARY INTRO & DAY SELECTOR
  elItineraryTitle.textContent = 'YOUR JOURNEY THROUGH ' + destName;
  renderDaySelector(data);

  // 4. BUDGET
  renderBudget();

  // 5. BUILT AROUND YOU
  renderBuiltAround();

  // 6. FINAL CTA BACKDROP & SUMMARY
  elFinalDestSummary.innerHTML = destName + ' &bull; ' + dastaanTrip.duration + ' DAYS &bull; ' + formattedBudget;
  elFinalPlaceholderBadge.textContent = '[ ' + destName + ' CINEMATIC BACKDROP ]';
  if (heroImgSrc) {
    setImgSrcWithLoadedCheck(elFinalBgImg, heroImgSrc);
  }
}

// DAY SELECTOR & TIMELINE
function renderDaySelector(data) {
  elDaySelector.innerHTML = '';
  const totalDays = Math.max(1, dastaanTrip.duration);
  
  for (let i = 1; i <= totalDays; i++) {
    const btn = document.createElement('button');
    btn.className = 'day-btn ' + (i === 1 ? 'active' : '');
    btn.textContent = 'DAY ' + String(i).padStart(2, '0');
    btn.onclick = () => selectDay(i, data, btn);
    elDaySelector.appendChild(btn);
  }

  selectDay(1, data, elDaySelector.firstChild);
}

function selectDay(dayNum, data, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const daysList = data.days;
  const currentDayData = daysList[(dayNum - 1) % daysList.length];

  elJournalDayNum.textContent = 'DAY ' + String(dayNum).padStart(2, '0');
  elJournalDayTitle.textContent = currentDayData.dayTitle || ('EXPLORING ' + dastaanTrip.destination.name.toUpperCase());

  // Timeline Activity Cards
  elTimelineContainer.innerHTML = '';
  
  currentDayData.activities.forEach((act, idx) => {
    const layoutClass = act.layout || (idx % 2 === 0 ? 'image-right' : 'image-left');
    const item = document.createElement('div');
    item.className = 'activity-card-row ' + layoutClass;
    item.style.animationDelay = (idx * 0.1) + 's';

    const imgLabel = act.imageLabel || (act.title.toUpperCase() + ' · ' + act.cat);
    const actImgSrc = getResolvedImage(act.title, act.image);

    const imgTag = actImgSrc ? `<img src="${actImgSrc}" alt="${act.title}" class="activity-img-element" onload="this.classList.add('loaded')" onerror="this.style.display='none'" />` : '';

    item.innerHTML = `
      <div class="activity-time-col">
        <span class="activity-time-text">${act.time}</span>
      </div>
      <div class="activity-main-content">
        <div class="activity-text-box">
          <h4>${act.title}</h4>
          <p class="activity-desc">${act.desc}</p>
          <span class="activity-cat-tag">${act.cat}</span>
        </div>
        <div class="activity-image-wrap image-placeholder" style="cursor:pointer;" title="Click to view full image">
          ${imgTag}
          <div class="placeholder-overlay">
            <span class="placeholder-badge">[ ${imgLabel} ]</span>
          </div>
          <div class="view-place-badge">VIEW PLACE</div>
        </div>
      </div>
    `;

    // Click on image opens full Lightbox Modal
    const imgWrap = item.querySelector('.activity-image-wrap');
    imgWrap.onclick = () => {
      openLightbox(act.title, act.desc, act.cat, actImgSrc, imgLabel);
    };

    elTimelineContainer.appendChild(item);
  });

  // Render SVG Route for current day
  renderRoute(currentDayData.activities);
}

// SVG ROUTE VISUALIZATION
function renderRoute(activities) {
  const multiplier = dastaanTrip.travelStyle === 'Packed' ? 1.4 : (dastaanTrip.travelStyle === 'Relaxed' ? 0.7 : 1);
  const placesCount = Math.round(activities.length * dastaanTrip.duration);
  const movementKm = Math.round(3.2 * multiplier * dastaanTrip.duration);
  const timeSavedMin = Math.round(45 * multiplier);

  statPlaces.textContent = placesCount;
  statMovement.textContent = movementKm + ' KM';
  statSaved.textContent = timeSavedMin + ' MIN';

  const nodeNames = ['START', ...activities.map(a => a.title), 'END'];
  const nodeCount = nodeNames.length;
  
  let svgHTML = '<svg width="100%" height="160" viewBox="0 0 800 160" fill="none" xmlns="http://www.w3.org/2000/svg">';
  
  const startX = 60;
  const endX = 740;
  const step = (endX - startX) / (nodeCount - 1);
  
  let pathD = 'M ' + startX + ' 80';
  const points = [];

  for (let i = 0; i < nodeCount; i++) {
    const x = startX + i * step;
    const y = 80 + (i % 2 === 1 ? -25 : 25);
    points.push({ x, y, name: nodeNames[i] });
    if (i > 0) {
      const prev = points[i - 1];
      const cx1 = prev.x + step / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + step / 2;
      const cy2 = y;
      pathD += ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + x + ' ' + y;
    }
  }

  svgHTML += '<path d="' + pathD + '" stroke="#D6B56D" stroke-width="3" stroke-linecap="round" opacity="0.6" stroke-dasharray="6 6" />';
  svgHTML += '<path d="' + pathD + '" stroke="#D6B56D" stroke-width="2" stroke-linecap="round" opacity="0.9" />';

  points.forEach((pt, idx) => {
    const isEdge = idx === 0 || idx === points.length - 1;
    const r = isEdge ? 7 : 9;
    const color = isEdge ? '#C87955' : '#D6B56D';
    
    svgHTML += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + (r + 4) + '" fill="#071D1A" stroke="' + color + '" stroke-width="1.5" opacity="0.8" />';
    svgHTML += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + r + '" fill="' + color + '" />';
    
    const textY = pt.y > 80 ? pt.y + 24 : pt.y - 16;
    const shortLabel = pt.name.length > 14 ? pt.name.substring(0, 12) + '...' : pt.name;
    svgHTML += '<text x="' + pt.x + '" y="' + textY + '" text-anchor="middle" fill="#F4EFE3" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="1">' + shortLabel.toUpperCase() + '</text>';
  });

  svgHTML += '</svg>';
  routeSvgCanvas.innerHTML = svgHTML;
}

// BUDGET SECTION REDESIGN
function renderBudget() {
  const total = dastaanTrip.budget;
  budgetTotal.innerHTML = '&#8377;' + total.toLocaleString();

  const breakdown = [
    { name: 'Accommodation', pct: 40, color: '#D6B56D' },
    { name: 'Food', pct: 25, color: '#C87955' },
    { name: 'Transport', pct: 15, color: '#7F9087' },
    { name: 'Activities', pct: 15, color: '#F4EFE3' },
    { name: 'Buffer', pct: 5, color: 'rgba(214, 181, 109, 0.35)' }
  ];

  budgetBar.innerHTML = '';
  budgetGrid.innerHTML = '';

  breakdown.forEach(item => {
    const segmentVal = Math.round(total * (item.pct / 100));
    
    const seg = document.createElement('div');
    seg.className = 'budget-segment';
    seg.style.width = item.pct + '%';
    seg.style.backgroundColor = item.color;
    
    seg.onmouseenter = (e) => {
      budgetTooltip.textContent = item.name + ' · ' + item.pct + '% · ₹' + segmentVal.toLocaleString();
      budgetTooltip.classList.add('active');
    };
    seg.onmousemove = (e) => {
      const rect = budgetBar.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      budgetTooltip.style.left = offset + 'px';
    };
    seg.onmouseleave = () => {
      budgetTooltip.classList.remove('active');
    };

    budgetBar.appendChild(seg);

    const gridItem = document.createElement('div');
    gridItem.className = 'budget-grid-item';
    gridItem.innerHTML = `
      <div class="bg-item-name">
        <div class="bg-item-dot" style="background-color: ${item.color}"></div>
        <span>${item.name}</span>
      </div>
      <div class="bg-item-val">&#8377;${segmentVal.toLocaleString()}</div>
      <div class="bg-item-pct">${item.pct}%</div>
    `;
    budgetGrid.appendChild(gridItem);
  });

  const style = dastaanTrip.travelStyle;
  if (style === 'Relaxed') {
    budgetInsightText.textContent = '"More breathing room between experiences. Your relaxed travel style keeps the itinerary comfortable while staying within your selected budget."';
  } else if (style === 'Packed') {
    budgetInsightText.textContent = '"More experiences with less downtime. Your packed travel style maximizes every hour while staying within your selected budget."';
  } else {
    budgetInsightText.textContent = '"A comfortable mix of exploration and downtime. Your balanced travel style keeps the itinerary comfortable while staying within your selected budget."';
  }
}

// BUILT AROUND YOU (DYNAMIC INTEREST PANELS)
function renderBuiltAround() {
  elInterestsBreakdown.innerHTML = '';
  const selectedInterests = dastaanTrip.interests;
  const defaultFallbackImg = '../images/manali/rohtangpass.jpg';

  if (selectedInterests.length === 0) {
    const card = document.createElement('div');
    card.className = 'interest-panel-card';
    card.innerHTML = `
      <div class="interest-image-wrap image-placeholder" style="cursor:pointer;" title="Click to view full image">
        <img src="${defaultFallbackImg}" alt="Balanced Exploration" class="interest-img-element" onload="this.classList.add('loaded')" onerror="this.style.display='none'" />
        <div class="placeholder-overlay">
          <span class="placeholder-badge">[ BALANCED EXPLORATION IMAGE ]</span>
        </div>
        <div class="view-place-badge">VIEW PLACE</div>
      </div>
      <div class="interest-panel-body">
        <h4 class="interest-panel-title">BALANCED EXPLORATION</h4>
        <p class="interest-panel-desc">We curated a balanced mix of cultural landmarks, local cuisine, and relaxing walks tailored to your budget.</p>
      </div>
    `;
    const imgWrap = card.querySelector('.interest-image-wrap');
    imgWrap.onclick = () => {
      openLightbox('BALANCED EXPLORATION', 'We curated a balanced mix of cultural landmarks, local cuisine, and relaxing walks tailored to your budget.', 'PERSONALIZATION', defaultFallbackImg, 'BALANCED EXPLORATION IMAGE');
    };
    elInterestsBreakdown.appendChild(card);
  } else {
    selectedInterests.forEach(interest => {
      const card = document.createElement('div');
      card.className = 'interest-panel-card';
      const explanation = interestExplanations[interest] || 'Tailored to your personal travel preferences.';
      const intImgSrc = interestImages[interest] || defaultFallbackImg;
      
      card.innerHTML = `
        <div class="interest-image-wrap image-placeholder" style="cursor:pointer;" title="Click to view full image">
          <img src="${intImgSrc}" alt="${interest}" class="interest-img-element" onload="this.classList.add('loaded')" onerror="this.style.display='none'" />
          <div class="placeholder-overlay">
            <span class="placeholder-badge">[ ${interest.toUpperCase()} · INTEREST IMAGE ]</span>
          </div>
          <div class="view-place-badge">VIEW PLACE</div>
        </div>
        <div class="interest-panel-body">
          <h4 class="interest-panel-title">${interest}</h4>
          <p class="interest-panel-desc">${explanation}</p>
        </div>
      `;
      const imgWrap = card.querySelector('.interest-image-wrap');
      imgWrap.onclick = () => {
        openLightbox(interest, explanation, 'INTEREST', intImgSrc, `${interest.toUpperCase()} · INTEREST IMAGE`);
      };
      elInterestsBreakdown.appendChild(card);
    });
  }

  const formattedBudget = '&#8377;' + dastaanTrip.budget.toLocaleString();
  const interestsTag = selectedInterests.length > 0 ? selectedInterests.join(' &bull; ') : 'General';
  
  elPersonalizationBadges.innerHTML = `
    <span class="badge-tag-pill">${interestsTag}</span>
    <span class="badge-tag-pill">${dastaanTrip.travelStyle} Pace</span>
    <span class="badge-tag-pill">${dastaanTrip.duration} Days</span>
    <span class="badge-tag-pill">${formattedBudget}</span>
  `;
}

// EVENT LISTENERS & ACTIONS
function setupEvents() {
  btnScrollDown.onclick = () => {
    document.getElementById('glance-section').scrollIntoView({ behavior: 'smooth' });
  };

  btnSave.onclick = () => {
    localStorage.setItem('dastaanSavedJourney', JSON.stringify(dastaanTrip));
    btnSave.innerHTML = '<span>&#10003; JOURNEY SAVED</span>';
    btnSave.style.background = '#F4EFE3';
    btnSave.style.color = '#071D1A';
    
    saveToast.classList.add('active');
    document.getElementById('toast-sub').textContent = 'Your ' + dastaanTrip.destination.name + ' itinerary is saved to your account.';
    
    setTimeout(() => {
      saveToast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  btnEdit.onclick = () => {
    window.location.href = '../page2/page2.html';
  };

  btnReset.onclick = () => {
    localStorage.removeItem('dastaanTrip');
    localStorage.removeItem('dastaanSavedJourney');
    window.location.href = '../page2/page2.html';
  };

  // Lightbox Close Handlers
  if (elLightboxClose) elLightboxClose.onclick = closeLightbox;
  if (elLightboxBackdrop) elLightboxBackdrop.onclick = closeLightbox;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elLightboxModal && elLightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

// SCROLL REVEAL ANIMATIONS
function setupScrollReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', init);