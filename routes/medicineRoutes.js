const express = require('express');
const {
  addMedicine,
  getMedicinesByPharmacy,
  updateMedicine,
  deleteMedicine,
  searchMedicines,
  getCategories
} = require('../controllers/medicineController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/search', searchMedicines);
router.get('/pharmacy/:pharmacyId', getMedicinesByPharmacy);

router
  .route('/')
  .post(protect, authorize('pharmacy_owner', 'admin'), addMedicine);

router
  .route('/:id')
  .put(protect, authorize('pharmacy_owner', 'admin'), updateMedicine)
  .delete(protect, authorize('pharmacy_owner', 'admin'), deleteMedicine);

module.exports = router;
