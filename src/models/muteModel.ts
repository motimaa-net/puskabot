import { model, Schema } from "mongoose";

const muteSchema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String
    },

    authorId: {
      type: String,
      required: true
    },
    authorName: {
      type: String
    },

    reason: {
      type: String,
      trim: true,
      required: true
    },

    length: {
      type: Number
    },
    expiresAt: {
      type: Date
    },

    removedType: {
      type: String,
      default: "expired"
    },
    removedAt: {
      type: Date
    },
    removedBy: {
      type: String,
      trim: true
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);
export default model("mutes", muteSchema);
