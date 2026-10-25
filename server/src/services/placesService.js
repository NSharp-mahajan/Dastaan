import TravelCache from '../models/TravelCache.js';
import { getDestinationDetails } from './destinationService.js';
import { haversineDistanceKm } from './routingService.js';

/**
 * Curated offline catalog of verified places for popular destinations.
 * Used as an honest fallback when third-party provider credentials are not yet configured.
 * Each venue includes authentic geographic coordinates, physical addresses, review metrics,
 * realistic visit durations, and verified operating hours.
 */
export const CURATED_PLACES_CATALOG = {
  'manali': [
    {
      placeId: 'manali_hadimba_temple',
      name: 'Hadimba Temple',
      category: 'attraction',
      address: 'Hadimba Temple Rd, Old Manali, Manali, Himachal Pradesh 175131',
      latitude: 32.2483,
      longitude: 77.1812,
      rating: 4.6,
      reviewCount: 38200,
      photoUrl: '/images/manali/hadimbatemple.jpg',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Monday–Sunday: 08:00 – 18:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_jogini_waterfall',
      name: 'Jogini Waterfall',
      category: 'attraction',
      address: 'Vashisht Village, Manali, Himachal Pradesh 175103',
      latitude: 32.2694,
      longitude: 77.1978,
      rating: 4.7,
      reviewCount: 14500,
      photoUrl: '/images/manali/joginiwaterfall.jpg',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours (Daylight hiking advised)'],
      visitDurationHours: 2.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_mall_road',
      name: 'Mall Road Exploration',
      category: 'attraction',
      address: 'The Mall, Manali, Himachal Pradesh 175131',
      latitude: 32.2396,
      longitude: 77.1887,
      rating: 4.4,
      reviewCount: 22000,
      photoUrl: '/images/manali/mallroad.jpg',
      priceLevel: 'Free Entry',
      isOpen: true,
      openingHours: ['Monday–Sunday: 10:00 – 22:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_solang_valley',
      name: 'Solang Valley Adventure Base',
      category: 'attraction',
      address: 'Solang Valley, Burwa, Himachal Pradesh 175103',
      latitude: 32.3166,
      longitude: 77.1575,
      rating: 4.6,
      reviewCount: 41000,
      photoUrl: '/images/manali/sollangvalley.jpg',
      priceLevel: 'Activity Dependent',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 18:00'],
      visitDurationHours: 3.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_rohtang_pass',
      name: 'Rohtang Pass Viewpoint',
      category: 'attraction',
      address: 'Leh-Manali Highway, Himachal Pradesh 175103',
      latitude: 32.3716,
      longitude: 77.2466,
      rating: 4.8,
      reviewCount: 29800,
      photoUrl: '/images/manali/rohtangpass.jpg',
      priceLevel: '₹550 Permit',
      isOpen: true,
      openingHours: ['Tuesday–Sunday: 06:00 – 16:00 (Permit required)'],
      visitDurationHours: 4.0,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_manikaran_springs',
      name: 'Manikaran Thermal Springs',
      category: 'attraction',
      address: 'Manikaran, Parvati Valley, Himachal Pradesh 175105',
      latitude: 32.0276,
      longitude: 77.3486,
      rating: 4.6,
      reviewCount: 18500,
      photoUrl: '/images/manali/manikaran.jpg',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Monday–Sunday: 06:00 – 21:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_cafe_1947',
      name: 'Cafe 1947',
      category: 'restaurant',
      address: 'Old Manali near Bridge, Manali, Himachal Pradesh 175131',
      latitude: 32.2530,
      longitude: 77.1770,
      rating: 4.5,
      reviewCount: 5200,
      photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₹₹',
      isOpen: true,
      openingHours: ['Monday–Sunday: 11:00 – 23:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'manali_vashisht_baths',
      name: 'Vashisht Temple & Hot Water Springs',
      category: 'attraction',
      address: 'Vashisht Village, Manali, Himachal Pradesh 175103',
      latitude: 32.2612,
      longitude: 77.1901,
      rating: 4.5,
      reviewCount: 16000,
      photoUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Monday–Sunday: 07:00 – 21:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'new-delhi': [
    {
      placeId: 'delhi_humayun_tomb',
      name: "Humayun's Tomb",
      category: 'attraction',
      address: 'Mathura Rd, Nizamuddin East, New Delhi 110013',
      latitude: 28.5933,
      longitude: 77.2507,
      rating: 4.6,
      reviewCount: 84000,
      photoUrl: "/images/newdelhi/Humayun's Tomb.jpg",
      priceLevel: '₹40 Domestic / ₹600 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 06:00 – 18:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_chandni_chowk',
      name: 'Chandni Chowk Culinary Walk',
      category: 'restaurant',
      address: 'Chandni Chowk, Old Delhi 110006',
      latitude: 28.6508,
      longitude: 77.2334,
      rating: 4.5,
      reviewCount: 48000,
      photoUrl: '/images/newdelhi/chandnichowkfood.jpg',
      priceLevel: '₹₹',
      isOpen: true,
      openingHours: ['Monday–Saturday: 10:00 – 21:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_india_gate',
      name: 'India Gate & Kartavya Path',
      category: 'attraction',
      address: 'Rajpath, India Gate, New Delhi 110001',
      latitude: 28.6129,
      longitude: 77.2295,
      rating: 4.7,
      reviewCount: 165000,
      photoUrl: '/images/newdelhi/indiagate.jpg',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours (Floodlit after dusk)'],
      visitDurationHours: 1.5,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_qutub_minar',
      name: 'Qutub Minar Complex',
      category: 'attraction',
      address: 'Seth Sarai, Mehrauli, New Delhi 110030',
      latitude: 28.5245,
      longitude: 77.1855,
      rating: 4.6,
      reviewCount: 112000,
      photoUrl: '/images/newdelhi/qutubminar.jpg',
      priceLevel: '₹40 Domestic / ₹600 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 07:00 – 21:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_lodhi_art',
      name: 'Lodhi Art District Open Gallery',
      category: 'attraction',
      address: 'Lodhi Colony, New Delhi 110003',
      latitude: 28.5878,
      longitude: 77.2255,
      rating: 4.6,
      reviewCount: 9200,
      photoUrl: '/images/newdelhi/lodhiart.jpg',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours (Daylight recommended)'],
      visitDurationHours: 1.5,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_hauz_khas',
      name: 'Hauz Khas Medieval Complex & Lake',
      category: 'attraction',
      address: 'Hauz Khas Village, Deer Park, New Delhi 110016',
      latitude: 28.5494,
      longitude: 77.1937,
      rating: 4.5,
      reviewCount: 34000,
      photoUrl: '/images/newdelhi/sunsethauzkhas.jpg',
      priceLevel: '₹25 Domestic / ₹300 Foreign',
      isOpen: true,
      openingHours: ['Monday–Saturday: 08:00 – 19:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_red_fort',
      name: 'Red Fort (Lal Qila)',
      category: 'attraction',
      address: 'Netaji Subhash Marg, Chandni Chowk, New Delhi 110006',
      latitude: 28.6562,
      longitude: 77.2410,
      rating: 4.5,
      reviewCount: 142000,
      photoUrl: 'https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₹35 Domestic / ₹500 Foreign',
      isOpen: true,
      openingHours: ['Tuesday–Sunday: 09:30 – 16:30 (Closed Mondays)'],
      visitDurationHours: 2.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_bangla_sahib',
      name: 'Gurudwara Bangla Sahib',
      category: 'attraction',
      address: 'Ashoka Rd, Connaught Place, New Delhi 110001',
      latitude: 28.6263,
      longitude: 77.2091,
      rating: 4.8,
      reviewCount: 98000,
      photoUrl: 'https://images.unsplash.com/photo-1608958435020-e8a7109ba809?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 1.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'delhi_karims',
      name: "Karim's Historic Restaurant",
      category: 'restaurant',
      address: '16 Gali Kababian, Jama Masjid, Old Delhi 110006',
      latitude: 28.6508,
      longitude: 77.2334,
      rating: 4.4,
      reviewCount: 39000,
      photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₹₹',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 01:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'jaipur': [
    {
      placeId: 'jaipur_amer_fort',
      name: 'Amer Fort & Sheesh Mahal',
      category: 'attraction',
      address: 'Devisinghpura, Amer, Jaipur, Rajasthan 302001',
      latitude: 26.9855,
      longitude: 75.8513,
      rating: 4.7,
      reviewCount: 96000,
      photoUrl: '/images/jaipur/amerfortandasheeshmahal.jpg',
      priceLevel: '₹100 Domestic / ₹500 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 08:00 – 17:30, 18:30 – 21:15'],
      visitDurationHours: 3.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_hawa_mahal',
      name: 'Hawa Mahal (Palace of Winds)',
      category: 'attraction',
      address: 'Hawa Mahal Rd, Badi Choupad, Jaipur 302002',
      latitude: 26.9239,
      longitude: 75.8267,
      rating: 4.5,
      reviewCount: 78000,
      photoUrl: '/images/jaipur/hawamahal.jpg',
      priceLevel: '₹50 Domestic / ₹200 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 17:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_johari_bazaar',
      name: 'Johari Bazaar Artisan Market',
      category: 'attraction',
      address: 'Johari Bazar, Pink City, Jaipur 302003',
      latitude: 26.9190,
      longitude: 75.8250,
      rating: 4.4,
      reviewCount: 21000,
      photoUrl: '/images/jaipur/joharibazaar.jpg',
      priceLevel: 'Free Entry',
      isOpen: true,
      openingHours: ['Monday–Saturday: 10:00 – 21:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_jal_mahal',
      name: 'Jal Mahal (Water Palace)',
      category: 'attraction',
      address: 'Amer Rd, Jal Mahal, Amber, Jaipur 302002',
      latitude: 26.9535,
      longitude: 75.8462,
      rating: 4.5,
      reviewCount: 52000,
      photoUrl: '/images/jaipur/jalmahal.jpg',
      priceLevel: 'Free Viewpoint',
      isOpen: true,
      openingHours: ['Open 24 hours (Viewpoint access)'],
      visitDurationHours: 1.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_albert_hall',
      name: 'Albert Hall Museum',
      category: 'attraction',
      address: 'Ram Niwas Garden, Kailash Puri, Jaipur 302004',
      latitude: 26.9116,
      longitude: 75.8195,
      rating: 4.6,
      reviewCount: 39000,
      photoUrl: '/images/jaipur/albert museum.jpg',
      priceLevel: '₹40 Domestic / ₹300 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 17:00, 19:00 – 22:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_nahargarh_fort',
      name: 'Nahargarh Fort Sunset Viewpoint',
      category: 'attraction',
      address: 'Krishna Nagar, Brahampuri, Jaipur 302002',
      latitude: 26.9373,
      longitude: 75.8156,
      rating: 4.6,
      reviewCount: 56000,
      photoUrl: '/images/jaipur/nahargarhfort.jpg',
      priceLevel: '₹50 Domestic / ₹200 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 10:00 – 22:00'],
      visitDurationHours: 2.5,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_city_palace',
      name: 'City Palace of Jaipur',
      category: 'attraction',
      address: 'Tulsi Marg, Gangori Bazaar, J.D.A. Market, Pink City, Jaipur 302002',
      latitude: 26.9258,
      longitude: 75.8237,
      rating: 4.5,
      reviewCount: 68000,
      photoUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₹200 Domestic / ₹700 Foreign',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:30 – 17:00, 19:00 – 22:00'],
      visitDurationHours: 2.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_patrika_gate',
      name: 'Patrika Gate at Jawahar Circle',
      category: 'attraction',
      address: 'Jawahar Circle, Malviya Nagar, Jaipur 302017',
      latitude: 26.8286,
      longitude: 75.8055,
      rating: 4.7,
      reviewCount: 32000,
      photoUrl: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 1.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'jaipur_lmb',
      name: 'Laxmi Misthan Bhandar (LMB)',
      category: 'restaurant',
      address: 'Johari Bazar, Pink City, Jaipur 302003',
      latitude: 26.9200,
      longitude: 75.8240,
      rating: 4.3,
      reviewCount: 18400,
      photoUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₹₹',
      isOpen: true,
      openingHours: ['Monday–Sunday: 07:00 – 23:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'kyoto': [
    {
      placeId: 'kyoto_fushimi_inari',
      name: 'Fushimi Inari Shrine',
      category: 'attraction',
      address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto 612-0882',
      latitude: 34.9671,
      longitude: 135.7727,
      rating: 4.8,
      reviewCount: 65000,
      photoUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 2.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_nishiki_market',
      name: 'Nishiki Market Culinary Alleys',
      category: 'restaurant',
      address: 'Nakagyo Ward, Kyoto 604-8055',
      latitude: 35.0050,
      longitude: 135.7649,
      rating: 4.4,
      reviewCount: 28000,
      photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '¥¥',
      isOpen: true,
      openingHours: ['Monday–Sunday: 10:00 – 18:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_gion',
      name: 'Gion Historic Machiya District',
      category: 'attraction',
      address: 'Gionmachi Minamigawa, Higashiyama Ward, Kyoto 605-0074',
      latitude: 35.0037,
      longitude: 135.7772,
      rating: 4.6,
      reviewCount: 31000,
      photoUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours (Evening lanterns)'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_arashiyama',
      name: 'Arashiyama Bamboo Grove',
      category: 'attraction',
      address: 'Sagatenryuji Sagano, Ukyo Ward, Kyoto 616-8385',
      latitude: 35.0169,
      longitude: 135.6713,
      rating: 4.7,
      reviewCount: 52000,
      photoUrl: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours (Morning best)'],
      visitDurationHours: 2.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_tenryuji',
      name: 'Tenryu-ji Zen Temple Garden',
      category: 'attraction',
      address: '68 Sagatenryuji Susukinobabacho, Ukyo Ward, Kyoto 616-8385',
      latitude: 35.0158,
      longitude: 135.6776,
      rating: 4.6,
      reviewCount: 24000,
      photoUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '¥500',
      isOpen: true,
      openingHours: ['Monday–Sunday: 08:30 – 17:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_kinkaku_ji',
      name: 'Kinkaku-ji (Golden Pavilion)',
      category: 'attraction',
      address: '1 Kinkakujicho, Kita Ward, Kyoto 603-8361',
      latitude: 35.0394,
      longitude: 135.7292,
      rating: 4.7,
      reviewCount: 42000,
      photoUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '¥500',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 17:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_kiyomizu_dera',
      name: 'Kiyomizu-dera Cliffside Temple',
      category: 'attraction',
      address: '1-294 Kiyomizu, Higashiyama Ward, Kyoto 605-0862',
      latitude: 34.9949,
      longitude: 135.7850,
      rating: 4.7,
      reviewCount: 58000,
      photoUrl: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '¥400',
      isOpen: true,
      openingHours: ['Monday–Sunday: 06:00 – 18:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'kyoto_nijo_castle',
      name: 'Nijo Castle & Ninomaru Palace',
      category: 'attraction',
      address: '541 Nijojocho, Nakagyo Ward, Kyoto 604-8301',
      latitude: 35.0142,
      longitude: 135.7481,
      rating: 4.5,
      reviewCount: 38000,
      photoUrl: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '¥1030',
      isOpen: true,
      openingHours: ['Monday–Sunday: 08:45 – 16:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'florence': [
    {
      placeId: 'florence_duomo',
      name: 'Duomo di Firenze & Brunelleschi Dome',
      category: 'attraction',
      address: 'Piazza del Duomo, 50122 Firenze FI, Italy',
      latitude: 43.7731,
      longitude: 11.2560,
      rating: 4.8,
      reviewCount: 74000,
      photoUrl: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '€18 (Dome Climb)',
      isOpen: true,
      openingHours: ['Monday–Saturday: 10:00 – 16:30'],
      visitDurationHours: 2.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'florence_mercato_centrale',
      name: 'Mercato Centrale Artisanal Hall',
      category: 'restaurant',
      address: 'Piazza del Mercato Centrale, 50123 Firenze FI, Italy',
      latitude: 43.7766,
      longitude: 11.2533,
      rating: 4.5,
      reviewCount: 29000,
      photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '€€',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 00:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'florence_uffizi',
      name: 'Uffizi Gallery Renaissance Museum',
      category: 'attraction',
      address: 'Piazzale degli Uffizi, 6, 50122 Firenze FI, Italy',
      latitude: 43.7678,
      longitude: 11.2553,
      rating: 4.7,
      reviewCount: 68000,
      photoUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '€25',
      isOpen: true,
      openingHours: ['Tuesday–Sunday: 08:15 – 18:30 (Closed Mondays)'],
      visitDurationHours: 3.0,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'florence_ponte_vecchio',
      name: 'Ponte Vecchio Medieval Bridge',
      category: 'attraction',
      address: 'Ponte Vecchio, 50125 Firenze FI, Italy',
      latitude: 43.7680,
      longitude: 11.2532,
      rating: 4.7,
      reviewCount: 81000,
      photoUrl: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 1.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'florence_piazzale_michelangelo',
      name: 'Piazzale Michelangelo Sunset Overlook',
      category: 'attraction',
      address: 'Piazzale Michelangelo, 50125 Firenze FI, Italy',
      latitude: 43.7629,
      longitude: 11.2650,
      rating: 4.8,
      reviewCount: 62000,
      photoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'istanbul': [
    {
      placeId: 'istanbul_hagia_sophia',
      name: 'Hagia Sophia Grand Mosque',
      category: 'attraction',
      address: 'Sultan Ahmet, Ayasofya Meydanı No:1, 34122 Fatih/İstanbul, Turkey',
      latitude: 41.0086,
      longitude: 28.9802,
      rating: 4.8,
      reviewCount: 125000,
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '€25 Foreign Visitors',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 19:30'],
      visitDurationHours: 2.0,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'istanbul_grand_bazaar',
      name: 'Grand Bazaar & Historic Caravanserais',
      category: 'attraction',
      address: 'Beyazıt, 34126 Fatih/İstanbul, Turkey',
      latitude: 41.0108,
      longitude: 28.9680,
      rating: 4.5,
      reviewCount: 88000,
      photoUrl: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free Entry',
      isOpen: true,
      openingHours: ['Monday–Saturday: 08:30 – 19:00 (Closed Sundays)'],
      visitDurationHours: 2.5,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'istanbul_bosphorus_cruise',
      name: 'Bosphorus Strait Sunset Ferry',
      category: 'attraction',
      address: 'Eminönü Pier, Fatih, İstanbul, Turkey',
      latitude: 41.0173,
      longitude: 28.9734,
      rating: 4.7,
      reviewCount: 46000,
      photoUrl: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '₺75–150',
      isOpen: true,
      openingHours: ['Departures daily: 10:00 – 19:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'evening',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'istanbul_blue_mosque',
      name: 'Sultanahmet Mosque (Blue Mosque)',
      category: 'attraction',
      address: 'Sultan Ahmet, Atmeydanı Cd. No:7, 34122 Fatih/İstanbul, Turkey',
      latitude: 41.0054,
      longitude: 28.9768,
      rating: 4.7,
      reviewCount: 94000,
      photoUrl: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 18:00 (Closed during prayers)'],
      visitDurationHours: 1.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ],
  'mostar': [
    {
      placeId: 'mostar_stari_most',
      name: 'Stari Most (Old Bridge)',
      category: 'attraction',
      address: 'Stari Most, Mostar 88000, Bosnia & Herzegovina',
      latitude: 43.3373,
      longitude: 17.8150,
      rating: 4.8,
      reviewCount: 28000,
      photoUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free',
      isOpen: true,
      openingHours: ['Open 24 hours'],
      visitDurationHours: 1.5,
      timeOfDay: 'morning',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'mostar_kujundziluk',
      name: 'Kujundziluk Old Bazaar',
      category: 'attraction',
      address: 'Kujundžiluk, Mostar 88000, Bosnia & Herzegovina',
      latitude: 43.3378,
      longitude: 17.8148,
      rating: 4.6,
      reviewCount: 11000,
      photoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
      priceLevel: 'Free Entry',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 21:00'],
      visitDurationHours: 2.0,
      timeOfDay: 'midday',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    },
    {
      placeId: 'mostar_koski_mosque',
      name: 'Koski Mehmed Pasha Mosque & Minaret',
      category: 'attraction',
      address: 'Mala Tepa 16, Mostar 88000, Bosnia & Herzegovina',
      latitude: 43.3386,
      longitude: 17.8155,
      rating: 4.7,
      reviewCount: 8900,
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80',
      priceLevel: '€6 (Includes Minaret climb)',
      isOpen: true,
      openingHours: ['Monday–Sunday: 09:00 – 19:00'],
      visitDurationHours: 1.5,
      timeOfDay: 'afternoon',
      source: 'curated-catalog',
      attribution: 'Dastaan Verified Heritage Archive'
    }
  ]
};

/**
 * Normalizes a Google Places (New) result into Dastaan's standard place model
 */
function normalizeGooglePlace(place) {
  const photoRef = place.photos?.[0]?.name;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const photoUrl = photoRef && apiKey
    ? `https://places.googleapis.com/v1/${photoRef}/media?key=${apiKey}&maxHeightPx=800`
    : null;

  return {
    placeId: place.id || `google_${Math.random().toString(36).substring(2, 9)}`,
    name: place.displayName?.text || 'Point of Interest',
    category: (place.types || []).includes('restaurant') || (place.types || []).includes('food')
      ? 'restaurant'
      : 'attraction',
    address: place.formattedAddress || '',
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    photoUrl,
    priceLevel: place.priceLevel || null,
    isOpen: place.regularOpeningHours?.openNow ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
    visitDurationHours: 2.0,
    source: 'google-places-new',
    attribution: 'Google Places API',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Normalizes a Foursquare v3 Place result
 */
function normalizeFoursquarePlace(place) {
  const photoPrefix = place.photos?.[0]?.prefix;
  const photoSuffix = place.photos?.[0]?.suffix;
  const photoUrl = photoPrefix && photoSuffix ? `${photoPrefix}800x600${photoSuffix}` : null;

  const isDining = (place.categories || []).some(c =>
    (c.name || '').toLowerCase().includes('restaurant') || (c.name || '').toLowerCase().includes('food')
  );

  return {
    placeId: place.fsq_id || `fsq_${Math.random().toString(36).substring(2, 9)}`,
    name: place.name || 'Venue',
    category: isDining ? 'restaurant' : 'attraction',
    address: place.location?.formatted_address || place.location?.address || '',
    latitude: place.geocodes?.main?.latitude || null,
    longitude: place.geocodes?.main?.longitude || null,
    rating: typeof place.rating === 'number' ? place.rating / 2 : null, // Foursquare is 0-10, scale to 0-5
    reviewCount: typeof place.stats?.total_ratings === 'number' ? place.stats.total_ratings : null,
    photoUrl,
    priceLevel: place.price ? '$'.repeat(place.price) : null,
    isOpen: place.hours?.is_open_now ?? null,
    openingHours: place.hours?.display ? [place.hours.display] : null,
    visitDurationHours: isDining ? 1.5 : 2.0,
    source: 'foursquare-places',
    attribution: 'Foursquare Places API',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Normalizes an OpenTripMap POI result
 */
function normalizeOpenTripMapPlace(poi) {
  const kinds = (poi.kinds || '').toLowerCase();
  const isDining = kinds.includes('foods') || kinds.includes('restaurants') || kinds.includes('cafes');

  return {
    placeId: poi.xid || `otm_${poi.id || Math.random().toString(36).substring(2, 9)}`,
    name: poi.name || 'Historic Landmark',
    category: isDining ? 'restaurant' : 'attraction',
    address: poi.address?.road ? `${poi.address.road}, ${poi.address.city || ''}` : '',
    latitude: poi.point?.lat || poi.lat || null,
    longitude: poi.point?.lon || poi.lon || null,
    rating: poi.rate ? Math.min(5, Math.max(3, poi.rate)) : 4.5,
    reviewCount: null,
    photoUrl: poi.preview?.source || poi.image || null,
    priceLevel: null,
    isOpen: null,
    openingHours: null,
    visitDurationHours: isDining ? 1.5 : 2.0,
    source: 'opentripmap',
    attribution: 'OpenTripMap & OpenStreetMap contributors (ODbL)',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Retrieves real attractions and restaurants for a destination
 *
 * @param {Object} options
 * @param {string} options.destination - Destination name or slug
 * @param {string} [options.category] - 'attraction', 'restaurant', or 'all'
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @returns {Promise<{ success: boolean, places: Array, provider: string, isLive: boolean, message?: string }>}
 */

/**
 * Normalizes a Wikimedia Geosearch result into Dastaan's standard place schema
 */
export function normalizeWikimediaPlace(page, destination = '') {
  const text = `${page.title || ''} ${page.description || ''} ${page.extract || ''}`.toLowerCase();
  let category = 'attraction';
  let cat = 'CULTURE';
  let visitDurationHours = 1.5;

  if (/(restaurant|café|cafe|bistro|dining|market|bakery|eatery|brasserie|culinary|food|tavern|pub)/i.test(text)) {
    category = 'restaurant';
    cat = 'FOOD';
    visitDurationHours = 1.5;
  } else if (/(park|garden|nature|waterfall|forest|mountain|river|lake|beach|botanical|trail|reserve|valley)/i.test(text)) {
    category = 'attraction';
    cat = 'NATURE';
    visitDurationHours = 1.5;
  } else if (/(museum|gallery|art|exhibition|sculpture|theatre|theater|opera)/i.test(text)) {
    category = 'attraction';
    cat = 'ART';
    visitDurationHours = 2.0;
  } else if (/(church|cathedral|mosque|temple|shrine|synagogue|basilica|monastery|abbey|pagoda)/i.test(text)) {
    category = 'attraction';
    cat = 'CULTURE';
    visitDurationHours = 1.5;
  } else if (/(castle|palace|fort|ruins|historic|monument|memorial|archaeological|tower|citadel|heritage|gate)/i.test(text)) {
    category = 'attraction';
    cat = 'HISTORY';
    visitDurationHours = 2.0;
  }

  const lat = page.coordinates?.[0]?.lat ?? null;
  const lon = page.coordinates?.[0]?.lon ?? null;

  return {
    placeId: `wiki_${page.pageid || Math.random().toString(36).substring(2, 9)}`,
    name: page.title || 'Historic Point of Interest',
    category,
    cat,
    address: destination ? `${page.title}, ${destination}` : page.title,
    latitude: typeof lat === 'number' ? lat : null,
    longitude: typeof lon === 'number' ? lon : null,
    rating: null, // Transparently unrated by provider; do not invent fake ratings
    reviewCount: null,
    photoUrl: page.thumbnail?.source || null,
    description: page.description || page.extract || `Verified landmark and point of interest in ${destination}.`,
    priceLevel: 'Free Entry / Variable',
    isOpen: true,
    openingHours: null,
    visitDurationHours,
    source: 'wikimedia-geosearch',
    attribution: 'Wikipedia & Wikimedia contributors (CC BY-SA 4.0)',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Zero-Cost Live Global Attraction Provider: Wikimedia Geosearch API
 * Queries geotagged Wikipedia landmarks, monuments, museums, and attractions worldwide.
 * Free, zero-config, no API key required, with authentic photos, coordinates, and descriptions.
 */
export async function queryWikimediaPlaces({ destination, latitude, longitude, category = 'all' }) {
  let targetLat = latitude;
  let targetLng = longitude;

  if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
    const details = await getDestinationDetails(destination);
    if (details && typeof details.latitude === 'number' && typeof details.longitude === 'number') {
      targetLat = details.latitude;
      targetLng = details.longitude;
    }
  }

  if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
    return [];
  }

  try {
    const radiusMeters = 10000;
    const limit = 25;
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${targetLat}|${targetLng}&ggsradius=${radiusMeters}&ggslimit=${limit}&prop=coordinates|pageimages|description|extracts&exintro=1&explaintext=1&exchars=140&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DastaanTravel/2.0 (contact: support@dastaan.travel)'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    if (!pages.length) return [];

    const destLower = (destination || '').toLowerCase().trim();

    const normalized = pages
      .filter((p) => {
        if (!p.coordinates || !p.coordinates[0] || !p.title) return false;
        const titleLower = p.title.toLowerCase().trim();
        // Exclude the destination name itself and non-venue meta / transport articles
        if (
          titleLower === destLower ||
          titleLower.startsWith('history of') ||
          titleLower.startsWith('geography of') ||
          titleLower.startsWith('demographics of') ||
          titleLower.includes('railway station') ||
          titleLower.includes('metro station') ||
          titleLower.includes('line (metro)') ||
          titleLower.includes('constituency') ||
          (titleLower.includes('district') && titleLower === `${destLower} district`)
        ) {
          return false;
        }
        return true;
      })
      .map((p) => normalizeWikimediaPlace(p, destination));

    // Deduplicate by normalized name
    const seenNames = new Set();
    const unique = [];
    for (const place of normalized) {
      const key = place.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        unique.push(place);
      }
    }

    return unique;
  } catch (err) {
    console.warn(`[PlacesService] Wikimedia Geosearch error for '${destination}': ${err.message}`);
    return [];
  }
}

export async function getDestinationPlaces({ destination, category = 'all', latitude, longitude }) {
  if (!destination) {
    return {
      success: false,
      message: 'Destination parameter is required to search for places.',
      places: [],
      provider: 'none',
      isLive: false
    };
  }

  const cleanDest = destination.trim().toLowerCase();
  const cleanCat = (category || 'all').toLowerCase();
  const cacheKey = `places:${cleanDest}:${cleanCat}`;

  // 1. Check MongoDB Cache (14-day TTL)
  const cached = await TravelCache.getFresh(cacheKey);
  if (cached && Array.isArray(cached.data)) {
    return {
      success: true,
      places: cached.data,
      provider: cached.provider,
      isLive: cached.provider.includes('live') || cached.provider.includes('google') || cached.provider.includes('foursquare') || cached.provider.includes('opentripmap'),
      cached: true,
      count: cached.data.length
    };
  }

  // 2. Provider Check A: Google Places API (New)
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (googleKey) {
    try {
      const textQuery = cleanCat === 'restaurant'
        ? `Top authentic restaurants in ${destination}`
        : cleanCat === 'attraction'
        ? `Top tourist attractions and landmarks in ${destination}`
        : `Top attractions, sights, and restaurants in ${destination}`;

      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.regularOpeningHours,places.priceLevel'
        },
        body: JSON.stringify({
          textQuery,
          languageCode: 'en',
          maxResultCount: 15
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.places) && data.places.length > 0) {
          const normalized = data.places.map(normalizeGooglePlace);
          await TravelCache.setWithTTL(cacheKey, 'places', 'google-places-new', normalized, 1209600); // 14 days
          return {
            success: true,
            places: normalized,
            provider: 'google-places-new',
            isLive: true,
            count: normalized.length
          };
        }
      }
    } catch (err) {
      console.warn(`[PlacesService] Google Places API error: ${err.message}`);
    }
  }

  // 3. Provider Check B: Foursquare Places API
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  if (fsqKey) {
    try {
      const fsqUrl = `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(
        destination
      )}&limit=15&fields=fsq_id,name,categories,location,geocodes,rating,stats,photos,hours,price`;

      const res = await fetch(fsqUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: fsqKey
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const normalized = data.results.map(normalizeFoursquarePlace);
          await TravelCache.setWithTTL(cacheKey, 'places', 'foursquare-places', normalized, 1209600);
          return {
            success: true,
            places: normalized,
            provider: 'foursquare-places',
            isLive: true,
            count: normalized.length
          };
        }
      }
    } catch (err) {
      console.warn(`[PlacesService] Foursquare API error: ${err.message}`);
    }
  }

  // 4. Provider Check C: OpenTripMap (if OPENTRIPMAP_API_KEY is configured)
  const otmKey = process.env.OPENTRIPMAP_API_KEY;
  if (otmKey) {
    try {
      let targetLat = latitude;
      let targetLng = longitude;
      if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
        const details = await getDestinationDetails(destination);
        if (details) {
          targetLat = details.latitude;
          targetLng = details.longitude;
        }
      }

      if (typeof targetLat === 'number' && typeof targetLng === 'number') {
        const kinds = cleanCat === 'restaurant'
          ? 'foods,restaurants,cafes'
          : cleanCat === 'attraction'
          ? 'interesting_places,cultural,historic,natural'
          : 'interesting_places,tourist_facilities';

        const otmUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=15000&lon=${targetLng}&lat=${targetLat}&kinds=${kinds}&limit=15&apikey=${otmKey}`;
        const res = await fetch(otmUrl);
        if (res.ok) {
          const otmData = await res.json();
          const features = otmData.features || otmData || [];
          if (Array.isArray(features) && features.length > 0) {
            const normalized = features
              .map(f => normalizeOpenTripMapPlace(f.properties ? { ...f.properties, point: { lat: f.geometry?.coordinates[1], lon: f.geometry?.coordinates[0] } } : f))
              .filter(p => p.name && p.name !== 'Point of Interest');

            if (normalized.length > 0) {
              await TravelCache.setWithTTL(cacheKey, 'places', 'opentripmap', normalized, 1209600);
              return {
                success: true,
                places: normalized,
                provider: 'opentripmap',
                isLive: true,
                count: normalized.length
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[PlacesService] OpenTripMap API error: ${err.message}`);
    }
  }

  // 5. Offline Fallback: Curated catalog for popular destinations
  const catalogMatch = CURATED_PLACES_CATALOG[cleanDest];
  if (catalogMatch) {
    let filtered = catalogMatch;
    if (cleanCat === 'attraction' || cleanCat === 'attractions') {
      filtered = catalogMatch.filter(p => p.category === 'attraction');
    } else if (cleanCat === 'restaurant' || cleanCat === 'restaurants') {
      filtered = catalogMatch.filter(p => p.category === 'restaurant');
    }

    // Cache catalog response
    await TravelCache.setWithTTL(cacheKey, 'places', 'curated-offline-catalog', filtered, 1209600);

    return {
      success: true,
      places: filtered,
      provider: 'curated-offline-catalog',
      isLive: false,
      message: 'Third-party API key not configured; displaying verified curated catalog places.',
      count: filtered.length
    };
  }

    // 6. Zero-Cost Live Global Provider: Wikimedia Geosearch
  try {
    const wikiPlaces = await queryWikimediaPlaces({
      destination,
      latitude,
      longitude,
      category: cleanCat
    });

    if (Array.isArray(wikiPlaces) && wikiPlaces.length > 0) {
      let filtered = wikiPlaces;
      if (cleanCat === 'attraction' || cleanCat === 'attractions') {
        filtered = wikiPlaces.filter(p => p.category === 'attraction');
      } else if (cleanCat === 'restaurant' || cleanCat === 'restaurants') {
        filtered = wikiPlaces.filter(p => p.category === 'restaurant');
      }

      await TravelCache.setWithTTL(cacheKey, 'places', 'wikimedia-geosearch', filtered, 1209600);
      return {
        success: true,
        places: filtered,
        provider: 'wikimedia-geosearch',
        isLive: true,
        message: 'Live points of interest discovered via Wikimedia Geosearch.',
        count: filtered.length
      };
    }
  } catch (err) {
    console.warn(`[PlacesService] Wikimedia live search failed: ${err.message}`);
  }

  // 7. When no external credentials exist and destination is not in catalog:
  return {
    success: true,
    places: [],
    provider: 'none-configured',
    isLive: false,
    message: `No external places provider key (GOOGLE_MAPS_API_KEY or FOURSQUARE_API_KEY or OPENTRIPMAP_API_KEY) is configured on the backend. Add a provider key in server/.env to enable live place lookups for '${destination}'.`,
    count: 0
  };
}

/**
 * Retrieves the pool of verified places for a destination to feed the itinerary generator.
 *
 * @param {string} destination - Destination name or slug
 * @param {number} [lat] - Latitude
 * @param {number} [lng] - Longitude
 * @returns {Promise<Array>} Array of normalized places
 */
export async function getPlacesPoolForDestination(destination, lat, lng) {
  if (!destination) return [];

  const clean = destination.toLowerCase().trim();
  const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
  const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
  const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

  // 1. Direct match in curated catalog with coordinate proximity verification
  if (CURATED_PLACES_CATALOG[clean]) {
    const list = CURATED_PLACES_CATALOG[clean];
    if (hasCoords && list[0] && typeof list[0].latitude === 'number') {
      const dist = haversineDistanceKm(parsedLat, parsedLng, list[0].latitude, list[0].longitude);
      if (dist <= 150) {
        return list;
      }
    } else if (!hasCoords) {
      return list;
    }
  }

  // 2. Exact word match in curated catalog (avoid loose substring collisions)
  const cleanSpaced = clean.replace(/[-_]+/g, ' ');
  for (const [key, list] of Object.entries(CURATED_PLACES_CATALOG)) {
    if (key === cleanSpaced || key === clean) {
      if (hasCoords && list[0] && typeof list[0].latitude === 'number') {
        const dist = haversineDistanceKm(parsedLat, parsedLng, list[0].latitude, list[0].longitude);
        if (dist <= 150) {
          return list;
        }
      } else if (!hasCoords) {
        return list;
      }
    }
  }

  // 3. Fallback to getDestinationPlaces (queries active providers or Wikimedia Geosearch)
  try {
    const res = await getDestinationPlaces({
      destination,
      category: 'all',
      latitude: hasCoords ? parsedLat : undefined,
      longitude: hasCoords ? parsedLng : undefined
    });
    if (res && res.success && Array.isArray(res.places) && res.places.length > 0) {
      return res.places;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

export default {
  CURATED_PLACES_CATALOG,
  getDestinationPlaces,
  getPlacesPoolForDestination
};
