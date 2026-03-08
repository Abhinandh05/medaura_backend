const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private (admin)
 */
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPharmacies = await Pharmacy.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalMedicines = await Medicine.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPharmacies,
        totalOrders,
        totalMedicines,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select('-password')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: { total, page, limit },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user (admin)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      res.status(400);
      throw new Error('Admin cannot delete their own account');
    }

    // If user is a pharmacy owner, also delete their pharmacy
    if (user.role === 'pharmacy_owner') {
      const pharmacy = await Pharmacy.findOne({ ownerId: user._id });
      if (pharmacy) {
        await pharmacy.deleteOne(); // triggers cascade delete of medicines
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system analytics
 * @route   GET /api/admin/analytics
 * @access  Private (admin)
 */
const getAnalytics = async (req, res, next) => {
  try {
    // Top medicines by stock (proxy for popularity since we don't have search tracking)
    const topMedicines = await Medicine.aggregate([
      {
        $group: {
          _id: '$medicineName',
          totalStock: { $sum: '$stockQuantity' },
          pharmacyCount: { $sum: 1 },
        },
      },
      { $sort: { pharmacyCount: -1 } },
      { $limit: 5 },
    ]);

    // Orders over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const totalRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // User growth - users registered in last 30 days vs previous 30 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const previousUsers = await User.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });

    const userGrowthPercent =
      previousUsers > 0
        ? Math.round(((recentUsers - previousUsers) / previousUsers) * 100)
        : recentUsers > 0
        ? 100
        : 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        topMedicines: topMedicines.map((m, i) => ({
          rank: i + 1,
          name: m._id,
          pharmacyCount: m.pharmacyCount,
          totalStock: m.totalStock,
        })),
        recentOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        userGrowth: {
          recentUsers,
          previousUsers,
          growthPercent: userGrowthPercent,
        },
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a pharmacy with a new owner account
 * @route   POST /api/admin/create-pharmacy
 * @access  Private (admin)
 */
const createPharmacyWithOwner = async (req, res, next) => {
  try {
    const {
      ownerName,
      email,
      password,
      phone,
      pharmacyName,
      address,
      pharmacyPhone,
      latitude,
      longitude,
      openingHours,
    } = req.body;

    // Validate required fields
    if (!ownerName || !email || !password || !pharmacyName || !address || !latitude || !longitude) {
      res.status(400);
      throw new Error(
        'Please provide ownerName, email, password, pharmacyName, address, latitude, and longitude'
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('A user with this email already exists');
    }

    // Create the pharmacy owner user
    const ownerUser = await User.create({
      name: ownerName,
      email,
      password,
      role: 'pharmacy_owner',
      phone: phone || '0000000000',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    // Create the pharmacy linked to the owner
    const pharmacy = await Pharmacy.create({
      pharmacyName,
      ownerId: ownerUser._id,
      address,
      phone: pharmacyPhone || phone || '',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      openingHours: openingHours || '9:00 AM - 9:00 PM',
    });

    // Populate ownerId for consistent response
    const populatedPharmacy = await Pharmacy.findById(pharmacy._id).populate(
      'ownerId',
      'name email phone'
    );

    res.status(201).json({
      success: true,
      data: populatedPharmacy,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  deleteUser,
  getAnalytics,
  createPharmacyWithOwner,
};
