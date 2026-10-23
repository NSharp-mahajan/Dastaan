/**
 * Dastaan Trip Inspiration Curated Dataset
 * 
 * Reuses canonical destination records from destinations.js (plannerDestinations & discoverDestinations).
 * Reuses verified interests from interests.js.
 * Genuine photography from approved local assets and verified travel photography.
 * Indicative budget estimates clearly labeled.
 */

import { plannerDestinations, discoverDestinations } from './destinations';

export const INSPIRATION_CATEGORIES = [
  { id: 'all', label: 'All Collections', tag: 'All' },
  { id: 'weekend', label: 'Weekend Escapes', tag: 'Weekend Escapes' },
  { id: 'mountain', label: 'Mountain Retreats', tag: 'Mountain Retreats' },
  { id: 'culture', label: 'Culture & Heritage', tag: 'Culture & Heritage' },
  { id: 'food', label: 'Food Journeys', tag: 'Food Journeys' },
  { id: 'romantic', label: 'Romantic Getaways', tag: 'Romantic Getaways' },
  { id: 'budget', label: 'Budget Adventures', tag: 'Budget Adventures' },
  { id: 'hidden', label: 'Hidden Gems', tag: 'Hidden Gems' }
];

/**
 * Retrieves the stable reference to an existing canonical destination record.
 * Checks plannerDestinations first, then discoverDestinations, with a fallback.
 */
export function getCanonicalDestination(id) {
  if (!id) return null;
  const cleanId = String(id).toLowerCase().trim();

  // 1. Check plannerDestinations
  const fromPlanner = plannerDestinations.find(d => d.id.toLowerCase() === cleanId);
  if (fromPlanner) {
    return {
      id: fromPlanner.id,
      name: fromPlanner.name,
      country: fromPlanner.country,
      image: fromPlanner.image,
      defaultDur: fromPlanner.defaultDur || 3,
      defaultBud: fromPlanner.defaultBud || 10000
    };
  }

  // 2. Check discoverDestinations
  const fromDiscover = discoverDestinations.find(d => d.id.toLowerCase() === cleanId);
  if (fromDiscover) {
    return {
      id: fromDiscover.id,
      name: fromDiscover.name,
      country: fromDiscover.country,
      image: fromDiscover.image,
      defaultDur: fromDiscover.days || 3,
      defaultBud: fromDiscover.budget || 12000
    };
  }

  return null;
}

export const INSPIRATION_DESTINATIONS = [
  {
    id: 'jaipur',
    canonical: getCanonicalDestination('jaipur'),
    name: 'Jaipur',
    region: 'Rajasthan',
    country: 'India',
    heroImage: '/images/jaipur/amerfortandasheeshmahal.jpg',
    tagline: 'Centuries of Rajputana splendor, mirror palaces, and royal street craft.',
    description: 'The Pink City offers a poetic balance of monumental hilltop fortresses, vibrant block-print textiles, and quiet courtyards framed by desert sunsets.',
    editorialNarrative: 'From the mirror-mosaic chambers of Sheesh Mahal to twilight overlooking the Aravalli hills from Nahargarh, Jaipur is an open-air museum designed for contemplative wanderers.',
    durationText: '3 Days',
    durationDays: 3,
    budgetRange: '₹12,000 – ₹16,000',
    budgetEstimateNum: 14000,
    categories: ['weekend', 'culture', 'romantic'],
    categoryLabels: ['Culture & Heritage', 'Weekend Escapes', 'Romantic Getaways'],
    interests: ['History', 'Culture', 'Shopping', 'Art'],
    travelStyle: 'Balanced',
    isSpotlight: true,
    vignettes: [
      {
        title: 'Hawa Mahal Lattice',
        desc: '953 carved sandstone windows capturing desert breezes.',
        image: '/images/jaipur/hawamahal.jpg',
        cat: 'CULTURE'
      },
      {
        title: 'Johari Bazaar Crafts',
        desc: 'Ancient alleys of enameled silver, emeralds, and block prints.',
        image: '/images/jaipur/joharibazaar.jpg',
        cat: 'SHOPPING'
      },
      {
        title: 'Jal Mahal Floating Palace',
        desc: 'Tranquil water palace reflecting in the Man Sagar lake.',
        image: '/images/jaipur/jalmahal.jpg',
        cat: 'HERITAGE'
      }
    ],
    highlights: [
      'Ascend Amer Fort at golden hour for panoramic valley views',
      'Taste traditional pyaz kachoris and hand-churned lassi',
      'Private sunset tea overlooking Pink City rooftops'
    ]
  },
  {
    id: 'manali',
    canonical: getCanonicalDestination('manali'),
    name: 'Manali',
    region: 'Himachal Pradesh',
    country: 'India',
    heroImage: '/images/manali/rohtangpass.jpg',
    tagline: 'High Himalayan passes, ancient cedar groves, and whispering glacial rivers.',
    description: 'Perched in the upper reaches of the Beas River Valley, Manali balances tranquil pine forest sanctuaries with the raw exhilaration of 13,000-foot glacier trails.',
    editorialNarrative: 'A retreat for those seeking fresh mountain air and slow mornings. Walk between ancient deodar pines to the tiered pagoda of Hadimba Temple before ascending to the alpine snowfields of Rohtang.',
    durationText: '3–4 Days',
    durationDays: 3,
    budgetRange: '₹9,000 – ₹13,000',
    budgetEstimateNum: 10000,
    categories: ['mountain', 'budget', 'weekend'],
    categoryLabels: ['Mountain Retreats', 'Budget Adventures', 'Weekend Escapes'],
    interests: ['Nature', 'Adventure', 'Culture'],
    travelStyle: 'Balanced',
    isSpotlight: false,
    vignettes: [
      {
        title: 'Hadimba Wooden Pagoda',
        desc: '16th-century timber sanctuary hidden in giant deodar cedar pines.',
        image: '/images/manali/hadimbatemple.jpg',
        cat: 'NATURE'
      },
      {
        title: 'Jogini Cascading Trails',
        desc: 'Himalayan pine trail leading to sacred tumbling mountain waterfalls.',
        image: '/images/manali/joginiwaterfall.jpg',
        cat: 'ADVENTURE'
      },
      {
        title: 'Solang Alpine Panorama',
        desc: 'Wide mountain meadow framed by perennial snow-covered peaks.',
        image: '/images/manali/sollangvalley.jpg',
        cat: 'OUTDOOR'
      }
    ],
    highlights: [
      'Early morning trail to Jogini Waterfall through apple orchards',
      'Steaming hot Siddu and local herbal tea along Old Manali lanes',
      'Panoramic descent from Rohtang Pass into the Lahaul vista'
    ]
  },
  {
    id: 'new-delhi',
    canonical: getCanonicalDestination('new-delhi'),
    name: 'New Delhi',
    region: 'Delhi NCR',
    country: 'India',
    heroImage: "/images/newdelhi/Humayun's Tomb.jpg",
    tagline: 'Imperial Mughal axes, ancient sandstone minarets, and iconic culinary lanes.',
    description: 'Where seven historical cities layer over one another. Walk through monumental garden tombs, open-air art districts, and the labyrinthine aromas of Old Delhi.',
    editorialNarrative: 'A city that rewards the curious epicurean and history enthusiast. Morning light illuminates red sandstone Mughal archways before the scent of cardamom and hot jalebis draws you into centuries-old alleyways.',
    durationText: '2–3 Days',
    durationDays: 3,
    budgetRange: '₹7,000 – ₹10,000',
    budgetEstimateNum: 8000,
    categories: ['culture', 'food', 'weekend'],
    categoryLabels: ['Culture & Heritage', 'Food Journeys', 'Weekend Escapes'],
    interests: ['History', 'Food', 'Culture', 'Art'],
    travelStyle: 'Packed',
    isSpotlight: false,
    vignettes: [
      {
        title: "Humayun's Garden Tomb",
        desc: 'Red sandstone Persian-Mughal symmetry that inspired the Taj Mahal.',
        image: "/images/newdelhi/Humayun's Tomb.jpg",
        cat: 'CULTURE'
      },
      {
        title: 'Chandni Chowk Food Alleys',
        desc: 'Centuries-old culinary havelis, stuffed paranthas, and crisp jalebis.',
        image: '/images/newdelhi/chandnichowkfood.jpg',
        cat: 'FOOD'
      },
      {
        title: 'Lodhi Open-Air Art District',
        desc: 'Vibrant contemporary street murals woven into tree-lined avenues.',
        image: '/images/newdelhi/lodhiart.jpg',
        cat: 'ART'
      }
    ],
    highlights: [
      'Curated Old Delhi street walk through Khari Baoli spice market',
      'Quiet sunset stroll around the 12th-century Qutub Minar pillars',
      'Evening illuminated walk along India Gate boulevard'
    ]
  },
  {
    id: 'udaipur',
    canonical: getCanonicalDestination('udaipur'),
    name: 'Udaipur',
    region: 'Rajasthan',
    country: 'India',
    heroImage: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Reflective palace waters, marble balconies, and timeless lake romances.',
    description: 'Known as the City of Lakes, Udaipur presents an oasis of whitewashed palaces floating gently on Lake Pichola against the backdrop of the rugged Aravalli range.',
    editorialNarrative: 'Designed for unhurried intimacy and architectural reverence. Sunset boat cruises cast golden ripples on marble arches, while rooftop musicians echo classical melodies across the water.',
    durationText: '3–4 Days',
    durationDays: 4,
    budgetRange: '₹18,000 – ₹24,000',
    budgetEstimateNum: 20000,
    categories: ['romantic', 'culture', 'weekend'],
    categoryLabels: ['Romantic Getaways', 'Culture & Heritage', 'Weekend Escapes'],
    interests: ['Nature', 'Culture', 'History', 'Food'],
    travelStyle: 'Relaxed',
    isSpotlight: true,
    vignettes: [
      {
        title: 'City Palace Courtyards',
        desc: 'Mewar royal architecture with panoramic views of the water.',
        image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=600&q=80',
        cat: 'HERITAGE'
      },
      {
        title: 'Lake Pichola Golden Sunset',
        desc: 'Leisurely wooden boat cruises around the iconic island palaces.',
        image: 'https://images.unsplash.com/photo-1699949958644-64499c608946?auto=format&fit=crop&w=600&q=80',
        cat: 'ROMANCE'
      },
      {
        title: 'Saheliyon-ki-Bari Fountains',
        desc: 'Historic royal gardens with lotus pools and marble pavilion fountains.',
        image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
        cat: 'GARDEN'
      }
    ],
    highlights: [
      'Private sunset boat journey past the glowing Lake Palace',
      'Artisan miniature painting workshop in an old city haveli',
      'Candlelit dinner on a lakeside rooftop terrace overlooking the reflections'
    ]
  },
  {
    id: 'rishikesh',
    canonical: getCanonicalDestination('rishikesh'),
    name: 'Rishikesh',
    region: 'Uttarakhand',
    country: 'India',
    heroImage: 'https://images.unsplash.com/photo-1678788166239-b28733f56956?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Sacred river currents, Himalayan foothills, and mindful riverbanks.',
    description: 'Where the emerald waters of the Ganges leave the mountains. A sanctuary combining soulful evening river aartis, Ayurvedic cafes, and riverside mountain treks.',
    editorialNarrative: 'Step away from the fast world. Wake up to bell chimes echoing over misty river rapids, spend the afternoon on quiet forest trails, and watch floating earthen lamps drift into the twilight.',
    durationText: '3 Days',
    durationDays: 3,
    budgetRange: '₹8,000 – ₹12,000',
    budgetEstimateNum: 10000,
    categories: ['mountain', 'budget', 'hidden'],
    categoryLabels: ['Mountain Retreats', 'Budget Adventures', 'Hidden Gems'],
    interests: ['Nature', 'Adventure', 'Culture'],
    travelStyle: 'Relaxed',
    isSpotlight: false,
    vignettes: [
      {
        title: 'Triveni Ghat Evening Aarti',
        desc: 'Chants, sacred fire rituals, and floating oil lamps at dusk.',
        image: 'https://images.unsplash.com/photo-1716573260891-23ad993e8833?auto=format&fit=crop&w=600&q=80',
        cat: 'SPIRITUAL'
      },
      {
        title: 'Laxman Jhula Suspension Span',
        desc: 'Iron suspension bridge linking ashrams across the emerald river.',
        image: 'https://images.unsplash.com/photo-1718383538820-524dd564fd06?auto=format&fit=crop&w=600&q=80',
        cat: 'LANDMARK'
      },
      {
        title: 'Neer Garh Cascade Pool',
        desc: 'Cool turquoise natural rock pools secluded within jungle foothills.',
        image: 'https://images.unsplash.com/photo-1612016281262-e71991c805be?auto=format&fit=crop&w=600&q=80',
        cat: 'NATURE'
      }
    ],
    highlights: [
      'Early sunrise meditation session overlooking the Ganges gorge',
      'Walk to hidden waterfalls through quiet hillside villages',
      'Organic Ayurvedic culinary tasting at riverfront cafes'
    ]
  },
  {
    id: 'kyoto',
    canonical: getCanonicalDestination('kyoto'),
    name: 'Kyoto',
    region: 'Kansai',
    country: 'Japan',
    heroImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
    tagline: 'Quiet vermilion torii paths, moss gardens, and historic wooden machiya.',
    description: 'Japan’s cultural heart preserves centuries of Zen aesthetics, morning temple rituals, and tea houses framed by weeping cherry blossoms and maple leaves.',
    editorialNarrative: 'Kyoto reveals its soul in the stillness of dawn. Wander through the towering green stalks of Arashiyama before the crowds awaken, then lose track of time in wooden teahouses in Gion.',
    durationText: '5 Days',
    durationDays: 5,
    budgetRange: '₹28,000 – ₹36,000',
    budgetEstimateNum: 30000,
    categories: ['culture', 'romantic', 'food'],
    categoryLabels: ['Culture & Heritage', 'Romantic Getaways', 'Food Journeys'],
    interests: ['Culture', 'Food', 'Nature', 'History'],
    travelStyle: 'Balanced',
    isSpotlight: true,
    vignettes: [
      {
        title: 'Fushimi Inari Torii Gateways',
        desc: 'Thousands of vivid vermilion shrines ascending the sacred mountain.',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
        cat: 'CULTURE'
      },
      {
        title: 'Gion Machiya District',
        desc: 'Preserved wooden merchant houses glowing with evening paper lanterns.',
        image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
        cat: 'HERITAGE'
      },
      {
        title: 'Nishiki Culinary Market',
        desc: 'Four centuries of artisanal matcha, fresh sashimi, and pickled delicacies.',
        image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
        cat: 'FOOD'
      }
    ],
    highlights: [
      'Early morning walk through the secluded upper paths of Fushimi Inari',
      'Traditional matcha whisking ceremony at a historic Zen temple',
      'Evening seasonal kaiseki dining alongside the Kamogawa riverbank'
    ]
  },
  {
    id: 'mostar',
    canonical: getCanonicalDestination('mostar'),
    name: 'Mostar',
    region: 'Herzegovina',
    country: 'Bosnia & Herzegovina',
    heroImage: '/images/stari_most_bridge.jpeg',
    tagline: 'The iconic Ottoman arch, turquoise river gorges, and copper artisan bazaars.',
    description: 'A striking cultural crossroads where Ottoman stone architecture meets European stone alleys over the vibrant turquoise waters of the Neretva River.',
    editorialNarrative: 'Stari Most stands as a testament to craftsmanship and resilience. Sit by a riverside tavern with rich Bosnian coffee poured from copper dzezvas as local divers plunge into the turquoise depths.',
    durationText: '2–3 Days',
    durationDays: 2,
    budgetRange: '₹14,000 – ₹19,000',
    budgetEstimateNum: 16000,
    categories: ['hidden', 'culture', 'budget'],
    categoryLabels: ['Hidden Gems', 'Culture & Heritage', 'Budget Adventures'],
    interests: ['History', 'Culture', 'Shopping', 'Nature'],
    travelStyle: 'Balanced',
    isSpotlight: false,
    vignettes: [
      {
        title: 'Stari Most Ottoman Arch',
        desc: 'The famed 16th-century crescent bridge spanning the river gorge.',
        image: '/images/stari_most_bridge.jpeg',
        cat: 'LANDMARK'
      },
      {
        title: 'Kujundziluk Coppersmith Bazaar',
        desc: 'Cobblestone artisan street echoing with hammer strikes on brass lamps.',
        image: '/images/jaipur/joharibazaar.jpg',
        cat: 'CRAFT'
      },
      {
        title: 'Koski Mehmed Pasha Minaret',
        desc: 'Panoramic viewpoint across stone rooftops and emerald river currents.',
        image: '/images/firstImage.jpeg',
        cat: 'VISTA'
      }
    ],
    highlights: [
      'Watch daring local divers leap 24 meters from the peak of Stari Most',
      'Sample warm cevapi with kajmak in stone courtyards beside the water',
      'Climb the mosque minaret for the definitive photograph of the bridge'
    ]
  },
  {
    id: 'istanbul',
    canonical: getCanonicalDestination('istanbul'),
    name: 'Istanbul',
    region: 'Marmara',
    country: 'Turkey',
    heroImage: 'https://images.unsplash.com/photo-1688668766801-b75f4e2571df?auto=format&fit=crop&w=1800&q=80',
    tagline: 'Where continents collide: Byzantine domes, spice bazaars, and Bosphorus sunsets.',
    description: 'A vibrant metropolis straddling Europe and Asia. Historic minarets punctuate the skyline as ferries cross the strait amid the call to prayer and the aroma of roasted chestnuts.',
    editorialNarrative: 'Istanbul is pure sensory immersion. Begin under the soaring mosaics of Hagia Sophia, navigate four thousand vaulted shops in the Grand Bazaar, and end on a sunset ferry with views of gilded palaces.',
    durationText: '4–5 Days',
    durationDays: 4,
    budgetRange: '₹22,000 – ₹28,000',
    budgetEstimateNum: 25000,
    categories: ['food', 'culture', 'hidden'],
    categoryLabels: ['Food Journeys', 'Culture & Heritage', 'Hidden Gems'],
    interests: ['History', 'Food', 'Culture', 'Shopping'],
    travelStyle: 'Packed',
    isSpotlight: false,
    vignettes: [
      {
        title: 'Hagia Sophia Byzantine Domes',
        desc: 'Grand 6th-century basilica with golden mosaics and soaring arches.',
        image: 'https://images.unsplash.com/photo-1688668766801-b75f4e2571df?auto=format&fit=crop&w=600&q=80',
        cat: 'HISTORY'
      },
      {
        title: 'Grand Bazaar Vaulted Alleys',
        desc: 'Vast sensory maze of hand-painted ceramics, carpets, and lantern shops.',
        image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
        cat: 'SHOPPING'
      },
      {
        title: 'Bosphorus Sunset Ferry Route',
        desc: 'Scenic water transit linking European historic quarters to Asian shores.',
        image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=600&q=80',
        cat: 'EXPERIENCE'
      }
    ],
    highlights: [
      'Sunset ferry between Karakoy and Kadikoy with hot Turkish cay',
      'Artisanal simit and meze tasting in the culinary quarter of Beyoglu',
      'Marveling at the intricate Blue Mosque tilework in quiet morning light'
    ]
  },
  {
    id: 'florence',
    canonical: getCanonicalDestination('florence'),
    name: 'Florence',
    region: 'Tuscany',
    country: 'Italy',
    heroImage: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80',
    tagline: 'Cradle of the Renaissance, terracotta rooftops, and timeless Tuscan flavors.',
    description: 'Florence is an intimate masterpiece carved in sandstone and marble. Home to world-defining art, shaded medieval piazzas, and the romance of the Arno River.',
    editorialNarrative: 'Walk where Michelangelo and da Vinci once walked. Gaze upon the iconic terracotta dome of Brunelleschi, taste freshly rolled pasta at bustling food halls, and cross the Ponte Vecchio at dusk.',
    durationText: '4 Days',
    durationDays: 4,
    budgetRange: '₹26,000 – ₹34,000',
    budgetEstimateNum: 28000,
    categories: ['romantic', 'culture', 'food'],
    categoryLabels: ['Romantic Getaways', 'Culture & Heritage', 'Food Journeys'],
    interests: ['Art', 'History', 'Culture', 'Food'],
    travelStyle: 'Balanced',
    isSpotlight: false,
    vignettes: [
      {
        title: 'Brunelleschi Terracotta Duomo',
        desc: 'Iconic Renaissance dome crowning the Florentine terracotta skyline.',
        image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=600&q=80',
        cat: 'ART'
      },
      {
        title: 'Ponte Vecchio Jeweler Bridge',
        desc: 'Medieval stone arch bridge sheltering gold and silver boutiques.',
        image: 'https://images.unsplash.com/photo-1534445867742-43195f401b6c?auto=format&fit=crop&w=600&q=80',
        cat: 'ROMANCE'
      },
      {
        title: 'Mercato Centrale Truffles & Wine',
        desc: 'Bustling two-story market hall for fresh pasta, pecorino, and Chianti.',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        cat: 'FOOD'
      }
    ],
    highlights: [
      'Climb the Giotto Campanile for unbroken vistas over Tuscan hills',
      'Artisanal gelato tasting along the tranquil Oltrarno artisan district',
      'Evening golden hour overlooking Florence from Piazzale Michelangelo'
    ]
  }
];

/**
 * Standardized Trip Configurator Contract Formatter
 * 
 * Formats an inspired destination into the exact payload expected by
 * TripConfiguratorPage (localStorage key: 'dastaanTrip').
 * 
 * Prefills only fields supported by the existing configurator:
 * - destination: { id, name, country, image, defaultDur, defaultBud }
 * - duration: integer
 * - budget: integer
 * - interests: string[] (matching availableInterests)
 * - travelStyle: 'Relaxed' | 'Balanced' | 'Packed'
 */
export function formatTripPayload(dest) {
  if (!dest) return null;

  // Retrieve canonical record or construct resilient fallback
  const canonical = dest.canonical || getCanonicalDestination(dest.id) || {
    id: dest.id || 'destination',
    name: dest.name || 'Destination',
    country: dest.country || 'India',
    image: dest.heroImage || '/images/jaipur/amerfortandasheeshmahal.jpg',
    defaultDur: dest.durationDays || 3,
    defaultBud: dest.budgetEstimateNum || 10000
  };

  return {
    destination: {
      id: canonical.id,
      name: canonical.name,
      country: canonical.country,
      image: canonical.image || dest.heroImage,
      defaultDur: canonical.defaultDur || dest.durationDays || 3,
      defaultBud: canonical.defaultBud || dest.budgetEstimateNum || 10000
    },
    duration: dest.durationDays || canonical.defaultDur || 3,
    budget: dest.budgetEstimateNum || canonical.defaultBud || 10000,
    interests: Array.isArray(dest.interests) ? dest.interests : ['Culture', 'Nature'],
    travelStyle: dest.travelStyle || 'Balanced'
  };
}
