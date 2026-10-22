/**
 * Server-side Itinerary Generator for Dastaan
 * Generates personalized, day-by-day itineraries based on destination,
 * duration, budget, travel style, and interests.
 */

export const destinationTemplates = {
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
    name: 'Curated Escapes',
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

/**
 * Generate a complete, formatted itinerary object for a trip.
 */
export function generateItinerary({ destination, duration = 3, budget = 8000, travelStyle = 'Balanced', interests = [] }) {
  const destId = (destination?.id || '').toLowerCase().trim();
  const template = destinationTemplates[destId] || destinationTemplates['default'];
  const templateDays = template.days && template.days.length > 0 ? template.days : destinationTemplates['default'].days;
  const destName = destination?.name || template.name;

  // Build dynamic tagline
  let tagline = `A ${travelStyle.toLowerCase()} journey`;
  if (Array.isArray(interests) && interests.length > 0) {
    tagline += ` through ${destName}'s ${interests.join(', ').toLowerCase()}`;
  } else {
    tagline += ` through ${destName}'s cultural landmarks and local escapes`;
  }
  tagline += '.';

  // Pace overview description
  const overview = travelStyle.toLowerCase() === 'relaxed'
    ? 'More breathing room between experiences. Your relaxed travel style keeps the itinerary comfortable while staying within your selected budget.'
    : travelStyle.toLowerCase() === 'packed'
    ? 'More experiences with less downtime. Your packed travel style maximizes every hour while staying within your selected budget.'
    : 'A comfortable mix of exploration and downtime. Your balanced travel style keeps the itinerary comfortable while staying within your selected budget.';

  // Budget breakdown
  const breakdown = [
    { name: 'Accommodation', pct: 40, amount: Math.round(budget * 0.40), color: '#D6B56D' },
    { name: 'Food', pct: 25, amount: Math.round(budget * 0.25), color: '#C87955' },
    { name: 'Transport', pct: 15, amount: Math.round(budget * 0.15), color: '#7F9087' },
    { name: 'Activities', pct: 15, amount: Math.round(budget * 0.15), color: '#F4EFE3' },
    { name: 'Buffer', pct: 5, amount: Math.round(budget * 0.05), color: 'rgba(214, 181, 109, 0.35)' }
  ];

  // Generate days based on duration
  const totalDays = Math.max(1, Math.min(60, parseInt(duration, 10) || 3));
  const days = [];

  for (let i = 1; i <= totalDays; i++) {
    const templateDay = templateDays[(i - 1) % templateDays.length];
    
    // Clone activities and ensure valid layout and labels
    const activities = (templateDay.activities || []).map((act, idx) => ({
      time: act.time || '10:00',
      title: act.title,
      desc: act.desc || '',
      cat: act.cat || 'EXPLORE',
      image: act.image || template.image,
      imageLabel: act.imageLabel || `${act.title.toUpperCase()} · ${act.cat || 'EXPLORE'}`,
      layout: act.layout || (idx % 2 === 0 ? 'image-right' : 'image-left')
    }));

    days.push({
      dayNum: i,
      dayTitle: i <= templateDays.length
        ? templateDay.dayTitle
        : `${templateDay.dayTitle} (PART ${Math.floor((i - 1) / templateDays.length) + 1})`,
      activities
    });
  }

  return {
    tagline,
    overview,
    breakdown,
    days
  };
}

export default generateItinerary;
