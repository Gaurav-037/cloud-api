const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const WhatsappService = require('./services/whatsappService');
const User = require('./models/User');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB and restore sessions
async function initializeServer() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Restore sessions for authenticated users
        const authenticatedUsers = await User.find({ isAuthenticated: true });
        console.log(`Found ${authenticatedUsers.length} authenticated users. Restoring sessions...`);
        
        for (const user of authenticatedUsers) {
            try {
                await WhatsappService.restoreSession(user._id.toString(), user.phoneNumber);
                console.log(`Restored session for user ${user.phoneNumber}`);
            } catch (error) {
                console.log(`Failed to restore session for user ${user.phoneNumber}:`, error.message);
                // Reset authentication status if session restore fails
                await User.findByIdAndUpdate(user._id, { isAuthenticated: false });
            }
        }
    } catch (error) {
        console.error('Server initialization error:', error);
        process.exit(1);
    }
}

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize server and start listening
initializeServer().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// const express = require('express');
// const dotenv = require('dotenv');
// const connectDB = require('./config/database');
// const authRoutes = require('./routes/authRoutes.js');
// const messageRoutes = require('./routes/messageRoutes.js');

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(express.json());

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/messages', messageRoutes);

// // Error handler
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ error: 'Something went wrong!' });
// });

// // Start server
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
