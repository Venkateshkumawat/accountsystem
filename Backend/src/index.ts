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

import { createServer } from "http";
import { initSocket } from "./socket.js";

// Connect to Database and Seed Nexus Configs
const bootstrap = async () => {
  try {
    await connectDB();
    await healRegistry();
    await seedSuperAdmin();
    await seedPlans();
    await initializeExistingProducts();
  } catch (err) {
    console.error('🌊 Nexus Bootstrap Failure:', err);
    process.exit(1);
  }
};

await bootstrap();

// -- Nightly Plan Cycle (12:00 AM) ---------------------------------------------
cron.schedule('0 0 * * *', async () => {
  console.log('?? Nexus Engine: Processing Nightly Subscription Cycle...');
  try {
    const today = new Date();
    await Business.updateMany(
      { planEndDate: { $lt: today }, isActive: true },
      { $set: { status: 'inactive', isActive: false } }
    );
    console.log('? Cycle Complete: Expired nodes decommissioned.');
  } catch (err) {
    console.error('? Nightly Cycle Failed:', err);
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
    "http://localhost:5173"                             // Local Dev
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
    console.log(`?? Nexus Engine Online: http://localhost:${p} (Industrial Bound to 0.0.0.0)`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`??? Port ${p} is busy. Nexus Protocol shifting to node ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error('? Nexus Engine Deep Failure:', err);
      process.exit(1);
    }
  });
};

startServer(port);
