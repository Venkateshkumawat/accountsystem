import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBusiness extends Document {
  businessId: string; // Unique generated ID (BB-XXXX-0000)
  shortId?: string;   // Suffix used for legacy index compatibility
  businessAdminId: mongoose.Types.ObjectId;
  ownerFullName: string;
  businessName: string;
  email: string;
  mobileNumber: string;
  location: {
    address?: string;
    city: string;
    state: string;
    pincode: string;
  };
  gstin?: string;
  plan: 'free' | 'pro' | 'enterprise';
  planStartDate: Date;
  planEndDate: Date;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  isActive: boolean;
  createdBySuperAdmin: boolean;
  suspendedAt?: Date;
  suspendReason?: string;
  activatedAt?: Date;
  planHistory: Array<{
    plan: string;
    transactionId: string;
    startDate: Date;
    endDate: Date;
    assignedBy: string;
    assignedAt: Date;
    amountPaid?: number;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }>;
  features: {
    pos: boolean;
    inventory: boolean;
    purchases: boolean;
    accounting: boolean;
    reports: boolean;
  };
  skuLimit: number;
  invoiceLimit: number;
  currentInvoiceCount: number;
  currentSkuCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    businessId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    shortId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    businessAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerFullName: {
      type: String,
      required: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    location: {
      address: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    gstin: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    planStartDate: {
      type: Date,
      default: Date.now,
    },
    planEndDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBySuperAdmin: {
      type: Boolean,
      default: false,
    },
    suspendedAt: Date,
    suspendReason: String,
    activatedAt: Date,
    planHistory: [
      {
        plan: String,
        transactionId: { type: String, unique: true, sparse: true },
        startDate: Date,
        endDate: Date,
        assignedBy: String,
        assignedAt: { type: Date, default: Date.now },
        amountPaid: Number,
        razorpayPaymentId: String,
        razorpayOrderId: String,
        razorpaySignature: String
      }
    ],
    features: {
      pos: { type: Boolean, default: true },
      inventory: { type: Boolean, default: true },
      purchases: { type: Boolean, default: true },
      accounting: { type: Boolean, default: true },
      reports: { type: Boolean, default: true }
    },
    skuLimit: { type: Number, default: 100 },
    invoiceLimit: { type: Number, default: 500 },
    currentInvoiceCount: { type: Number, default: 0 },
    currentSkuCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes for high-performance telemetry lookup
businessSchema.index({ businessAdminId: 1 });
businessSchema.index({ status: 1 });

const Business: Model<IBusiness> = mongoose.models.Business || mongoose.model<IBusiness>("Business", businessSchema);
export { businessSchema };
export default Business;
