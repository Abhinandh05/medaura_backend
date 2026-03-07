const express = require('express');
const {
  createPharmacy,
  getPharmacies,
  getPharmacy,
  updatePharmacy,
  deletePharmacy,
  getNearbyPharmacies,
  getMyPharmacy,
  getPharmacyStats
} = require('../controllers/pharmacyController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Search route must be defined before /:id to prevent 'nearby' being treated as an id
router.get('/nearby', getNearbyPharmacies);
router.get('/stats', protect, authorize('pharmacy_owner'), getPharmacyStats);
router.get('/my-pharmacy', protect, authorize('pharmacy_owner'), getMyPharmacy);

router
  .route('/')
  .get(getPharmacies)
  .post(protect, authorize('pharmacy_owner', 'admin'), createPharmacy);

router
  .route('/:id')
  .get(getPharmacy)
  .put(protect, authorize('pharmacy_owner', 'admin'), updatePharmacy)
  .delete(protect, authorize('pharmacy_owner', 'admin'), deletePharmacy);

module.exports = router;
