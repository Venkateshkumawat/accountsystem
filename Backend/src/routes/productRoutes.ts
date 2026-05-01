import express from "express";
import {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  adjustStock,
  getCategories,
  deleteCategory,
  bulkUpdateCategory
} from "../controllers/productController.js";
import { protect, role, verifySubscription, tenantHandler } from "../middleware/auth.js";

import { checkPlanLimit } from "../middleware/planLimit.js";

const router = express.Router();

router.get("/", protect, verifySubscription, tenantHandler, getProducts);
router.get("/categories", protect, verifySubscription, tenantHandler, getCategories);
router.delete("/categories/:categoryName", protect, verifySubscription, tenantHandler, role("businessAdmin"), deleteCategory);
router.get("/low-stock", protect, verifySubscription, tenantHandler, getLowStockProducts);
router.get("/barcode/:barcode", protect, verifySubscription, tenantHandler, getProductByBarcode);
router.get("/:id", protect, verifySubscription, tenantHandler, getProductById);

router.post("/", protect, verifySubscription, tenantHandler, role("businessAdmin", "manager"), checkPlanLimit("products"), createProduct);
router.put("/:id", protect, verifySubscription, tenantHandler, role("businessAdmin", "manager"), updateProduct);
router.delete("/:id", protect, verifySubscription, tenantHandler, role("businessAdmin"), deleteProduct);

// Manual stock adjustment
router.post("/:id/adjust-stock", protect, verifySubscription, tenantHandler, role("businessAdmin", "manager"), adjustStock);
router.put("/bulk/category", protect, verifySubscription, tenantHandler, role("businessAdmin"), bulkUpdateCategory);


export default router;
