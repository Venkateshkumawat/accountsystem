import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Business from "../models/Business.js";
import Staff from "../models/Staff.js";
import { generateToken } from "../utils/jwt.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";
import { getTenantConnection } from "../config/tenantConnection.js";
import { getTenantModels } from "../config/tenantModels.js";
import { generateBusinessId } from "../utils/generateBusinessId.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      businessName,
      ownerName,
      email,
      password,
      phone,
      gstin,
      city,
      state,
      pincode,
      address,
      plan,
      planEndDate
    } = req.body;

    const userWithEmail = await User.findOne({ email });
    const businessWithEmail = await Business.findOne({ email });
    const businessWithName = await Business.findOne({ businessName });

    if (userWithEmail || businessWithEmail) {
      res.status(400).json({ message: "An account with this email already exists" });
      return;
    }

    if (businessWithName) {
      res.status(400).json({ message: "Company Name is already registered. Please choose another." });
      return;
    }

    const generatedBusinessId = await generateBusinessId();

    const newUser = await User.create({
      name: ownerName,
      email,
      password,
      role: "businessAdmin",
      businessId: generatedBusinessId,
    });

    const finalPlanEndDate = planEndDate ? new Date(planEndDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const newBusiness = await Business.create({
      businessId: generatedBusinessId,
      businessAdminId: newUser._id,
      businessName,
      ownerFullName: ownerName,
      email,
      mobileNumber: phone,
      location: {
        city: city || "Unknown",
        state: state || "Unknown",
        pincode: pincode || "111111",
        address: address || "",
        country: "India"
      },
      gstin,
      plan: plan || "pro",
      planEndDate: finalPlanEndDate,
      planHistory: [{
        plan: plan || "pro",
        startDate: new Date(),
        endDate: finalPlanEndDate,
        assignedBy: "SuperAdmin",
        assignedAt: new Date()
      }],
      status: "active",
      isActive: true,
    });

    newUser.businessObjectId = newBusiness._id as any;
    newUser.businessAdminId = newUser._id as any;
    await newUser.save();

    await logActivity(req, "CREATE", "BUSINESS", `Registered new business: ${businessName} (BB-ID: ${generatedBusinessId})`, newBusiness._id.toString(), newUser._id.toString());

    // Notify SuperAdmin about the new deployment
    await createNotification(
      null, 
      `New Business Node Initialized: ${businessName} (ID: ${generatedBusinessId}) by ${ownerName}.`,
      "success",
      "superadmin"
    );

    // Notify the BusinessAdmin about their new dashboard node
    await createNotification(
      newBusiness._id, 
      `Pro-active Registry Initialized: Welcome to NexusBill, ${ownerName}. Your business node is now active.`,
      "success",
      "businessAdmin"
    );

    const securityToken = generateToken({
      userId: newUser._id.toString(),
      name: newUser.name,
      role: newUser.role,
      businessId: newBusiness._id.toString(),           // MongoDB ObjectId
      shortBusinessId: generatedBusinessId,             // 5-char ref e.g. K9P3Z
      businessAdminId: newUser._id.toString(),          // owner's _id
      permissions: [],                                  // businessAdmin = full access, no restrictions
    });

    res.status(201).json({
      success: true,
      message: "Business registered successfully",
      token: securityToken,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        businessId: generatedBusinessId,
      },
    });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: Object.values(err.errors).map((val: any) => val.message).join(", ")
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server Registration Error",
      error: err.message
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, uniqueId, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const cleanNode = uniqueId.trim();

    const user = await User.findOne({ email: normalizedEmail }).populate("businessObjectId");

    if (!user) {
      res.status(401).json({ message: "CREDENTIAL_MISMATCH: Identity not found in Nexus registry." });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: "ACCOUNT_SUSPENDED: Administrative access decommissioned." });
      return;
    }

    // ── IDENTITY AUDIT: Workspace Node Verification ───────────────────
    const dbWorkspace = (user.businessId || "").toLowerCase().trim();
    const inputWorkspace = cleanNode.toLowerCase().trim();
    const isWorkspaceMatch = dbWorkspace === inputWorkspace;

    if (!isWorkspaceMatch) {
      res.status(401).json({ 
        message: "VALIDATION_FAILURE: Workspace node mismatch.",
        diagnostic: "WORKSPACE_ID_DRIFT"
      });
      return;
    }

    const allowedBusinessRoles = ['businessAdmin', 'manager', 'accountant', 'cashier'];
    if (!allowedBusinessRoles.includes(user.role)) {
      res.status(401).json({ 
        success: false, 
        message: "Access Denied: This portal is exclusively for Business Workspace users." 
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const businessDoc = user.businessObjectId as any;
    const businessObjectId = businessDoc?._id?.toString() || businessDoc?.toString() || null;
    const shortBizId = user.businessId || null; // e.g., BB-XXXX-0000 

    const businessAdminId = user.businessAdminId?.toString()
      || (user.role === 'businessAdmin' ? user._id.toString() : null);

    // ── Fetch staff permissions if this is a staff login ────────────────────
    // businessAdmin and superadmin bypass permission gating (full access)
    let permissions: string[] = [];
    if (!['businessAdmin', 'superadmin'].includes(user.role)) {
      try {
          // Nexus Protocol: Query the shared Staff registry directly
          const staffDoc = await Staff.findOne({ userId: user._id }).select('permissions').lean();
          permissions = (staffDoc?.permissions as string[]) || [];
      } catch (err) {
        console.error("🌊 Security Node Permissions Offline:", err);
        // Default to safe empty permissions if node is offline
      }
    }

    const securityToken = generateToken({
      userId: user._id.toString(),
      name: user.name,
      role: user.role,
      businessId: businessObjectId,        // MongoDB ObjectId
      shortBusinessId: shortBizId,         // 5-char ref e.g. K9P3Z
      businessAdminId,
      permissions,                         // [] for admin, [...] for staff
      planEndDate: businessDoc?.planEndDate || null,
    });

    res.status(200).json({
      message: "Login successful",
      token: securityToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        businessObjectId: businessObjectId, // Required for real-time node sync
        permissions,                       
        planEndDate: businessDoc?.planEndDate || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Login Error", error: err.message });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.userId).populate("businessObjectId");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (err: any) {
    res.status(500).json({ message: "Profile Fetch Error", error: err.message });
  }
};
