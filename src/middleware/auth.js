const User = require('../models/User');
const WhatsappService = require('../services/whatsappService');

const authMiddleware = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        const user = await User.findOne({ apiKey });

        if (!user) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Check both database authentication and WhatsApp client connection
        if (!user.isAuthenticated || !WhatsappService.isClientInitialized(user._id.toString())) {
            // Reset authentication status if client is not connected
            await User.findByIdAndUpdate(user._id, { isAuthenticated: false });
            return res.status(403).json({ 
                error: 'WhatsApp client not authenticated. Please reinitialize and scan QR code.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;