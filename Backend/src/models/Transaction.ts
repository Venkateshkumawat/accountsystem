import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
   businessId: mongoose.Types.ObjectId;
   businessAdminId: mongoose.Types.ObjectId;
   transactionId: string;
   userId?: mongoose.Types.ObjectId;
  type: 'sale' | 'purchase' | 'expense' | 'income';
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  offerDetails?: string;
  referenceId?: mongoose.Types.ObjectId; // Invoice or Purchase ID
  referenceModel?: 'Invoice' | 'Purchase';
  paymentMethod?: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    businessAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    transactionId: {
       type: String,
       required: true,
       unique: true,
       trim: true
    },
    type: {
      type: String,
      enum: ['sale', 'purchase', 'expense', 'income'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    originalAmount: {
        type: Number
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    offerDetails: {
        type: String
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceModel: {
      type: String,
      enum: ['Invoice', 'Purchase'],
    },
    paymentMethod: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { 
    timestamps: true 
  }
);

transactionSchema.index({ businessAdminId: 1, createdAt: -1 });
transactionSchema.index({ businessAdminId: 1, type: 1 });
transactionSchema.index({ businessAdminId: 1, transactionId: 1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", transactionSchema);
export { transactionSchema };
export default Transaction;
