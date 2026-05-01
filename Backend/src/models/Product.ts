import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  businessId: mongoose.Types.ObjectId;
  businessAdminId: mongoose.Types.ObjectId;
  name: string;
  barcode: string;
  sku: string; // 🛰️ Unique Stock Keeping Unit
  category?: string;
  unit?: string;
  purchasePrice?: number;
  sellingPrice: number;
  unitValue?: number;
  unitType?: 'unit' | 'kg' | 'gm' | 'ltr' | 'ml' | 'pack' | 'box' | 'pcs';
  weight?: number;
  weightUnit?: string;
  gstRate: 0 | 5 | 12 | 18 | 28;
  stock: number;
  lowStockThreshold: number;
  discount: number; // Flat nodal discount pre-applied to this item
  saleEndDate?: Date; // Deadline for the discount
  isActive: boolean;
  image?: string;
  stockStatus: 'out-of-stock' | 'low-stock' | 'in-stock';
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
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
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
    },
    unit: {
      type: String,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, "Purchase price cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    unitValue: {
      type: Number,
      default: 1,
      min: [0, "Unit value cannot be negative"],
    },
    unitType: {
      type: String,
      enum: ['unit', 'kg', 'gm', 'ltr', 'ml', 'pack', 'box', 'pcs'],
      default: 'unit',
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, "Weight cannot be negative"],
    },
    weightUnit: {
      type: String,
      default: 'gm',
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    lowStockThreshold: {
      type: Number,
      default: 15,
      min: [0, "Threshold cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    saleEndDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'inventories'
  }
);

// Virtual for Stock Status
productSchema.virtual("stockStatus").get(function (this: IProduct) {
  if (this.stock === 0) return "out-of-stock";
  if (this.stock <= this.lowStockThreshold) return "low-stock";
  return "in-stock";
});

// Indexes
// --- INDUSTRIAL INDEXES: Enforcing Multi-Tenant Performance ---
productSchema.index({ businessAdminId: 1, isActive: 1, createdAt: -1 });
productSchema.index({ businessAdminId: 1, barcode: 1, isActive: 1 });
productSchema.index({ businessAdminId: 1, sku: 1, isActive: 1 });
productSchema.index({ businessAdminId: 1, name: 1, isActive: 1 });
productSchema.index({ businessAdminId: 1, category: 1, isActive: 1 });
// Text search for "Global Search Hub"
productSchema.index({ name: 'text', barcode: 'text', sku: 'text' });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);
export { productSchema };
export default Product;
