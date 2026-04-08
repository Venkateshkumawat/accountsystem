import mongoose, { Schema, Document } from "mongoose";

export interface IOffer extends Document {
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  name: string;
  type: 'PERCENTAGE' | 'FLAT' | 'BOGO' | 'BULK' | 'B2G1';
  value: number;
  description?: string;
  productId?: mongoose.Types.ObjectId; 
  buyQty?: number;
  getQty?: number;
  minQty?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    businessAdminId: {
       type: Schema.Types.ObjectId,
       ref: "User",
       required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT', 'BOGO', 'BULK', 'B2G1'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      default: 0
    },
    description: {
      type: String,
      trim: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product"
    },
    buyQty: { type: Number, default: 0 },
    getQty: { type: Number, default: 0 },
    minQty: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes
offerSchema.index({ businessId: 1 });
offerSchema.index({ businessAdminId: 1 });
offerSchema.index({ isActive: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });

const Offer = mongoose.models.Offer || mongoose.model<IOffer>("Offer", offerSchema);
export { offerSchema };
export default Offer;
