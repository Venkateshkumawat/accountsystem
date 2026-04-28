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

    // --- TEMPORARY RENAME SCRIPT ---
    const allProds = await Product.find({ businessAdminId, isActive: true });
    
    const namesByCategory: Record<string, string[]> = {
      'Apparel': ['Nike Dri-FIT T-Shirt', "Levi's 501 Original Jeans", 'Adidas Ultraboost Shoes', 'Puma Classic Hoodie', 'Under Armour Shorts'],
      'Beverages': ['Coca-Cola 2L', 'Red Bull Energy 250ml', 'Monster Energy 500ml', 'Tropicana Orange Juice', 'Sprite 1.5L', 'Pepsi Max 330ml'],
      'Electronics': ['Samsung Galaxy S23', 'Apple MacBook Air', 'Sony WH-1000XM5', 'iPad Pro 11-inch', 'Logitech MX Master 3'],
      'Groceries': ['Basmati Rice 5kg', 'Whole Wheat Bread', 'Organic Eggs 12pk', 'Almond Milk 1L', 'Heinz Tomato Ketchup'],
      'Cosmetics': ["L'Oreal Foundation", 'MAC Matte Lipstick', 'Maybelline Mascara', 'Nivea Body Lotion', 'Neutrogena Sunscreen'],
      'Stationery': ['Pilot G2 Pens 5pk', 'Moleskine Notebook', 'Faber-Castell Pencils', 'Post-it Notes', 'Highlighter Set'],
      'Hardware': ['Stanley Hammer 16oz', 'DeWalt Power Drill', 'Philips Screwdriver Set', '3M Duct Tape', 'WD-40 Lubricant'],
      'Snacks': ['Doritos Nacho Cheese', 'Oreo Cookies', "Lay's Classic Chips", 'Snickers Bar', 'Pringles Original'],
      'Toys': ['Lego Star Wars Set', 'Hot Wheels 5-Pack', 'Barbie Dreamhouse', 'Nerf Elite Blaster', "Rubik's Cube"],
      'Pharmacy': ['Advil Ibuprofen 200mg', 'Tylenol Extra Strength', 'Band-Aid Assorted', 'Vicks VapoRub', 'Pepto Bismol'],
      'Personal Care': ['Dove Body Wash', 'Colgate Total Toothpaste', 'Gillette Fusion5 Razor', 'Pantene Pro-V Shampoo', 'Degree Deodorant'],
      'Dairy & Eggs': ['Amul Butter 500g', 'Organic Whole Milk 1L', 'Farm Fresh Eggs 12pk', 'Cheddar Cheese Block', 'Greek Yogurt Vanilla'],
      'Cleaning Supplies': ['Clorox Disinfecting Wipes', 'Tide Pods Detergent', 'Windex Glass Cleaner', 'Dawn Dish Soap', 'Swiffer Sweeper'],
      'General': ['Duracell AA Batteries 4pk', 'Bic Lighter', 'Scotch Magic Tape', 'Ziploc Sandwich Bags', 'Compact Umbrella']
    };

    const counters: Record<string, number> = {};

    for (let i = 0; i < allProds.length; i++) {
      const prod = allProds[i];
      const cat = prod.category || 'General';
      
      // Try to find exact match or fallback
      let list = namesByCategory[cat];
      if (!list) {
        // Fallback checks for slight naming variations
        if (cat.includes('Clean')) list = namesByCategory['Cleaning Supplies'];
        else if (cat.includes('Personal')) list = namesByCategory['Personal Care'];
        else if (cat.includes('Dairy')) list = namesByCategory['Dairy & Eggs'];
        else list = namesByCategory['General'];
      }
      
      counters[cat] = counters[cat] || 0;
      const newName = list[counters[cat] % list.length];
      counters[cat]++;
      
      // Always overwrite if it looks like a generic placeholder (contains 'Item' or ends with a number)
      if (prod.name.includes('Item') || prod.name.includes('Product') || /\d$/.test(prod.name)) {
        prod.name = newName;
        await prod.save();
      }
    }
    // -------------------------------

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

    await logActivity(req, "CREATE", "PRODUCT", `Initialized new SKU: ${product.name}`, (product._id as any).toString(), undefined, undefined, true);

    await createNotification(
      businessId,
      `New Node Initialized: Product ${product.name} successfully deployed to registry.`,
      "success",
      "businessAdmin",
      undefined,
      "product"
    );

    // 📡 Nexus Protocol: Real-time Data Sync Signal
    if (businessId) {
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });

      // Infrastructure Monitoring: Immediate Stock Check
      if (product.stock <= product.lowStockThreshold && product.stock >= 0) {
        await createNotification(
          businessId,
          `Critical Inventory Alarm: ${product.name} initialized with low stock (${product.stock} units).`,
          product.stock === 0 ? "error" : "warning",
          "businessAdmin",
          undefined,
          "alert"
        );
      }

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

    await logActivity(req, "UPDATE", "PRODUCT", `Updated SKU: ${product.name}`, (product._id as any).toString(), undefined, undefined, true);

    // Consolidated Notification Logic: High Priority (Alarm) > Low Priority (Info)
    if (product.stock <= product.lowStockThreshold && product.stock >= 0) {
      await createNotification(
        req.user?.businessId,
        `Critical Inventory Alarm: ${product.name} is low on stock (${product.stock} units remaining).`,
        product.stock === 0 ? "error" : "warning",
        "businessAdmin",
        undefined,
        "alert"
      );
    } else {
      await createNotification(
        req.user?.businessId,
        `SKU Configuration Updated: ${product.name} (Stock: ${product.stock}, Threshold: ${product.lowStockThreshold}).`,
        "info",
        "businessAdmin",
        undefined,
        "product"
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

    await logActivity(req, "DELETE", "PRODUCT", `Deleted SKU: ${product.name}`, (product._id as any).toString());

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

    res.status(200).json({ success: true, message: "Product deleted" });
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
 * @body    { qty, type: 'add'|'remove', reason }  ← standard format
 *          OR { adjustment: number, reason }        ← shorthand format (signed number)
 */
export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Product } = req.tenantModels!;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const { qty, type, adjustment, reason } = req.body;

    // ── Resolve adjustment delta from either payload format ──
    let delta: number;
    if (adjustment !== undefined) {
      // Shorthand signed format: { adjustment: +5 } or { adjustment: -2 }
      delta = Number(adjustment);
    } else if (qty !== undefined && type !== undefined) {
      // Standard format: { qty: 5, type: 'add' | 'remove' }
      delta = type === 'add' ? Number(qty) : -Number(qty);
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payload. Provide either { qty, type } or { adjustment }."
      });
      return;
    }

    // ── Guard: ensure delta is a valid number ──
    if (isNaN(delta)) {
      res.status(400).json({ success: false, message: "Stock adjustment value must be a valid number." });
      return;
    }

    // ── Fetch current product to check floor ──
    const currentProduct = await Product.findOne({ _id: id, businessAdminId });
    if (!currentProduct) {
      res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      return;
    }

    const currentStock = Number(currentProduct.stock) || 0;
    const newStock = currentStock + delta;

    // ── Guard: prevent stock going below 0 ──
    if (newStock < 0) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock. Current: ${currentStock}, Attempted reduction: ${Math.abs(delta)}.`
      });
      return;
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, businessAdminId },
      { $inc: { stock: delta } },
      { returnDocument: 'after' }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      return;
    }

    const adjustLabel = delta >= 0 ? `+${delta}` : `${delta}`;
    const adjustReason = reason || 'Manual adjustment';
    const directionLabel = delta >= 0 ? 'increased' : 'decreased';

    await logActivity(req, "UPDATE", "PRODUCT", `Manual stock adjustment for: ${product.name} (${adjustLabel} units). Reason: ${adjustReason}`, (product._id as any).toString());

    await createNotification(
      req.user?.businessId,
      `Stock Node Adjusted: ${product.name} ${directionLabel} by ${Math.abs(delta)} units. Reason: ${adjustReason}. New Stock: ${product.stock}.`,
      delta >= 0 ? 'success' : 'warning',
      "businessAdmin",
      undefined,
      "product"
    );

    // Infrastructure Monitoring: Dynamic Stock Check
    if (product.stock <= product.lowStockThreshold && product.stock >= 0) {
      await createNotification(
        req.user?.businessId,
        `Inventory Alarm Post-Adjustment: ${product.name} is now ${product.stock === 0 ? 'Out of Stock' : 'Low on Stock'} (${product.stock} units).`,
        product.stock === 0 ? "error" : "warning",
        "businessAdmin",
        undefined,
        "alert"
      );
    }

    // 📡 Real-time Data Sync
    if (req.user?.businessId) {
      getIO()?.to(req.user.businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
    }

    res.status(200).json({
      success: true,
      data: product,
      message: `Stock adjusted by ${adjustLabel} units. New stock: ${product.stock}. Reason: ${adjustReason}`
    });
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
