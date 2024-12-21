const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController.js');
const authMiddleware = require("../middleware/auth.js");
const { messageLimiter } = require('../middleware/rateLimiter.js');

router.post(
    '/send',
    [authMiddleware, messageLimiter],
    messageController.sendMessage
);

module.exports = router;