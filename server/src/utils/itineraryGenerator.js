/**
 * Server-side Curated Itinerary Archive & Generator for Dastaan
 * Refactored to eliminate repetitive modulo-based generation and silent default fallbacks.
 *
 * For uncataloged destinations or dynamic generation, requests are routed to
 * server/src/services/itineraryService.js.
 */
export { generateItineraryWithLiveRouting } from '../services/itineraryGenerator.js';

import { buildBudgetBreakdown, calculateTripDates } from '../services/itineraryService.js';

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
          { time: '09:00', title: 'Hadimba Temple', desc: 'Visit the 16th-century wooden pagoda temple sheltered among towering ancient deodar cedar forests.', cat: 'CULTURE', imageLabel: 'HADIMBA TEMPLE · CULTURE', image: '/images/manali/hadimbatemple.jpg', layout: 'image-right', lat: 32.2476, lon: 77.1892 },
          { time: '12:30', title: 'Jogini Waterfall Trek', desc: 'Scenic trek past pine trails and apple orchards to sacred cascading mountain waterfalls.', cat: 'NATURE', imageLabel: 'JOGINI WATERFALL · NATURE', image: '/images/manali/joginiwaterfall.jpg', layout: 'image-left', lat: 32.2644, lon: 77.1895 },
          { time: '16:30', title: 'Mall Road Exploration', desc: 'Stroll through the lively street market for Kullu shawls, local cafes, and steaming hot street food.', cat: 'SHOPPING', imageLabel: 'MALL ROAD · SHOPPING', image: '/images/manali/mallroad.jpg', layout: 'image-right', lat: 32.2426, lon: 77.1891 }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'HIGH PASS ADVENTURES & SPRINGS',
        activities: [
          { time: '09:00', title: 'Solang Valley', desc: 'Experience thrilling paragliding, ropeway cable car rides, and snow valley panoramas.', cat: 'ADVENTURE', imageLabel: 'SOLANG VALLEY · ADVENTURE', image: '/images/manali/sollangvalley.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Rohtang Pass', desc: 'Ascend to 13,050 ft for breathtaking glacier vistas and snow-capped Himalayan peaks (permit required).', cat: 'NATURE', imageLabel: 'ROHTANG PASS · NATURE', image: '/images/manali/rohtangpass.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Parvati Valley & Manikaran Excursion', desc: 'Nearby Day Trip (~80 km / 3-hr scenic drive): Rejuvenate in natural thermal hot springs beside the rushing Parvati River.', cat: 'RELAX', imageLabel: 'MANIKARAN HOT SPRINGS · DAY TRIP', image: '/images/manali/manikaran.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'OLD TOWN CEDARS & VALLEY VIEWPOINTS',
        activities: [
          { time: '09:00', title: 'Manu Temple & Old Manali Village', desc: 'Explore the historic wooden shrine to Sage Manu surrounded by rustic apple orchards, quaint cafes, and traditional stone houses.', cat: 'CULTURE', imageLabel: 'MANU TEMPLE · CULTURE', image: '/images/manali/hadimbatemple.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Vashisht Hot Springs & Temple', desc: 'Bathe in 4,000-year-old natural thermal sulphur springs known for restorative healing properties overlooking the valley.', cat: 'RELAX', imageLabel: 'VASHISHT SPRINGS · RELAX', image: '/images/manali/manikaran.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Van Vihar & Beas Riverfront Walk', desc: 'Stroll among towering ancient deodars along the rushing glacier waters of the Beas River at golden hour.', cat: 'NATURE', imageLabel: 'BEAS RIVERFRONT · NATURE', image: '/images/manali/joginiwaterfall.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'HIMALAYAN HERITAGE CASTLES & ART VILLAGES',
        activities: [
          { time: '09:30', title: 'Naggar Castle & Roerich Art Gallery', desc: 'Tour the 15th-century wood-and-stone Kullu royal fortress and Russian master Nicholas Roerich\'s Himalayan landscape gallery.', cat: 'HISTORY', imageLabel: 'NAGGAR CASTLE · HISTORY', image: '/images/manali/rohtangpass.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Jana Waterfall & Himachali Siddu Tasting', desc: 'Discover hidden mountain waterfalls and savor freshly steamed wheat siddu with ghee and walnut chutney at a rustic wooden dhaba.', cat: 'FOOD', imageLabel: 'JANA FALLS & FOOD · NATURE', image: '/images/manali/joginiwaterfall.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Tibetan Monastery & Himalayan Handlooms', desc: 'Visit Gadhan Thekkchokling Gompa for peaceful Buddhist chanting, fragrant incense, and exquisite woven pashminas.', cat: 'ART', imageLabel: 'TIBETAN MONASTERY · ART', image: '/images/manali/mallroad.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'OLD MANALI HERITAGE & THERMAL SPRINGS',
        activities: [
          { time: '09:30', title: 'Vashisht Temple & Sulphur Baths', desc: 'Visit the 4,000-year-old stone temple with natural restorative hot mineral baths.', cat: 'CULTURE', imageLabel: 'VASHISHT TEMPLE · CULTURE', image: '/images/manali/hadimbatemple.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Old Manali Village & Cafes', desc: 'Meander through rustic apple orchards, bohemian cafes, and traditional Himachali timber homes.', cat: 'FOOD', imageLabel: 'OLD MANALI · FOOD', image: '/images/manali/mallroad.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Manu Temple Sanctuary', desc: 'Historic pagoda shrine perched high with panoramic mountain vistas across the Beas valley.', cat: 'HISTORY', imageLabel: 'MANU TEMPLE · HISTORY', image: '/images/manali/sollangvalley.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'NAGGAR CASTLE & ARTISAN TRAIL',
        activities: [
          { time: '09:30', title: 'Naggar Castle & Roerich Gallery', desc: 'Explore the medieval wood-and-stone fortress and Himalayan oil paintings gallery.', cat: 'HISTORY', imageLabel: 'NAGGAR CASTLE · HISTORY', image: '/images/manali/hadimbatemple.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Beas River Outlook & Riverside Picnic', desc: 'Tranquil afternoon by the clear rushing river flanked by pine groves.', cat: 'NATURE', imageLabel: 'BEAS RIVER · NATURE', image: '/images/manali/rohtangpass.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Gadhan Thekchhokling Gompa', desc: 'Admire colourful Buddhist frescoes and spin golden prayer wheels in peace.', cat: 'CULTURE', imageLabel: 'TIBETAN MONASTERY · CULTURE', image: '/images/manali/mallroad.jpg', layout: 'image-right' }
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
          { time: '09:00', title: "Humayun's Tomb", desc: 'Explore the grand red sandstone Mughal garden tomb (UNESCO) that inspired the Taj Mahal.', cat: 'CULTURE', imageLabel: "HUMAYUN TOMB · CULTURE", image: "/images/newdelhi/Humayun's Tomb.jpg", layout: 'image-right' },
          { time: '13:00', title: 'Chandni Chowk Food Walk', desc: 'Dive into Old Delhi\'s bustling lanes for legendary paranthas, jalebis, chaat, and aromatic spices.', cat: 'FOOD', imageLabel: 'CHANDNI CHOWK · FOOD', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '17:00', title: 'India Gate & Kartavya Path', desc: 'Evening stroll along the ceremonial boulevard under warm golden floodlights and war memorials.', cat: 'CULTURE', imageLabel: 'INDIA GATE · CULTURE', image: '/images/newdelhi/indiagate.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'ANCIENT SANCTUARIES & MODERN ART',
        activities: [
          { time: '09:30', title: 'Qutub Minar Complex', desc: 'Walk among ancient 12th-century stone minarets (UNESCO) and intricately carved red sandstone pillars.', cat: 'HISTORY', imageLabel: 'QUTUB MINAR · HISTORY', image: '/images/newdelhi/qutubminar.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Lodhi Art District', desc: 'Discover vibrant open-air street murals and contemporary urban art in India\'s first public art district.', cat: 'ART', imageLabel: 'LODHI ART DISTRICT · ART', image: '/images/newdelhi/lodhiart.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Hauz Khas Village Sunset', desc: 'Relax by medieval reservoir ruins surrounded by trendy boutiques, deer park greenery, and rooftop cafes.', cat: 'RELAX', imageLabel: 'HAUZ KHAS LAKE · RELAX', image: '/images/newdelhi/sunsethauzkhas.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'CITADELS OF EMPERORS & SUFI SHRINES',
        activities: [
          { time: '09:00', title: 'Red Fort & Jama Masjid', desc: 'Step inside Emperor Shah Jahan\'s monumental 17th-century red sandstone citadel and India\'s grandest congregational mosque.', cat: 'HISTORY', imageLabel: 'RED FORT & JAMA MASJID · HISTORY', image: "/images/newdelhi/Humayun's Tomb.jpg", layout: 'image-right' },
          { time: '13:00', title: 'National Museum & Janpath Bazaar', desc: 'Admire 5,000 years of South Asian history, Indus Valley bronze artifacts, followed by brassware crafts at Janpath.', cat: 'ART', imageLabel: 'NATIONAL MUSEUM · ART', image: '/images/newdelhi/lodhiart.jpg', layout: 'image-left' },
          { time: '17:30', title: 'Hazrat Nizamuddin Dargah & Sufi Qawwali', desc: 'Immerse in seven centuries of mystic Sufi poetry as live qawwali devotional music echoes through candlelit marble courtyards.', cat: 'CULTURE', imageLabel: 'NIZAMUDDIN SUFI SHRINE · CULTURE', image: '/images/newdelhi/sunsethauzkhas.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'CONTEMPORARY SPACES & CRAFT TRADITIONS',
        activities: [
          { time: '09:30', title: 'Lotus Temple & Dilli Haat Crafts', desc: 'Marvel at the pure white Greek marble Baháʼí lotus petals, then discover regional handicrafts and state food stalls at Dilli Haat.', cat: 'CULTURE', imageLabel: 'LOTUS TEMPLE & DILLI HAAT · CULTURE', image: '/images/newdelhi/indiagate.jpg', layout: 'image-right' },
          { time: '13:30', title: 'National Gallery of Modern Art', desc: 'Explore historic Jaipur House showcasing landmark modern Indian masterpieces from Amrita Sher-Gil and Rabindranath Tagore.', cat: 'ART', imageLabel: 'NGMA MODERN ART · ART', image: '/images/newdelhi/lodhiart.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Agrasen ki Baoli & Connaught Place', desc: 'Descend 108 stone steps of the 14th-century stepwell before evening coffee among British colonial Georgian white colonnades.', cat: 'RELAX', imageLabel: 'AGRASEN KI BAOLI · RELAX', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'OLD EMPIRES & MEMORIAL MONUMENTS',
        activities: [
          { time: '09:30', title: 'Red Fort & Meena Bazaar', desc: 'Grand 17th-century Mughal fortress of Shah Jahan with red sandstone ramparts.', cat: 'HISTORY', imageLabel: 'RED FORT · HISTORY', image: '/images/newdelhi/Humayun\'s Tomb.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Jama Masjid Courtyard', desc: 'Stand in India\'s most monumental mosque courtyard overlooking historic Old Delhi.', cat: 'CULTURE', imageLabel: 'JAMA MASJID · CULTURE', image: '/images/newdelhi/chandnichowkfood.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Raj Ghat & Peace Memorials', desc: 'Reflective landscaped gardens dedicated to Mahatma Gandhi along the Yamuna bank.', cat: 'RELAX', imageLabel: 'RAJ GHAT · RELAX', image: '/images/newdelhi/indiagate.jpg', layout: 'image-right' }
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
          { time: '09:00', title: 'Amer Fort & Sheesh Mahal', desc: 'Ascend the hilltop fortress to admire the intricate mirror palace craft, marble courtyards, and Maota Lake views.', cat: 'HISTORY', imageLabel: 'AMER FORT · HISTORY', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Hawa Mahal (Palace of Winds)', desc: 'Marvel at the 953 honeycomb lattice windows designed for royal court ladies overlooking the bazaar.', cat: 'CULTURE', imageLabel: 'HAWA MAHAL · CULTURE', image: '/images/jaipur/hawamahal.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Johari Bazaar Crafts', desc: 'Shop traditional block-printed textiles, handmade silver jewelry, and famous Rajasthani handicrafts.', cat: 'SHOPPING', imageLabel: 'JOHARI BAZAAR · SHOPPING', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'FORTRESS VISTAS & HERITAGE MUSEUMS',
        activities: [
          { time: '09:00', title: 'Jal Mahal (Water Palace)', desc: 'Admire the peaceful red sandstone palace floating gracefully in the middle of Man Sagar Lake.', cat: 'CULTURE', imageLabel: 'JAL MAHAL · CULTURE', image: '/images/jaipur/jalmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Albert Hall Museum', desc: 'Explore Indo-Saracenic architecture showcasing ancient royal artifacts, pottery, and classical paintings.', cat: 'ART', imageLabel: 'ALBERT HALL · ART', image: '/images/jaipur/albert museum.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Nahargarh Fort Sunset', desc: 'Watch the golden sun dip below the Aravalli hills with panoramic views overlooking the entire Pink City.', cat: 'RELAX', imageLabel: 'NAHARGARH FORT · RELAX', image: '/images/jaipur/nahargarhfort.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'ASTRONOMY & THE MAHARAJA COURTS',
        activities: [
          { time: '09:00', title: 'Jantar Mantar Observatory', desc: 'Explore the UNESCO 18th-century stone astronomical instruments, including the world\'s largest stone sundial built by Jai Singh II.', cat: 'HISTORY', imageLabel: 'JANTAR MANTAR · HISTORY', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' },
          { time: '12:30', title: 'City Palace Museum & Pritam Niwas Chowk', desc: 'Tour royal courtyards, the famous peacock gate representing autumn, and historic textile and armory galleries.', cat: 'CULTURE', imageLabel: 'CITY PALACE · CULTURE', image: '/images/jaipur/hawamahal.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Jaigarh Fort & Cannon Foundry', desc: 'Ascend the rugged defensive citadel housing the monumental Jaivana cannon, with aerial vistas of Amer valley.', cat: 'ADVENTURE', imageLabel: 'JAIGARH FORT · ADVENTURE', image: '/images/jaipur/nahargarhfort.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'STEPWELLS, TEXTILES & SACRED VALLEYS',
        activities: [
          { time: '09:30', title: 'Panna Meena ka Kund & Anokhi Museum', desc: 'Marvel at 16th-century geometric criss-cross stepwell stairs and watch living master block-printers at work.', cat: 'ART', imageLabel: 'PANNA MEENA KUND · ART', image: '/images/jaipur/jalmahal.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Bapu Bazaar & Traditional Rajasthani Lunch', desc: 'Shop traditional camel-leather Mojari footwear, Jaipur blue pottery, and savor authentic Dal Baati Churma.', cat: 'FOOD', imageLabel: 'BAPU BAZAAR · FOOD', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '17:30', title: 'Galta Ji Temple (Monkey Temple)', desc: 'Ascend through an Aravalli mountain gorge to discover natural freshwater springs, carved pavilions, and sunset vistas.', cat: 'NATURE', imageLabel: 'GALTA JI SUNSET · NATURE', image: '/images/jaipur/albert museum.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'udaipur': {
    name: 'Udaipur',
    country: 'India',
    image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'REGAL PALACES & LAKE PICHOLA',
        activities: [
          { time: '09:00', title: 'City Palace Complex', desc: 'Tour Rajasthan\'s largest palace complex, admiring mirrored galleries, peacock courtyards, and lake vistas.', cat: 'HISTORY', imageLabel: 'CITY PALACE · HISTORY', image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Traditional Mewari Lunch & Jagdish Temple', desc: 'Savor Dal Baati Churma and Gatte ki Sabzi in the old town, then admire the 1651 CE carved Hindu temple.', cat: 'FOOD', imageLabel: 'MEWARI CUISINE · FOOD', image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Lake Pichola Sunset Boat Cruise & Jag Mandir', desc: 'Glide past the floating marble Lake Palace to island gardens at Jag Mandir as dusk colors the water.', cat: 'NATURE', imageLabel: 'LAKE PICHOLA · NATURE', image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'HERITAGE HAVELIS & SERENE LAKES',
        activities: [
          { time: '09:30', title: 'Saheliyon-ki-Bari', desc: 'Wander through the historic Garden of the Maidens featuring marble elephant fountains and lotus pools.', cat: 'CULTURE', imageLabel: 'SAHELIYON KI BARI · CULTURE', image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '14:00', title: 'Fateh Sagar Lake & Craft Promenade', desc: 'Relax along the scenic embankment, enjoy cold kulhad coffee, and explore local miniature painting workshops.', cat: 'RELAX', imageLabel: 'FATEH SAGAR · RELAX', image: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '18:30', title: 'Bagore Ki Haveli Dharohar Dance', desc: 'Experience an authentic waterfront Rajasthani folk performance featuring Chari fire dancing, puppetry, and Ghoomar.', cat: 'ART', imageLabel: 'BAGORE KI HAVELI · ART', image: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'MONSOON MOUNTAINS & RURAL ARTISANS',
        activities: [
          { time: '09:30', title: 'Sajjangarh Monsoon Palace', desc: 'Climb 944m atop Bansdara mountain to the Maharaja\'s monsoon retreat for panoramic sweeps of the Aravalli hills and lakes.', cat: 'NATURE', imageLabel: 'MONSOON PALACE · NATURE', image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Shilpgram Rural Crafts Village', desc: 'Explore living traditional mud-and-thatch huts, terracotta pottery, and folk musicians at the western crafts center.', cat: 'CULTURE', imageLabel: 'SHILPGRAM VILLAGE · CULTURE', image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Doodh Talai & Sunset Ropeway', desc: 'Ride the aerial cable car to Karni Mata Temple overlooking illuminated Udaipur palaces as evening lights reflect on the water.', cat: 'RELAX', imageLabel: 'DOODH TALAI ROPEWAY · RELAX', image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'ANCIENT SHRINES & MEWAR ROYAL MEMORIES',
        activities: [
          { time: '09:00', title: 'Eklingji Temple & Sahasra Bahu Excursion', desc: 'Nearby Day Trip (~22 km / 45 min): Admire the 8th-century complex of 108 stone shrines and exquisite 10th-century carvings.', cat: 'HISTORY', imageLabel: 'EKLINGJI TEMPLE · DAY TRIP', image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Vintage & Classic Car Collection', desc: 'Inspect the Maharajas of Mewar\'s legendary motor collection, including 1934 Rolls Royce Phantoms and ceremonial carriages.', cat: 'HISTORY', imageLabel: 'VINTAGE CARS · HISTORY', image: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Ambrai Ghat Twilight Waterfront', desc: 'Watch dusk settle over the water with the glowing golden facade of the City Palace directly across the serene lake.', cat: 'RELAX', imageLabel: 'AMBRAI GHAT · RELAX', image: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      }
    ]
  },
  'rishikesh': {
    name: 'Rishikesh',
    country: 'India',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'SPIRITUAL HEART & GANGA AARTI',
        activities: [
          { time: '08:30', title: 'Ram Jhula & Lakshman Jhula Walk', desc: 'Cross iconic suspension footbridges overlooking the emerald Ganges, connecting historic ashrams and shrines.', cat: 'CULTURE', imageLabel: 'RAM JHULA · CULTURE', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '12:30', title: 'Satvik & Ayurvedic Culinary Tasting', desc: 'Enjoy nourishing organic thalis, fresh Himalayan herbal teas, and sourdough delicacies at a river-view cafe.', cat: 'FOOD', imageLabel: 'AYURVEDIC CUISINE · FOOD', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Triveni Ghat & Maha Ganga Aarti', desc: 'Join the sacred evening prayer gathering as priests chant Vedic hymns and hundreds of brass oil lamps illuminate the river.', cat: 'CULTURE', imageLabel: 'TRIVENI GHAT · CULTURE', image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'WHITE WATER & HIMALAYAN FOOTHILLS',
        activities: [
          { time: '09:00', title: 'Shivpuri River Rafting on the Ganga', desc: 'Paddle through exhilarating Class III rapids such as Three Blind Mice and Roller Coaster with certified river guides.', cat: 'ADVENTURE', imageLabel: 'WHITE WATER RAFTING · ADVENTURE', image: 'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'The Beatles Ashram (Chaurasi Kutia)', desc: 'Explore the 1968 meditation dome huts and colourful mural halls where The Beatles composed the White Album.', cat: 'HISTORY', imageLabel: 'BEATLES ASHRAM · HISTORY', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Neer Garh Waterfall Hike', desc: 'Trek through subtropical jungle trails to crystal-clear natural limestone pools cascading down the Himalayan foothills.', cat: 'NATURE', imageLabel: 'NEER GARH FALLS · NATURE', image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'HIMALAYAN SUNRISE & RIVERSIDE ASHRAMS',
        activities: [
          { time: '06:30', title: 'Kunjapuri Temple Sunrise & Himalayan Yoga', desc: 'Ascend to 1,676m for an awe-inspiring sunrise over snow-capped peaks of Swargarohini and Chaukhamba, followed by guided meditation.', cat: 'ADVENTURE', imageLabel: 'KUNJAPURI SUNRISE · ADVENTURE', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '12:30', title: 'Parmarth Niketan Ashram & Gardens', desc: 'Wander the peaceful courtyards, ancient banyan trees, and Ayurvedic medicinal gardens of Rishikesh\'s largest ashram.', cat: 'CULTURE', imageLabel: 'PARMARTH NIKETAN · CULTURE', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Shatrughna Ghat Riverbank Meditation', desc: 'Experience quiet contemplative twilight chanting on the gentle lower banks away from crowds as bells ring across the river.', cat: 'RELAX', imageLabel: 'SHATRUGHNA GHAT · RELAX', image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'ANCIENT CAVES & PROMENADE WALKS',
        activities: [
          { time: '09:00', title: 'Vashistha Cave (Gufa) on the Ganges', desc: 'Visit the sacred natural subterranean stone cave where Sage Vashistha meditated, tucked into river cliffs ~25 km upstream.', cat: 'HISTORY', imageLabel: 'VASHISTHA GUFA · HISTORY', image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Tapovan Organic Cafes & Singing Bowls', desc: 'Savor artisan vegan dishes, sample Tibetan singing bowl acoustics, and explore handcrafted meditation beads and textiles.', cat: 'SHOPPING', imageLabel: 'TAPOVAN CAFES · SHOPPING', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:00', title: 'Marine Drive Astha Path Sunset', desc: 'Take a relaxed evening walk along the paved riverside promenade overlooking tranquil turquoise eddies as dusk falls.', cat: 'NATURE', imageLabel: 'ASTHA PATH SUNSET · NATURE', image: 'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'ASTRONOMY & ROYAL COURTYARDS',
        activities: [
          { time: '09:00', title: 'City Palace Complex & Museum', desc: 'Walk through Mubarak Mahal, Chandra Mahal, and courtyards preserving royal regalia.', cat: 'CULTURE', imageLabel: 'CITY PALACE · CULTURE', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Jantar Mantar UNESCO Observatory', desc: 'Marvel at the world\'s largest stone sundial and 18th-century geometric astronomy devices.', cat: 'HISTORY', imageLabel: 'JANTAR MANTAR · HISTORY', image: '/images/jaipur/albert museum.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Bapu Bazaar Textile Walk', desc: 'Browse authentic Sanganeri block-print quilts, mojaris, and brass ornaments.', cat: 'SHOPPING', imageLabel: 'BAPU BAZAAR · SHOPPING', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'WARRIOR STRONGHOLDS & SACRED SPRINGS',
        activities: [
          { time: '09:00', title: 'Jaigarh Fort & Jaivana Cannon', desc: 'Explore the rugged military redoubt boasting the world\'s largest wheeled cannon.', cat: 'HISTORY', imageLabel: 'JAIGARH FORT · HISTORY', image: '/images/jaipur/nahargarhfort.jpg', layout: 'image-right' },
          { time: '13:30', title: 'Galtaji Monkey Temple Springs', desc: 'Sacred natural water kunds and ancient shrines tucked into a dramatic rocky gorge.', cat: 'NATURE', imageLabel: 'GALTAJI TEMPLE · NATURE', image: '/images/jaipur/jalmahal.jpg', layout: 'image-left' },
          { time: '17:30', title: 'Chokhi Dhani Folk Village', desc: 'Traditional Rajasthani thali feast, folk dancers, fire acrobatics, and puppet lore.', cat: 'FOOD', imageLabel: 'CHOKHI DHANI · FOOD', image: '/images/jaipur/hawamahal.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 5,
        dayTitle: 'ROYAL GARDENS & ARTISAN STEPWELLS',
        activities: [
          { time: '09:30', title: 'Sisodia Rani Palace & Garden', desc: 'Multi-tiered Mughal gardens adorned with painted murals of Radha and Krishna.', cat: 'NATURE', imageLabel: 'SISODIA GARDENS · NATURE', image: '/images/jaipur/jalmahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Anokhi Museum of Hand Printing', desc: 'Observe master block carvers and textile printers preserving ancient artisanal craft.', cat: 'CULTURE', imageLabel: 'ANOKHI MUSEUM · CULTURE', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Panna Meena ka Kund Stepwell', desc: 'Atmospheric 16th-century symmetrical geometric stepwell near Amer.', cat: 'HISTORY', imageLabel: 'STEPWELL · HISTORY', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-right' }
        ]
      },
      {
        dayNum: 6,
        dayTitle: 'DEVOTIONAL SHRINES & CULINARY HERITAGE',
        activities: [
          { time: '09:00', title: 'Govind Dev Ji Temple', desc: 'Historic temple in the City Palace pavilion with resonant morning devotional aarti.', cat: 'CULTURE', imageLabel: 'GOVIND DEV JI · CULTURE', image: '/images/jaipur/hawamahal.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Samode Palace Day Outing', desc: 'Regal excursion to a painted mirror durbar hall in the scenic Aravalli foothills.', cat: 'HISTORY', imageLabel: 'SAMODE PALACE · HISTORY', image: '/images/jaipur/amerfortandasheeshmahal.jpg', layout: 'image-left' },
          { time: '17:00', title: 'MI Road Lassi & Street Flavors', desc: 'Taste legendary kulhad lassi and traditional kachoris at iconic century-old spots.', cat: 'FOOD', imageLabel: 'CULINARY WALK · FOOD', image: '/images/jaipur/joharibazaar.jpg', layout: 'image-right' }
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
          { time: '09:00', title: 'Fushimi Inari Shrine', desc: 'Hike through the iconic tunnel of thousands of vermilion torii gates winding up the sacred forested mountain.', cat: 'CULTURE', imageLabel: 'FUSHIMI INARI SHRINE · CULTURE', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Nishiki Market Culinary Walk', desc: 'Explore Kyoto\'s 400-year-old kitchen street, sampling dashi tamagoyaki, tsukemono, and fresh matcha sweets.', cat: 'FOOD', imageLabel: 'NISHIKI MARKET · FOOD', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:00', title: 'Gion Historic District', desc: 'Stroll through preserved 17th-century wooden machiya merchant townhouses as paper lanterns light the evening lanes.', cat: 'HISTORY', imageLabel: 'GION DISTRICT · HISTORY', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'BAMBOO GROVES & ZEN GARDENS',
        activities: [
          { time: '08:30', title: 'Arashiyama Bamboo Grove', desc: 'Immerse yourself in soaring green bamboo stalks swaying peacefully in the morning breeze.', cat: 'NATURE', imageLabel: 'ARASHIYAMA BAMBOO GROVE · NATURE', image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '12:00', title: 'Tenryu-ji Temple', desc: 'Marvel at the UNESCO World Heritage Zen garden dating to 1339, with pond reflections framed by mountain ridges.', cat: 'CULTURE', imageLabel: 'TENRYU-JI TEMPLE · CULTURE', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '15:30', title: 'Okochi Sanso Villa & Matcha Tea', desc: 'Relax at a traditional hillside Japanese estate with seasonal gardens and ceremonial matcha overlooking Kyoto.', cat: 'RELAX', imageLabel: 'OKOCHI SANSO VILLA · RELAX', image: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'GOLDEN PAVILIONS & STONE MEDITATION',
        activities: [
          { time: '09:00', title: 'Kinkaku-ji (Golden Pavilion)', desc: 'Marvel at the breathtaking UNESCO Zen temple covered in delicate gold leaf, mirrored in the tranquil surrounding pond.', cat: 'CULTURE', imageLabel: 'KINKAKU-JI · CULTURE', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Ryoan-ji Zen Rock Garden', desc: 'Contemplate Japan\'s most celebrated dry landscape garden, featuring fifteen enigmatic boulders set in raked white gravel.', cat: 'ART', imageLabel: 'RYOAN-JI GARDEN · ART', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Pontocho Alley Lantern Walk', desc: 'Wander along the narrow stone corridor lit by crimson lanterns beside the Kamogawa River, rich with traditional dining.', cat: 'FOOD', imageLabel: 'PONTOCHO ALLEY · FOOD', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: "CANAL PATHS & HIGASHIYAMA TEMPLE SHRINES",
        activities: [
          { time: '09:00', title: "Ginkaku-ji & Philosopher's Path", desc: 'Walk the serene stone canal trail shaded by cherry trees, connecting historic temples in the eastern foothills.', cat: 'NATURE', imageLabel: "PHILOSOPHER'S PATH · NATURE", image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Nanzen-ji Temple & Aqueduct', desc: 'Admire the monumental wooden Sanmon entrance gate and the striking red-brick Roman-style Meiji aqueduct.', cat: 'HISTORY', imageLabel: 'NANZEN-JI TEMPLE · HISTORY', image: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Maruyama Park & Yasaka Shrine', desc: 'Stroll Kyoto\'s historic public garden centered around weeping cherry trees and illuminated Gion shrine lanterns.', cat: 'RELAX', imageLabel: 'MARUYAMA PARK · RELAX', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 5,
        dayTitle: 'CLIFFTOP VERANDAS & PRESERVED LANES',
        activities: [
          { time: '09:00', title: 'Kiyomizu-dera Temple & Otowa Falls', desc: 'Stand on the soaring wooden stage built entirely without nails overlooking forested cliffs, and drink from sacred mountain streams.', cat: 'CULTURE', imageLabel: 'KIYOMIZU-DERA · CULTURE', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Sannenzaka & Ninenzaka Slopes', desc: 'Browse handcrafted ceramics, traditional fans, and sweet warabi-mochi in preserved Edo-period stone walking alleys.', cat: 'SHOPPING', imageLabel: 'SANNENZAKA SLOPES · SHOPPING', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Kamogawa Riverbank Sunset Promenade', desc: 'Relax with locals on the open grassy banks of the Kamogawa River as dusk settles over the eastern mountains.', cat: 'RELAX', imageLabel: 'KAMOGAWA RIVERBANK · RELAX', image: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      }
    ]
  },
  'mostar': {
    name: 'Mostar',
    country: 'Bosnia & Herzegovina',
    image: '/images/firstImage.jpeg',
    days: [
      {
        dayNum: 1,
        dayTitle: 'OLD BRIDGE & ARTISAN BAZAAR',
        activities: [
          { time: '09:30', title: 'Stari Most (Old Bridge)', desc: 'Witness the iconic 16th-century Ottoman stone arch bridge (UNESCO) soaring 24 meters over the turquoise Neretva River.', cat: 'HISTORY', imageLabel: 'STARI MOST · HISTORY', image: '/images/stari_most_bridge.jpeg', layout: 'image-right' },
          { time: '12:30', title: 'Kujundziluk Old Bazaar', desc: 'Wander cobblestone lanes lined with artisan coppersmiths hammering traditional Bosnian cezve coffee pots and filigree lanterns.', cat: 'SHOPPING', imageLabel: 'OLD BAZAAR · SHOPPING', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:00', title: 'Koski Mehmed Pasha Mosque', desc: 'Climb the 17th-century minaret for Mostar\'s most famous panoramic postcard view of Stari Most and the river gorge.', cat: 'CULTURE', imageLabel: 'KOSKI MOSQUE · CULTURE', image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'BLAGAJ EXCURSION & HERZEGOVINIAN HERITAGE',
        activities: [
          { time: '09:30', title: 'Blagaj Tekke Dervish Monastery', desc: 'Nearby Day Trip (~12 km / 20-min drive south): Visit the 600-year-old Ottoman Sufi lodge built under a 200m limestone cliff at the Buna spring.', cat: 'CULTURE', imageLabel: 'BLAGAJ TEKKE · DAY TRIP', image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Traditional Bosnian Culinary Tasting', desc: 'Taste hot grilled Ćevapi in soft somun flatbread, flaky meat Burek, and traditional copper-poured Bosnian coffee.', cat: 'FOOD', imageLabel: 'BOSNIAN CUISINE · FOOD', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Muslibegović House & Tara Tower', desc: 'Tour the grand Ottoman residential mansion with lush courtyard gardens and discover bridge diving history in Tara Tower.', cat: 'HISTORY', imageLabel: 'MUSLIBEGOVIC HOUSE · HISTORY', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'EMERALD WATERFALLS & FORTIFIED CITADELS',
        activities: [
          { time: '09:30', title: 'Kravica Waterfalls Excursion', desc: 'Nearby Day Trip (~40 km / 45-min drive): Explore spectacular 25m cascading amphitheater falls spilling into emerald karst lakes.', cat: 'NATURE', imageLabel: 'KRAVICA FALLS · NATURE', image: '/images/firstImage.jpeg', layout: 'image-right' },
          { time: '14:00', title: 'Počitelj Medieval Stone Citadel', desc: 'Nearby Day Trip (~30 km): Climb the fortified Ottoman stone village, 15th-century watchtower, and artist colony perched on the hillside.', cat: 'HISTORY', imageLabel: 'POCITELJ CITADEL · HISTORY', image: '/images/stari_most_bridge.jpeg', layout: 'image-left' },
          { time: '17:30', title: 'Biscevic House & Neretva Riverside Dining', desc: 'Visit the 1635 Ottoman riverside dwelling with cantilevered verandas and enjoy local grilled trout along the turquoise waters.', cat: 'RELAX', imageLabel: 'BISCEVIC HOUSE · RELAX', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
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
        dayTitle: 'RENAISSANCE CATHEDRALS & MASTERPIECES',
        activities: [
          { time: '09:00', title: "Cattedrale di Santa Maria del Fiore & Brunelleschi's Dome", desc: 'Admire Florence Cathedral\'s green and white marble facade and climb Filippo Brunelleschi\'s legendary 15th-century terracotta dome.', cat: 'CULTURE', imageLabel: 'FLORENCE DUOMO · CULTURE', image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Mercato Centrale Food Tasting', desc: 'Savor handmade truffle tagliolini, Tuscan pecorino cheeses, fresh schiacciata bread, and Chianti wine in the historic food hall.', cat: 'FOOD', imageLabel: 'MERCATO CENTRALE · FOOD', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:00', title: 'Uffizi Gallery Renaissance Tour', desc: 'Walk alongside world-renowned masterpieces including Botticelli\'s Birth of Venus, da Vinci\'s Annunciation, and Caravaggio paintings.', cat: 'ART', imageLabel: 'UFFIZI GALLERY · ART', image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'MEDIEVAL BRIDGES & PANORAMIC VISTAS',
        activities: [
          { time: '09:30', title: 'Ponte Vecchio & Piazza della Signoria', desc: 'Cross the iconic 1345 medieval stone closed-spandrel arch bridge lined with jewelers, into the civic sculpture heart of Florence.', cat: 'HISTORY', imageLabel: 'PONTE VECCHIO · HISTORY', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: "Galleria dell'Accademia (Michelangelo's David)", desc: 'Stand in awe before Michelangelo\'s monumental original marble masterpiece, David, sculpted in 1504.', cat: 'ART', imageLabel: 'MICHELANGELO DAVID · ART', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Piazzale Michelangelo Sunset', desc: 'Ascend to the panoramic hillside terrace for the quintessential golden-hour view over Florence\'s red terracotta rooftops and the Arno River.', cat: 'RELAX', imageLabel: 'PIAZZALE MICHELANGELO · RELAX', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'MEDICI RESIDENCES & SECRET GARDENS',
        activities: [
          { time: '09:30', title: 'Palazzo Pitti & Boboli Gardens', desc: 'Explore the grand Renaissance royal palace of the Medici family and stroll the sprawling 16th-century Italian Renaissance garden terraces.', cat: 'HISTORY', imageLabel: 'BOBOLI GARDENS · HISTORY', image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Oltrarno Artisan Quarter & Leather Shops', desc: 'Wander across the Arno into Florence\'s authentic artisan workshops, watch handmade marbling paper crafts, and enjoy local trattoria fare.', cat: 'SHOPPING', imageLabel: 'OLTRARNO CRAFTS · SHOPPING', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Basilica di San Miniato al Monte', desc: 'Visit one of Tuscany\'s finest Romanesque churches, perched above the city for sunset Gregorian chants and olive grove vistas.', cat: 'CULTURE', imageLabel: 'SAN MINIATO · CULTURE', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'MONASTIC TREASURES & TUSCAN HILLS',
        activities: [
          { time: '09:30', title: 'Santa Maria Novella & Historic Perfumery', desc: 'Admire Masaccio\'s pioneering Holy Trinity fresco and visit the historic Officina Profumo-Farmaceutica founded by Dominican friars in 1221.', cat: 'CULTURE', imageLabel: 'SANTA MARIA NOVELLA · CULTURE', image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Bargello National Museum & Piazza Santa Croce', desc: 'Marvel at Donatello\'s bronze David in the medieval fortress palace and pay homage at the tombs of Galileo and Michelangelo.', cat: 'ART', imageLabel: 'BARGELLO MUSEUM · ART', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Fiesole Hillside Panoramic Excursion', desc: 'Nearby Day Trip (~8 km / 20-min bus): Walk among ancient Roman amphitheater ruins and savor Tuscan wine overlooking the entire Florence basin.', cat: 'RELAX', imageLabel: 'FIESOLE HILLS · DAY TRIP', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'OLTRARNO BRIDGES & HILLTOP PANORAMAS',
        activities: [
          { time: '09:30', title: 'Ponte Vecchio Medieval Bridge', desc: 'Historic 14th-century stone arch bridge lined with venerable goldsmith shops.', cat: 'HISTORY', imageLabel: 'PONTE VECCHIO · HISTORY', image: '/images/image2.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Pitti Palace & Boboli Gardens', desc: 'Grand Medici Renaissance palace with expansive Renaissance sculptured cypress gardens.', cat: 'NATURE', imageLabel: 'BOBOLI GARDENS · NATURE', image: '/images/image4.jpg', layout: 'image-left' },
          { time: '17:00', title: 'Piazzale Michelangelo Sunset', desc: 'World-famous terrace overlooking the Arno river and terracotta roofs at golden hour.', cat: 'RELAX', imageLabel: 'PIAZZALE MICHELANGELO · RELAX', image: '/images/image3.jpg', layout: 'image-right' }
        ]
      }
    ]
  },
  'istanbul': {
    name: 'Istanbul',
    country: 'Turkey',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1800&q=80',
    days: [
      {
        dayNum: 1,
        dayTitle: 'HISTORIC SULTANAHMET & GRAND BAZAARS',
        activities: [
          { time: '09:00', title: 'Hagia Sophia & Blue Mosque', desc: 'Step inside the monumental 6th-century Byzantine cathedral-turned-mosque with soaring golden domes and the Blue Mosque\'s Iznik tiles.', cat: 'HISTORY', imageLabel: 'HAGIA SOPHIA · HISTORY', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:00', title: 'Grand Bazaar & Spice Market', desc: 'Immerse in one of the world\'s oldest covered markets with over 4,000 shops of spices, Turkish delight, lamps, and hand-woven kilims.', cat: 'SHOPPING', imageLabel: 'GRAND BAZAAR · SHOPPING', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Bosphorus Sunset Cruise', desc: 'Cruise the strait separating Europe and Asia as Ottoman waterfront palaces and illuminated minarets glow in the evening light.', cat: 'CULTURE', imageLabel: 'BOSPHORUS CRUISE · CULTURE', image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'IMPERIAL PALACES & GALATA PROMENADE',
        activities: [
          { time: '09:00', title: 'Topkapi Palace & Basilica Cistern', desc: 'Explore four centuries of Ottoman imperial courts overlooking the Golden Horn, then descend into the atmospheric Byzantine sunken cistern.', cat: 'HISTORY', imageLabel: 'TOPKAPI PALACE · HISTORY', image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Eminönü Street Food & Turkish Coffee', desc: 'Savor freshly grilled Balık Ekmek (mackerel sandwiches) by Galata Bridge and authentic hot sand brewed Turkish coffee with pistachio baklava.', cat: 'FOOD', imageLabel: 'EMINONU STREET FOOD · FOOD', image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '16:30', title: 'Galata Tower & Karaköy Promenade', desc: 'Ascend the 14th-century Genoese stone cylinder tower for 360-degree skyline views, then wander through Karaköy artisan cafes and galleries.', cat: 'RELAX', imageLabel: 'GALATA TOWER · RELAX', image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 3,
        dayTitle: 'OTTOMAN GLAMOUR & BOSPHORUS STRAIT',
        activities: [
          { time: '09:30', title: 'Dolmabahçe Palace Waterfront', desc: 'Tour the opulent 19th-century waterfront palace of Ottoman Sultans featuring 14-ton gilded ceilings and massive crystal chandeliers.', cat: 'HISTORY', imageLabel: 'DOLMABAHCE PALACE · HISTORY', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'İstiklal Avenue & Historic Tünel Tram', desc: 'Walk down the pedestrian avenue lined with historic passages, live street music, and ride the 1875 historic red tram.', cat: 'CULTURE', imageLabel: 'ISTIKLAL AVENUE · CULTURE', image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Ortaköy Mosque & Bosphorus Bridge Waffles', desc: 'Taste famous baked kumpir and waffles beside the baroque jewel mosque right under the glowing intercontinental bridge.', cat: 'FOOD', imageLabel: 'ORTAKOY MOSQUE · FOOD', image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 4,
        dayTitle: 'CROSS-CONTINENT VISTAS & SACRED MOSQUES',
        activities: [
          { time: '09:00', title: 'Kadıköy Asian Ferry & Seaside Promenade', desc: 'Take a scenic ferry ride across the Bosphorus to the Asian shore, exploring Moda seaside cafes and bustling food markets.', cat: 'NATURE', imageLabel: 'KADIKOY SEASIDE · NATURE', image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80', layout: 'image-right' },
          { time: '13:30', title: 'Süleymaniye Mosque & Golden Horn Views', desc: 'Visit architect Mimar Sinan\'s majestic 16th-century Ottoman imperial complex perched atop the third hill of Istanbul.', cat: 'CULTURE', imageLabel: 'SULEYMANIYE MOSQUE · CULTURE', image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80', layout: 'image-left' },
          { time: '17:30', title: 'Çamlıca Hill Sunset Tea Gardens', desc: 'Relax in pine-shaded open-air tea gardens overlooking panoramic views across both European and Asian continents.', cat: 'RELAX', imageLabel: 'CAMLICA HILL · RELAX', image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=800&q=80', layout: 'image-right' }
        ]
      },
      {
        dayNum: 2,
        dayTitle: 'IMPERIAL PALACES & UNDERGROUND CISTERNS',
        activities: [
          { time: '09:00', title: 'Topkapi Palace & Harem', desc: 'Sprawling Ottoman sultan palace overlooking the Golden Horn with sacred imperial relics.', cat: 'HISTORY', imageLabel: 'TOPKAPI PALACE · HISTORY', image: '/images/image1.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Basilica Cistern Sunken Palace', desc: 'Walk illuminated subterranean wooden platforms among 336 ancient Roman marble columns.', cat: 'CULTURE', imageLabel: 'BASILICA CISTERN · CULTURE', image: '/images/image3.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Galata Tower & Karakoy Cafes', desc: 'Medieval stone tower vistas followed by vibrant artisan coffee culture in Karakoy.', cat: 'FOOD', imageLabel: 'GALATA TOWER · FOOD', image: '/images/image4.jpg', layout: 'image-right' }
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
      },
      {
        dayNum: 2,
        dayTitle: 'DERVISH MONASTERY & WATERFALLS',
        activities: [
          { time: '09:30', title: 'Blagaj Tekke Dervish House', desc: 'Historical 16th-century Sufi monastery nestled under a sheer 200m limestone cliff beside the Buna spring.', cat: 'CULTURE', imageLabel: 'BLAGAJ TEKKE · CULTURE', image: '/images/image1.jpg', layout: 'image-right' },
          { time: '13:00', title: 'Kravice Waterfalls Lagoon', desc: 'Cascade amphitheatre with emerald waters and emerald green riverbanks.', cat: 'NATURE', imageLabel: 'KRAVICE WATERFALLS · NATURE', image: '/images/manali/joginiwaterfall.jpg', layout: 'image-left' },
          { time: '16:30', title: 'Pocitelj Fortified Medieval Village', desc: 'Step back in time through stone stairways, Ottoman watchtowers, and pomegranate orchards.', cat: 'HISTORY', imageLabel: 'POCITELJ · HISTORY', image: '/images/image3.jpg', layout: 'image-right' }
        ]
      }
    ]
  }
};

/**
 * Generate a complete, formatted itinerary object from curated templates.
 * Rejects unknown destinations with DESTINATION_NOT_FOUND rather than silently
 * falling back to New Delhi.
 *
 * @param {Object} options
 * @returns {Object} Complete itinerary object
 */
export function generateItinerary({
  destination,
  duration = 3,
  budget = 8000,
  travelers = 1,
  startDate = null,
  travelStyle = 'Balanced',
  interests = []
}) {
  const destId = (destination?.id || destination?.name || '').toLowerCase().trim();
  const template = destinationTemplates[destId];

  // Elimination of silent fallback: throw explicit error for unknown destination
  if (!template) {
    const error = new Error(
      `Destination "${destination?.name || destId}" is not in the curated template archive. Grounded generation required.`
    );
    error.code = 'DESTINATION_NOT_FOUND';
    throw error;
  }

  const templateDays = template.days || [];
  const destName = destination?.name || template.name;
  const totalDays = Math.max(1, Math.min(60, parseInt(duration, 10) || 3));
  const travNum = Math.max(1, Math.min(20, parseInt(travelers, 10) || 1));
  const budNum = Math.max(1000, parseInt(budget, 10) || 8000);

  // Dynamic tagline
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

  // Budget calculations
  const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(budNum, travNum);
  const { dates } = calculateTripDates(startDate, totalDays);

  // Build days without modulo duplicates: take available distinct days from template
  const days = [];
  for (let i = 1; i <= totalDays; i++) {
    // If within template length, use distinct template day
    if (i <= templateDays.length) {
      const templateDay = templateDays[i - 1];
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
        date: dates[i - 1] || null,
        dayTitle: templateDay.dayTitle,
        activities
      });
    } else {
      // If duration exceeds curated days, assemble an exploration day rather than repeating Day 1 verbatim
      const remainingDayNum = i;
      days.push({
        dayNum: remainingDayNum,
        date: dates[i - 1] || null,
        dayTitle: `LOCAL EXPLORATION & HIDDEN GEMS (DAY ${remainingDayNum})`,
        activities: [
          {
            time: '10:00',
            title: `${destName} Artisan District & Local Market Walk`,
            desc: `Explore off-the-beaten-path neighborhood alleys, local handicraft shops, and authentic food corners in ${destName}.`,
            cat: 'SHOPPING',
            image: template.image,
            imageLabel: `${destName.toUpperCase()} · SHOPPING`,
            layout: 'image-right'
          },
          {
            time: '14:00',
            title: `${destName} Botanical Enclave & Garden Stroll`,
            desc: `Quiet afternoon walk through regional gardens and green sanctuaries sheltered from city crowds.`,
            cat: 'NATURE',
            image: template.image,
            imageLabel: `${destName.toUpperCase()} · NATURE`,
            layout: 'image-left'
          },
          {
            time: '17:30',
            title: `${destName} Evening Sunset Point & Teahouse`,
            desc: `Unwind with scenic twilight vistas over ${destName} and sample regional teas and desserts.`,
            cat: 'RELAX',
            image: template.image,
            imageLabel: `${destName.toUpperCase()} · RELAX`,
            layout: 'image-right'
          }
        ]
      });
    }
  }

  return {
    tagline,
    overview,
    estimatedCostPerPerson,
    breakdown,
    days
  };
}

export default generateItinerary;
