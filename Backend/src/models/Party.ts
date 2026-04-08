import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParty extends Document {
  businessAdminId: mongoose.Types.ObjectId;
  name: string;
  type: 'Customer' | 'Supplier';
  email?: string;
  phone: string;
  gstin?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  openingBalance: number;
  currentBalance: number;
  totalSales?: number; // Cumulative revenue for Customers
  totalPurchases?: number; // Cumulative expense for Suppliers
  group?: string; // Section identifier (e.g., VIP, Local, Wholesale)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<IParty>(
  {
    businessAdminId: {
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
    type: {
      type: String,
      enum: ['Customer', 'Supplier'],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative'],
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: [0, 'Total purchases cannot be negative'],
    },
    group: {
      type: String,
      default: 'General',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true 
  }
);

// High-speed indices for search and filtering
partySchema.index({ businessAdminId: 1, type: 1 });
partySchema.index({ businessAdminId: 1, name: 1 });
partySchema.index({ businessAdminId: 1, phone: 1 });
partySchema.index({ businessAdminId: 1, group: 1 });

const Party: Model<IParty> = mongoose.models.Party || mongoose.model<IParty>("Party", partySchema);
export { partySchema };
export default Party;
