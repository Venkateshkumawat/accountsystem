import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStaff extends Document {
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  // Denormalized for quick display without populate
  name: string;
  email: string;
  mobile: string;
  role: 'manager' | 'accountant' | 'cashier';
  permissions: string[];
  isActive: boolean;
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z\s]+$/, 'Name must contain only alphabets and spaces'],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
    },
    role: {
      type: String,
      enum: ['manager', 'accountant', 'cashier'],
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    businessAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true
  }
);

// Indexes
staffSchema.index({ businessAdminId: 1, userId: 1 }, { unique: true });
staffSchema.index({ businessAdminId: 1, email: 1 });

// Nexus Protocol: Exporting schema for dynamic tenant binding
export { staffSchema };

// Optional Default-connection compilation for legacy scripts (Lazier approach)
const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>("Staff", staffSchema);
export default Staff;
