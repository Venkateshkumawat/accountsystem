import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlan extends Document {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number;
  maxUsers: number;
  maxInvoicesPerMonth: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
    },
    priceYearly: {
      type: Number,
      required: true,
    },
    maxProducts: {
      type: Number,
      required: true,
    },
    maxUsers: {
      type: Number,
      required: true,
    },
    maxInvoicesPerMonth: {
      type: Number,
      required: true,
    },
    features: {
      type: [String],
      default: [],
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

const Plan: Model<IPlan> = mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);
export default Plan;
