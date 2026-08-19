import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    movieTitle: {
      type: String,
      required: true,
    },
    seats: {
      type: [String], // เช่น ["A1", "A2"]
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    date: {
      type: String,
    },
    cinema: {
      type: String,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    qrCode: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // ✅ บันทึกเวลา createdAt / updatedAt อัตโนมัติ
  }
);

// ✅ สร้างและ export model
export default mongoose.model("Booking", bookingSchema);
