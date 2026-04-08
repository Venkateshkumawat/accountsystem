import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  purchasePrice: number;
  total: number;
}

export interface IPurchase extends Document {
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  billNumber: string;
  vendorName: string;
  vendorPhone?: string;
  vendorGstin?: string;
  items: IPurchaseItem[];
  subtotal: number;
  totalGST: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'partial';
  note?: string;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    businessAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    billNumber: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true, trim: true },
    vendorPhone: { type: String },
    vendorGstin: { type: String },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        purchasePrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    totalGST: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'credit'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'partial'],
      default: 'paid',
    },
    note: { type: String },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

purchaseSchema.index({ businessAdminId: 1, createdAt: -1 });
purchaseSchema.index({ businessAdminId: 1, vendorName: 1 });

const Purchase: Model<IPurchase> = mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", purchaseSchema);
export { purchaseSchema };
export default Purchase;
