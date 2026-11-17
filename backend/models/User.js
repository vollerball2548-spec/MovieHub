import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 40 },
  password: { type: String, required: true, select: false },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  role: { type: String, enum: ["user", "admin", "staff"], default: "user", required: true },
}, {
  timestamps: true,
});

export default mongoose.model("User", UserSchema);
