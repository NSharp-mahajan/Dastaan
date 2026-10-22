import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    time: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    desc: { type: String, trim: true },
    cat: { type: String, trim: true },
    image: { type: String, trim: true },
    imageLabel: { type: String, trim: true },
    layout: { type: String, enum: ['image-left', 'image-right'], default: 'image-right' }
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNum: { type: Number, required: true },
    dayTitle: { type: String, trim: true },
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
      image: { type: String, trim: true },
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
      breakdown: [
        {
          name: { type: String, trim: true },
          pct: { type: Number },
          amount: { type: Number },
          color: { type: String, trim: true }
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
