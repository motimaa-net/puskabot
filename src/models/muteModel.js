const { Schema, model } = require('mongoose');

const muteSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
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

        unmuteType: {
            type: String,
            default: 'expired',
        },
        unmutedAt: {
            type: Date,
        },
        unmutedBy: {
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
module.exports = model('mutes', muteSchema);
