const mongoose = require('mongoose');

const banSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
        },
        userDiscriminator: {
            type: String,
        },

        roles: {
            type: Array,
            required: true,
            default: [],
        },

        authorId: {
            type: String,
            required: true,
        },
        authorName: {
            type: String,
        },
        authorDiscriminator: {
            type: String,
        },

        reason: {
            type: String,
            trim: true,
            required: true,
        },

        length: {
            type: Number,
        },
        expiresAt: {
            type: Date,
        },

        unbanReason: {
            type: String,
            trim: true,
            default: 'expired',
        },

        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);
module.exports = mongoose.model('bans', banSchema);
