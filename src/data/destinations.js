/**
 * Destination datasets for Dastaan
 */

export const plannerDestinations = [
  { id: 'new-delhi', name: 'New Delhi', country: 'India', image: '/images/newdelhi/indiagate.jpg', defaultDur: 3, defaultBud: 8000 },
  { id: 'jaipur', name: 'Jaipur', country: 'India', image: '/images/jaipur/amerfortandasheeshmahal.jpg', defaultDur: 3, defaultBud: 10000 },
  { id: 'manali', name: 'Manali', country: 'India', image: '/images/manali/rohtangpass.jpg', defaultDur: 3, defaultBud: 9000 },
  { id: 'kyoto', name: 'Kyoto', country: 'Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80', defaultDur: 5, defaultBud: 30000 },
  { id: 'mostar', name: 'Mostar', country: 'Bosnia', image: 'https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80', defaultDur: 2, defaultBud: 5000 },
  { id: 'florence', name: 'Florence', country: 'Italy', image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 25000 },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80', defaultDur: 4, defaultBud: 15000 },
];

export const discoverDestinations = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    description: "Culture, food and nature come together in a slower-paced journey through Japan's historic heart.",
    budget: 30000,
    days: 5,
    interests: ["Culture", "Food", "Nature", "History"],
    styles: ["Balanced", "Relaxed"]
  },
  {
    id: "jaipur",
    name: "Jaipur",
    country: "India",
    image: "/images/jaipur/hawamahal.jpg",
    description: "The Pink City offers majestic forts, royal palaces, and vibrant bazaars full of life and color.",
    budget: 15000,
    days: 3,
    interests: ["History", "Culture", "Shopping", "Art"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "udaipur",
    name: "Udaipur",
    country: "India",
    image: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1200&q=80",
    description: "Known as the City of Lakes, offering a romantic, serene, and historically rich escape.",
    budget: 20000,
    days: 4,
    interests: ["Nature", "Culture", "History", "Food"],
    styles: ["Relaxed", "Balanced"]
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description: "Where East meets West—a bustling metropolis of bazaars, mosques, and incredible street food.",
    budget: 25000,
    days: 5,
    interests: ["History", "Food", "Culture", "Shopping"],
    styles: ["Packed", "Balanced"]
  },
  {
    id: "rishikesh",
    name: "Rishikesh",
    country: "India",
    image: "https://images.unsplash.com/photo-1545203144-79397492b239?auto=format&fit=crop&w=1200&q=80",
    description: "The Yoga Capital of the World, sitting on the banks of the Ganges, offering peace and adventure.",
    budget: 12000,
    days: 3,
    interests: ["Nature", "Adventure", "Culture"],
    styles: ["Relaxed", "Balanced"]
  }
];
