import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'online';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
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
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'online'],
      required: true,
    },
    transactionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
    },
  },
  { 
    timestamps: true 
  }
);

// Indexes
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ businessAdminId: 1 });
paymentSchema.index({ businessAdminId: 1, createdAt: -1 });

const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
export { paymentSchema };
export default Payment;
