const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  }

}, { timestamps: true });


connectionSchema.index(
  { participants: 1 },
  { unique: true }
);

connectionSchema.index({ sender: 1 });
connectionSchema.index({ receiver: 1 });

connectionSchema.pre("validate", function (next) {
  this.participants = [this.sender, this.receiver]
    .map(id => id.toString())
    .sort()
    .map(id => new mongoose.Types.ObjectId(id));

  next();
});


module.exports = mongoose.model("Connection", connectionSchema);