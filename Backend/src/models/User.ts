import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'businessAdmin' | 'manager' | 'accountant' | 'cashier';
  businessId?: string | null;
  businessAdminId?: Types.ObjectId | null;
  businessObjectId?: Types.ObjectId | null;
  isActive: boolean;
  lastLoginAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  toSafeObject(): Partial<IUser>;
}

interface UserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['superadmin', 'businessAdmin', 'manager', 'accountant', 'cashier'],
      required: true,
      default: 'businessAdmin',
    },
    businessId: {
      type: String,
      default: null,
      sparse: true,
    },
    businessAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    businessObjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password
userSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidate, this.password);
};

// Instance method to exclude password safely
userSchema.methods.toSafeObject = function (): Partial<IUser> {
  const userObj = this.toObject();
  delete userObj.password;
  return userObj;
};

const User = mongoose.models.User || mongoose.model<IUser, UserModel>('User', userSchema);

export { userSchema };
export default User;
