const User = require('../models/User');
const WhatsappService = require('../services/whatsappService');

const messageController = {
    async sendMessage(req, res) {
        try {
            const { recipientNumber, message } = req.body;
            const userId = req.user._id.toString();

            if (!recipientNumber || !message) {
                return res.status(400).json({ 
                    error: 'Recipient number and message are required' 
                });
            }

            // Check client status and try to reconnect if needed
            if (!WhatsappService.isClientInitialized(userId)) {
                console.log('Client not initialized, attempting to restore session...');
                try {
                    await WhatsappService.restoreSession(userId, req.user.phoneNumber);
                } catch (error) {
                    console.error('Session restoration failed:', error);
                    return res.status(403).json({ 
                        error: 'WhatsApp session expired. Please reinitialize and scan QR code.' 
                    });
                }
            }

            // Double check client status after potential restoration
            if (!WhatsappService.isClientInitialized(userId)) {
                return res.status(403).json({ 
                    error: 'Failed to initialize WhatsApp client. Please reinitialize.' 
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
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = messageController;