const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
  }
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    pharmacyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Pharmacy',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Packed', 'On Way', 'Delivered', 'Cancelled'],
      default: 'Placed',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
