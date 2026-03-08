const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'pharmacy_owner', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    location: {
      // GeoJSON Point
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere' // Required for geospatial queries
      }
    },
    addresses: [
      {
        title: { type: String, required: true },
        address: { type: String, required: true },
        icon: { type: String, default: '🏠' }
      }
    ],
    notificationSettings: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      deliveryStatus: { type: Boolean, default: true },
      newPharmacies: { type: Boolean, default: true }
    },
    cards: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        number: { type: String, required: true },
        expiry: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
