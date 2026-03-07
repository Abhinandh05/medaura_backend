const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Please add a medicine name'],
      trim: true,
      index: true, // We will also create a text index for search
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
      default: 'General'
    },
    pharmacyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Pharmacy',
      required: true,
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Please add stock quantity'],
      min: [0, 'Stock cannot be negative']
    },
    price: {
      type: Number,
      required: [true, 'Please add price']
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Out of Stock'],
      default: 'Available'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Create a text index on medicineName to optimize the search query
medicineSchema.index({ medicineName: 'text' });

// Middleware to update availability status based on stock quantity
medicineSchema.pre('save', function (next) {
  if (this.stockQuantity === 0) {
    this.availabilityStatus = 'Out of Stock';
  } else {
    this.availabilityStatus = 'Available';
  }
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
