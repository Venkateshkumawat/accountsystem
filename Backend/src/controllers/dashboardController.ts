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

    // Yesterday Logic
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    // Last Month Logic
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    // Last Year Logic
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    const results = await Promise.all([
      // 1. Comprehensive Sales Intelligence with Historical Comparison
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
            yesterdaySalesTotal: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfYesterday] }, { $lte: ["$createdAt", endOfYesterday] }] }, "$grandTotal", 0] } },
            lastMonthSalesTotal: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfLastMonth] }, { $lte: ["$createdAt", endOfLastMonth] }] }, "$grandTotal", 0] } },
            lastYearSalesTotal: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfLastYear] }, { $lte: ["$createdAt", endOfLastYear] }] }, "$grandTotal", 0] } },
            totalGST: { $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalGST", 0] } }
          }
        }
      ]),
      Purchase.aggregate([{ $match: { businessAdminId: businessAdminId as any } }, { $group: { _id: null, totalPurchases: { $sum: "$grandTotal" }, purchaseCount: { $sum: 1 } } }]),
      Transaction.countDocuments({ businessAdminId: businessAdminId as any }),
      Product.aggregate([{ $match: { businessAdminId: businessAdminId as any, isActive: true } }, { $group: { _id: null, totalProducts: { $sum: 1 }, inventoryValue: { $sum: { $multiply: ["$stock", { $ifNull: ["$purchasePrice", 0] }] } }, lowStockCount: { $sum: { $cond: [{ $lte: ["$stock", "$lowStockThreshold"] }, 1, 0] } } } }]),
      Staff.countDocuments({ businessAdminId: businessAdminId as any, isActive: true }),
      Activity.find({ businessAdminId: businessAdminId as any }).sort({ createdAt: -1 }).limit(10).lean(),
      Invoice.aggregate([{ $match: { businessAdminId: businessAdminId as any } }, { $unwind: "$items" }, { $group: { _id: "$items.name", totalRevenue: { $sum: "$items.total" } } }, { $sort: { totalRevenue: -1 } }, { $limit: 10 }, { $project: { name: "$_id", totalRevenue: 1, _id: 0 } }]),
      Invoice.find({ businessAdminId: businessAdminId as any }).sort({ createdAt: -1 }).limit(10).select('invoiceNumber customerName customerPhone customerAddress customerEmail customerGstin items subtotal totalGST totalDiscount grandTotal paymentStatus paymentMethod businessDetails createdAt').lean(),
      Product.find({ businessAdminId: businessAdminId as any, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).limit(5).select('name stock lowStockThreshold').lean(),
      Invoice.aggregate([{ $match: { businessAdminId: businessAdminId as any, createdAt: { $gte: new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)) } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$grandTotal" } } }, { $sort: { _id: 1 } }])
    ]);

    const salesStats = results[0][0] || { totalSales: 0, todaySalesTotal: 0, todaySalesCount: 0, monthlySalesTotal: 0, monthlySalesCount: 0, yearlySales: 0, yesterdaySalesTotal: 0, lastMonthSalesTotal: 0, lastYearSalesTotal: 0, totalGST: 0 };
    const purchaseStats = results[1][0] || { totalPurchases: 0, purchaseCount: 0 };
    const transactionStats = results[2];
    const inventoryStats = results[3][0] || { totalProducts: 0, inventoryValue: 0, lowStockCount: 0 };
    const staffCount = results[4];
    const recentActivities = results[5];
    const topProducts = results[6];
    const recentInvoices = results[7];
    const lowStockProducts = results[8];
    const revenueTrend = results[9].map((d: any) => ({ name: new Date(d._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), revenue: d.revenue }));

    const bizDoc = await mongoose.model("Business").findById(req.user?.businessId);
    const calcVar = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

    res.status(200).json({
      success: true,
      data: {
        totalSales: salesStats.totalSales,
        todaySales: { total: salesStats.todaySalesTotal, count: salesStats.todaySalesCount, comparison: calcVar(salesStats.todaySalesTotal, salesStats.yesterdaySalesTotal) },
        monthlySales: { total: salesStats.monthlySalesTotal, count: salesStats.monthlySalesCount, comparison: calcVar(salesStats.monthlySalesTotal, salesStats.lastMonthSalesTotal) },
        yearlySales: { total: salesStats.yearlySales, comparison: calcVar(salesStats.yearlySales, salesStats.lastYearSalesTotal) },
        totalPurchases: purchaseStats.totalPurchases,
        totalTransactions: transactionStats,
        lowStockCount: inventoryStats.lowStockCount,
        totalProducts: inventoryStats.totalProducts,
        inventoryValue: inventoryStats.inventoryValue,
        gstPayableThisMonth: salesStats.totalGST,
        recentActivities,
        topProducts,
        recentInvoices,
        lowStockProducts,
        staffCount,
        revenueTrend,
        productCount: inventoryStats.totalProducts,
        skuLimit: bizDoc?.skuLimit || 0,
        usedSku: bizDoc?.currentSkuCount || 0,
        remainingSku: (bizDoc?.skuLimit || 0) - (bizDoc?.currentSkuCount || 0)
      }
    });

  } catch (error: any) {
    console.error("🌊 Dashboard Aggregation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
