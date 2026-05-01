import { ClientSession, Model } from "mongoose";
import { IProduct } from "../models/Product.js";
import { IInvoiceItem } from "../models/Invoice.js";
import { createNotification } from "../controllers/notificationController.js";

/**
 * NexusBill Inventory Helper: reduceStock
 * Atomically reduces stock for a list of items during invoice creation
 */
export const reduceStock = async (
  Product: Model<IProduct>,
  items: IInvoiceItem[], 
  businessAdminId: string, 
  session: ClientSession
): Promise<void> => {
  for (const item of items) {
    // Security check: Find by _id AND businessAdminId
    const product = await Product.findOne({ 
      _id: item.productId, 
      businessAdminId,
      isActive: true 
    }).session(session);

    if (!product) {
      throw new Error(`Product not found or access denied: ${item.name}`);
    }

    // Check if enough stock exists
    const reductionAmount = item.qty * (product.unitValue || 1);
    
    if (product.stock - reductionAmount < 0) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested Volume: ${reductionAmount}`);
    }

    // Atomic reduction using $inc with calculated fractional value
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: item.productId, businessAdminId },
      { $inc: { stock: -reductionAmount } },
      { session, returnDocument: 'after' }
    );

    if (updatedProduct && updatedProduct.stock <= updatedProduct.lowStockThreshold) {
       // Pro-active Replenishment Signal
       await createNotification(
          updatedProduct.businessAdminId, // Targeting the Business Admin's Node
          `Business Node Alert: Low Stock for ${updatedProduct.name}. Current: ${updatedProduct.stock}. Replenish immediately.`,
          "warning",
          "businessAdmin",
          undefined,
          "alert"
       );
    }
  }
};

/**
 * NexusBill Inventory Helper: increaseStock
 * Increases stock for a product (e.g. on return or adjustment)
 */
export const increaseStock = async (
  Product: Model<IProduct>,
  productId: string, 
  qty: number, 
  businessAdminId: string
) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, businessAdminId },
    { $inc: { stock: qty } },
    { returnDocument: 'after' }
  );

  if (!product) {
    throw new Error("Product not found or access denied");
  }

  return product;
};
