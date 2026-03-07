const express = require('express');
const { registerUser, loginUser, getMe, updateUserProfile, addAddress, deleteAddress } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:id', protect, deleteAddress);

module.exports = router;
