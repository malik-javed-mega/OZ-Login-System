const mongoose = require('mongoose');

const oauthSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }
});

// Index to automatically delete expired codes
oauthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const accessTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
});

// Index to automatically delete expired tokens
accessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthCode = mongoose.model('AuthCode', oauthSchema);
const AccessToken = mongoose.model('AccessToken', accessTokenSchema);

module.exports = { AuthCode, AccessToken }; 