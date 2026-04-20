import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";
import mongoose from "mongoose";

/**
 * @desc    Get complete audit log for a business
 * @route   GET /api/reports/activity
 */
export const getActivityLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Activity } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);
    const action   = req.query.action   ? String(req.query.action)   : undefined;
    const resource = req.query.resource ? String(req.query.resource) : undefined;
    const search   = req.query.search   ? String(req.query.search)   : undefined;
    const page     = Number(req.query.page  || 1);
    const limit    = Number(req.query.limit || 50);

    const query: any = { businessAdminId: businessAdminId as any };
    if (action)   query.action   = action;
    if (resource) query.resource = resource;
    if (search)   query.description = { $regex: search, $options: 'i' };

    const total      = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ success: true, total, data: activities });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a specific audit node
 * @route   DELETE /api/reports/activity/:id
 */
export const deleteActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Activity } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);

    const result = await Activity.deleteOne({ _id: req.params.id, businessAdminId: businessAdminId as any });
    
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Node not found or unauthorized." });
      return;
    }

    res.status(200).json({ success: true, message: "Audit node decommissioned." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Detailed Sales Report with Dynamic Filtering
 * @route   GET /api/reports/sales
 */
export const getSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice, Product, Purchase, Activity } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);

    // 0. Parse Filter Params
    const { startDate, endDate, paymentMethod, customerName } = req.query;
    
    // Default: Last 30 Days if no dates provided
    let dateFilter: any = {};
    if (startDate || endDate) {
       dateFilter.createdAt = {};
       const parsedStart = startDate ? new Date(String(startDate)) : null;
       const parsedEnd = endDate ? new Date(String(endDate)) : null;
       
       if (parsedStart && !isNaN(parsedStart.getTime())) {
         dateFilter.createdAt.$gte = parsedStart;
       }
       if (parsedEnd && !isNaN(parsedEnd.getTime())) {
          parsedEnd.setHours(23, 59, 59, 999);
          dateFilter.createdAt.$lte = parsedEnd;
       }
       // If invalid dates were provided but couldn't be parsed, fallback to 30 days
       if (Object.keys(dateFilter.createdAt).length === 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          dateFilter.createdAt = { $gte: thirtyDaysAgo };
       }
    } else {
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       dateFilter.createdAt = { $gte: thirtyDaysAgo };
    }

    // Dynamic Match Object
    const salesMatch: any = { ...dateFilter, businessAdminId: businessAdminId as any };
    if (paymentMethod) salesMatch.paymentMethod = String(paymentMethod).toLowerCase();
    
    if (customerName) {
      salesMatch.$or = [
        { customerName: { $regex: String(customerName), $options: 'i' } },
        { customerPhone: { $regex: String(customerName), $options: 'i' } }
      ];
    }

    const purchaseMatch: any = { ...dateFilter, businessAdminId: businessAdminId as any };

    const [dailySales, dailyPurchases, topSoldItems, leastSoldItems, topPurchasedItems, leastPurchasedItems, paymentMetrics, gstLiability, totalSalesAllTime, lowStockItems, activities, totalDiscounts] = await Promise.all([
      // ... previous 11 promises ...
      // 1. Daily Sales trend
      Invoice.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalSales: { $sum: "$grandTotal" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 2. Daily Purchase trend
      Purchase.aggregate([
        { $match: purchaseMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalPurchases: { $sum: "$grandTotal" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 3. Top Sold Items
      Invoice.aggregate([
        { $match: salesMatch },
        { $unwind: "$items" },
        { 
          $group: { 
            _id: "$items.name", 
            totalQty: { $sum: "$items.qty" }, 
            revenue: { $sum: "$items.total" } 
          } 
        },
        { $sort: { totalQty: -1 } },
        { $limit: 10 }
      ]),

      // 4. Least Sold Items
      Invoice.aggregate([
        { $match: salesMatch },
        { $unwind: "$items" },
        { 
          $group: { 
            _id: "$items.name", 
            totalQty: { $sum: "$items.qty" }, 
            revenue: { $sum: "$items.total" } 
          } 
        },
        { $sort: { totalQty: 1 } },
        { $limit: 10 }
      ]),

      // 5. Top Purchased Items
      Purchase.aggregate([
        { $match: purchaseMatch },
        { $unwind: "$items" },
        { 
          $group: { 
            _id: "$items.name", 
            totalQty: { $sum: "$items.qty" }, 
            investment: { $sum: "$items.total" } 
          } 
        },
        { $sort: { totalQty: -1 } },
        { $limit: 10 }
      ]),

      // 6. Least Purchased Items
      Purchase.aggregate([
        { $match: purchaseMatch },
        { $unwind: "$items" },
        { 
          $group: { 
            _id: "$items.name", 
            totalQty: { $sum: "$items.qty" }, 
            investment: { $sum: "$items.total" } 
          } 
        },
        { $sort: { totalQty: 1 } },
        { $limit: 10 }
      ]),

      // 7. Payment Distribution (Filtered)
      Invoice.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$grandTotal" },
            count: { $sum: 1 }
          }
        }
      ]),

      // 8. Detailed GST Breakdown (Slab-wise / Filtered)
      Invoice.aggregate([
        { $match: salesMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.gstRate",
            totalTax: { $sum: "$items.gstAmount" },
            taxableValue: { $sum: { $subtract: ["$items.total", "$items.gstAmount"] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 9. Total Sales (All Time for context)
      Invoice.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),

      // 10. Low Stock Items
      Product.find({ 
        businessAdminId: businessAdminId as any,
        isActive: true, 
        $expr: { $lte: ["$stock", "$lowStockThreshold"] } 
      }).limit(5).select('name stock'),

      // 11. Recent Audit Logs
      Activity.find({ businessAdminId: businessAdminId as any })
        .sort({ createdAt: -1 })
        .limit(10),

      // 12. Total Discounts Yield (Filtered)
      Invoice.aggregate([
        { $match: salesMatch },
        { $group: { _id: null, total: { $sum: "$totalDiscount" } } }
      ])
    ]);

    res.status(200).json({ 
      success: true, 
      data: { 
        dailySales, 
        dailyPurchases, 
        topSoldItems, 
        leastSoldItems,
        topPurchasedItems, 
        leastPurchasedItems,
        paymentMetrics,
        gstSlabs: gstLiability,
        totalGST: (gstLiability as any[]).reduce((s, c) => s + c.totalTax, 0),
        totalSalesAllTime: totalSalesAllTime[0]?.total || 0,
        totalDiscounts: totalDiscounts[0]?.total || 0,
        lowStockItems,
        activities
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Inventory Valuation and Health Report
 * @route   GET /api/reports/inventory
 */
export const getInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Product } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);

    const stats = await Product.aggregate([
      { $match: { businessAdminId: businessAdminId as any, isActive: true } },
      {
        $group: {
          _id: null,
          totalSKUs: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValuation: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
          averagePrice: { $avg: "$sellingPrice" }
        }
      }
    ]);

    const categoryDistribution = await Product.aggregate([
      { $match: { businessAdminId: businessAdminId as any, isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          value: { $sum: { $multiply: ["$stock", "$purchasePrice"] } }
        }
      }
    ]);

    res.status(200).json({ 
      success: true, 
      data: { stats: stats[0] || {}, categoryDistribution } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Detailed Transaction Ledger Report
 * @route   GET /api/reports/transactions
 */
export const getTransactionReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Transaction } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);
    const { type, startDate, endDate } = req.query;

    let query: any = { businessAdminId: businessAdminId as any };
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    const [transactions, summary] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).limit(100),
      Transaction.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({ success: true, data: { transactions, summary } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Dedicated GST Liability Report
 * @route   GET /api/reports/gst
 */
export const getGSTReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice, Purchase } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);
    const { startDate, endDate } = req.query;

    let match: any = { businessAdminId: businessAdminId as any };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        match.createdAt.$lte = d;
      }
    }

    const [salesSlabs, purchaseSlabs] = await Promise.all([
      Invoice.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.gstRate",
            totalTax: { $sum: "$items.gstAmount" },
            taxableValue: { $sum: { $subtract: ["$items.total", "$items.gstAmount"] } },
            count: { $sum: "$items.qty" }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Purchase.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.gstRate",
            totalTax: { $sum: { $multiply: ["$items.purchasePrice", "$items.qty", { $divide: ["$items.gstRate", 100] }] } },
            taxableValue: { $sum: { $multiply: ["$items.purchasePrice", "$items.qty"] } },
            count: { $sum: "$items.qty" }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

     // 3. Generate Analytical trend: 6-Month Fiscal Forecaster
     const sixMonthsAgo = new Date();
     sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

     const purchaseMatch = {
        businessAdminId: businessAdminId as any,
        $or: [
          { purchaseDate: match.createdAt || { $exists: true } },
          { createdAt: match.createdAt || { $exists: true } }
        ]
      };
     
     const [salesTrend, purchaseTrend] = await Promise.all([
       Invoice.aggregate([
         { $match: { businessAdminId: businessAdminId as any, createdAt: { $gte: sixMonthsAgo } } },
         {
           $group: {
             _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
             total: { $sum: { $ifNull: ["$totalGST", { $sum: "$items.gstAmount" }] } }
           }
         },
         { $sort: { _id: 1 } }
       ]),
       Purchase.aggregate([
         { 
           $match: { 
             businessAdminId: businessAdminId as any, 
             $or: [ { purchaseDate: { $gte: sixMonthsAgo } }, { createdAt: { $gte: sixMonthsAgo } } ]
           } 
         },
         {
           $group: {
             _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$purchaseDate", "$createdAt"] } } },
             total: { $sum: { $ifNull: ["$totalGST", { $sum: "$items.gstAmount" }] } }
           }
         },
         { $sort: { _id: 1 } }
       ])
     ]);

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const sMatch = salesTrend.find(s => s._id === monthKey);
        const pMatch = purchaseTrend.find(p => p._id === monthKey);

        trend.push({
          month: months[d.getMonth()],
          output: sMatch?.total || 0,
          input: pMatch?.total || 0
        });
      }

     // Improve metric card fidelity: sum directly from top-level fields for the match
     const [outputGSTResult, inputGSTResult] = await Promise.all([
        Invoice.aggregate([
          { $match: match },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$totalGST", { $sum: "$items.gstAmount" }] } } } }
        ]),
        Purchase.aggregate([
          { 
            $match: purchaseMatch
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$totalGST", { $sum: "$items.gstAmount" }] } } } }
        ])
      ]);

     const outputGST = outputGSTResult[0]?.total || 0;
     const inputGST = inputGSTResult[0]?.total || 0;

     // 4. Fetch History Ledger: Unified Sales and Purchases
     const historyLimit = Number(req.query.limit || 10);
     const [recentSales, recentPurchases] = await Promise.all([
       Invoice.find({ ...match }).sort({ createdAt: -1 }).limit(historyLimit).lean(),
       Purchase.find({ 
         businessAdminId: businessAdminId as any,
         $or: [
           { purchaseDate: match.createdAt || { $exists: true } },
           { createdAt: match.createdAt || { $exists: true } }
         ]
       }).sort({ createdAt: -1 }).limit(historyLimit).lean()
     ]);

     const history = [
       ...recentSales.map((s: any) => ({
         _id: s._id,
         type: 'SALES',
         ref: s.invoiceNumber,
         date: s.createdAt,
         taxable: s.subtotal,
         gst: s.totalGST,
         status: 'COLLECTED',
         customer: s.customerName,
         transactionId: s.transactionId
       })),
       ...recentPurchases.map((p: any) => ({
         _id: p._id,
         type: 'PURCHASE',
         ref: p.billNumber,
         date: p.purchaseDate || p.createdAt,
         taxable: p.subtotal,
         gst: p.totalGST,
         status: 'PAID',
         customer: p.vendorName,
         transactionId: p.transactionId,
          vendorCompany: p.vendorCompany,
          vendorPhone: p.vendorPhone,
          vendorAddress: p.vendorAddress
       }))
     ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

     res.status(200).json({ 
       success: true, 
       data: { 
         salesSlabs, 
         purchaseSlabs,
         outputGST,
         inputGST,
         netPayable: Math.max(0, outputGST - inputGST),
         itcBalance: Math.max(0, inputGST - outputGST),
         history,
         trend
       } 
     });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Detailed Purchase / Procurement Report
 * @route   GET /api/reports/purchase
 */
export const getPurchaseReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Purchase } = req.tenantModels;
    const adminIdStr = getBusinessAdminId(req);
    const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);
    const { startDate, endDate, vendorName } = req.query;

    let match: any = { businessAdminId: businessAdminId as any };
    if (vendorName) match.vendorName = { $regex: String(vendorName), $options: 'i' };

    if (startDate || endDate) {
      match.purchaseDate = {};
      if (startDate) match.purchaseDate.$gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        match.purchaseDate.$lte = d;
      }
    }

    const [purchases, vendorStats] = await Promise.all([
      Purchase.find(match).sort({ purchaseDate: -1 }).limit(100),
      Purchase.aggregate([
        { $match: { businessAdminId: businessAdminId as any } },
        {
          $group: {
            _id: "$vendorName",
            totalValue: { $sum: "$grandTotal" },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalValue: -1 } }
      ])
    ]);

    res.status(200).json({ success: true, data: { purchases, vendorStats } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Nexus P&L Forensics: The Profit & Loss Aggregation Node.
 * Reconciles Sales Revenue vs COGS and Tax for net margin analysis.
 */
export const getProfitLoss = async (req: AuthRequest, res: Response): Promise<void> => {
   try {
      if (!req.tenantModels) {
         res.status(500).json({ success: false, message: "Workspace node offline." });
         return;
      }
      const { Invoice, Purchase } = req.tenantModels;
      const adminIdStr = getBusinessAdminId(req);
      const businessAdminId = new mongoose.Types.ObjectId(adminIdStr);

      // 1. All Lifetime Sales Aggregation (Excl. Tax)
      const salesResult = await Invoice.aggregate([
         { $match: { businessAdminId: businessAdminId as any } },
         { $group: { 
            _id: null, 
            totalSales: { $sum: "$subtotal" }, 
            outputGST: { $sum: "$totalGST" },
            cogs: { 
              $sum: { 
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.purchasePrice", 0] }, "$$this.qty"] }] }
                }
              }
            }
         }}
      ]);

      const salesData = salesResult[0] || { totalSales: 0, outputGST: 0, cogs: 0 };

      // 2. All Lifetime Purchases Aggregation (Excl. Tax)
      const purchaseResult = await Purchase.aggregate([
         { $match: { businessAdminId: businessAdminId as any } },
         { $group: { 
            _id: null, 
            totalPurchase: { $sum: "$subtotal" },
            inputGST: { $sum: "$totalGST" }
         } }
      ]);
      
      const purchaseData = purchaseResult[0] || { totalPurchase: 0, inputGST: 0 };
      
      // Calculate Net Profit: (Sales Revenue Excl. Tax) - (Purchase Costs Excl. Tax)
      // Note: We use totalPurchase here as 'Operating Expenses' if we don't have separate expense nodes.
      const netProfit = salesData.totalSales - purchaseData.totalPurchase;

      // Net Tax Liability: GST from Sales - GST from Purchases (ITC)
      const taxLiability = salesData.outputGST - purchaseData.inputGST;

      res.status(200).json({
         success: true,
         data: {
            period: "All Operations",
            totalSales: salesData.totalSales,
            cogs: salesData.cogs,
            operatingExpenses: purchaseData.totalPurchase,
            taxLiabilities: taxLiability,
            netProfit: netProfit
         }
      });
   } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
   }
};


