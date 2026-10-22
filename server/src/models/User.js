import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      trim: true
    },
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
    photoURL: {
      type: String,
      trim: true,
      default: null
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: null
    },
    mobile: {
      type: String,
      trim: true,
      default: null
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'user'
    },
    emailVerified: {
      type: Boolean,
      default: false
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

// Prevent accidental leaking of internal or legacy fields in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
