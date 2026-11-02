const mongoose = require("mongoose");

const profileViewSchema = new mongoose.Schema(
{
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

},
{ timestamps: true }
);

profileViewSchema.index(
  { viewer: 1, profile: 1 },
  { unique: true }
);

module.exports = mongoose.model("ProfileView", profileViewSchema);