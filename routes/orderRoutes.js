const express = require('express');
const {
  createOrder,
  getUserOrders,
  getPharmacyOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// User routes
router.post('/', protect, authorize('user'), createOrder);
router.get('/myorders', protect, authorize('user'), getUserOrders);

// Pharmacy owner routes
router.get('/pharmacy', protect, authorize('pharmacy_owner'), getPharmacyOrders);
router.put('/:id/status', protect, authorize('pharmacy_owner'), updateOrderStatus);

module.exports = router;
