import express, { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import superAdminAuthRoutes from "./routes/superAdminAuth.routes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import { seedSuperAdmin } from "./utils/seedSuperAdmin.js";
import { seedPlans } from "./utils/seedPlans.js";
import { initializeExistingProducts } from "./utils/productUtils.js";
import { healRegistry } from "./utils/healRegistry.js";
import mongoose from "mongoose";
import cron from "node-cron";
import Business from "./models/Business.js";
import { createNotification } from "./controllers/notificationController.js";

import { createServer } from "http";
import { initSocket } from "./socket.js";

// Initialization logic moved to bottom bootstrap block

// -- Nightly Plan Cycle (12:00 AM) ---------------------------------------------
cron.schedule('0 0 * * *', async () => {
  console.log('📡 Nexus Engine: Processing Nightly Subscription Cycle...');
  try {
    const today = new Date();
    
    // 1. Decommission Expired Nodes
    const expiredBusinesses = await Business.find({ planEndDate: { $lt: today }, isActive: true });
    if (expiredBusinesses.length > 0) {
      await Business.updateMany(
        { planEndDate: { $lt: today }, isActive: true },
        { $set: { status: 'inactive', isActive: false } }
      );
      
      for (const biz of expiredBusinesses) {
        await createNotification(
          null,
          `Critical Alert: Node ${biz.businessName} (ID: ${biz.businessId}) has expired and was decommissioned.`,
          "error",
          "superadmin",
          "/superadmin/accounts",
          "alert"
        );
      }
    }

    // 2. Alert SuperAdmin for Expiring Soon (7 Days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const startOf7thDay = new Date(sevenDaysFromNow.setHours(0,0,0,0));
    const endOf7thDay = new Date(sevenDaysFromNow.setHours(23,59,59,999));

    const expiringSoon = await Business.find({
      planEndDate: { $gte: startOf7thDay, $lte: endOf7thDay },
      status: 'active'
    });

    for (const biz of expiringSoon) {
      await createNotification(
        null,
        `Proactive Governance: Node ${biz.businessName} (ID: ${biz.businessId}) will expire in 7 days.`,
        "warning",
        "superadmin",
        "/superadmin/accounts",
        "alert"
      );
    }
    console.log('✅ Cycle Complete: Expired nodes decommissioned and alerts dispatched.');
  } catch (err) {
    console.error('❌ Nightly Cycle Failed:', err);
  }
});

const app = express();
const httpServer = createServer(app);

// Security & Performance Middleware
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 
app.use(morgan("dev"));
app.use(express.json());

// High-Performance CORS Registry: Supports Vercel Previews and Production Nodes
app.use(cors({
  origin: [
    /^https:\/\/account-billing-system.*\.vercel\.app$/, // Trust all Vercel subdomains
    "https://account-billing-system.vercel.app",        // Primary Production
    "http://localhost:5173",                            // Local Dev
    "http://127.0.0.1:5173"                             // Local Dev IP
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/superadmin/auth", superAdminAuthRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/offers", offerRoutes);

// Health Check Routes
app.get("/api/test", (req: Request, res: Response) => {
  res.json({ message: "NexusBill backend connected successfully" });
});

app.get("/", (req: Request, res: Response) => {
  res.send("NexusBill Backend is running smoothly!");
});

// Initialize Real-time Telemetry Hub
initSocket(httpServer);

/**
 * Nexus Port Dispatcher: Programmatically scans for the first available port
 * if the desired node (5000) is congested.
 */
let port = Number(process.env.PORT) || 5000;

const startServer = (p: number) => {
  httpServer.listen(p, '0.0.0.0', () => {
    console.log(`🚀 Nexus Engine Online: http://localhost:${p} (Industrial Bound to 0.0.0.0)`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${p} is busy. Nexus Protocol shifting to node ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error('🛑 Nexus Engine Deep Failure:', err);
      process.exit(1);
    }
  });
};

// Server startup moved to bootstrap block

// ── Background Nexus Initialization ──────────────────────────────────────────
(async () => {
    try {
        console.log('📡 Nexus Engine: Initializing Core Infrastructure...');
        await connectDB();
        
        console.log('📡 Nexus Engine: Initializing Background Registry Audit...');
        await healRegistry();
        await seedSuperAdmin();
        await seedPlans();
        await initializeExistingProducts();
        
        console.log('✅ Nexus Registry: All nodes successfully re-synchronized.');
        
        // Start Server after DB is ready
        startServer(port);
    } catch (err) {
        console.error('🌊 Nexus Bootstrap Failure:', err);
        process.exit(1);
    }
})();
