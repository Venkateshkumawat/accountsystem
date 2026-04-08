import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";
import mongoose from "mongoose";

/**
 * @desc    Get comprehensive dashboard metrics
 * @route   GET /api/dashboard
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice, Product, Purchase, Transaction, Staff, Activity } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      salesStats,
      purchaseStats,
      transactionStats,
      inventoryStats,
      staffCount,
      recentActivities,
      topProducts,
      recentInvoices,
      lowStockProducts
    ] = await Promise.all([
      // 1. Comprehensive Sales Intelligence
      Invoice.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$grandTotal" },
            todaySalesTotal: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, "$grandTotal", 0] } },
            todaySalesCount: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
            monthlySalesTotal: { $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$grandTotal", 0] } },
            monthlySalesCount: { $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] } },
            yearlySales: { $sum: { $cond: [{ $gte: ["$createdAt", startOfYear] }, "$grandTotal", 0] } },
            totalGST: { $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalGST", 0] } }
          }
        }
      ]),

      // 2. Purchase Metrics
      Purchase.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: "$grandTotal" },
            purchaseCount: { $sum: 1 }
          }
        }
      ]),

      // 3. Transaction Node Vitals
      Transaction.countDocuments({ businessAdminId: businessAdminId as any }),

      // 4. Inventory Valuation & Health
      Product.aggregate([
        { $match: { businessAdminId: businessAdminId as any, isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            inventoryValue: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
            lowStockCount: {
              $sum: { $cond: [{ $lte: ["$stock", "$lowStockThreshold"] }, 1, 0] }
            }
          }
        }
      ]),

      // 5. Staff Census
      Staff.countDocuments({ businessAdminId: businessAdminId as any, isActive: true }),

      // 6. Master Audit Logs
      Activity.find({ businessAdminId: businessAdminId as any })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // 7. Top Growth Products (by revenue)
      Invoice.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        { $unwind: "$items" },
        { $group: { _id: "$items.name", totalRevenue: { $sum: "$items.total" } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        { $project: { name: "$_id", totalRevenue: 1, _id: 0 } }
      ]),

      // 8. Recent Invoices Ledger
      Invoice.find({ businessAdminId: businessAdminId as any })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('invoiceNumber customerName grandTotal paymentStatus createdAt')
        .lean(),

      // 9. Detailed Low Stock Node List
      Product.find({ 
        businessAdminId: businessAdminId as any, 
        isActive: true, 
        $expr: { $lte: ["$stock", "$lowStockThreshold"] } 
      })
      .limit(5)
      .select('name stock lowStockThreshold')
      .lean()
    ]);

    const sales = salesStats[0] || { 
      totalSales: 0, 
      todaySalesTotal: 0,
      todaySalesCount: 0,
      monthlySalesTotal: 0,
      monthlySalesCount: 0,
      yearlySales: 0, 
      totalGST: 0 
    };
    const purchases = purchaseStats[0] || { totalPurchases: 0, purchaseCount: 0 };
    const inventory = inventoryStats[0] || { totalProducts: 0, inventoryValue: 0, lowStockCount: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalSales: sales.totalSales,
        todaySales: {
          total: sales.todaySalesTotal,
          count: sales.todaySalesCount
        },
        monthlySales: sales.monthlySalesTotal,
        monthlyCount: sales.monthlySalesCount,
        yearlySales: sales.yearlySales,
        totalPurchases: purchases.totalPurchases,
        totalTransactions: transactionStats,
        lowStockCount: inventory.lowStockCount,
        totalProducts: inventory.totalProducts,
        inventoryValue: inventory.inventoryValue,
        gstPayableThisMonth: sales.totalGST,
        recentActivities,
        topProducts,
        recentInvoices,
        lowStockProducts,
        staffCount,
        productCount: inventory.totalProducts
      }
    });

  } catch (error: any) {
    console.error("🌊 Dashboard Aggregation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
