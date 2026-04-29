import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivity extends Document {
  businessAdminId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "TRANSACTION";
  resource: "PRODUCT" | "STAFF" | "INVOICE" | "PAYMENT" | "BUSINESS" | "PARTY" | "PURCHASE";
  resourceId?: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    businessAdminId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    userName: { type: String, required: true },
    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE", "TRANSACTION"], required: true },
    resource: { type: String, enum: ["PRODUCT", "STAFF", "INVOICE", "PAYMENT", "BUSINESS", "PARTY", "PURCHASE", "OFFER", "SYSTEM_CONFIG"], required: true },
    resourceId: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ businessAdminId: 1, createdAt: -1 });

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>("Activity", activitySchema);
export { activitySchema };
export default Activity;
