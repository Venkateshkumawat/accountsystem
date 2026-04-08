import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
    res.status(500).json({ success: false, message: "Workspace node unavailable." });
    return;
  }
  const { Staff } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, mobile, password, role, permissions, referenceId } = req.body;
    const { userId, businessId, businessAdminId, shortBusinessId } = req.user!;

    if (!name || !email || !mobile || !password || !role) {
      throw new Error("Missing required fields");
    }

    const adminId = businessAdminId || userId;

    if (referenceId !== adminId.toString() && referenceId !== shortBusinessId) {
       throw new Error(`Invalid Administrator Reference ID. Use your Node ID (${shortBusinessId}) or Admin ID.`);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User with this email already exists.");
    }

    const userDocs = await User.create([{
      name, email, password, role,
      businessAdminId: adminId as any,
      businessId: shortBusinessId,
      businessObjectId: businessId as any,
      createdBy: userId as any,
      isActive: true
    }] as any, { session });
    const newUser = userDocs[0];

    const staffDocs = await Staff.create([{
      userId: newUser._id,
      businessAdminId: adminId as any,
      businessId: businessId as any,
      name, email, mobile, role,
      permissions: permissions || [],
      addedBy: userId as any,
      isActive: true
    }] as any, { session });
    const newStaff = staffDocs[0];

    await session.commitTransaction();
    session.endSession();

    await logActivity(req, "CREATE", "STAFF", `Added staff: ${name}`, (newStaff._id as any).toString());
    await createNotification(req.user?.businessId, `New staff node ${name} deployed.`, "success", "businessAdmin", undefined, "staff");

    res.status(201).json({ success: true, data: { staff: newStaff } });

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
       res.status(500).json({ success: false, message: "Workspace node unavailable." });
       return;
    }
    const { Staff } = req.tenantModels;
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;

    const staffDocs = await Staff.find({ businessAdminId: adminId })
      .sort({ createdAt: -1 });

    // Multi-tenant Population Protocol (Manual Merge since User is Global)
    const userIds = staffDocs.map(s => s.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email role isActive lastLoginAt');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const staff = staffDocs.map(s => {
       const user = userMap.get(s.userId.toString());
       return {
         ...s.toObject(),
         userId: user || { _id: s.userId, name: s.name, email: s.email, role: s.role, isActive: s.isActive }
       };
    });

    res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
       res.status(500).json({ success: false, message: "Workspace node unavailable." });
       return;
    }
    const { Staff } = req.tenantModels;
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, businessAdminId: adminId });
      
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }

    const user = await User.findById(staff.userId).select('name email role isActive lastLoginAt');
    const staffObj = {
      ...staff.toObject(),
      userId: user || { _id: staff.userId, name: staff.name, email: staff.email, role: staff.role, isActive: staff.isActive }
    };

    res.status(200).json({ success: true, data: staffObj });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
     res.status(500).json({ success: false, message: "Workspace node unavailable." });
     return;
  }
  const { Staff } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;
    const { id } = req.params;
    const { name, mobile, role, permissions } = req.body;

    const staff = await Staff.findOne({ _id: id, businessAdminId: adminId });
    if (!staff) throw new Error("Staff not found");

    if (name) staff.name = name;
    if (mobile) staff.mobile = mobile;
    if (role) staff.role = role as any;
    if (permissions) staff.permissions = permissions;
    await staff.save({ session });

    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (role) updateFields.role = role;
    if (Object.keys(updateFields).length > 0) {
      await User.findByIdAndUpdate(staff.userId, updateFields, { session });
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
       res.status(500).json({ success: false, message: "Workspace node unavailable." });
       return;
    }
    const { Staff } = req.tenantModels;
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;
    const { id } = req.params;
    const { permissions } = req.body;

    const staff = await Staff.findOneAndUpdate(
      { _id: id, businessAdminId: adminId },
      { permissions },
      { returnDocument: 'after' }
    );

    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }

    await logActivity(req, "UPDATE", "STAFF", `Permissions updated for: ${staff.name}`, (staff._id as any).toString());
    res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
     res.status(500).json({ success: false, message: "Workspace node unavailable." });
     return;
  }
  const { Staff } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, businessAdminId: adminId });
    if (!staff) throw new Error("Staff not found");

    staff.isActive = !staff.isActive;
    await staff.save({ session });
    await User.findByIdAndUpdate(staff.userId, { isActive: staff.isActive }, { session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, isActive: staff.isActive });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
     res.status(500).json({ success: false, message: "Workspace node unavailable." });
     return;
  }
  const { Staff } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, businessAdminId } = req.user!;
    const adminId = businessAdminId || userId;
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, businessAdminId: adminId });
    if (!staff) throw new Error("Staff not found");

    await User.findByIdAndDelete(staff.userId, { session });
    await Staff.findByIdAndDelete(id, { session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, message: "Staff deleted" });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new Error("Incorrect password");
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
