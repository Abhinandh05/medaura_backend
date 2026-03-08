const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');

/**
 * @desc    Add new medicine
 * @route   POST /api/medicines
 * @access  Private (pharmacy_owner, admin)
 */
const addMedicine = async (req, res, next) => {
  try {
    let { pharmacyId } = req.body;

    // If pharmacyId is not provided, auto-resolve from the logged-in owner
    if (!pharmacyId && req.user.role === 'pharmacy_owner') {
      const ownerPharmacy = await Pharmacy.findOne({ ownerId: req.user.id });
      if (!ownerPharmacy) {
        res.status(404);
        throw new Error('No pharmacy found for your account. Please create a pharmacy first.');
      }
      pharmacyId = ownerPharmacy._id;
      req.body.pharmacyId = pharmacyId;
    }

    // Check if pharmacy exists
    const pharmacy = await Pharmacy.findById(pharmacyId);

    if (!pharmacy) {
      res.status(404);
      throw new Error(`Pharmacy not found with id of ${pharmacyId}`);
    }

    // Ensure user is owner of the pharmacy
    if (pharmacy.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(401);
      throw new Error(`User ${req.user.id} is not authorized to add a medicine to this pharmacy`);
    }

    const medicine = await Medicine.create(req.body);

    res.status(201).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get medicines by pharmacy
 * @route   GET /api/medicines/pharmacy/:pharmacyId
 * @access  Public
 */
const getMedicinesByPharmacy = async (req, res, next) => {
  try {
    const medicines = await Medicine.find({ pharmacyId: req.params.pharmacyId });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update medicine
 * @route   PUT /api/medicines/:id
 * @access  Private (pharmacy_owner, admin)
 */
const updateMedicine = async (req, res, next) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      res.status(404);
      throw new Error(`Medicine not found with id of ${req.params.id}`);
    }

    // Check pharmacy ownership
    const pharmacy = await Pharmacy.findById(medicine.pharmacyId);
    if (pharmacy.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(401);
      throw new Error(`User ${req.user.id} is not authorized to update this medicine`);
    }

    // Update fields on the document so pre-save hook runs (updates availabilityStatus)
    Object.keys(req.body).forEach((key) => {
      medicine[key] = req.body[key];
    });
    medicine = await medicine.save();

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete medicine
 * @route   DELETE /api/medicines/:id
 * @access  Private (pharmacy_owner, admin)
 */
const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      res.status(404);
      throw new Error(`Medicine not found with id of ${req.params.id}`);
    }

    // Check pharmacy ownership
    const pharmacy = await Pharmacy.findById(medicine.pharmacyId);
    if (pharmacy.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(401);
      throw new Error(`User ${req.user.id} is not authorized to delete this medicine`);
    }

    await medicine.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search for a medicine
 * @route   GET /api/medicines/search?name=paracetamol
 * @access  Public
 */
const searchMedicines = async (req, res, next) => {
  try {
    const { name } = req.query;

    if (!name) {
      res.status(400);
      throw new Error('Please provide a medicine name to search');
    }

    // First, find medicines matching the text search
    // We populate the pharmacy details as requested
    const medicines = await Medicine.find({
      $text: { $search: name }
    })
    .populate({
      path: 'pharmacyId',
      select: 'pharmacyName address phone location openingHours'
    })
    .sort({ score: { $meta: "textScore" } }); // Sort by best match

    // Format the response according to requirements
    const formattedResponse = medicines.map(med => ({
      _id: med._id,
      medicineName: med.medicineName,
      category: med.category,
      pharmacyName: med.pharmacyId ? med.pharmacyId.pharmacyName : 'N/A',
      pharmacyLocation: med.pharmacyId ? med.pharmacyId.location : null,
      address: med.pharmacyId ? med.pharmacyId.address : 'N/A',
      phoneNumber: med.pharmacyId ? med.pharmacyId.phone : 'N/A',
      availabilityStatus: med.availabilityStatus,
      stockQuantity: med.stockQuantity,
      price: med.price,
      lastUpdated: med.lastUpdated
    }));

    res.status(200).json({
      success: true,
      count: formattedResponse.length,
      data: formattedResponse
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all unique medicine categories
 * @route   GET /api/medicines/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Medicine.distinct('category');
    
    // Add 'All' as the first option
    const result = ['All', ...categories];

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addMedicine,
  getMedicinesByPharmacy,
  updateMedicine,
  deleteMedicine,
  searchMedicines,
  getCategories
};
