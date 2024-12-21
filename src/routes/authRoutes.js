const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');

router.post('/initialize', authController.initializeSession);
router.get('/qr-code/:userId', authController.getQRCode);
router.post('/logout/:userId', authController.logout);

module.exports = router;