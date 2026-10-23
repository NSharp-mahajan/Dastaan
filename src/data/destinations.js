/**
 * Destination datasets for Dastaan
 * Synchronized across Trip Planner and Discover Engine.
 * Note: Budgets are estimated ground costs in INR (excluding international flights).
 */

export const plannerDestinations = [
  { id: 'new-delhi', name: 'New Delhi', country: 'India', image: '/images/newdelhi/indiagate.jpg', defaultDur: 3, defaultBud: 10000 },
  { id: 'jaipur', name: 'Jaipur', country: 'India', image: '/images/jaipur/amerfortandasheeshmahal.jpg', defaultDur: 3, defaultBud: 12000 },
  { id: 'manali', name: 'Manali', country: 'India', image: '/images/manali/rohtangpass.jpg', defaultDur: 3, defaultBud: 11000 },
  { id: 'udaipur', name: 'Udaipur', country: 'India', image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 18000 },
  { id: 'rishikesh', name: 'Rishikesh', country: 'India', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1800&q=80', defaultDur: 3, defaultBud: 12000 },
  { id: 'kyoto', name: 'Kyoto', country: 'Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80', defaultDur: 5, defaultBud: 35000 },
  { id: 'mostar', name: 'Mostar', country: 'Bosnia & Herzegovina', image: '/images/firstImage.jpeg', defaultDur: 2, defaultBud: 10000 },
  { id: 'florence', name: 'Florence', country: 'Italy', image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 30000 },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 22000 },
];

export const discoverDestinations = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    description: "Culture, culinary arts, and tranquil zen gardens come together in a slower-paced journey through Japan's historic imperial heart.",
    budget: 35000,
    days: 5,
    interests: ["Culture", "Food", "Nature", "History"],
    styles: ["Balanced", "Relaxed"]
  },
  {
    id: "jaipur",
    name: "Jaipur",
    country: "India",
    image: "/images/jaipur/amerfortandasheeshmahal.jpg",
    description: "The Pink City offers majestic hilltop forts, royal courtyards, and vibrant craft bazaars rich in Rajasthani heritage.",
    budget: 12000,
    days: 3,
    interests: ["History", "Culture", "Shopping", "Art"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "udaipur",
    name: "Udaipur",
    country: "India",
    image: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1200&q=80",
    description: "Known as the City of Lakes, offering regal marble palaces, tranquil sunset boat rides on Lake Pichola, and living heritage.",
    budget: 18000,
    days: 4,
    interests: ["Nature", "Culture", "History", "Food"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description: "Where Europe and Asia meet—a bustling metropolis of Byzantine domes, Ottoman palaces, fragrant spice markets, and Bosphorus cruises.",
    budget: 22000,
    days: 4,
    interests: ["History", "Food", "Culture", "Shopping"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "rishikesh",
    name: "Rishikesh",
    country: "India",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    description: "The Yoga Capital of the World, resting on the sacred banks of the Ganges, offering Himalayan spirituality, ashrams, and river rafting.",
    budget: 12000,
    days: 3,
    interests: ["Nature", "Adventure", "Culture"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "new-delhi",
    name: "New Delhi",
    country: "India",
    image: "/images/newdelhi/indiagate.jpg",
    description: "A monumental capital blending UNESCO Mughal garden tombs, legendary Old Delhi street food walks, and contemporary open-air art districts.",
    budget: 10000,
    days: 3,
    interests: ["History", "Food", "Culture", "Art"],
    styles: ["Balanced", "Packed"]
  },
  {
    id: "manali",
    name: "Manali",
    country: "India",
    image: "/images/manali/rohtangpass.jpg",
    description: "Nestled in the Pir Panjal range, featuring ancient cedar-shaded pagoda temples, waterfall treks, and high-altitude alpine pass vistas.",
    budget: 11000,
    days: 3,
    interests: ["Nature", "Adventure", "Culture"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "mostar",
    name: "Mostar",
    country: "Bosnia & Herzegovina",
    image: "/images/firstImage.jpeg",
    description: "A historic cultural crossroads where reconstructed 16th-century Ottoman stone architecture and artisan copperware line the turquoise Neretva River.",
    budget: 10000,
    days: 2,
    interests: ["History", "Culture", "Shopping", "Nature"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "florence",
    name: "Florence",
    country: "Italy",
    image: "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80",
    description: "The cradle of the Renaissance, renowned for terracotta dome architecture, world-famous Uffizi art collections, and authentic Tuscan cuisine.",
    budget: 30000,
    days: 4,
    interests: ["Art", "Culture", "Food", "History"],
    styles: ["Balanced", "Packed"]
  }
];
