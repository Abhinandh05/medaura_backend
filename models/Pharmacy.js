const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    pharmacyName: {
      type: String,
      required: [true, 'Please add a pharmacy name'],
      trim: true,
      maxlength: [100, 'Name can not be more than 100 characters'],
    },
    ownerId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
    },
    phone: {
      type: String,
      maxlength: [20, 'Phone number can not be longer than 20 characters'],
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
        index: '2dsphere' // Essential for geospatial query $nearSphere
      }
    },
    openingHours: {
      type: String,
      default: '9:00 AM - 9:00 PM',
    },
  },
  {
    timestamps: true,
  }
);

// we could add cascading delete for medicines when a pharmacy is deleted
pharmacySchema.pre('deleteOne', { document: true, query: false }, async function () {
  console.log(`Medicines being removed from pharmacy ${this._id}`);
  await this.model('Medicine').deleteMany({ pharmacyId: this._id });
});

module.exports = mongoose.model('Pharmacy', pharmacySchema);
