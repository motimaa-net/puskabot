const { Schema, model } = require('mongoose');

const banSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
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

        unbannedType: {
            type: String,
            default: 'expired',
        },
        unbannedAt: {
            type: Date,
        },
        unbannedBy: {
            type: String,
            trim: true,
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
module.exports = model('bans', banSchema);
