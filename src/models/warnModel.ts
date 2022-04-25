import { model, Schema } from "mongoose";

const warnSchema = new Schema(
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

    expiresAt: {
      type: Date
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
export default model("warns", warnSchema);
