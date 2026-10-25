import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    distanceKm: { type: Number },
    durationMin: { type: Number },
    mode: { type: String, enum: ['driving', 'walking', 'transit'], default: 'driving' },
    provider: { type: String, default: 'haversine-estimate' },
    isEstimated: { type: Boolean, default: true },
    geometry: {
      type: { type: String, default: 'LineString' },
      coordinates: { type: [[Number]], default: [] }
    },
    legs: [
      {
        from: { type: String },
        to: { type: String },
        distanceKm: { type: Number },
        durationMin: { type: Number },
        isEstimated: { type: Boolean },
        sourceLabel: { type: String }
      }
    ],
    attribution: { type: String },
    note: { type: String }
  },
  { _id: false }
);

const transitLegSchema = new mongoose.Schema(
  {
    toTitle: { type: String },
    distanceKm: { type: Number },
    durationMin: { type: Number },
    mode: { type: String },
    provider: { type: String },
    isEstimated: { type: Boolean },
    sourceLabel: { type: String }
  },
  { _id: false }
);

const feasibilitySchema = new mongoose.Schema(
  {
    dailyBudgetHours: { type: Number },
    totalVisitHours: { type: Number },
    totalTransitHours: { type: Number },
    totalDayHours: { type: Number },
    status: { type: String, enum: ['optimal', 'tight', 'relaxed'], default: 'optimal' },
    isFeasible: { type: Boolean, default: true },
    routeQuality: { type: String, enum: ['road_network', 'estimate', 'unknown'], default: 'unknown' },
    suggestions: [{ type: String }],
    warnings: [{ type: String }]
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    time: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    desc: { type: String, trim: true },
    cat: { type: String, trim: true },
    image: { type: String, trim: true },
    imageLabel: { type: String, trim: true },
    layout: { type: String, enum: ['image-left', 'image-right'], default: 'image-right' },
    transitToNext: transitLegSchema,
    placeId: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, trim: true },
    rating: { type: Number },
    visitDurationHours: { type: Number },
    openingStatus: { type: String, trim: true },
    source: { type: String, trim: true },
    attribution: { type: String, trim: true },
    imageSource: { type: String, trim: true },
    imageAttribution: { type: String, trim: true },
    isSelfGuided: { type: Boolean, default: false },
    poiId: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNum: { type: Number, required: true },
    date: { type: Date, default: null },
    dayTitle: { type: String, trim: true },
    isExplorationDay: { type: Boolean, default: false },
    feasibility: feasibilitySchema,
    route: routeSchema,
    activities: [activitySchema]
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trip must be associated with an authenticated user'],
      index: true
    },
    destination: {
      id: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      country: { type: String, trim: true },
      countryCode: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
      image: { type: String, trim: true },
      imageAttribution: { type: String, trim: true },
      defaultDur: { type: Number },
      defaultBud: { type: Number }
    },
    duration: {
      type: Number,
      required: [true, 'Trip duration is required'],
      min: [1, 'Duration must be at least 1 day'],
      max: [60, 'Duration cannot exceed 60 days'],
      default: 3
    },
    travelers: {
      type: Number,
      required: [true, 'Traveller count is required'],
      min: [1, 'At least 1 traveller is required'],
      max: [20, 'Maximum 20 travellers allowed per group plan'],
      default: 1
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    budget: {
      type: Number,
      required: [true, 'Trip budget is required'],
      min: [1000, 'Budget must be at least ₹1,000'],
      default: 8000
    },
    interests: {
      type: [String],
      default: []
    },
    travelStyle: {
      type: String,
      enum: ['Relaxed', 'Balanced', 'Packed', 'RELAXED', 'BALANCED', 'PACKED'],
      default: 'Balanced'
    },
    itinerary: {
      tagline: { type: String, trim: true },
      overview: { type: String, trim: true },
      estimatedCostPerPerson: { type: Number },
      breakdown: [
        {
          name: { type: String, trim: true },
          pct: { type: Number },
          amount: { type: Number },
          perPersonAmount: { type: Number },
          color: { type: String, trim: true },
          isEstimated: { type: Boolean, default: true }
        }
      ],
      days: [daySchema]
    }
  },
  {
    timestamps: true
  }
);

tripSchema.index({ user: 1, createdAt: -1 });

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;
