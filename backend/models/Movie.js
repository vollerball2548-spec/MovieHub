import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema({
  title: String,
  genre: String,
  year: Number,
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
