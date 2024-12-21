const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    apiKey: {
        type: String,
        unique: true
    },
    isAuthenticated: {
        type: Boolean,
        default: false
    },
    whatsappSessionData: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date
    }
});

userSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.apiKey = await bcrypt.hash(this.phoneNumber + Date.now(), 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
