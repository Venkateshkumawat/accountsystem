import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  businessId: mongoose.Types.ObjectId;
  role: 'superadmin' | 'businessAdmin' | 'manager' | 'cashier' | 'accountant' | 'staff';
  message: string;
  type: "success" | "error" | "info" | "warning";
  category: "product" | "invoice" | "payment" | "alert" | "staff" | "users";
  isRead: boolean;
  isBookmarked: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: function (this: any) { return this.role !== 'superadmin'; },
      index: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'businessAdmin', 'manager', 'cashier', 'accountant', 'staff'],
      default: 'businessAdmin',
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["success", "error", "info", "warning"],
      default: "info",
    },
    category: {
      type: String,
      enum: ["product", "invoice", "payment", "alert", "staff", "users"],
      default: "alert",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Nexus Protocol: Do NOT compile the model here if using with connection.model() elsewhere 
// to prevent "OverwriteModelError". For Global notifications, we use a separate alias.

export { notificationSchema };

// Global model initialization using the default connection (only for SuperAdmin alerts)
const GlobalNotification = mongoose.models.GlobalNotification || mongoose.model<INotification>("GlobalNotification", notificationSchema, "global_notifications");
export default GlobalNotification;
