import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    mobile: {
      type: String,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [32, 'Password hash must be valid']
    },
    travelStyle: {
      type: String,
      enum: {
        values: ['RELAXED', 'BALANCED', 'PACKED', 'Relaxed', 'Balanced', 'Packed'],
        message: '{VALUE} is not a valid travel style'
      },
      default: 'Balanced'
    }
  },
  {
    timestamps: true
  }
);

// Prevent accidental leaking of password hash in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Index on email for fast lookups
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;
