import { Document, model, Schema } from "mongoose";

export interface Ban extends Document {
  createdAt: Date;
  updatedAt: Date;
  reason: string;
  roles: string[];
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

const BanSchema = new Schema<Ban>(
  {
    reason: {
      type: String,
      trim: true,
      required: true
    },
    roles: {
      type: [String],
      default: []
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
export default model<Ban>("Bans", BanSchema);
