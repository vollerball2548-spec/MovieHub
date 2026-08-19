import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema({
  title: String,
  description: String,
  poster: String,
  duration: Number,
  showtimes: [
    {
      cinema: String,
      times: [String],
    },
  ],
});

export default mongoose.model("Movie", MovieSchema);
