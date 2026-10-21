import mongoose from 'mongoose';

const savedDestinationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for saved destinations'],
      index: true
    },
    destinationId: {
      type: String,
      required: [true, 'Destination ID is required'],
      trim: true
    },
    destinationName: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate saved destinations for the same user
savedDestinationSchema.index({ user: 1, destinationId: 1 }, { unique: true });

const SavedDestination = mongoose.model('SavedDestination', savedDestinationSchema);

export default SavedDestination;
