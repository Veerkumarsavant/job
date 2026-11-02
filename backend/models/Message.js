const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },


    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    text: {
      type: String,
      trim: true,
      default: ""
    },

    attachments: [
      {
        type: String // images, audio, files
      }
    ],

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
      index: true
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    edited: {
      type: Boolean,
      default: false
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    deletedForEveryone: {
      type: Boolean,
      default: false
    },
    reactions: {
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      love: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      fire: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);