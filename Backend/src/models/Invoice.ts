import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  barcode: string;
  qty: number;
  price: number;
  gstRate: number;
  gstAmount: number;
  discount: number;
  freeQty: number;
  offerType?: string;
  total: number;
}

export interface IInvoice extends Document {
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: IInvoiceItem[];
  subtotal: number;
  totalGST: number;
  totalDiscount: number;
  grandTotal: number;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paymentMethod: 'cash' | 'upi' | 'card' | 'online';
  note?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    businessAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerName: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        barcode: { type: String },
        qty: { type: Number, default: 1 },
        price: { type: Number, required: true },
        gstRate: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        freeQty: { type: Number, default: 0 },
        offerType: { type: String },
        total: { type: Number, required: true },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    totalGST: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'online'],
      default: 'cash',
    },
    note: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
  },
  { 
    timestamps: true 
  }
);

// Indexes
invoiceSchema.index({ businessAdminId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ businessAdminId: 1, createdAt: -1 });
invoiceSchema.index({ businessAdminId: 1, customerPhone: 1 });
invoiceSchema.index({ businessAdminId: 1, customerName: 1 });
invoiceSchema.index({ businessAdminId: 1, paymentStatus: 1 });

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);
export { invoiceSchema };
export default Invoice;
