import { model, Schema } from "mongoose";

export interface Warn extends Document {
  createdAt: Date;
  updatedAt: Date;
  reason: string;
  user: {
    id: string;
    username: string;
  };
  author: {
    id: string;
    username: string;
  };
  expiration: {
    active: boolean;
    length: number | null;
    expiresAt: Date | null;
    removedAt: Date | null;
    removedBy: string | null;
  };
}

const WarnSchema = new Schema<Warn>(
  {
    reason: {
      type: String,
      trim: true,
      required: true
    },
    user: {
      id: {
        type: String,
        required: true
      },
      username: {
        type: String,
        required: true
      }
    },
    author: {
      id: {
        type: String,
        required: true
      },
      username: {
        type: String,
        required: true
      }
    },
    expiration: {
      active: {
        type: Boolean,
        default: true
      },
      length: {
        type: Number,
        required: true,
        min: 0
      },
      expiresAt: {
        type: Date
      },
      removedAt: {
        type: Date
      },
      removedBy: {
        type: String
      }
    }
  },
  {
    timestamps: true
  }
);
export default model<Warn>("warns", WarnSchema);
