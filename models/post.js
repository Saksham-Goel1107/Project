const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  comments: [
    {
      user: { type: mongoose.Schema.ObjectId, ref: "User" },
      text: { type: String, required: true }, 
    }
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
});

module.exports = mongoose.model("Post", postSchema);
