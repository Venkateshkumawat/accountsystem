import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId, verifyManagerOrAdmin } from "../utils/businessUtils.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";
import { getIO } from "../socket.js";
import { generateSKU, generateBarcode } from "../utils/productUtils.js";
import Business from "../models/Business.js";

/**
 * @desc    Get all products for a business with search & pagination
 * @route   GET /api/products
 * @access  Private (protect)
 */
export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);

    // Explicitly cast query params to string to avoid ParsedQs type conflicts
    const search = req.query.search ? String(req.query.search) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const stockStatus = req.query.stockStatus ? String(req.query.stockStatus) : undefined;
    const name = req.query.name ? String(req.query.name) : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const query: any = { businessAdminId, isActive: true };

    // Search by name or barcode
    const searchTerm = search || name;
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { barcode: { $regex: searchTerm, $options: "i" } }
      ];
    }

    if (category) query.category = category;

    if (stockStatus) {
      if (stockStatus === 'out') {
        query.stock = 0;
      } else if (stockStatus === 'low') {
        query.$expr = {
          $and: [
            { $gt: ["$stock", 0] },
            { $lte: ["$stock", "$lowStockThreshold"] }
          ]
        };
      } else if (stockStatus === 'in') {
        query.$expr = { $gt: ["$stock", "$lowStockThreshold"] };
      }
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const biz = await Business.findById(req.user?.businessId);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      productLimit: biz?.skuLimit || 0,
      usedProducts: biz?.currentSkuCount || 0,
      remainingProduct: (biz?.skuLimit || 0) - (biz?.currentSkuCount || 0),
      data: products
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Get product by barcode (AND businessAdminId)
 * @route   GET /api/products/barcode/:barcode
 */
export const getProductByBarcode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);
    const { barcode } = req.params;

    const product = await Product.findOne({ businessAdminId, barcode, isActive: true });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or access denied" });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get product by ID (AND businessAdminId)
 * @route   GET /api/products/:id
 */
export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, businessAdminId, isActive: true });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or access denied" });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create product (Inject businessAdminId and businessId)
 * @route   POST /api/products
 * @access  businessAdmin or manager
 */
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    verifyManagerOrAdmin(req);
    const businessId = req.user?.businessId;
    const businessAdminId = getBusinessAdminId(req);
    const { name, barcode, stock, ...rest } = req.body;

    if (!businessId) {
      res.status(400).json({ success: false, message: "Business context missing. Please log out and log in again." });
      return;
    }

    // 1. DEDUP CHECK: Match existing SKU by name (exact-ish) or Barcode
    // Note: We search for active products within the same business node
    const existing = await Product.findOne({
      businessAdminId,
      isActive: true,
      $or: [
        { name: name.trim() },
        ...(barcode ? [{ barcode: barcode.trim() }] : [])
      ]
    });

    if (existing) {
      // 2. REPLENISHMENT PROTOCOL: Update existing SKU instead of creating duplicate
      const updatedQty = existing.stock + (Number(stock) || 0);

      // We update the stock and potentially other basic fields if they changed (optional)
      const updatedProduct = await Product.findByIdAndUpdate(
        existing._id,
        {
          ...rest, // Update price, category, etc if provided
          stock: updatedQty,
          name: name.trim(),
          barcode: barcode ? barcode.trim() : existing.barcode
        },
        { returnDocument: 'after' }
      );

      await logActivity(req, "UPDATE", "PRODUCT", `Replenished SKU: ${name} (Previous: ${existing.stock}, Added: ${stock})`, (existing._id as any).toString());

      await createNotification(
        req.user?.businessId,
        `Inventory Replenished: ${name} stock increased to ${updatedQty} units.`,
        "info",
        "businessAdmin",
        undefined,
        "product"
      );

      res.status(200).json({
        success: true,
        message: `Existing product detected. SKU replenished to ${updatedQty} units.`,
        data: updatedProduct
      });

      // 📡 Nexus Protocol: Real-time Data Sync Signal
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });

      return;
    }

    // 3. CREATION PROTOCOL: No matching node found, initiate new SKU
    const { sku, category } = req.body;

    // 🏗️ Check existing barcode uniqueness if provided
    if (barcode) {
      const exists = await Product.findOne({ businessAdminId, barcode: barcode.trim() });
      if (exists) {
        res.status(400).json({ success: false, message: "Barcode already exists in your registry." });
        return;
      }
    }

    // 🏗️ Check SKU uniqueness if provided
    if (sku) {
      const exists = await Product.findOne({ businessAdminId, sku: sku.trim().toUpperCase() });
      if (exists) {
        res.status(400).json({ success: false, message: "SKU already exists in your registry." });
        return;
      }
    }

    // 🛰️ Auto-generate if missing
    const finalBarcode = (barcode && barcode.trim()) || await generateBarcode(businessAdminId);
    const finalSKU = (sku && sku.trim().toUpperCase()) || await generateSKU(name, category || 'GEN', businessAdminId);

    // 🏗️ Enforce Monetization Protocol: SKU Limit Check
    const biz = await Business.findById(businessId);
    if (biz && biz.currentSkuCount >= biz.skuLimit) {
      res.status(403).json({
        success: false,
        message: "Plan limit reached. Upgrade required."
      });
      return;
    }

    const product = await Product.create({
      ...req.body,
      name: name.trim(),
      barcode: finalBarcode,
      sku: finalSKU,
      businessId,
      businessAdminId
    });

    // Increment absolute counter for the business node
    const updatedBiz = await Business.findByIdAndUpdate(businessId, { $inc: { currentSkuCount: 1 } }, { new: true });

    await logActivity(req, "CREATE", "PRODUCT", `Initialized New SKU: ${product.name}`, (product._id as any).toString());

    await createNotification(
      req.user?.businessId,
      `New SKU created: ${product.name}. Initial stock: ${product.stock} units.`,
      "success",
      "businessAdmin",
      undefined,
      "product"
    );

    // 📡 Nexus Protocol: Real-time Data Sync Signal
    if (businessId) {
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
      if (updatedBiz) {
        const payload = {
          businessAdminId: businessAdminId.toString(),
          businessId: businessId.toString(),
          usedSku: updatedBiz.currentSkuCount,
          remainingSku: updatedBiz.skuLimit - updatedBiz.currentSkuCount
        };
        getIO()?.to(businessId.toString()).emit('skuUpdated', payload);
        getIO()?.emit('skuUpdated', payload); // Global sync for SuperAdmin
      }
    }

    res.status(201).json({ success: true, data: product });

  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update product (Verify ownership)
 * @route   PUT /api/products/:id
 */
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    verifyManagerOrAdmin(req);
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const { barcode, sku } = req.body;

    // 🏗️ Check Uniqueness for Barcode
    if (barcode) {
      const exists = await Product.findOne({
        businessAdminId: businessAdminId as any,
        barcode: barcode.trim(),
        _id: { $ne: id as any }
      } as any);
      if (exists) {
        res.status(400).json({ success: false, message: "Identification Node Collision: Barcode already exists." });
        return;
      }
    }

    // 🏗️ Check Uniqueness for SKU
    if (sku) {
      const exists = await Product.findOne({
        businessAdminId: businessAdminId as any,
        sku: sku.trim().toUpperCase(),
        _id: { $ne: id as any }
      } as any);
      if (exists) {
        res.status(400).json({ success: false, message: "Identification Node Collision: SKU already exists." });
        return;
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, businessAdminId: businessAdminId as any },
      { ...req.body, sku: sku ? sku.trim().toUpperCase() : undefined },
      { returnDocument: 'after', runValidators: true }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      return;
    }

    await logActivity(req, "UPDATE", "PRODUCT", `Updated SKU: ${product.name}`, (product._id as any).toString());

    await createNotification(
      req.user?.businessId,
      `SKU Configuration Updated: ${product.name} (Stock: ${product.stock}, Threshold: ${product.lowStockThreshold}).`,
      "info",
      "businessAdmin",
      undefined,
      "product"
    );

    // Compliance Check: Low Stock Alert node
    if (product.stock <= product.lowStockThreshold && product.stock >= 0) {
      await createNotification(
        req.user?.businessId,
        `Critical Inventory Alarm: ${product.name} is low on stock (${product.stock} units remaining).`,
        product.stock === 0 ? "error" : "warning",
        "businessAdmin",
        undefined,
        "alert"
      );
    }

    // 📡 Nexus Protocol: Real-time Data Sync Signal
    if (req.user?.businessId) {
      getIO().to(req.user.businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Soft delete product (Only businessAdmin)
 * @route   DELETE /api/products/:id
 */
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    verifyManagerOrAdmin(req);
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;

    const product = await Product.findOneAndUpdate(
      { _id: id, businessAdminId },
      { isActive: false },
      { returnDocument: 'after' }
    );

    if (product) {
      // Decrement absolute counter for the business node
      const updatedBiz = await Business.findByIdAndUpdate(
        product.businessId || req.user?.businessId,
        { $inc: { currentSkuCount: -1 } },
        { new: true }
      );

      if (updatedBiz && req.user?.businessId) {
        const payload = {
          businessAdminId: businessAdminId.toString(),
          businessId: updatedBiz._id.toString(),
          usedSku: updatedBiz.currentSkuCount,
          remainingSku: updatedBiz.skuLimit - updatedBiz.currentSkuCount
        };
        getIO()?.to(req.user.businessId.toString()).emit('skuUpdated', payload);
        getIO()?.emit('skuUpdated', payload); // Global sync for SuperAdmin
      }
    }

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      return;
    }

    await logActivity(req, "DELETE", "PRODUCT", `Decommissioned SKU: ${product.name}`, (product._id as any).toString());

    await createNotification(
      req.user?.businessId,
      `SKU Deactivated: ${product.name} has been removed from active inventory nodes.`,
      "warning",
      "businessAdmin",
      undefined,
      "product"
    );

    // 📡 Nexus Protocol: Real-time Data Sync Signal
    if (req.user?.businessId) {
      getIO()?.to(req.user.businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
    }

    res.status(200).json({ success: true, message: "Product marked as inactive" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get products with low stock
 * @route   GET /api/products/low-stock
 */
export const getLowStockProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);

    const products = await Product.find({
      businessAdminId,
      isActive: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] }
    }).sort({ stock: 1 });

    res.status(200).json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Manual stock adjustment
 * @route   POST /api/products/:id/adjust-stock
 */
export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const { qty, type, reason } = req.body;

    const adjustment = type === 'add' ? Number(qty) : -Number(qty);

    const product = await Product.findOneAndUpdate(
      { _id: id, businessAdminId },
      { $inc: { stock: adjustment } },
      { returnDocument: 'after' }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      return;
    }

    await logActivity(req, "UPDATE", "PRODUCT", `Manual stock adjustment for: ${product.name} (${type}: ${qty}). Reason: ${reason}`, (product._id as any).toString());

    await createNotification(
      req.user?.businessId,
      `Stock Node Adjusted: ${product.name} ${type === 'add' ? 'increased' : 'decreased'} by ${qty} units. Reason: ${reason}. Total Stock: ${product.stock}.`,
      type === 'add' ? 'success' : 'warning',
      "businessAdmin", // Added missing role parameter to match signature
      undefined,
      "product"
    );

    // 📡 Nexus Protocol: Real-time Data Sync Signal
    if (req.user?.businessId) {
      getIO()?.to(req.user.businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
    }

    res.status(200).json({ success: true, data: product, message: `Stock adjusted: ${reason}` });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all unique categories for a business
 * @route   GET /api/products/categories
 */
export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);
    const categories = await Product.distinct("category", { businessAdminId, isActive: true });
    const filtered = categories.filter((c: any) => c && c.trim() !== "");
    // Ensure standard categories are suggested if none exist
    const defaultCats = ["Food", "Cloths", "Beverages", "Toy", "Stationary"];
    const finalSet = new Set([...defaultCats, ...filtered]);
    res.status(200).json({ success: true, data: Array.from(finalSet) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
