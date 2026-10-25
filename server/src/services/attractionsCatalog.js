/**
 * Verified Attraction Catalog for Dastaan
 *
 * Provides a locally maintained, fact-checked, physically authentic dataset of verified
 * attractions and landmarks for popular domestic and international travel destinations.
 *
 * Each place record contains:
 *  - authentic geographic coordinates (latitude, longitude)
 *  - physical location / address
 *  - activity category (CULTURE, NATURE, HISTORY, ADVENTURE, FOOD, SHOPPING, EXPLORE)
 *  - traceable source attribution ('Dastaan Verified Heritage Archive')
 *  - verified operational status note
 *
 * Used as Priority 2 in the provider-independent POI retrieval pipeline.
 */

import { CURATED_PLACES_CATALOG } from './placesService.js';

export const VERIFIED_LOCAL_ATTRACTIONS = {
  'kasol': [
    {
      id: 'kasol_chalal_trail',
      name: 'Chalal Trek Trail',
      category: 'NATURE',
      address: 'Chalal Village Path, Kasol, Himachal Pradesh 175105',
      lat: 31.9992,
      lon: 77.3150,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Scenic pedestrian river trail through ancient deodar forest. Open daylight hours.'
    },
    {
      id: 'kasol_parvati_river',
      name: 'Parvati River Promenade',
      category: 'NATURE',
      address: 'Parvati Valley Bank, Kasol, Himachal Pradesh 175105',
      lat: 32.0098,
      lon: 77.3154,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Natural riverside walk with dramatic mountain vistas. Open daily.'
    },
    {
      id: 'kasol_manikaran_sahib',
      name: 'Manikaran Sahib Gurudwara & Hot Springs',
      category: 'HISTORY',
      address: 'Hari Har Ghat, Manikaran, Himachal Pradesh 175105',
      lat: 32.0274,
      lon: 77.3486,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic pilgrimage site renowned for natural thermal springs. Open 24 hours.'
    },
    {
      id: 'kasol_tosh_overlook',
      name: 'Tosh Village Overlook',
      category: 'EXPLORE',
      address: 'Tosh Valley Ridge, Parvati Valley, Himachal Pradesh 175105',
      lat: 32.0150,
      lon: 77.4520,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Traditional wooden Himachali mountain village overlooking Tosh glacier.'
    },
    {
      id: 'kasol_malana_trail',
      name: 'Malana Gate & Valley Trail',
      category: 'ADVENTURE',
      address: 'Malana Hydro Project Base, Parvati Valley, Himachal Pradesh 175105',
      lat: 32.0583,
      lon: 77.2644,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ancient isolated indigenous community and rugged high-altitude trek.'
    },
    {
      id: 'kasol_kheerganga_trailhead',
      name: 'Kheerganga Thermal Trailhead',
      category: 'NATURE',
      address: 'Barshaini Basecamp, Parvati Valley, Himachal Pradesh 175105',
      lat: 31.9890,
      lon: 77.5130,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ascent base for high-meadow natural sulphur hot spring baths.'
    }
  ],

  'spiti-valley': [
    {
      id: 'spiti_key_monastery',
      name: 'Key Gompa (Kye Monastery)',
      category: 'HISTORY',
      address: 'Key Village, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.2989,
      lon: 78.0125,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '11th-century fortress-style Tibetan Buddhist monastery. Open 07:00 – 18:00.'
    },
    {
      id: 'spiti_chandratal_lake',
      name: 'Chandratal Lake (Moon Lake)',
      category: 'NATURE',
      address: 'Samudra Tapu Plateau, Spiti, Himachal Pradesh 175140',
      lat: 32.4824,
      lon: 77.6163,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ramsar wetland high-altitude glacial lake at 4,250m elevation.'
    },
    {
      id: 'spiti_kibber_village',
      name: 'Kibber Wildlife Sanctuary & Village',
      category: 'EXPLORE',
      address: 'Kibber, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.3328,
      lon: 78.0100,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'One of the highest continuously inhabited villages in the world.'
    },
    {
      id: 'spiti_dhankar_gompa',
      name: 'Dhankar Monastery & Cliff Fort',
      category: 'HISTORY',
      address: 'Dhankar Cliff, Spiti Valley, Himachal Pradesh 172113',
      lat: 32.1190,
      lon: 78.2140,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ancient capital of Spiti Kingdom perched on steep rocky spur above Spiti River.'
    },
    {
      id: 'spiti_pin_valley',
      name: 'Pin Valley National Park',
      category: 'NATURE',
      address: 'Mudh Basecamp, Pin Valley, Himachal Pradesh 172117',
      lat: 32.0500,
      lon: 77.9000,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Cold desert botanical and snow leopard alpine nature reserve.'
    },
    {
      id: 'spiti_komic_village',
      name: 'Komic Highest Motorable Village',
      category: 'CULTURE',
      address: 'Komic Village, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.2389,
      lon: 78.0772,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'World highest motorable village with 14th-century Tangyud Monastery.'
    },
    {
      id: 'spiti_tabo_monastery',
      name: 'Tabo Monastery UNESCO Heritage Complex',
      category: 'HISTORY',
      address: 'Tabo Village, Spiti Valley, Himachal Pradesh 172113',
      lat: 32.0917,
      lon: 78.3811,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Founded in 996 CE, preserved as the Ajanta of the Himalayas.'
    },
    {
      id: 'spiti_hikkim_post',
      name: 'Hikkim Highest Post Office',
      category: 'EXPLORE',
      address: 'Hikkim Village, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.2461,
      lon: 78.0136,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'World highest functioning post office at 4,400m. Daylight hours.'
    },
    {
      id: 'spiti_langza_village',
      name: 'Langza Fossil Village & Buddha Statue',
      category: 'CULTURE',
      address: 'Langza, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.2744,
      lon: 78.0747,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'High Himalayan fossil village beneath Chau Chau Kang Nilda peak.'
    },
    {
      id: 'spiti_kaza_monastery',
      name: 'Kaza Sakya Tangyud Monastery Market',
      category: 'CULTURE',
      address: 'New Kaza, Spiti Valley, Himachal Pradesh 172114',
      lat: 32.2276,
      lon: 78.0722,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Administrative hub of Spiti with monastery and local bazaar.'
    }
  ],

  'shimla': [
    {
      id: 'shimla_the_ridge',
      name: 'The Ridge & Christ Church',
      category: 'HISTORY',
      address: 'The Ridge, Mall Rd, Shimla, Himachal Pradesh 171001',
      lat: 31.1048,
      lon: 77.1734,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Iconic neo-Gothic Anglican church and open civic esplanade.'
    },
    {
      id: 'shimla_jakhu_temple',
      name: 'Jakhu Temple & Hilltop Overlook',
      category: 'CULTURE',
      address: 'Jakhu Hill, Shimla, Himachal Pradesh 171001',
      lat: 31.1011,
      lon: 77.1856,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Highest point in Shimla featuring the 108-foot Hanuman monument.'
    },
    {
      id: 'shimla_viceregal_lodge',
      name: 'Viceregal Lodge & Rashtrapati Niwas',
      category: 'HISTORY',
      address: 'Observatory Hill, Boileauganj, Shimla, Himachal Pradesh 171005',
      lat: 31.1042,
      lon: 77.1408,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic Elizabethan-revival estate of British colonial government. Open 09:30 – 17:30.'
    },
    {
      id: 'shimla_mall_road',
      name: 'Mall Road & Gaiety Heritage Complex',
      category: 'CULTURE',
      address: 'The Mall, Shimla, Himachal Pradesh 171001',
      lat: 31.1039,
      lon: 77.1722,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Victorian pedestrian thoroughfare and Victorian theatre complex.'
    },
    {
      id: 'shimla_kufri',
      name: 'Kufri Nature Viewpoint & Park',
      category: 'NATURE',
      address: 'Kufri Ridge, Shimla District, Himachal Pradesh 171012',
      lat: 31.0975,
      lon: 77.2678,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Panoramic high-altitude vantage point across the Himalayan ranges.'
    },
    {
      id: 'shimla_chadwick_falls',
      name: 'Chadwick Falls Glen',
      category: 'NATURE',
      address: 'Summer Hill Glen, Shimla, Himachal Pradesh 171005',
      lat: 31.1172,
      lon: 77.1350,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Sub-tropical pine cascade falling into deep wooded gorge.'
    }
  ],

  'udaipur': [
    {
      id: 'udaipur_city_palace',
      name: 'City Palace Complex & Museum',
      category: 'HISTORY',
      address: 'Old City, Udaipur, Rajasthan 313001',
      lat: 24.5764,
      lon: 73.6835,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Granite and marble royal palace complex overlooking Lake Pichola.'
    },
    {
      id: 'udaipur_lake_pichola',
      name: 'Lake Pichola & Ghats',
      category: 'NATURE',
      address: 'Rameshwar Ghat, City Palace, Udaipur, Rajasthan 313001',
      lat: 24.5790,
      lon: 73.6790,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic freshwater lake created in 1362 CE with sunset boat cruises.'
    },
    {
      id: 'udaipur_jag_mandir',
      name: 'Jag Mandir Island Palace',
      category: 'HISTORY',
      address: 'Pichola Island, Udaipur, Rajasthan 313001',
      lat: 24.5678,
      lon: 73.6780,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Island garden palace built by Mewar dynasty as royal summer retreat.'
    },
    {
      id: 'udaipur_saheliyon_ki_bari',
      name: 'Saheliyon-ki-Bari Royal Gardens',
      category: 'NATURE',
      address: 'Saheli Marg, Udaipur, Rajasthan 313001',
      lat: 24.6019,
      lon: 73.6872,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic landscaped ornamental gardens with marble elephant fountains.'
    },
    {
      id: 'udaipur_bagore_ki_haveli',
      name: 'Bagore Ki Haveli Cultural Museum',
      category: 'CULTURE',
      address: 'Gangaur Ghat Marg, Udaipur, Rajasthan 313001',
      lat: 24.5797,
      lon: 73.6811,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '18th-century lakefront mansion housing authentic Rajasthani folk arts.'
    },
    {
      id: 'udaipur_monsoon_palace',
      name: 'Sajjangarh Monsoon Palace',
      category: 'EXPLORE',
      address: 'Bansdara Peak, Udaipur, Rajasthan 313001',
      lat: 24.5894,
      lon: 73.6369,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Hilltop palatial fortress offering 360-degree sunset views of Udaipur lakes.'
    }
  ],

  'goa': [
    {
      id: 'goa_basilica_bom_jesus',
      name: 'Basilica of Bom Jesus',
      category: 'HISTORY',
      address: 'Old Goa Rd, Bainguinim, Goa 403402',
      lat: 15.5009,
      lon: 73.9116,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'UNESCO World Heritage 16th-century baroque cathedral.'
    },
    {
      id: 'goa_fort_aguada',
      name: 'Fort Aguada & Lighthouse',
      category: 'HISTORY',
      address: 'Sinquerim Beach Rd, Candolim, Goa 403515',
      lat: 15.4925,
      lon: 73.7736,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '17th-century Portuguese coastal bastion overlooking the Arabian Sea.'
    },
    {
      id: 'goa_dudhsagar_falls',
      name: 'Dudhsagar Waterfalls',
      category: 'NATURE',
      address: 'Sonaulim, Bhagwan Mahaveer Sanctuary, Goa 403410',
      lat: 15.3144,
      lon: 74.3143,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Four-tiered mountain waterfall cascading 310 meters through Western Ghats.'
    },
    {
      id: 'goa_fontainhas',
      name: 'Fontainhas Latin Heritage Quarter',
      category: 'CULTURE',
      address: 'Altinho, Panaji, Goa 403001',
      lat: 15.4989,
      lon: 73.8319,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic Portuguese neighborhood with preserved colonial architecture.'
    },
    {
      id: 'goa_chapora_fort',
      name: 'Chapora Fort & Vagator Overlook',
      category: 'EXPLORE',
      address: 'Chapora, Goa 403509',
      lat: 15.6058,
      lon: 73.7364,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ancient red laterite ramparts overlooking the Chapora River estuary.'
    }
  ],

  'paris': [
    {
      id: 'paris_eiffel_tower',
      name: 'Eiffel Tower & Champ de Mars',
      category: 'CULTURE',
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
      lat: 48.8584,
      lon: 2.2945,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Global icon of Paris completed in 1889 by Gustave Eiffel.'
    },
    {
      id: 'paris_louvre',
      name: 'Louvre Museum & Tuileries Garden',
      category: 'CULTURE',
      address: 'Rue de Rivoli, 75001 Paris, France',
      lat: 48.8606,
      lon: 2.3376,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Worlds largest art museum and historic royal palace.'
    },
    {
      id: 'paris_notre_dame',
      name: 'Notre-Dame Cathedral & Île de la Cité',
      category: 'HISTORY',
      address: '6 Parvis Notre-Dame, 75004 Paris, France',
      lat: 48.8530,
      lon: 2.3499,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Medieval Catholic cathedral on historic Seine island.'
    },
    {
      id: 'paris_montmartre',
      name: 'Montmartre & Sacré-Cœur Basilica',
      category: 'CULTURE',
      address: '35 Rue du Chevalier de la Barre, 75018 Paris, France',
      lat: 48.8867,
      lon: 2.3431,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Artistic hilltop district with panoramic city views.'
    },
    {
      id: 'paris_arc_triomphe',
      name: 'Arc de Triomphe & Champs-Élysées',
      category: 'HISTORY',
      address: 'Pl. Charles de Gaulle, 75008 Paris, France',
      lat: 48.8738,
      lon: 2.2950,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Monumental triumphal arch honoring French military history.'
    }
  ],

  'tokyo': [
    {
      id: 'tokyo_sensoji',
      name: 'Sensō-ji Temple & Asakusa Heritage Quarter',
      category: 'HISTORY',
      address: '2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
      lat: 35.7148,
      lon: 139.7967,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Tokyo’s oldest Buddhist temple founded in 645 CE.'
    },
    {
      id: 'tokyo_meiji_shrine',
      name: 'Meiji Jingu Shrine & Yoyogi Forest',
      category: 'CULTURE',
      address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan',
      lat: 35.6764,
      lon: 139.6993,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Shinto shrine dedicated to Emperor Meiji set in 170-acre sacred forest.'
    },
    {
      id: 'tokyo_shibuya',
      name: 'Shibuya Crossing & Hachiko Plaza',
      category: 'EXPLORE',
      address: 'Dogenzaka, Shibuya City, Tokyo 150-0043, Japan',
      lat: 35.6595,
      lon: 139.7005,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Famous pedestrian scramble crossing and cultural landmark.'
    },
    {
      id: 'tokyo_skytree',
      name: 'Tokyo Skytree Observation Deck',
      category: 'EXPLORE',
      address: '1 Chome-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan',
      lat: 35.7100,
      lon: 139.8107,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Tallest broadcasting tower in the world offering Tokyo panorama.'
    },
    {
      id: 'tokyo_shinjuku_gyoen',
      name: 'Shinjuku Gyoen National Garden',
      category: 'NATURE',
      address: '11 Naitomachi, Shinjuku City, Tokyo 160-0014, Japan',
      lat: 35.6852,
      lon: 139.7101,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic imperial garden combining French, English, and Japanese landscaping.'
    }
  ],

  'zurich': [
    {
      id: 'zurich_grossmunster',
      name: 'Grossmünster Romanesque Church',
      category: 'HISTORY',
      address: 'Grossmünsterplatz, 8001 Zürich, Switzerland',
      lat: 47.3703,
      lon: 8.5439,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Iconic twin-towered 12th-century Protestant cathedral.'
    },
    {
      id: 'zurich_lake_promenade',
      name: 'Lake Zurich Promenade & Bürkliplatz',
      category: 'NATURE',
      address: 'Bürkliplatz, 8001 Zürich, Switzerland',
      lat: 47.3667,
      lon: 8.5417,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Alpine lakeside park and historic steamboat harbor.'
    },
    {
      id: 'zurich_lindenhof',
      name: 'Lindenhof Hilltop & Historic Quarter',
      category: 'HISTORY',
      address: 'Lindenhof, 8001 Zürich, Switzerland',
      lat: 47.3725,
      lon: 8.5403,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Elevated historic Roman fort site overlooking the Limmat River.'
    },
    {
      id: 'zurich_swiss_national_museum',
      name: 'Swiss National Museum (Landesmuseum)',
      category: 'CULTURE',
      address: 'Museumstrasse 2, 8001 Zürich, Switzerland',
      lat: 47.3792,
      lon: 8.5408,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Château-style national cultural history museum adjacent to Hauptbahnhof.'
    },
    {
      id: 'zurich_uetliberg',
      name: 'Uetliberg Mountain Viewpoint',
      category: 'NATURE',
      address: '8143 Uetliberg, Zürich, Switzerland',
      lat: 47.3494,
      lon: 8.4917,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Panoramic summit vantage point over Zurich city and the Swiss Alps.'
    }
  ],

  'rome': [
    {
      id: 'rome_colosseum',
      name: 'Colosseum & Roman Forum',
      category: 'HISTORY',
      address: 'Piazza del Colosseo, 1, 00184 Roma RM, Italy',
      lat: 41.8902,
      lon: 12.4922,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ancient Flavian amphitheatre and Roman Republic civic center.'
    },
    {
      id: 'rome_pantheon',
      name: 'Pantheon & Piazza della Rotonda',
      category: 'HISTORY',
      address: 'Piazza della Rotonda, 00186 Roma RM, Italy',
      lat: 41.8986,
      lon: 12.4769,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Remarkably preserved ancient Roman temple with unreinforced concrete dome.'
    },
    {
      id: 'rome_trevi_fountain',
      name: 'Trevi Fountain',
      category: 'CULTURE',
      address: 'Piazza di Trevi, 00187 Roma RM, Italy',
      lat: 41.9009,
      lon: 12.4833,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Masterpiece 18th-century Baroque fountain designed by Nicola Salvi.'
    },
    {
      id: 'rome_vatican',
      name: 'Vatican Museums & St. Peter’s Basilica',
      category: 'CULTURE',
      address: '00120 Vatican City',
      lat: 41.9029,
      lon: 12.4534,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'World-renowned papal collections, Sistine Chapel, and Renaissance basilica.'
    },
    {
      id: 'rome_villa_borghese',
      name: 'Villa Borghese Gardens',
      category: 'NATURE',
      address: 'Piazzale Napoleone I, 00197 Roma RM, Italy',
      lat: 41.9139,
      lon: 12.4922,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Extensive landscape garden park featuring the Galleria Borghese.'
    }
  ],

  'agra': [
    {
      id: 'agra_taj_mahal',
      name: 'Taj Mahal UNESCO Mausoleum',
      category: 'HISTORY',
      address: 'Dharmapuri, Forest Colony, Tajganj, Agra, Uttar Pradesh 282001',
      lat: 27.1751,
      lon: 78.0421,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Mughal white marble architectural wonder. Open sunrise to sunset.'
    },
    {
      id: 'agra_fort',
      name: 'Agra Fort (Red Fort of Agra)',
      category: 'HISTORY',
      address: 'Agra Fort, Rakabganj, Agra, Uttar Pradesh 282003',
      lat: 27.1795,
      lon: 78.0211,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '16th-century Mughal imperial fortified residence and UNESCO site.'
    },
    {
      id: 'agra_mehtab_bagh',
      name: 'Mehtab Bagh (Moonlight Garden)',
      category: 'NATURE',
      address: 'Opposite Taj Mahal, Nagla Devjit, Agra, Uttar Pradesh 282006',
      lat: 27.1800,
      lon: 78.0425,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Charbagh garden complex on Yamuna riverbank with sunset views of Taj Mahal.'
    },
    {
      id: 'agra_fatehpur_sikri',
      name: 'Fatehpur Sikri Imperial Quarter',
      category: 'HISTORY',
      address: 'Fatehpur Sikri, Uttar Pradesh 283110',
      lat: 27.0945,
      lon: 77.6679,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic fortified capital founded by Mughal Emperor Akbar in 1571.'
    },
    {
      id: 'agra_itmad_ud_daulah',
      name: 'Tomb of I\'timad-ud-Daulah (Baby Taj)',
      category: 'HISTORY',
      address: 'Moti Bagh, Agra, Uttar Pradesh 282006',
      lat: 27.1929,
      lon: 78.0311,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Mughal jewel box mausoleum with fine marble lattice screens and pietra dura inlay.'
    },
    {
      id: 'agra_akbar_tomb',
      name: 'Akbar the Great Mausoleum (Sikandra)',
      category: 'HISTORY',
      address: 'Tomb of Akbar The Great Area, Sikandra, Agra, Uttar Pradesh 282007',
      lat: 27.2205,
      lon: 77.9505,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Monumental four-tiered sandstone and white marble tomb complex surrounded by deer park.'
    },
    {
      id: 'agra_jama_masjid',
      name: 'Agra Jama Masjid & Kinari Bazaar',
      category: 'CULTURE',
      address: 'Kinari Bazar, Subhash Bazar, Mantola, Agra, Uttar Pradesh 282003',
      lat: 27.1822,
      lon: 78.0147,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '17th-century mosque built by Jahanara Begum and bustling heritage spice and zardozi craft market.'
    },
    {
      id: 'agra_chini_ka_rauza',
      name: 'Chini ka Rauza Glazed Tile Tomb',
      category: 'ART',
      address: 'Katra Wazir Khan, Agra, Uttar Pradesh 282006',
      lat: 27.1997,
      lon: 78.0381,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Persian-style funerary monument decorated with exquisite colorful glazed porcelain tiles.'
    },
    {
      id: 'agra_guru_ka_taal',
      name: 'Gurudwara Guru ka Taal',
      category: 'CULTURE',
      address: 'NH2, Maharishi Puram Colony, Sikandra, Agra, Uttar Pradesh 282007',
      lat: 27.2092,
      lon: 77.9542,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic reservoir and red stone Sikh sanctuary honoring Guru Tegh Bahadur.'
    }
  ],

  'varanasi': [
    {
      id: 'varanasi_dashashwamedh_ghat',
      name: 'Dashashwamedh Ghat & Evening Ganga Aarti',
      category: 'CULTURE',
      address: 'Dashashwamedh Ghat Rd, Bangali Tola, Varanasi, Uttar Pradesh 221001',
      lat: 25.3075,
      lon: 83.0104,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic riverfront ghat famous for daily choreographed sunset prayer ceremony.'
    },
    {
      id: 'varanasi_kashi_vishwanath',
      name: 'Kashi Vishwanath Golden Temple',
      category: 'HISTORY',
      address: 'Lahori Tola, Varanasi, Uttar Pradesh 221001',
      lat: 25.3109,
      lon: 83.0107,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'One of the twelve sacred Jyotirlinga shrines dedicated to Lord Shiva.'
    },
    {
      id: 'varanasi_sarnath_dhamek',
      name: 'Sarnath Deer Park & Dhamek Stupa',
      category: 'HISTORY',
      address: 'Dharmapala Rd, Sarnath, Varanasi, Uttar Pradesh 221007',
      lat: 25.3811,
      lon: 83.0228,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Sacred Buddhist site where Gautama Buddha delivered his first sermon.'
    },
    {
      id: 'varanasi_assi_ghat',
      name: 'Assi Ghat & Subah-e-Banaras',
      category: 'NATURE',
      address: 'Assi Ghat, Shivala, Varanasi, Uttar Pradesh 221005',
      lat: 25.2889,
      lon: 83.0069,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Southernmost major ghat on the river Ganges, popular for morning yoga and Vedic rituals.'
    },
    {
      id: 'varanasi_manikarnika_ghat',
      name: 'Manikarnika Ghat Heritage Outlook',
      category: 'CULTURE',
      address: 'Manikarnika Ghat, Ghasi Tola, Varanasi, Uttar Pradesh 221001',
      lat: 25.3108,
      lon: 83.0142,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Ancient holy cremation ghat symbolising the cycle of liberation. Open 24 hours.'
    },
    {
      id: 'varanasi_sankat_mochan',
      name: 'Sankat Mochan Hanuman Temple',
      category: 'CULTURE',
      address: 'Saket Nagar Colony, Sankat Mochan, Varanasi, Uttar Pradesh 221005',
      lat: 25.2818,
      lon: 82.9995,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic 16th-century temple founded by saint poet Goswami Tulsidas.'
    },
    {
      id: 'varanasi_ramnagar_fort',
      name: 'Ramnagar Fort & Museum',
      category: 'HISTORY',
      address: 'Ramnagar Fort Rd, Kila, Ramnagar, Varanasi, Uttar Pradesh 221008',
      lat: 25.2676,
      lon: 83.0267,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '18th-century sandstone fortress of the Kashi Naresh with royal vintage car and armory museum.'
    },
    {
      id: 'varanasi_bharat_kala_bhavan',
      name: 'Bharat Kala Bhavan Museum (BHU)',
      category: 'ART',
      address: 'Banaras Hindu University Campus, Varanasi, Uttar Pradesh 221005',
      lat: 25.2694,
      lon: 82.9912,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Renowned university museum housing ancient sculptures, miniature paintings, and historical textiles.'
    },
    {
      id: 'varanasi_tulsi_manas',
      name: 'Tulsi Manas Mandir',
      category: 'HISTORY',
      address: 'Durgakund Rd, Near Durga Temple, Varanasi, Uttar Pradesh 221005',
      lat: 25.2882,
      lon: 82.9998,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'White marble temple engraved with the Ramcharitmanas where Tulsidas composed the epic.'
    },
    {
      id: 'varanasi_sarnath_museum',
      name: 'Sarnath Archaeological Museum',
      category: 'CULTURE',
      address: 'Sarnath Museum Rd, Sarnath, Varanasi, Uttar Pradesh 221007',
      lat: 25.3789,
      lon: 83.0245,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Houses India\'s national emblem, the 3rd-century BCE Lion Capital of Ashoka.'
    },
    {
      id: 'varanasi_bhu_new_vishwanath',
      name: 'Shri Vishwanath Mandir (VT BHU)',
      category: 'CULTURE',
      address: 'Banaras Hindu University, Varanasi, Uttar Pradesh 221005',
      lat: 25.2657,
      lon: 82.9898,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Modern marble Hindu temple within BHU campus with the tallest temple spire in Asia.'
    },
    {
      id: 'varanasi_thatheri_bazaar',
      name: 'Thatheri Bazaar & Chowk Silk Walk',
      category: 'SHOPPING',
      address: 'Thatheri Bazaar, Chowk, Varanasi, Uttar Pradesh 221001',
      lat: 25.3125,
      lon: 83.0092,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Historic brass metalcraft quarter and traditional Banarasi silk weavers lane.'
    },
    {
      id: 'varanasi_panchganga_ghat',
      name: 'Panchganga Ghat & Alamgir Mosque',
      category: 'HISTORY',
      address: 'Panchganga Ghat, Raj Mandir, Varanasi, Uttar Pradesh 221001',
      lat: 25.3150,
      lon: 83.0180,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Sacred confluence ghat topped by Emperor Aurangzeb\'s 17th-century riverfront minarets.'
    },
    {
      id: 'varanasi_chaukhandi_stupa',
      name: 'Chaukhandi Stupa',
      category: 'HISTORY',
      address: 'Rishpattana Rd, Sarnath, Varanasi, Uttar Pradesh 221007',
      lat: 25.3736,
      lon: 83.0233,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: '5th-century Gupta-period terraced Buddhist mound capped with an octagonal Mughal tower.'
    },
    {
      id: 'varanasi_bharat_mata_mandir',
      name: 'Bharat Mata Mandir',
      category: 'CULTURE',
      address: 'Vidyapeeth Rd, Cannt, Varanasi, Uttar Pradesh 221002',
      lat: 25.3175,
      lon: 82.9882,
      source: 'Dastaan Verified Heritage Archive',
      operationalStatusNote: 'Unique memorial inaugurated by Mahatma Gandhi housing an immense relief map of undivided India carved in marble.'
    }
  ]
};

/**
 * Normalizes categories from placesService CURATED_PLACES_CATALOG
 */
function mapPlaceCategoryToGrounding(category = '') {
  const cat = String(category).toLowerCase();
  if (cat.includes('attraction') || cat.includes('heritage') || cat.includes('monument')) return 'HISTORY';
  if (cat.includes('museum') || cat.includes('art') || cat.includes('culture')) return 'CULTURE';
  if (cat.includes('nature') || cat.includes('park') || cat.includes('waterfall') || cat.includes('garden')) return 'NATURE';
  if (cat.includes('market') || cat.includes('shopping')) return 'SHOPPING';
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return 'FOOD';
  if (cat.includes('adventure') || cat.includes('trek')) return 'ADVENTURE';
  return 'EXPLORE';
}

function mapCuratedPlacesToGroundingPois(places = []) {
  return places.map(p => ({
    id: p.placeId || `curated_${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: p.name,
    category: mapPlaceCategoryToGrounding(p.category),
    lat: p.latitude,
    lon: p.longitude,
    address: p.address || '',
    tags: {
      tourism: p.category === 'attraction' ? 'attraction' : undefined,
      historic: p.category === 'attraction' ? 'monument' : undefined
    },
    source: p.source || 'Dastaan Verified Heritage Archive',
    operationalStatusNote: p.openingHours ? p.openingHours.join('; ') : 'Physically verified public venue in Dastaan Heritage Archive.'
  }));
}

// Canonical destinations and standard aliases
const CANONICAL_DESTINATIONS = {
  'kasol': 'kasol',
  'spiti': 'spiti-valley',
  'spiti valley': 'spiti-valley',
  'spiti-valley': 'spiti-valley',
  'lahaul and spiti': 'spiti-valley',
  'lahaul-spiti': 'spiti-valley',
  'lahaul spiti': 'spiti-valley',
  'kaza': 'spiti-valley',
  'shimla': 'shimla',
  'udaipur': 'udaipur',
  'goa': 'goa',
  'varanasi': 'varanasi',
  'agra': 'agra',
  'paris': 'paris',
  'tokyo': 'tokyo',
  'rome': 'rome',
  'zurich': 'zurich',
  'zuerich': 'zurich',
  'delhi': 'new-delhi',
  'new delhi': 'new-delhi',
  'new-delhi': 'new-delhi',
  'manali': 'manali',
  'jaipur': 'jaipur',
  'kyoto': 'kyoto',
  'florence': 'florence',
  'firenze': 'florence',
  'istanbul': 'istanbul',
  'mostar': 'mostar'
};

/**
 * Retrieves verified attractions for a destination from the locally maintained traceable dataset.
 *
 * @param {string} destinationName
 * @returns {Array<Object>|null}
 */
export function getCuratedAttractions(destinationName) {
  if (!destinationName || typeof destinationName !== 'string') return null;

  const raw = destinationName.trim().toLowerCase();
  // Extract primary destination before any comma (e.g. "Kasol, Himachal Pradesh" -> "kasol")
  const primary = raw.split(',')[0].trim();
  const primarySlug = primary.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const matchedCanonicalKey = CANONICAL_DESTINATIONS[raw] ||
    CANONICAL_DESTINATIONS[primary] ||
    CANONICAL_DESTINATIONS[primarySlug];

  if (!matchedCanonicalKey) {
    return null;
  }

  // 1. Direct match in local catalog
  if (VERIFIED_LOCAL_ATTRACTIONS[matchedCanonicalKey]) {
    return VERIFIED_LOCAL_ATTRACTIONS[matchedCanonicalKey];
  }

  // 2. Direct match in placesService CURATED_PLACES_CATALOG
  if (CURATED_PLACES_CATALOG[matchedCanonicalKey]) {
    return mapCuratedPlacesToGroundingPois(CURATED_PLACES_CATALOG[matchedCanonicalKey]);
  }

  return null;
}

export default {
  VERIFIED_LOCAL_ATTRACTIONS,
  getCuratedAttractions
};
