const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema(
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

        expiresAt: {
            type: Date,
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
module.exports = mongoose.model('warns', warnSchema);
