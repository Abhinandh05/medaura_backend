const express = require('express');
const {
  getAdminStats,
  getAllUsers,
  deleteUser,
  getAnalytics,
  createPharmacyWithOwner,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/analytics', getAnalytics);
router.post('/create-pharmacy', createPharmacyWithOwner);

module.exports = router;
