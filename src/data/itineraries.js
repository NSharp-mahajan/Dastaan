/**
 * Curated Day-by-Day Itineraries Dataset for Dastaan (Page 3)
 */

export const localImageMap = {
  // Destinations
  "manali": "/images/manali/rohtangpass.jpg",
  "new delhi": "/images/newdelhi/indiagate.jpg",
  "new-delhi": "/images/newdelhi/indiagate.jpg",
  "jaipur": "/images/jaipur/amerfortandasheeshmahal.jpg",
  "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80",
  "mostar": "https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80",
  "florence": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80",
  "istanbul": "https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80",

  // New Delhi Activities
  "humayun's tomb": "/images/newdelhi/Humayun's Tomb.jpg",
  "humayun tomb": "/images/newdelhi/Humayun's Tomb.jpg",
  "chandni chowk food walk": "/images/newdelhi/chandnichowkfood.jpg",
  "chandni chowk": "/images/newdelhi/chandnichowkfood.jpg",
  "india gate & kartavya path": "/images/newdelhi/indiagate.jpg",
  "india gate": "/images/newdelhi/indiagate.jpg",
  "qutub minar complex": "/images/newdelhi/qutubminar.jpg",
  "qutub minar": "/images/newdelhi/qutubminar.jpg",
  "lodhi art district": "/images/newdelhi/lodhiart.jpg",
  "lodhi art": "/images/newdelhi/lodhiart.jpg",
  "hauz khas village sunset": "/images/newdelhi/sunsethauzkhas.jpg",
  "hauz khas": "/images/newdelhi/sunsethauzkhas.jpg",

  // Jaipur Activities
  "amer fort & sheesh mahal": "/images/jaipur/amerfortandasheeshmahal.jpg",
  "amer fort": "/images/jaipur/amerfortandasheeshmahal.jpg",
  "hawa mahal (palace of winds)": "/images/jaipur/hawamahal.jpg",
  "hawa mahal": "/images/jaipur/hawamahal.jpg",
  "johari bazaar crafts": "/images/jaipur/joharibazaar.jpg",
  "johari bazaar": "/images/jaipur/joharibazaar.jpg",
  "jal mahal (water palace)": "/images/jaipur/jalmahal.jpg",
  "jal mahal": "/images/jaipur/jalmahal.jpg",
  "albert hall museum": "/images/jaipur/albert museum.jpg",
  "albert museum": "/images/jaipur/albert museum.jpg",
  "nahargarh fort sunset": "/images/jaipur/nahargarhfort.jpg",
  "nahargarh fort": "/images/jaipur/nahargarhfort.jpg",

  // Manali Activities
  "hadimba temple": "/images/manali/hadimbatemple.jpg",
  "jogini waterfall trek": "/images/manali/joginiwaterfall.jpg",
  "jogini waterfall": "/images/manali/joginiwaterfall.jpg",
  "mall road exploration": "/images/manali/mallroad.jpg",
  "mall road": "/images/manali/mallroad.jpg",
  "solang valley": "/images/manali/sollangvalley.jpg",
  "rohtang pass": "/images/manali/rohtangpass.jpg",
  "manikaran hot springs": "/images/manali/manikaran.jpg",
  "manikaran": "/images/manali/manikaran.jpg"
};

export const interestImages = {
  'History': "/images/newdelhi/Humayun's Tomb.jpg",
  'Food': "/images/newdelhi/chandnichowkfood.jpg",
  'Culture': "/images/jaipur/hawamahal.jpg",
  'Art': "/images/newdelhi/lodhiart.jpg",
  'Nature': "/images/manali/joginiwaterfall.jpg",
  'Shopping': "/images/jaipur/joharibazaar.jpg",
  'Adventure': "/images/manali/sollangvalley.jpg",
  'Nightlife': "/images/newdelhi/sunsethauzkhas.jpg"
};

export const interestExplanations = {
  'History': 'Historic districts, UNESCO heritage sites, and centuries-old landmarks have been prioritized in your daily route.',
  'Food': 'Authentic street markets, local culinary workshops, and renowned dining spots are woven into your schedule.',
  'Nature': 'Botanical gardens, scenic lookouts, and tranquil outdoor escapes offer peaceful breaks throughout your journey.',
  'Culture': 'Local artisan workshops, traditional performances, and sacred architecture are central to your daily path.',
  'Shopping': 'Boutique artisan alleys, craft bazaars, and local designer markets are allocated dedicated exploration time.',
  'Art': 'Contemporary art galleries, open-air street murals, and design hubs enrich your sightseeing schedule.',
  'Adventure': 'Active walking routes, panoramic climbs, and exhilarating outdoor pursuits keep your journey dynamic.',
  'Nightlife': 'Illuminated night markets, atmospheric riverfront lounges, and evening strolls complete your nights.'
};

export const mockItineraries = {
  'manali': {
    name: 'Manali',
    country: 'India',
    image: '/images/manali/rohtangpass.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'SACRED FORESTS & MOUNTAIN TRAILS',
        activities: [
          { time: '09:00', title: 'Hadimba Temple', desc: 'Visit the ancient pagoda-style wooden temple sheltered among towering cedar pine forests.', cat: 'CULTURE', imageLabel: 'HADIMBA TEMPLE · CULTURE', image: '/images/manali/hadimbatemple.jpg', layout: 'image-right' },
          { time: '12:30', title: 'Jogini Waterfall Trek', desc: 'Scenic trek through pine trails to sacred cascading mountain waterfalls.', cat: 'NATURE', imageLabel: 'JOGINI WATERFALL · NATURE', image: '/images/manali/joginiwaterfall.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Mall Road Exploration', desc: 'Stroll through the lively street market for Kullu shawls, local cafes, and hot street food.', cat: 'SHOPPING', imageLabel: 'MALL ROAD · SHOPPING', image: '/images/manali/mallroad.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'HIGH PASS ADVENTURES & SPRINGS',
        activities: [
          { time: '09:00', title: 'Solang Valley', desc: 'Experience thrilling paragliding, ropeway rides, and snow valley panoramas.', cat: 'ADVENTURE', imageLabel: 'SOLANG VALLEY · ADVENTURE', image: '/images/manali/sollangvalley.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Rohtang Pass', desc: 'Ascend 13,000 ft to breathtaking glacier vistas and snow-capped Himalayan peaks.', cat: 'NATURE', imageLabel: 'ROHTANG PASS · NATURE', image: '/images/manali/rohtangpass.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Manikaran Hot Springs', desc: 'Rejuvenate in natural thermal hot springs beside the rushing Parvati River.', cat: 'RELAX', imageLabel: 'MANIKARAN HOT SPRINGS · RELAX', image: '/images/manali/manikaran.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'new-delhi': {
    name: 'New Delhi',
    country: 'India',
    image: '/images/newdelhi/indiagate.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'MUGHAL HERITAGE & IMPERIAL AXIS',
        activities: [
          { time: '09:00', title: "Humayun's Tomb", desc: 'Explore the grand red sandstone Mughal garden tomb that inspired the Taj Mahal.', cat: 'CULTURE', imageLabel: "HUMAYUN TOMB · CULTURE", image: "/images/newdelhi/Humayun's Tomb.jpg", layout: 'image-right' },
          { time: '13:00', title: 'Chandni Chowk Food Walk', desc: 'Dive into Old Delhi\'s bustling lanes for legendary paranthas, jalebis, chaat, and spices.', cat: 'FOOD', imageLabel: 'CHANDNI CHOWK · FOOD', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '17:00', title: 'India Gate & Kartavya Path', desc: 'Evening stroll along the ceremonial boulevard under warm golden floodlights.', cat: 'CULTURE', imageLabel: 'INDIA GATE · CULTURE', image: '/images/newdelhi/indiagate.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'ANCIENT SANCTUARIES & MODERN ART',
        activities: [
          { time: '09:30', title: 'Qutub Minar Complex', desc: 'Walk among ancient 12th-century stone minarets and intricate carved sandstone pillars.', cat: 'HISTORY', imageLabel: 'QUTUB MINAR · HISTORY', image: '/images/newdelhi/qutubminar.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Lodhi Art District', desc: 'Discover vibrant open-air street murals created by global urban artists.', cat: 'ART', imageLabel: 'LODHI ART DISTRICT · ART', image: '/images/newdelhi/lodhiart.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Hauz Khas Village Sunset', desc: 'Relax by medieval reservoir ruins surrounded by trendy boutiques and rooftop cafes.', cat: 'RELAX', imageLabel: 'HAUZ KHAS LAKE · RELAX', image: '/images/newdelhi/sunsethauzkhas.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'jaipur': {
    name: 'Jaipur',
    country: 'India',
    image: '/images/jaipur/amerfortandasheeshmahal.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'ROYAL PALACES & PINK CITY BAZAARS',
        activities: [
          { time: '09:00', title: 'Amer Fort & Sheesh Mahal', desc: 'Ascend the hilltop fortress to admire mirror palace craft and royal courtyards.', cat: 'HISTORY', imageLabel: 'AMER FORT · HISTORY', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Hawa Mahal (Palace of Winds)', desc: 'Marvel at the 953 honeycomb lattice windows designed for royal court ladies.', cat: 'CULTURE', imageLabel: 'HAWA MAHAL · CULTURE', image: '/images/jaipur/hawamahal.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Johari Bazaar Crafts', desc: 'Shop traditional block-printed textiles, silver jewelry, and famous Jaipur handicrafts.', cat: 'SHOPPING', imageLabel: 'JOHARI BAZAAR · SHOPPING', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'FORTRESS VISTAS & HERITAGE MUSEUMS',
        activities: [
          { time: '09:00', title: 'Jal Mahal (Water Palace)', desc: 'Admire the peaceful palace floating gracefully in the middle of Man Sagar Lake.', cat: 'CULTURE', imageLabel: 'JAL MAHAL · CULTURE', image: '/images/jaipur/jalmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Albert Hall Museum', desc: 'Explore Indo-Saracenic architecture showcasing ancient Rajasthani artifacts and paintings.', cat: 'ART', imageLabel: 'ALBERT HALL · ART', image: '/images/jaipur/albert museum.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Nahargarh Fort Sunset', desc: 'Watch the golden sun dip below the Aravalli hills with panoramic views over the Pink City.', cat: 'RELAX', imageLabel: 'NAHARGARH FORT · RELAX', image: '/images/jaipur/nahargarhfort.jpg', layout: 'image-right' }
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
          { time: '09:00', title: 'Fushimi Inari Shrine', desc: 'Walk through the iconic thousands of vermilion torii gates before the crowds arrive.', cat: 'CULTURE', imageLabel: 'FUSHIMI INARI SHRINE · CULTURE', image: '/images/image1.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Nishiki Market', desc: 'Explore Kyoto\'s historic kitchen market and sample fresh local delicacies and street food.', cat: 'FOOD', imageLabel: 'NISHIKI MARKET · FOOD', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Gion District', desc: 'Stroll through preserved wooden machiya houses as traditional lanterns illuminate the streets.', cat: 'HISTORY', imageLabel: 'GION HISTORIC DISTRICT · HISTORY', image: '/images/image2.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'BAMBOO GROVES & ZEN GARDENS',
        activities: [
          { time: '08:30', title: 'Arashiyama Bamboo Grove', desc: 'Immerse in the towering green stalks of Arashiyama in the quiet morning light.', cat: 'NATURE', imageLabel: 'ARASHIYAMA BAMBOO GROVE · NATURE', image: '/images/image3.jpg', layout: 'image-right' },
          { time: '12:00', title: 'Tenryu-ji Temple', desc: 'Marvel at UNESCO World Heritage Zen landscaping framed by mountain silhouettes.', cat: 'CULTURE', imageLabel: 'TENRYU-JI TEMPLE · CULTURE', image: '/images/image4.jpg', layout: 'image-left' },
          { time: '15:30', title: 'Okochi Sanso Villa', desc: 'Relax at a samurai actor\'s estate with hot ceremonial matcha and panoramic valley views.', cat: 'RELAX', imageLabel: 'OKOCHI SANSO VILLA · RELAX', image: '/images/manali/sollangvalley.jpg', layout: 'image-right' }
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
          { time: '09:30', title: 'Stari Most (Old Bridge)', desc: 'Witness the iconic Ottoman arch bridge spanning the turquoise Neretva River.', cat: 'HISTORY', imageLabel: 'STARI MOST · HISTORY', image: '/images/image4.jpg', layout: 'image-right' },
          { time: '12:30', title: 'Kujundziluk Old Bazaar', desc: 'Browse handcrafted copperware, traditional lamps, and authentic Bosnian coffee sets.', cat: 'SHOPPING', imageLabel: 'OLD BAZAAR · SHOPPING', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Koski Mehmed Pasha Mosque', desc: 'Climb the minaret for breathtaking panoramic vistas over Mostar\'s stone rooftops.', cat: 'CULTURE', imageLabel: 'KOSKI MOSQUE · CULTURE', image: '/images/image2.jpg', layout: 'image-right' }
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
          { time: '09:00', title: 'Duomo di Milano & Brunelleschi Dome', desc: 'Ascend the terracotta dome for unrivaled views over Tuscan red tile roofs.', cat: 'CULTURE', imageLabel: 'FLORENCE DUOMO · CULTURE', image: '/images/image3.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Mercato Centrale Lunch', desc: 'Savor fresh truffle pasta, artisanal cheeses, and Tuscan Chianti wines.', cat: 'FOOD', imageLabel: 'MERCATO CENTRALE · FOOD', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Uffizi Gallery Exploration', desc: 'Admire iconic Renaissance masterpieces by Botticelli, da Vinci, and Michelangelo.', cat: 'ART', imageLabel: 'UFFIZI GALLERY · ART', image: '/images/newdelhi/lodhiart.jpg', layout: 'image-right' }
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
          { time: '09:00', title: 'Hagia Sophia & Blue Mosque', desc: 'Step inside timeless Byzantine domes and magnificent Iznik tile sanctuary walls.', cat: 'HISTORY', imageLabel: 'HAGIA SOPHIA · HISTORY', image: '/images/image4.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Grand Bazaar & Spice Market', desc: 'Immense sensory journey through aromatic spices, Turkish delight, and ceramics.', cat: 'SHOPPING', imageLabel: 'GRAND BAZAAR · SHOPPING', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Bosphorus Sunset Cruise', desc: 'Sail between Europe and Asia as palaces and minarets glow against the sunset skyline.', cat: 'CULTURE', imageLabel: 'BOSPHORUS CRUISE · CULTURE', image: '/images/image2.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'default': {
    name: 'Destination Escapes',
    country: 'World',
    image: '/images/newdelhi/indiagate.jpg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'HISTORIC CENTER & FLAVORS',
        activities: [
          { time: '09:30', title: 'Historic Old Town Walk', desc: 'Discover central architectural monuments, cobblestone plazas, and local heritage.', cat: 'CULTURE', imageLabel: 'OLD TOWN WALK · CULTURE', image: "/images/newdelhi/Humayun's Tomb.jpg", layout: 'image-right' },
          { time: '13:00', title: 'Artisanal Culinary Tasting', desc: 'Sample regional culinary specialties and handcrafted traditional dishes.', cat: 'FOOD', imageLabel: 'CULINARY TASTING · FOOD', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:00', title: 'Scenic Outlook & Sunset', desc: 'Unwind with panoramic city views as evening lights illuminate the horizon.', cat: 'NATURE', imageLabel: 'SCENIC OUTLOOK · NATURE', image: '/images/manali/sollangvalley.jpg', layout: 'image-right' }
        ]
      }
    ]
  }
};

export function resolveImage(keyOrTitle, providedImage) {
  const k = (keyOrTitle || '').toLowerCase().trim();
  if (localImageMap[k]) {
    return localImageMap[k];
  }
  if (providedImage) {
    if (providedImage.startsWith('../images/')) {
      return providedImage.replace('../images/', '/images/');
    }
    if (providedImage.startsWith('images/')) {
      return '/' + providedImage;
    }
    return providedImage;
  }
  return '';
}
