const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
exports.createOrder = async (req, res, next) => {
  try {
    const { pharmacyId, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    const order = await Order.create({
      userId: req.user.id,
      pharmacyId,
      items,
      totalAmount,
      status: 'Placed'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private (User)
exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('pharmacyId', 'pharmacyName address')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get pharmacy orders (for owner)
// @route   GET /api/orders/pharmacy
// @access  Private (Pharmacy Owner)
exports.getPharmacyOrders = async (req, res, next) => {
  try {
    // Find the pharmacy owned by the logged-in user
    const pharmacy = await Pharmacy.findOne({ ownerId: req.user.id });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found for this owner' });
    }

    const orders = await Order.find({ pharmacyId: pharmacy._id })
      .populate('userId', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Pharmacy Owner)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Valid statuses
    const validStatuses = ['Placed', 'Confirmed', 'Packed', 'On Way', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the owner
    const pharmacy = await Pharmacy.findById(order.pharmacyId);
    if (!pharmacy || pharmacy.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    order.status = status;
    order = await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};
