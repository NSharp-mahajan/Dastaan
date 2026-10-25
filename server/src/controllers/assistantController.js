/**
 * Dastaan Conversational AI Travel Assistant Controller
 *
 * Implements a genuine context-aware conversational travel planning agent:
 *  - Natural multi-turn dialogue with intent recognition
 *  - Explicit conversation stages (collecting_preferences, clarifying, ready_for_confirmation, generating_itinerary, completed)
 *  - Context preservation across turns without resetting established parameters
 *  - Unambiguous total-trip budget semantics in INR
 *  - Knowledge-grounded answers for general travel and destination questions
 *  - Explicit confirmation requirement before generating any final itinerary
 */

import Trip from '../models/Trip.js';
import { callNvidiaChat } from '../services/nvidiaClient.js';
import {
  generateGroundedItinerary,
  buildBudgetBreakdown,
  calculateTripDates
} from '../services/itineraryService.js';
import generateItinerary, { destinationTemplates } from '../utils/itineraryGenerator.js';
import { verifyDestination, verifyDestinationAndPois } from '../services/groundingService.js';
import { validateItinerary } from '../services/validationService.js';

// In-flight itinerary generation lock to enforce single generation per session/trip
const activeItineraryGenerations = new Map();

export function getActiveGenerationsCount() {
  return activeItineraryGenerations.size;
}

export function clearActiveGenerations() {
  activeItineraryGenerations.clear();
}

// English words to numeric mapping for numbers 1 through 30
const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30
};

// Curated & popular travel destinations directly recognized
const POPULAR_DESTINATIONS = [
  { name: 'Bir', country: 'India' },
  { name: 'Bir-Billing', country: 'India' },
  { name: 'Spiti Valley', country: 'India' },
  { name: 'Spiti', country: 'India' },
  { name: 'Kasol', country: 'India' },
  { name: 'Goa', country: 'India' },
  { name: 'Udaipur', country: 'India' },
  { name: 'Shimla', country: 'India' },
  { name: 'Rishikesh', country: 'India' },
  { name: 'Varanasi', country: 'India' },
  { name: 'Munnar', country: 'India' },
  { name: 'Ladakh', country: 'India' },
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Kyoto', country: 'Japan' },
  { name: 'Rome', country: 'Italy' },
  { name: 'London', country: 'United Kingdom' },
  { name: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Bangkok', country: 'Thailand' },
  { name: 'Singapore', country: 'Singapore' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Amalfi', country: 'Italy' },
  { name: 'Santorini', country: 'Greece' },
  { name: 'Paris', country: 'France' },
  { name: 'Manali', country: 'India' },
  { name: 'Jaipur', country: 'India' },
  { name: 'New Delhi', country: 'India' }
];

// Dastaan supported interests patterns
const INTEREST_PATTERNS = {
  'Culture': /\b(?:culture|cultural|heritage|temple|palace|museum)\b/i,
  'History': /\b(?:history|historical|monument|fort)\b/i,
  'Food': /\b(?:food|culinary|cuisine|gastronomy|dishes|cafe|restaurant|street\s+food)\b/i,
  'Nature': /\b(?:nature|scenic|outdoor|mountains|valley|lake|river|forest)\b/i,
  'Art': /\b(?:art|artistic|museums?|galleries|crafts?)\b/i,
  'Shopping': /\b(?:shopping|markets?|bazaars?|souvenirs?)\b/i,
  'Adventure': /\b(?:adventure|treks?|trekking|hiking|paragliding|rafting|camp|camping)\b/i,
  'Nightlife': /\b(?:nightlife|lounges?|evening|party|bars?)\b/i
};

// Rich Destination Knowledge for conversational question answering & grounding
const DESTINATION_KNOWLEDGE = {
  spiti: {
    name: 'Spiti Valley',
    attractions: [
      'Key (Kee) Monastery (iconic 1,000-year-old whitewashed Tibetan Buddhist monastery at 4,166m)',
      'Chandratal Lake (sacred crescent-shaped high-altitude lake of vibrant turquoise waters at 4,250m)',
      'Dhankar Monastery & Fort (ancient cliff-hanging gompa perched high above the confluence of Spiti and Pin rivers)',
      'Hikkim Village (home to the world\'s highest post office at 4,400m where travelers mail vintage postcards)',
      'Komic Village (one of the world\'s highest motorable villages at 4,587m with Tangyud Monastery)',
      'Langza Village (fossil village beneath the majestic snow-capped Chau Chau Kang Nilda peak)',
      'Pin Valley National Park (dramatic high-altitude cold desert biosphere home to snow leopards and ibex)',
      'Tabo Monastery (founded in 996 CE, often called the "Ajanta of the Himalayas" for ancient murals)'
    ],
    food: [
      'Warm traditional Spitian butter tea (po cha) churned with yak butter and salt',
      'Freshly steamed Tingmo (fluffy Tibetan bread) and vegetable/chicken Momos with fiery chilli dip',
      'Hearty Tibetan Thukpa and Thenthuk noodle soups stewed in spiced mountain broth',
      'Tart and refreshing Seabuckthorn herbal berry tea'
    ],
    stays: [
      'Traditional Spitian mud homestays in Kaza, Langza, and Kibber with authentic local family warmth',
      'Riverside adventure campsites near Chandratal Lake with breathtaking Milky Way stargazing',
      'Backpacker lodges and hostels in Kaza main bazaar'
    ],
    startingPoints: 'Chandigarh or Shimla (via Kinnaur route - open year-round), or Manali (via Atal Tunnel and Kunzum Pass - open June to October).',
    bestTime: 'June to October for open high mountain passes, and December to February for thrilling winter snow expeditions.'
  },
  'spiti valley': {
    name: 'Spiti Valley',
    attractions: [
      'Key (Kee) Monastery (iconic 1,000-year-old whitewashed Tibetan Buddhist monastery at 4,166m)',
      'Chandratal Lake (sacred crescent-shaped high-altitude lake of vibrant turquoise waters at 4,250m)',
      'Dhankar Monastery & Fort (ancient cliff-hanging gompa perched high above the confluence of Spiti and Pin rivers)',
      'Hikkim Village (home to the world\'s highest post office at 4,400m where travelers mail vintage postcards)',
      'Komic Village (one of the world\'s highest motorable villages at 4,587m with Tangyud Monastery)',
      'Langza Village (fossil village beneath the majestic snow-capped Chau Chau Kang Nilda peak)',
      'Pin Valley National Park (dramatic high-altitude cold desert biosphere home to snow leopards and ibex)',
      'Tabo Monastery (founded in 996 CE, often called the "Ajanta of the Himalayas" for ancient murals)'
    ],
    food: [
      'Warm traditional Spitian butter tea (po cha) churned with yak butter and salt',
      'Freshly steamed Tingmo (fluffy Tibetan bread) and vegetable/chicken Momos with fiery chilli dip',
      'Hearty Tibetan Thukpa and Thenthuk noodle soups stewed in spiced mountain broth',
      'Tart and refreshing Seabuckthorn herbal berry tea'
    ],
    stays: [
      'Traditional Spitian mud homestays in Kaza, Langza, and Kibber with authentic local family warmth',
      'Riverside adventure campsites near Chandratal Lake with breathtaking Milky Way stargazing',
      'Backpacker lodges and hostels in Kaza main bazaar'
    ],
    startingPoints: 'Chandigarh or Shimla (via Kinnaur route - open year-round), or Manali (via Atal Tunnel and Kunzum Pass - open June to October).',
    bestTime: 'June to October for open high mountain passes, and December to February for thrilling winter snow expeditions.'
  },
  kasol: {
    name: 'Kasol',
    attractions: [
      'Manikaran Sahib & Natural Sulphur Hot Springs (vibrant gurudwara in a scenic mountain gorge)',
      'Chalal Village Pine Trail Walk (peaceful riverside stroll along the Parvati River)',
      'Tosh Village & Waterfall (picturesque traditional wooden houses at the valley head)',
      'Kheerganga Trek (famous panoramic mountain trek with geothermal hot spring pool)',
      'Parvati River Valley Banks (tranquil glacial river spots for meditation and photography)'
    ],
    food: [
      'Evergreen Cafe and Moon Dance Cafe for authentic Israeli shakshuka, fresh pastries, and schnitzel',
      'Jim Morrison Cafe nestled peacefully in the pine woods with live acoustic music',
      'Traditional hot Himachali Siddu dipped in pure desi ghee',
      'Fresh river trout fish delicately spiced and pan-fried at riverside bistros'
    ],
    stays: [
      'Riverside campsites along the Parvati River in Kasol and Katagla with bonfires and stargazing',
      'Vibrant backpacker hostels like The Hosteller Kasol and Nomad\'s Hostel',
      'Rustic timber homestays in Chalal and Tosh offering authentic Himalayan warmth'
    ],
    bestTime: 'March to June for pleasant mountain weather, and September to November for clear crisp autumn skies.'
  },
  goa: {
    name: 'Goa',
    attractions: [
      'Palolem & Agonda Beaches (pristine crescent beaches in South Goa with calm turquoise waters)',
      'Chapora Fort & Vagator Cliffs (scenic red laterite ramparts with sweeping Arabian Sea panoramas)',
      'Fontainhas Latin Quarter (historic Portuguese pastel-colored villas and boutique art galleries)',
      'Basilica of Bom Jesus & Old Goa (UNESCO World Heritage 16th-century baroque churches)',
      'Dudhsagar Waterfalls (dramatic four-tiered cascading falls on the Mandovi River)'
    ],
    food: [
      'Authentic Goan fish curry thali with fresh surmai or pomfret and freshly baked poi bread',
      'Traditional Pork or Chicken Cafreal with fiery green coriander masala',
      'Classic layered Bebinca dessert paired with fresh coconut water',
      'Fisherman\'s Wharf, Vinayak Family Restaurant, and Gunpowder in Assagao'
    ],
    stays: [
      'Rustic beachfront eco-huts along Agonda and Palolem beaches',
      'Heritage Portuguese villa boutique hotels in Fontainhas or Assagao',
      'Lively backpacker social hostels like Zostel Morjim and Woke Hostel'
    ],
    bestTime: 'November to February for breezy tropical weather and coastal celebrations.'
  },
  jaipur: {
    name: 'Jaipur',
    attractions: [
      'Amer Fort & Sheesh Mahal (hilltop fortress with exquisite mirror inlay craftsmanship)',
      'Hawa Mahal (Palace of Winds featuring 953 intricate honeycomb lattice windows)',
      'City Palace & Mubarak Mahal (royal regalia and magnificent Rajasthani courtyards)',
      'Jantar Mantar (UNESCO 18th-century stone astronomical observatory with the world\'s largest sundial)',
      'Nahargarh Fort (panoramic sunset vistas overlooking the Pink City from the Aravalli hills)'
    ],
    food: [
      'Rawat Mishthan Bhandar for legendary crisp Pyaaz Kachori and sweet Mawa Kachori',
      'Laxmi Mishthan Bhandar (LMB) in Johari Bazaar for authentic Paneer Ghewar',
      'Chokhi Dhani ethnic resort for a royal Rajasthani dal baati churma thali feast',
      'Tapri Central for rooftop spiced masala chai overlooking Central Park'
    ],
    stays: [
      'Heritage havelis like Mandawa Haveli and Alsisar Haveli in the city center',
      'Boutique heritage stays in Bani Park and Civil Lines',
      'Backpacker hubs like Zostel Jaipur near Hawa Mahal'
    ],
    bestTime: 'October to March for crisp desert winters and sightseeing festivals.'
  },
  bir: {
    name: 'Bir-Billing',
    attractions: [
      'Billing Take-off Point (world-renowned paragliding site with breathtaking valley views)',
      'Chokling Monastery (beautiful Tibetan monastery in the heart of Bir Tibetan Colony)',
      'Dharmalaya Institute (eco-campus focused on sustainable living and traditional Himalayan architecture)',
      'Sherab Ling Monastery (large, peaceful monastery complex surrounded by pine forests)',
      'Bir Landing Site (vibrant sunset spot where paragliders land among local cafes)'
    ],
    food: [
      'Garden Cafe and Musafir Cafe for healthy organic meals and mountain views',
      'Silver Linings Cafe for delicious home-baked cakes and coffee',
      'Traditional Tibetan Thukpa and Momos at local eateries in the colony'
    ],
    stays: [
      'Zostel Bir for a social backpacker experience',
      'Eco-homestays in the upper Bir area for peace and nature',
      'Boutique guest houses in the Tibetan Colony near the landing site'
    ],
    bestTime: 'March to June and September to November for the best paragliding weather.'
  },
  manali: {
    name: 'Manali',
    attractions: [
      'Solang Valley (paragliding, snow sports, and ropeway panoramas)',
      'Hadimba Temple (ancient pagoda wooden shrine sheltered among towering deodar forests)',
      'Jogini Waterfalls (invigorating pine trail trek near Vashisht village)',
      'Old Manali village and Beas river outlook with bohemian cafes',
      'Atal Tunnel and Rohtang Pass high altitude glacier vistas'
    ],
    food: [
      'Cafe 1947 by the river for wood-fired pizzas and mountain trout',
      'Dylan\'s Toasted and Roasted for freshly ground coffee and warm cinnamon cookies',
      'Hot authentic Himachali Siddu and piping-hot thukpa at local stalls'
    ],
    stays: [
      'Riverside cottages along the Beas River in Old Manali',
      'Apple orchard chalets and wooden homestays in Naggar and Vashisht',
      'Social backpacker hostels like Zostel Old Manali'
    ],
    bestTime: 'May to June for summer escape, and December to February for fresh snowfall.'
  }
};

/**
 * Normalizes and bounds client-supplied conversation history (max 15 turns).
 */
function sanitizeConversationHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(msg => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
    .slice(-15)
    .map(msg => ({ role: msg.role, content: msg.content.trim() }));
}

/**
 * Parses traveller counts from natural language.
 */
function parseTravelers(text) {
  if (!text) return undefined;
  const str = text.trim();

  if (/\b(?:solo|just me|alone|myself|single\s+traveler|single\s+traveller)\b/i.test(str)) {
    return 1;
  }
  if (/\b(?:couple|two people|for 2|2 people|me and my (?:wife|husband|partner|friend|girlfriend|boyfriend))\b/i.test(str)) {
    return 2;
  }

  // "with 3 friends" -> 1 user + 3 friends = 4 travellers
  const withFriendsMatch = str.match(/\bwith\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*friends?\b/i);
  if (withFriendsMatch) {
    const raw = withFriendsMatch[1].toLowerCase();
    const num = WORD_TO_NUM[raw] || parseInt(raw, 10);
    if (num >= 1 && num <= 19) return num + 1;
  }

  // "3 members", "3 friends", "3 travellers", "3 travelers", "3 people", "3 persons", "3 adults", "3 of us"
  const countNounMatch = str.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?:members?|people|persons?|travelers?|travellers?|adults?|friends?|folks?|of us)\b/i);
  if (countNounMatch) {
    const raw = countNounMatch[1].toLowerCase();
    const num = WORD_TO_NUM[raw] || parseInt(raw, 10);
    if (num >= 1 && num <= 20) return num;
  }

  // "we are 3", "we're 3", "group of 3", "party of 3", "make it 3", "total of 3", "for 3"
  const groupMatch = str.match(/\b(?:we are|we're|there are|group of|party of|total of|make it|for)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:\s*(?:people|persons?|members?|travelers?|travellers?|friends?|adults?))?\b/i);
  if (groupMatch) {
    const raw = groupMatch[1].toLowerCase();
    const num = WORD_TO_NUM[raw] || parseInt(raw, 10);
    if (num >= 1 && num <= 20) return num;
  }

  // Standalone digits when user responds specifically to traveler question (e.g. "3" or "4")
  if (/^\s*(\d{1,2})\s*$/.test(str)) {
    const num = parseInt(str.trim(), 10);
    if (num >= 1 && num <= 20) return num;
  }

  return undefined;
}

/**
 * Parses duration in days from natural language.
 */
function parseDuration(text) {
  if (!text) return undefined;
  const str = text.trim();

  if (/\blong\s+weekend\b/i.test(str)) return 4;
  if (/\bweekend\b/i.test(str)) return 3;
  if (/\ba\s+week\b/i.test(str)) return 7;
  if (/\bfortnight\b/i.test(str)) return 14;

  const numMatch = str.match(/\b(\d+)\s*(?:-\s*)?days?\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 60) return num;
  }

  const wordMatch = str.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|twenty|thirty)\s*(?:-\s*)?days?\b/i);
  if (wordMatch) {
    const num = WORD_TO_NUM[wordMatch[1].toLowerCase()];
    if (num >= 1 && num <= 60) return num;
  }

  // Standalone digit when responding to duration question (e.g. "5")
  if (/^\s*(\d{1,2})\s*$/.test(str)) {
    const num = parseInt(str.trim(), 10);
    if (num >= 1 && num <= 60) return num;
  }

  return undefined;
}

/**
 * Parses budget and detects ambiguity.
 * Distinguishes total trip budget from per-person amounts.
 */
function parseBudget(text, currentTravelers = 1) {
  if (!text) return { budget: undefined, budgetType: 'total', isAmbiguous: false };
  const str = text.trim();

  const isExplicitPerPerson = /\b(?:each|per\s+(?:person|head|member|traveller|traveler)|for\s+each)\b/i.test(str);
  const isExplicitTotal = /\b(?:total|for\s+all|altogether|combined|entire\s+group|group\s+budget|in\s+total)\b/i.test(str);

  // "20k", "50k", "24 k"
  const kMatch = str.match(/\b(\d+)\s*k\s*(?:inr|rs|rupees)?\b/i);
  if (kMatch) {
    const rawVal = parseInt(kMatch[1], 10) * 1000;
    if (rawVal >= 1000) {
      if (isExplicitPerPerson && currentTravelers > 1) {
        return { budget: rawVal * currentTravelers, budgetType: 'per_person', isAmbiguous: false };
      }
      return { budget: rawVal, budgetType: 'total', isAmbiguous: false };
    }
  }

  // Standard budget patterns: "budget is 24000", "24000 total", "total 24000", "₹24,000", "24000"
  const patterns = [
    /(?:total\s+budget\s*(?:is|of)?|total\s*(?:is|of)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]{4,})/i,
    /\b([\d,]{4,})\s*(?:total|for\s+all|altogether|combined)\b/i,
    /(?:budget\s*(?:is|of|to|around|approx)?\s*|₹|rs\.?|inr)\s*([\d,]{4,})/i,
    /\b([\d,]{4,})\s*(?:₹|rs\.?|inr|rupees)\b/i,
    /\bbudget\s*(?:is|of)?\s*([\d,]{4,})\b/i,
    /^\s*(?:₹|rs\.?)?\s*([\d,]{4,})\s*$/, // standalone number (e.g. "24000")
    /\b([\d,]{4,7})\b/ // fallback any 4-7 digit number
  ];

  for (const pat of patterns) {
    const m = str.match(pat);
    if (m && m[1]) {
      const rawVal = parseInt(m[1].replace(/,/g, ''), 10);
      if (rawVal >= 1000) {
        if (isExplicitPerPerson && currentTravelers > 1) {
          return { budget: rawVal * currentTravelers, budgetType: 'per_person', isAmbiguous: false };
        }
        // If user provided a raw number when traveler count > 1 and gave no explicit total/per-person qualifier
        const isAmbiguous = Boolean(currentTravelers > 1 && !isExplicitTotal && !isExplicitPerPerson && !/total\s+budget/i.test(str));
        return { budget: rawVal, budgetType: 'total', isAmbiguous };
      }
    }
  }

  return { budget: undefined, budgetType: 'total', isAmbiguous: false };
}

/**
 * Parses starting departure city from natural language.
 */
function parseStartingCity(text) {
  if (!text) return undefined;
  const str = text.trim();

  const match = str.match(/\b(?:starting(?:\s+from|\s+point)?|from|departing(?:\s+from)?|leaving(?:\s+from)?|origin(?:ating)?(?:\s+from)?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
  if (match) {
    let candidate = match[1].trim();
    candidate = candidate.replace(/\s+\b(?:with|for|and|in|on|at|budget|starting|having|to|next|this)\b.*$/i, '').trim();
    const stopWords = ['the', 'a', 'an', 'here', 'now', 'scratch', 'home', 'scratch', 'tomorrow', 'today', 'us', 'me', 'india', 'my', 'our'];
    if (candidate.length >= 2 && !stopWords.includes(candidate.toLowerCase())) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  // Standalone common starting cities
  const commonCities = [
    'Chandigarh', 'Delhi', 'New Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai',
    'Shimla', 'Manali', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Kullu', 'Amritsar',
    'Lucknow', 'Dehradun', 'Rishikesh', 'Haridwar'
  ];
  for (const c of commonCities) {
    if (new RegExp(`^\\s*${c}\\s*$`, 'i').test(str)) {
      return c;
    }
  }

  return undefined;
}

/**
 * Parses destination name from natural language.
 */
function parseDestination(text) {
  if (!text) return undefined;
  const str = text.trim();

  // 1. Popular destinations check (e.g. Spiti Valley, Kasol, Goa, Tokyo, etc.)
  for (const pop of POPULAR_DESTINATIONS) {
    const regex = new RegExp(`\\b${pop.name}\\b`, 'i');
    if (regex.test(str)) {
      return { name: pop.name, country: pop.country, id: pop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
    }
  }

  // 2. Curated templates check
  const curatedKeys = Object.keys(destinationTemplates);
  for (const k of curatedKeys) {
    const tpl = destinationTemplates[k];
    const regex = new RegExp(`\\b${tpl.name}\\b`, 'i');
    if (regex.test(str)) {
      return { name: tpl.name, country: tpl.country, id: k };
    }
  }

  // 3. Action verbs: "go to [Place]", "trip to [Place]", "visit [Place]"
  const patterns = [
    /\b(?:trip to|travel to|going to|head to|heading to|visit|explore|holiday in|tour of|switch to|change(?:\s+destination)?\s+to|destination\s+is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /\bgo\s+to\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /\bgo\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /\bin\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i
  ];

  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'india', 'weekend', 'week', 'summer', 'winter', 'autumn', 'spring',
    'budget', 'days', 'day', 'people', 'members', 'friends', 'travelers', 'travellers',
    'relaxed', 'balanced', 'packed', 'culture', 'nature', 'food', 'adventure', 'trekking',
    'november', 'december', 'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'dastaan', 'there', 'here', 'now', 'ahead'
  ]);

  for (const pat of patterns) {
    const m = str.match(pat);
    if (m && m[1]) {
      let candidate = m[1].trim();
      candidate = candidate.replace(/\s+\b(?:with|for|and|in|on|next|this|budget|starting|at)\b.*$/i, '').trim();
      const titleCased = candidate.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      if (titleCased.length >= 2 && !STOP_WORDS.has(titleCased.toLowerCase())) {
        return {
          name: titleCased,
          country: 'Worldwide',
          id: titleCased.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
      }
    }
  }

  return undefined;
}

/**
 * Checks whether user message is an advisory travel question.
 */
function isTravelQuestion(text) {
  if (!text) return false;
  const t = text.trim();

  // Exclude explicit booking/generation commands
  if (/^\s*(?:confirm|build(?:\s+itinerary)?|generate(?:\s+itinerary)?|proceed|let's go|yes|sure)\s*$/i.test(t)) {
    return false;
  }

  // Question indicators
  const questionPattern = /\b(?:what|where|how|which|why|suggest|recommend|tell me|can you tell|is five days enough|is \d+ days enough|how much|places to visit|things to do|sightseeing|attractions|hotels?|cafes?|food|restaurants?|dishes|cuisine|weather|climate|time to visit)\b/i;

  return questionPattern.test(t) || t.endsWith('?');
}

/**
 * Generates an informative travel advice response for questions without forcing trip generation.
 */
async function buildTravelAdviceResponse(destName, userMessage, pois = [], fetchFn = fetch) {
  const normDest = (destName || '').toLowerCase().trim();
  const known = DESTINATION_KNOWLEDGE[normDest];

  // If no POIs provided, try to fetch some for grounding
  let groundedPois = pois;
  if ((!groundedPois || groundedPois.length === 0) && destName) {
    try {
      const check = await verifyDestinationAndPois(destName, { fetchFn });
      if (check.verified && check.pois) {
        groundedPois = check.pois;
      }
    } catch (e) {
      console.warn('[AssistantController] Could not fetch POIs for travel advice:', e.message);
    }
  }

  const wantsFood = /\b(?:food|cafes?|restaurants?|dishes|cuisine|eat|dining|breakfast|lunch|dinner)\b/i.test(userMessage);
  const wantsStays = /\b(?:hotels?|stays?|stay|hostels?|resorts?|homestays?|accommodation|campsites?)\b/i.test(userMessage);
  const wantsPlaces = /\b(?:places|visit|attractions|sights|things to do|see|explore|special)\b/i.test(userMessage) || (!wantsFood && !wantsStays);

  const parts = [];
  
  if (known) {
    parts.push(`Here is what you should know about **${known.name}**:`);

    if (wantsPlaces && known.attractions) {
      parts.push(`\n**Top Places to Visit:**`);
      known.attractions.slice(0, 5).forEach(a => {
        // Simple heuristic for map link if we have known coords for these top spots
        // For Spiti specifically, we can add some known ones
        let mapLink = '';
        if (normDest === 'spiti valley' || normDest === 'spiti') {
          if (a.includes('Key')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.2976,78.0122))';
          else if (a.includes('Chandratal')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.4824,77.6156))';
          else if (a.includes('Dhankar')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.1214,78.2135))';
          else if (a.includes('Hikkim')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.2115,78.0874))';
          else if (a.includes('Komic')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.2008,78.1091))';
        } else if (normDest === 'bir' || normDest === 'bir-billing') {
          if (a.includes('Billing Take-off')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.0526,76.7441))';
          else if (a.includes('Chokling')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.0336,76.7226))';
          else if (a.includes('Dharmalaya')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.0468,76.7198))';
          else if (a.includes('Sherab Ling')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.0494,76.6896))';
          else if (a.includes('Landing Site')) mapLink = ' ([View on Map](https://www.google.com/maps/search/?api=1&query=32.0314,76.7215))';
        }
        parts.push(`• ${a}${mapLink}`);
      });
    }
    if ((wantsFood || wantsStays) && known.food && wantsFood) {
      parts.push(`\n**Local Food & Cafes:**\n` + known.food.map(f => `• ${f}`).join('\n'));
    }
    if ((wantsStays || wantsFood) && known.stays && wantsStays) {
      parts.push(`\n**Recommended Stays:**\n` + known.stays.map(s => `• ${s}`).join('\n'));
    }
  } else if (groundedPois && groundedPois.length > 0) {
    const attractions = groundedPois.filter(p => p.category === 'CULTURE' || p.category === 'NATURE' || p.category === 'HISTORY').slice(0, 5);
    parts.push(`Here are verified attractions in **${destName}**:`, '');
    attractions.forEach(a => {
      const mapUrl = (a.lat && a.lon) ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lon}` : null;
      const mapLink = mapUrl ? ` ([View on Map](${mapUrl}))` : '';
      parts.push(`• ${a.name}${mapLink}`);
    });
  } else {
    parts.push(`${destName || 'This destination'} is a wonderful choice for travelers! To help tailor recommendations, let me know if you prefer nature, heritage, food walks, or relaxation.`);
  }

  parts.push(`\nWhenever you're ready to continue planning, let me know your trip duration and group budget!`);
  return parts.join('\n');
}

/**
 * Deterministic Regex/Heuristic Fallback for Preference Extraction
 */
function extractPreferencesHeuristically(message, currentTravelers = 1) {
  const text = (message || '').trim();
  const result = {};

  // 1. Travelers count
  const trav = parseTravelers(text);
  if (trav !== undefined) result.travelers = trav;

  // 2. Duration
  const dur = parseDuration(text);
  if (dur !== undefined) result.duration = dur;

  // 3. Budget & Ambiguity
  // Handle clarification replies: e.g. "total", "total for all", "it's total", "per person", "each"
  if (/^\s*(?:total|it(?:'s|\s+is)?\s+total|for\s+all|total\s+for\s+all(?:\s+travellers|\s+travelers)?|total\s+budget)\s*$/i.test(text)) {
    result.budgetType = 'total';
    result.budgetAmbiguity = false;
  } else if (/^\s*(?:per\s+person|each|per\s+head|for\s+each)\s*$/i.test(text)) {
    result.budgetType = 'per_person';
    result.budgetAmbiguity = false;
    result.multiplyByTravelers = true;
  } else {
    const effectiveTravelers = trav !== undefined ? trav : currentTravelers;
    const { budget, budgetType, isAmbiguous } = parseBudget(text, effectiveTravelers);
    if (budget !== undefined) {
      result.budget = budget;
      result.budgetType = budgetType;
      result.budgetAmbiguity = isAmbiguous;
    }
  }

  // 4. Starting City
  const startCity = parseStartingCity(text);
  if (startCity !== undefined) result.startingCity = startCity;

  // 5. Exact Date (YYYY-MM-DD or e.g. "1 Nov 2026", "2026-11-01")
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    if (!isNaN(d.getTime())) result.startDate = isoMatch[1];
  } else {
    const wordsDateMatch = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i);
    if (wordsDateMatch) {
      const day = String(wordsDateMatch[1]).padStart(2, '0');
      const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const month = monthNames[wordsDateMatch[2].toLowerCase().substring(0, 3)];
      const year = wordsDateMatch[3];
      result.startDate = `${year}-${month}-${day}`;
    }
  }

  // 6. Travel Style & Interests
  if (/\b(?:adventure|trekking|treks?|packed|fast|action-packed)\b/i.test(text)) {
    result.travelStyle = 'Packed';
  } else if (/\brelaxed|slow|leisurely|peaceful\b/i.test(text)) {
    result.travelStyle = 'Relaxed';
  } else if (/\bbalanced|moderate|sightseeing\b/i.test(text)) {
    result.travelStyle = 'Balanced';
  }

  const detectedInterests = [];
  Object.entries(INTEREST_PATTERNS).forEach(([interest, regex]) => {
    if (regex.test(text)) {
      detectedInterests.push(interest);
    }
  });
  if (detectedInterests.length > 0) {
    result.interests = detectedInterests;
  }

  // 7. Destination Extraction
  const dest = parseDestination(text);
  if (dest !== undefined) result.destination = dest;

  return result;
}

/**
 * Builds destination context string for prompt grounding
 */
function getDestinationContext(destName) {
  if (!destName) return 'No destination selected yet.';
  const norm = destName.toLowerCase().trim();
  const known = DESTINATION_KNOWLEDGE[norm];
  if (!known) return `Destination: ${destName}.`;
  return `Destination: ${known.name}. Verified Highlights: ${known.attractions.slice(0, 4).join('; ')}. Typical transport routes: ${known.startingPoints || 'Standard intercity links'}.`;
}

/**
 * Builds prompt messages for NVIDIA NIM conversational travel planning
 */
export function buildNvidiaAssistantPrompt(userMessage, conversationHistory, currentPreferences) {
  const systemPrompt = `You are Dastaan's Conversational AI Travel Agent for "Dastaan — Stories • Ideas • Emotions".
You are an expert, warm, and attentive travel curator having a natural, multi-turn conversation with travelers.

YOUR GOALS:
1. Understand the traveler's intent: Are they providing travel details, asking a travel question, modifying a preference, or confirming?
2. Natural multi-turn flow: Ask only one relevant follow-up question at a time for missing required details. If the user provides multiple details at once, extract all of them without asking for them again.
3. The four required trip fields:
   - Destination: City or region (e.g., Spiti Valley, Kasol, Jaipur, Goa, Tokyo)
   - Duration: Number of days (1-60)
   - Travelers: Total count of people (1-20)
   - Budget: Total trip budget in INR (₹). Always clarify if a budget is total or per-person when ambiguous.
4. Optional fields:
   - Starting city, travel dates, travel style, and interests are OPTIONAL. If the user volunteers them, preserve them, but DO NOT ask follow-up questions for starting city, dates, or travel style.
5. Answer travel questions gracefully:
   If the traveler asks questions about attractions, food, hotels, or season, provide rich, helpful advice without forcing immediate trip generation.
6. Summary & Confirmation:
   ONLY when all four required fields (destination, duration, travelers, budget) are gathered and unambiguous, summarize the entire journey clearly in your reply and set conversationStage to "ready_for_confirmation". Never show a confirmation summary prematurely.

DESTINATION CONTEXT:
${getDestinationContext(currentPreferences?.destination?.name || userMessage)}

CURRENT ESTABLISHED TRIP STATE:
${JSON.stringify(currentPreferences || {}, null, 2)}

OUTPUT FORMAT:
Respond with strictly valid JSON:
{
  "intent": "provide_information" | "ask_question" | "modify_preference" | "confirm_itinerary" | "greeting" | "general_chat",
  "reply": "Warm, engaging conversational response (2-4 sentences). Answer questions with local insight, or ask the next logical follow-up question.",
  "conversationStage": "collecting_preferences" | "clarifying" | "ready_for_confirmation",
  "extractedPreferences": {
    "destination": string | null,
    "duration": number | null,
    "travelers": number | null,
    "budget": number | null,
    "budgetType": "total" | "per_person" | null,
    "startingCity": string | null,
    "startDate": string | null,
    "interests": string[] | null,
    "travelStyle": "Relaxed" | "Balanced" | "Packed" | null,
    "accommodationPreference": string | null
  },
  "budgetAmbiguity": boolean,
  "nextQuestionField": "duration" | "travelers" | "budget" | null,
  "suggestedReplies": ["short quick reply 1", "short quick reply 2", "short quick reply 3"]
}`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Include recent conversation context (last 4 turns) to keep inference fast
  const recentHistory = (conversationHistory || []).slice(-4);
  recentHistory.forEach(turn => {
    if (turn?.role && turn?.content) {
      messages.push({ role: turn.role, content: turn.content });
    }
  });

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Returns contextual quick-reply chips based on the field being asked
 */
function getSuggestedRepliesForField(field) {
  switch (field) {
    case 'duration':
      return ['3 days', '5 days', '7 days', '10 days'];
    case 'travelers':
      return ['1 traveller', '2 travellers', '3 travellers', '4 travellers'];
    case 'budget':
      return ['₹15,000', '₹25,000', '₹35,000', '₹50,000'];
    default:
      return [];
  }
}

/**
 * POST /api/assistant/chat
 * Primary Conversational Endpoint
 */
export async function handleAssistantChat(req, res) {
  try {
    const {
      message = '',
      conversationHistory = [],
      currentPreferences = {},
      currentTripId = null,
      currentTrip = null,
      action = null
    } = req.body;

    const fetchFn = req.fetchFn || fetch;
    const sanitizedHistory = sanitizeConversationHistory(conversationHistory);

    // -------------------------------------------------------------
    // SCENARIO A: EXPLICIT CONFIRMATION ACTION
    // -------------------------------------------------------------
    const isExplicitConfirmation =
      action === 'confirm' ||
      /^\s*(?:confirm|yes,\s*generate|build(?:\s+itinerary)?|generate(?:\s+itinerary)?|confirm\s+and\s+build(?:\s+itinerary)?)\s*$/i.test(message);

    if (isExplicitConfirmation) {
      const prefs = { ...currentPreferences };

      // Ensure required preferences are present
      const destName = prefs.destination?.name || (typeof prefs.destination === 'string' ? prefs.destination : '');
      const duration = Math.max(1, Math.min(60, parseInt(prefs.duration, 10) || 0));
      const budget = Math.max(1000, parseInt(prefs.budget, 10) || 0);
      const travelers = Math.max(1, Math.min(20, parseInt(prefs.travelers, 10) || 1));
      const startDate = prefs.startDate || null;
      const travelStyle = prefs.travelStyle || 'Balanced';
      const interests = Array.isArray(prefs.interests) && prefs.interests.length > 0 ? prefs.interests : ['Culture', 'History'];

      if (!destName || duration < 1 || budget < 1000) {
        return res.status(400).json({
          success: false,
          code: 'INCOMPLETE_PREFERENCES_FOR_CONFIRMATION',
          message: 'Cannot generate itinerary yet. Destination, duration, and budget are required.',
          missingFields: [
            !destName && 'destination',
            duration < 1 && 'duration',
            budget < 1000 && 'budget'
          ].filter(Boolean)
        });
      }

      const userOrSessionKey = (req.user && (req.user._id || req.user.id)) || req.body?.sessionId || req.ip || 'session';
      const tripLockKey = `${userOrSessionKey}:${currentTripId || 'new'}:${destName.toLowerCase().trim()}`;

      // Join active single-flight generation if already in progress
      if (activeItineraryGenerations.has(tripLockKey)) {
        console.info(`[AssistantController] In-flight generation joined for session "${tripLockKey}"`);
        const existingPromise = activeItineraryGenerations.get(tripLockKey);
        try {
          const joinedRes = await existingPromise;
          return res.status(joinedRes.status).json(joinedRes.body);
        } catch (joinedErr) {
          return res.status(joinedErr.status || 500).json(joinedErr.body || {
            success: false,
            message: joinedErr.message
          });
        }
      }

      const generationPromise = (async () => {
        let generatedTrip = null;
        const isCurated = Object.keys(destinationTemplates).includes(destName.toLowerCase().trim());

        try {
          if (isCurated) {
            const curatedResult = generateItinerary({
              destination: { id: destName.toLowerCase().trim(), name: destName },
              duration,
              budget,
              travelers,
              startDate,
              travelStyle,
              interests
            });
            generatedTrip = {
              destination: {
                name: destName,
                country: destinationTemplates[destName.toLowerCase().trim()]?.country || 'India',
                id: destName.toLowerCase().trim()
              },
              duration,
              travelers,
              startDate: startDate ? new Date(startDate) : null,
              budget,
              travelStyle,
              interests,
              startingCity: prefs.startingCity || null,
              itinerary: curatedResult
            };
          } else {
            // Open worldwide destination: ground via OSM/catalogs and NVIDIA
            generatedTrip = await generateGroundedItinerary(
              {
                destination: { name: destName },
                duration,
                budget,
                travelers,
                startDate,
                travelStyle,
                interests,
                startingCity: prefs.startingCity || null
              },
              { fetchFn, preferredSource: req.body?.preferredSource || 'auto' }
            );
          }

          // Validate generated itinerary
          const val = validateItinerary(generatedTrip.itinerary, { expectedDays: duration, travelStyle });
          if (!val.isValid) {
            return {
              status: 422,
              body: {
                success: false,
                code: 'ITINERARY_VALIDATION_FAILED',
                message: 'Generated itinerary failed quality validation: ' + val.errors.join('; ')
              }
            };
          }

          // Persist to MongoDB if authenticated
          let savedTripDoc = null;
          if (req.user && (req.user._id || req.user.id)) {
            const userId = req.user._id || req.user.id;
            const firebaseUid = req.user.uid || 'dev-uid';

            if (currentTripId) {
              const existing = await Trip.findById(currentTripId);
              if (existing && String(existing.userId) !== String(userId)) {
                return {
                  status: 403,
                  body: {
                    success: false,
                    code: 'FORBIDDEN',
                    message: 'Unauthorized: You cannot overwrite another user’s trip.'
                  }
                };
              }
              savedTripDoc = await Trip.findByIdAndUpdate(
                currentTripId,
                {
                  ...generatedTrip,
                  userId,
                  firebaseUid,
                  updatedAt: new Date()
                },
                { new: true }
              );
            } else {
              savedTripDoc = await Trip.create({
                ...generatedTrip,
                userId,
                firebaseUid,
                isPublic: false
              });
            }
          }

          const finalTrip = savedTripDoc ? savedTripDoc.toObject() : generatedTrip;
          const isDegraded = finalTrip.qualityLimitation?.poiServiceUnavailable;

          return {
            status: 201,
            body: {
              success: true,
              type: 'itinerary_generated',
              conversationStage: 'completed',
              reply: isDegraded
                ? `Your journey to ${destName} has been generated using AI knowledge (live map verification is temporarily unavailable). Please verify the details below.`
                : `Your journey to ${destName} has been generated and verified! You can explore the full day-by-day itinerary below.`,
              trip: finalTrip,
              redirectUrl: finalTrip._id ? `/itinerary?id=${finalTrip._id}` : '/itinerary'
            }
          };

        } catch (genErr) {
          const isValidationFailed = genErr.code === 'ITINERARY_VALIDATION_FAILED';
          const isInsufficientAttractions = genErr.code === 'INSUFFICIENT_ATTRACTIONS';
          const isPoiUnavailable = genErr.code === 'POI_SERVICE_UNAVAILABLE';
          const isRecoverableTripState = isValidationFailed || isInsufficientAttractions || isPoiUnavailable;

          const statusCode = genErr.code === 'DESTINATION_NOT_FOUND' ? 400
            : isPoiUnavailable ? 503
            : 422;

          return {
            status: statusCode,
            body: {
              success: false,
              code: genErr.code || 'GENERATION_FAILED',
              conversationStage: isRecoverableTripState ? 'ready_for_confirmation' : 'error',
              currentPreferences: prefs,
              confirmationSummary: {
                destination: prefs.destination,
                duration,
                travelers,
                budget,
                travelStyle,
                startingCity: prefs.startingCity || null,
                estimatedCostPerPerson: Math.round(budget / Math.max(1, travelers))
              },
              readyForConfirmation: isRecoverableTripState,
              message: genErr.message || 'Itinerary generation could not be completed.',
              retryable: Boolean(genErr.retryable || isRecoverableTripState),
              validationErrors: genErr.validationErrors || [],
              qualityLimitation: genErr.qualityLimitation || null
            }
          };
        }
      })();

      activeItineraryGenerations.set(tripLockKey, generationPromise);

      try {
        const outcome = await generationPromise;
        return res.status(outcome.status).json(outcome.body);
      } finally {
        activeItineraryGenerations.delete(tripLockKey);
      }
    }

    // -------------------------------------------------------------
    // SCENARIO B: ITINERARY MODIFICATION
    // -------------------------------------------------------------
    const extractedForMod = extractPreferencesHeuristically(message, currentPreferences.travelers || 1);
    const destChanged = extractedForMod.destination && currentTrip &&
      extractedForMod.destination.name.toLowerCase().trim() !== currentTrip.destination?.name?.toLowerCase().trim();

    const isModificationIntent =
      Boolean(currentTripId || currentTrip) &&
      !destChanged && // If destination changed, it's a new trip, not a modification
      /\b(?:make day \d+|replace|more food|change (?:the )?budget|budget|more relaxed|more packed|relax day \d+)\b/i.test(message);

    if (isModificationIntent) {
      let tripToModify = currentTrip;
      if (currentTripId) {
        const foundTrip = await Trip.findById(currentTripId);
        if (foundTrip) {
          if (req.user && String(foundTrip.userId) !== String(req.user._id || req.user.id)) {
            return res.status(403).json({
              success: false,
              code: 'FORBIDDEN',
              message: 'Unauthorized: You cannot modify another user’s trip.'
            });
          }
          tripToModify = foundTrip.toObject();
        }
      }

      if (tripToModify && tripToModify.itinerary) {
        // 1. Budget Modification
        const budMatch = message.match(/(?:budget\s*(?:to|of|is)?|₹)\s*([\d,]{4,})/i);
        if (budMatch) {
          const newBudget = parseInt(budMatch[1].replace(/,/g, ''), 10);
          if (newBudget >= 1000) {
            tripToModify.budget = newBudget;
            const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(newBudget, tripToModify.travelers || 1);
            tripToModify.itinerary.breakdown = breakdown;
            tripToModify.itinerary.estimatedCostPerPerson = estimatedCostPerPerson;

            if (currentTripId && req.user) {
              await Trip.findByIdAndUpdate(currentTripId, {
                budget: newBudget,
                'itinerary.breakdown': breakdown,
                'itinerary.estimatedCostPerPerson': estimatedCostPerPerson
              });
            }

            const confirmationSummary = {
              destination: tripToModify.destination,
              duration: tripToModify.duration,
              travelers: tripToModify.travelers,
              startDate: tripToModify.startDate,
              budget: newBudget,
              budgetType: 'total',
              estimatedCostPerPerson,
              startingCity: tripToModify.startingCity || null,
              interests: tripToModify.interests,
              travelStyle: tripToModify.travelStyle || 'Balanced'
            };

            const updatedPreferences = {
              ...currentPreferences,
              budget: newBudget,
              budgetType: 'total'
            };

            return res.json({
              success: true,
              type: 'conversation',
              conversationStage: 'ready_for_confirmation',
              reply: `I have updated your total trip budget to ₹${newBudget.toLocaleString('en-IN')} (approx. ₹${estimatedCostPerPerson.toLocaleString('en-IN')} per person). All allocations have been recalibrated. Please review the updated summary and click Confirm to build your new itinerary!`,
              currentPreferences: updatedPreferences,
              readyForConfirmation: true,
              confirmationSummary,
              suggestedReplies: ['Confirm & Build Itinerary', 'Adjust total budget']
            });
          }
        }

        // 2. Day Pacing Modification
        const dayMatch = message.match(/day\s*(\d+)/i);
        if (dayMatch && /relaxed|slower|less/i.test(message)) {
          const dayNum = parseInt(dayMatch[1], 10);
          const targetDay = tripToModify.itinerary.days?.find(d => d.dayNum === dayNum);
          if (targetDay && targetDay.activities.length > 2) {
            targetDay.activities = targetDay.activities.slice(0, 2);
            targetDay.dayTitle = `${targetDay.dayTitle} (RELAXED PACE)`;

            const val = validateItinerary(tripToModify.itinerary, { expectedDays: tripToModify.duration });
            if (val.isValid) {
              const confirmationSummary = {
                destination: tripToModify.destination,
                duration: tripToModify.duration,
                travelers: tripToModify.travelers,
                startDate: tripToModify.startDate,
                budget: tripToModify.budget,
                budgetType: 'total',
                estimatedCostPerPerson: tripToModify.itinerary.estimatedCostPerPerson,
                startingCity: tripToModify.startingCity || null,
                interests: tripToModify.interests,
                travelStyle: 'Relaxed'
              };

              const updatedPreferences = {
                ...currentPreferences,
                travelStyle: 'Relaxed'
              };

              return res.json({
                success: true,
                type: 'conversation',
                conversationStage: 'ready_for_confirmation',
                reply: `I have updated your pacing to be more relaxed. Please review the updated summary and click Confirm to rebuild your itinerary!`,
                currentPreferences: updatedPreferences,
                readyForConfirmation: true,
                confirmationSummary,
                suggestedReplies: ['Confirm & Build Itinerary', 'Adjust total budget']
              });
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // SCENARIO C: NATURAL MULTI-TURN CONVERSATION & PREFERENCE EXTRACTION
    // -------------------------------------------------------------
    let parsedLLM = null;
    let llmFailureReason = null;

    if (process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim() !== '' && process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here') {
      try {
        const messages = buildNvidiaAssistantPrompt(message, sanitizedHistory, currentPreferences);
        const chatTimeoutMs = parseInt(process.env.NVIDIA_CHAT_TIMEOUT_MS, 10) || 10000;
        const chatMaxTokens = parseInt(process.env.NVIDIA_CHAT_MAX_TOKENS, 10) || 220;
        const completion = await callNvidiaChat({
          messages,
          maxTokens: chatMaxTokens,
          timeoutMs: chatTimeoutMs,
          responseFormat: { type: 'json_object' },
          fetchFn
        });

        if (completion?.content) {
          let cleanContent = completion.content.trim();
          if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          parsedLLM = JSON.parse(cleanContent);
          console.info(`[AssistantController] LLM inference completed successfully (${completion.durationMs}ms) via ${completion.model}`);
        }
      } catch (llmErr) {
        llmFailureReason = llmErr.code || llmErr.message;
        if (llmErr.code === 'NVIDIA_CIRCUIT_OPEN') {
          console.info('[AssistantController] NVIDIA circuit breaker open, using fast deterministic extraction.');
        } else if (llmErr.code === 'NVIDIA_TIMEOUT') {
          console.info(`[AssistantController] LLM inference timed out (${llmErr.durationMs || chatTimeoutMs}ms), seamlessly falling back to deterministic extraction.`);
        } else {
          console.info(`[AssistantController] LLM inference unavailable (${llmErr.message}), seamlessly falling back to deterministic extraction.`);
        }
      }
    }

    // Deterministic extraction backup & reinforcement
    const extracted = extractPreferencesHeuristically(message, currentPreferences.travelers || 1);
    const inferenceSource = parsedLLM ? 'llm' : 'deterministic_fallback';

    // Merge preferences: newly extracted values update the state; non-mentioned fields are preserved
    const extractedDest = parsedLLM?.extractedPreferences?.destination
      ? (typeof parsedLLM.extractedPreferences.destination === 'string'
          ? { name: parsedLLM.extractedPreferences.destination, country: 'Worldwide' }
          : parsedLLM.extractedPreferences.destination)
      : extracted.destination;

    const extractedDuration = parsedLLM?.extractedPreferences?.duration !== undefined
      ? parsedLLM.extractedPreferences.duration
      : extracted.duration;

    const extractedTravelers = parsedLLM?.extractedPreferences?.travelers !== undefined
      ? parsedLLM.extractedPreferences.travelers
      : extracted.travelers;

    const extractedStartDate = parsedLLM?.extractedPreferences?.startDate !== undefined
      ? parsedLLM.extractedPreferences.startDate
      : extracted.startDate;

    const extractedBudget = parsedLLM?.extractedPreferences?.budget !== undefined
      ? parsedLLM.extractedPreferences.budget
      : extracted.budget;

    const extractedStartingCity = parsedLLM?.extractedPreferences?.startingCity !== undefined
      ? parsedLLM.extractedPreferences.startingCity
      : extracted.startingCity;

    const extractedInterests = (parsedLLM?.extractedPreferences?.interests?.length)
      ? parsedLLM.extractedPreferences.interests
      : extracted.interests;

    const extractedStyle = parsedLLM?.extractedPreferences?.travelStyle || extracted.travelStyle;

    const mergedPreferences = {
      destination: extractedDest !== undefined ? extractedDest : (currentPreferences.destination || null),
      duration: extractedDuration !== undefined ? extractedDuration : (currentPreferences.duration || null),
      travelers: extractedTravelers !== undefined ? extractedTravelers : (currentPreferences.travelers || null),
      startDate: extractedStartDate !== undefined ? extractedStartDate : (currentPreferences.startDate || null),
      budget: extractedBudget !== undefined ? extractedBudget : (currentPreferences.budget || null),
      budgetType: extracted.budgetType || currentPreferences.budgetType || 'total',
      startingCity: extractedStartingCity !== undefined ? extractedStartingCity : (currentPreferences.startingCity || null),
      interests: extractedInterests !== undefined ? extractedInterests : (currentPreferences.interests || []),
      travelStyle: extractedStyle !== undefined ? extractedStyle : (currentPreferences.travelStyle || null)
    };

    // Apply budget clarification multipliers if user clarified per-person amount
    if (extracted.multiplyByTravelers && mergedPreferences.budget && (mergedPreferences.travelers || 1) > 1) {
      mergedPreferences.budget = mergedPreferences.budget * (mergedPreferences.travelers || 1);
      mergedPreferences.budgetType = 'total';
    }

    // Verify destination grounding if newly extracted
    let groundingWarning = null;
    if (mergedPreferences.destination?.name) {
      const destName = mergedPreferences.destination.name;
      const isCurated = Object.keys(destinationTemplates).includes(destName.toLowerCase().trim());
      if (!isCurated) {
        const check = await verifyDestination(destName, { fetchFn });
        if (!check.verified) {
          groundingWarning = `I couldn't verify "${destName}" on the world map. Please check the spelling or choose another city.`;
          mergedPreferences.destination = null;
        } else {
          mergedPreferences.destination.country = check.country || 'Worldwide';
        }
      }
    }

    // Check if the current message is an advisory travel question
    const isQuestion = isTravelQuestion(message);

    // Check budget ambiguity (e.g. user provided standalone budget number for multiple travelers without total/each)
    const budgetIsAmbiguous = extracted.budgetAmbiguity === false
      ? false
      : Boolean(extracted.budgetAmbiguity || (currentPreferences.budgetAmbiguity && !extracted.budgetType));

    // Evaluate missing fields: ONLY the 4 required fields
    const missing = [];
    if (!mergedPreferences.destination?.name) missing.push('destination');
    if (!mergedPreferences.duration) missing.push('duration');
    if (!mergedPreferences.travelers) missing.push('travelers');
    if (!mergedPreferences.budget) missing.push('budget');

    // Starting city, travel dates, style, and interests are optional
    if (!mergedPreferences.travelStyle) {
      mergedPreferences.travelStyle = 'Balanced';
    }

    // Ready for confirmation requires ONLY the 4 essential fields, no ambiguity, no unverified destination, and not a pure question
    const readyForConfirmation = missing.length === 0 && !budgetIsAmbiguous && !groundingWarning && !isQuestion;

    // Determine conversation stage
    let conversationStage = 'collecting_preferences';
    if (readyForConfirmation) {
      conversationStage = 'ready_for_confirmation';
    } else if (budgetIsAmbiguous || groundingWarning) {
      conversationStage = 'clarifying';
    }

    // Determine next question field (strictly one of the missing required fields)
    let nextQuestionField = null;
    if (!readyForConfirmation) {
      if (budgetIsAmbiguous) {
        nextQuestionField = 'budget';
      } else if (missing.includes('destination')) {
        nextQuestionField = 'destination';
      } else if (missing.includes('duration')) {
        nextQuestionField = 'duration';
      } else if (missing.includes('travelers')) {
        nextQuestionField = 'travelers';
      } else if (missing.includes('budget')) {
        nextQuestionField = 'budget';
      }
    }

    // Determine suggested quick-reply chips
    let suggestedReplies = parsedLLM?.suggestedReplies;
    if (!suggestedReplies || !Array.isArray(suggestedReplies) || suggestedReplies.length === 0) {
      if (readyForConfirmation) {
        suggestedReplies = [
          'Confirm & Build Itinerary',
          'Make pacing more relaxed',
          'Adjust total budget'
        ];
      } else if (budgetIsAmbiguous) {
        const b = mergedPreferences.budget;
        suggestedReplies = [
          `₹${b?.toLocaleString('en-IN')} total for all travellers`,
          `₹${b?.toLocaleString('en-IN')} per person`
        ];
      } else {
        suggestedReplies = getSuggestedRepliesForField(nextQuestionField);
      }
    }

    // Generate natural conversational reply
    let replyText = parsedLLM?.reply;

    if (isQuestion) {
      // User asked an informational question (e.g. "What is special about Spiti?", "Suggest local food")
      const currentDestName = mergedPreferences.destination?.name || 'Spiti Valley';
      replyText = await buildTravelAdviceResponse(currentDestName, message, [], fetchFn);
    } else if (budgetIsAmbiguous) {
      const b = mergedPreferences.budget;
      const t = mergedPreferences.travelers || 2;
      replyText = `Is ₹${b?.toLocaleString('en-IN')} your total budget for all ${t} travellers, or per person?`;
    } else if (groundingWarning) {
      replyText = groundingWarning;
    } else if (!replyText) {
      if (missing.includes('destination')) {
        replyText = "Where would you like to travel?";
      } else if (missing.includes('duration')) {
        replyText = `Sounds exciting! How many days are you planning for your journey to ${mergedPreferences.destination?.name}?`;
      } else if (missing.includes('travelers')) {
        replyText = `Got it. How many people will be travelling, including you?`;
      } else if (missing.includes('budget')) {
        const t = mergedPreferences.travelers;
        replyText = t && t > 1
          ? `What is your total budget for all ${t} people in INR (₹)?`
          : `What is your estimated total budget in INR (₹)?`;
      } else if (readyForConfirmation) {
        const dest = mergedPreferences.destination.name;
        const dur = mergedPreferences.duration;
        const trav = mergedPreferences.travelers;
        const bud = mergedPreferences.budget;
        const perPerson = Math.round(bud / trav);
        const fromCity = mergedPreferences.startingCity ? ` starting from ${mergedPreferences.startingCity}` : '';
        const style = mergedPreferences.travelStyle || 'Balanced';
        replyText = `I have your journey mapped out: ${dur} days in ${dest}${fromCity} for ${trav} ${trav === 1 ? 'traveller' : 'travellers'} with a total budget of ₹${bud.toLocaleString('en-IN')} (~₹${perPerson.toLocaleString('en-IN')} per person), focused on ${style.toLowerCase()} travel. Please review the summary below and click Confirm to build your itinerary!`;
      } else {
        replyText = "I'm excited to help plan your journey. Tell me what experiences or travel style you have in mind!";
      }
    }

    const confirmationSummary = readyForConfirmation ? {
      destination: mergedPreferences.destination,
      duration: mergedPreferences.duration,
      travelers: mergedPreferences.travelers,
      startDate: mergedPreferences.startDate,
      budget: mergedPreferences.budget,
      budgetType: mergedPreferences.budgetType || 'total',
      estimatedCostPerPerson: Math.round(mergedPreferences.budget / mergedPreferences.travelers),
      startingCity: mergedPreferences.startingCity || null,
      interests: mergedPreferences.interests,
      travelStyle: mergedPreferences.travelStyle || 'Balanced'
    } : null;

    return res.json({
      success: true,
      type: 'conversation',
      source: inferenceSource,
      isLlmDegraded: Boolean(llmFailureReason),
      conversationStage,
      reply: replyText,
      currentPreferences: mergedPreferences,
      missingFields: missing,
      readyForConfirmation,
      confirmationSummary,
      nextQuestionField,
      suggestedReplies
    });

  } catch (err) {
    console.error('[AssistantController] Unexpected error in chat endpoint:', err);
    return res.status(500).json({
      success: false,
      code: 'ASSISTANT_INTERNAL_ERROR',
      conversationStage: 'error',
      message: 'The travel assistant encountered an error. Please try again or refine your question.'
    });
  }
}

export default {
  handleAssistantChat,
  extractPreferencesHeuristically,
  parseTravelers,
  parseDuration,
  parseBudget,
  parseDestination,
  parseStartingCity,
  isTravelQuestion,
  buildTravelAdviceResponse,
  buildNvidiaAssistantPrompt,
  DESTINATION_KNOWLEDGE,
  POPULAR_DESTINATIONS
};
