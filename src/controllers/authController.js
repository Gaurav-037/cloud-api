const User = require('../models/User.js');
const WhatsappService = require('../services/whatsappService.js');

const authController = {
    async initializeSession(req, res) {
        try {
            const { phoneNumber } = req.body;

            if (!phoneNumber) {
                return res.status(400).json({ error: 'Phone number is required' });
            }

            let user = await User.findOne({ phoneNumber });

            if (!user) {
                user = new User({ phoneNumber });
                await user.save();
            }

            // Initialize WhatsApp client
            await WhatsappService.initializeClient(user._id.toString(), phoneNumber);

            res.json({ 
                userId: user._id,
                apiKey: user.apiKey,
                message: 'Scan QR code to authenticate' 
            });
        } catch (error) {
            console.error('Session initialization error:', error);
            res.status(500).json({ error: 'Failed to initialize session' });
        }
    },

    async getQRCode(req, res) {
        try {
            const { userId } = req.params;
            const qrCode = WhatsappService.getQRCode(userId);

            if (!qrCode) {
                return res.status(404).json({ error: 'QR code not found' });
            }

            res.json({ qrCode });
        } catch (error) {
            console.error('QR code retrieval error:', error);
            res.status(500).json({ error: 'Failed to get QR code' });
        }
    },

    async logout(req, res) {
        try {
            const { userId } = req.params;
            
            WhatsappService.disconnectClient(userId);
            
            await User.findByIdAndUpdate(userId, { 
                isAuthenticated: false,
                whatsappSessionData: null
            });

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Failed to logout' });
        }
    }
};

module.exports = authController;