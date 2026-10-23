import mongoose from 'mongoose';

const travelCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Cache key is required'],
      unique: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Cache category is required'],
      enum: ['search', 'destination', 'places', 'weather'],
      index: true
    },
    provider: {
      type: String,
      required: [true, 'Data provider identity is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Cached data payload is required']
    },
    retrievedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB automatic TTL deletion
    }
  },
  {
    timestamps: true
  }
);

/**
 * Retrieve fresh unexpired cache entry
 */
travelCacheSchema.statics.getFresh = async function (key) {
  // If database is disconnected (e.g. unit tests), skip gracefully
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const entry = await this.findOne({
      key,
      expiresAt: { $gt: new Date() }
    }).lean();
    return entry || null;
  } catch (err) {
    console.warn('[TravelCache] Read error:', err.message);
    return null;
  }
};

/**
 * Upsert cache entry with configurable TTL in seconds
 */
travelCacheSchema.statics.setWithTTL = async function (key, category, provider, data, ttlSeconds = 86400) {
  // If database is disconnected (e.g. unit tests), skip gracefully
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return await this.findOneAndUpdate(
      { key },
      {
        $set: {
          category,
          provider,
          data,
          retrievedAt: new Date(),
          expiresAt
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (err) {
    console.warn('[TravelCache] Write error:', err.message);
    return null;
  }
};

const TravelCache = mongoose.model('TravelCache', travelCacheSchema);

export default TravelCache;
