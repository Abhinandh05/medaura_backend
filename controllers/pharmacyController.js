const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');

/**
 * @desc    Get pharmacy stats for dashboard
 * @route   GET /api/pharmacies/stats
 * @access  Private (pharmacy_owner)
 */
const getPharmacyStats = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findOne({ ownerId: req.user.id });

    if (!pharmacy) {
      res.status(404);
      throw new Error('Pharmacy not found for this user');
    }

    const totalMedicines = await Medicine.countDocuments({ pharmacyId: pharmacy._id });
    const lowStock = await Medicine.countDocuments({ 
      pharmacyId: pharmacy._id, 
      stockQuantity: { $lt: 5 } 
    });
    
    // Recent activity (mocked for now based on medicine updates)
    const recentMedicines = await Medicine.find({ pharmacyId: pharmacy._id })
      .sort({ updatedAt: -1 })
      .limit(2);

    const activity = recentMedicines.map(med => ({
      text: `You updated "${med.medicineName}" stock.`,
      time: med.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        totalMedicines,
        lowStock,
        dailyViews: Math.floor(Math.random() * 200), // Placeholder for views
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new pharmacy
 * @route   POST /api/pharmacies
 * @access  Private (pharmacy_owner, admin)
 */
const createPharmacy = async (req, res, next) => {
  try {
    // Add user to req.body as ownerId
    req.body.ownerId = req.user.id;

    // Handle initial location format from frontend
    // Expecting lat and lng in body for simpler API
    if (req.body.latitude && req.body.longitude) {
      req.body.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
      };
    }

    const pharmacy = await Pharmacy.create(req.body);

    res.status(201).json({
      success: true,
      data: pharmacy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pharmacies (with optional simple filtering)
 * @route   GET /api/pharmacies
 * @access  Public
 */
const getPharmacies = async (req, res, next) => {
  try {
    // Basic filtering and pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = Pharmacy.find().populate('ownerId', 'name email phone');

    const pharmacies = await query.skip(startIndex).limit(limit);
    const total = await Pharmacy.countDocuments();

    res.status(200).json({
      success: true,
      count: pharmacies.length,
      pagination: {
        total,
        page,
        limit
      },
      data: pharmacies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single pharmacy
 * @route   GET /api/pharmacies/:id
 * @access  Public
 */
const getPharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id).populate('ownerId', 'name email phone');

    if (!pharmacy) {
      res.status(404);
      throw new Error(`Pharmacy not found with id of ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: pharmacy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update pharmacy
 * @route   PUT /api/pharmacies/:id
 * @access  Private (pharmacy_owner, admin)
 */
const updatePharmacy = async (req, res, next) => {
  try {
    let pharmacy = await Pharmacy.findById(req.params.id);

    if (!pharmacy) {
      res.status(404);
      throw new Error(`Pharmacy not found with id of ${req.params.id}`);
    }

    // Make sure user is pharmacy owner
    if (pharmacy.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(401);
      throw new Error(`User ${req.user.id} is not authorized to update this pharmacy`);
    }

    // Handle location update
    if (req.body.latitude && req.body.longitude) {
      req.body.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
      };
    }

    pharmacy = await Pharmacy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: pharmacy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete pharmacy
 * @route   DELETE /api/pharmacies/:id
 * @access  Private (pharmacy_owner, admin)
 */
const deletePharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id);

    if (!pharmacy) {
      res.status(404);
      throw new Error(`Pharmacy not found with id of ${req.params.id}`);
    }

    // Make sure user is pharmacy owner
    if (pharmacy.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(401);
      throw new Error(`User ${req.user.id} is not authorized to delete this pharmacy`);
    }

    // Use deleteOne to trigger the cascade delete middleware
    await pharmacy.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pharmacies within a radius
 * @route   GET /api/pharmacies/nearby?lat=xx&lng=xx&distance=5
 * @access  Public
 */
const getNearbyPharmacies = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    // Default search radius is 10km if not specified
    const distanceInKm = req.query.distance ? parseFloat(req.query.distance) : 10;

    if (!lat || !lng) {
      res.status(400);
      throw new Error('Please provide latitude and longitude (lat, lng)');
    }

    // Calc radius using radians
    // Divide distance by radius of Earth
    // Earth Radius = 3,963 mi / 6,378 km
    const radius = distanceInKm / 6378;

    const pharmacies = await Pharmacy.find({
      location: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius]
        }
      }
    });

    res.status(200).json({
      success: true,
      count: pharmacies.length,
      data: pharmacies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pharmacy for the logged-in owner
 * @route   GET /api/pharmacies/my-pharmacy
 * @access  Private (pharmacy_owner)
 */
const getMyPharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findOne({ ownerId: req.user.id });

    if (!pharmacy) {
      // It's possible an owner doesn't have a pharmacy created yet
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: pharmacy
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPharmacy,
  getPharmacies,
  getPharmacy,
  updatePharmacy,
  deletePharmacy,
  getNearbyPharmacies,
  getMyPharmacy,
  getPharmacyStats
};
