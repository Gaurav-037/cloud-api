const User = require('../models/User.js');
const WhatsappService = require('../services/whatsappService.js');

const messageController = {
    async sendMessage(req, res) {
        try {
            const { recipientNumber, message } = req.body;
            const userId = req.user._id;

            if (!recipientNumber || !message) {
                return res.status(400).json({ 
                    error: 'Recipient number and message are required' 
                });
            }

            if (!WhatsappService.isClientInitialized(userId)) {
                return res.status(403).json({ 
                    error: 'WhatsApp client not authenticated' 
                });
            }

            const response = await WhatsappService.sendMessage(
                userId,
                recipientNumber,
                message
            );

            res.json({ 
                success: true, 
                messageId: response.id._serialized 
            });
        } catch (error) {
            console.error('Message sending error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    }
};

module.exports = messageController;