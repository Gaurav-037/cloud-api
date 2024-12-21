const User = require('../models/User.js');

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

        if (!user.isAuthenticated) {
            return res.status(403).json({ error: 'User not authenticated' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;