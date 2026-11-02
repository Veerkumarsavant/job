const mongoose = require("mongoose");
const Connection = require("../models/Connection");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");

const sendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (receiverId === senderId.toString()) {
      return res.status(400).json({ message: "Cannot connect with yourself" });
    }

    const receiver = await User.findById(receiverId)
      .select("name headline avatar")
      .lean();

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const participants = [senderId, receiverId]
      .map(id => id.toString())
      .sort()
      .map(id => new mongoose.Types.ObjectId(id));

    const existing = await Connection.findOne({participants: { $all: participants,  $size: 2}});
    if (existing) {
      return res.status(400).json({
        message: "Connection already exists or pending"
      });
    }

    const connection = await Connection.create({
      sender: senderId,
      receiver: receiverId,
      participants,
      status: "pending"
    });

    const io = req.app.get("io");

    const payload = {
      _id: connection._id,
      sender: {
        _id: senderId,
        name: req.user.name,
        headline: req.user.headline,
        avatar: req.user.avatar
      }
    };

    if (io) {
  io.to(receiverId.toString()).emit(
    "connectionRequest",
    payload
  );

  io.to(senderId.toString()).emit(
    "connectionRequestSent",
    payload
  );
}


    await createNotification({
      io,
      recipient: receiverId,
      sender: senderId,
      type: "connection_request",
      message: `${req.user.name} sent you a connection request`
    });

    return res.json(connection);

  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(400).json({
        message: "Connection already exists"
      });
    }

    res.status(500).json({ message: "Connection request failed" });
  }
};

const acceptRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID"
      });
    }

    const userId = req.user._id;

    const connection = await Connection.findOneAndUpdate(
      {
        _id: req.params.id,
        receiver: userId,
        status: "pending"
      },
      {
        $set: { status: "accepted" }
      },
      {
        new: true
      }
    );

    if (!connection) {
      return res.status(400).json({
        message: "Already processed or not authorized"
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(connection.sender, {
        $addToSet: {
          connections: connection.receiver
        }
      }),
      User.findByIdAndUpdate(connection.receiver, {
        $addToSet: {
          connections: connection.sender
        }
      })
    ]);

    const io = req.app.get("io");

    if (io) {
      const payload = {
        _id: connection._id
      };

      io.to(connection.sender.toString())
        .emit("connectionAccepted", payload);

      io.to(connection.receiver.toString())
        .emit("connectionAccepted", payload);
    }

    try {
      await createNotification({
        io,
        recipient: connection.sender,
        sender: userId,
        type: "connection_accepted",
        message: `${req.user.name} accepted your connection request`
      });
    } catch (err) {
      console.error(
        "Notification error:",
        err
      );
    }

    return res.json({
      message: "Connection accepted"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Accept request failed"
    });
  }
};

const rejectRequest = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID"
      });
    }

    const userId = req.user._id;

    const connection = await Connection.findOneAndDelete({
      _id: req.params.id,
      receiver: userId,
      status: "pending"
    });

    if (!connection) {
      return res.status(400).json({
        message: "Already processed or not authorized"
      });
    }

    const io = req.app.get("io");

    if (io) {
      const payload = {
        _id: connection._id
      };

      io.to(connection.sender.toString())
        .emit("connectionRejected", payload);

      io.to(connection.receiver.toString())
        .emit("connectionRejected", payload);
    }

    return res.json({
      message: "Request rejected"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Reject request failed"
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Connection.find({receiver: userId,status: "pending"})
    .populate({path: "sender",select: "name headline avatar"})
    .lean();

    const validRequests = requests.filter(req => req.sender);
    return res.json(validRequests);
  } catch (err) {
    console.error("Get requests error:", err);
    return res.status(500).json({message: "Failed to load requests"});

  }
};

const getPeopleYouMayKnow = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdString = userId.toString();
    const currentUser = await User.findById(userId)
      .select("connections")
      .lean();

    if (!currentUser) {

      return res.status(404).json({
        message: "User not found"
      });
    }

    // Find pending requests involving the current user.
    const pendingRequests = await Connection.find({

      participants: userId,
      status: "pending"
    })
      .select("sender receiver")
      .lean();

    const excludedIds = new Set([
      userIdString,
      ...(currentUser.connections || []).map(id => id.toString())
    ]);

    for (const connection of pendingRequests) {
      const senderId = connection.sender.toString();
      const receiverId = connection.receiver.toString();

      excludedIds.add(
        senderId === userIdString ? receiverId : senderId
      );
    }

    const excludedObjectIds = [...excludedIds].map(
      id => new mongoose.Types.ObjectId(id)
    );

    const userConnections = (currentUser.connections || []).map(
      id => new mongoose.Types.ObjectId(id.toString())
    );

    const suggestions = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludedObjectIds }
        }
      },
      {
        $addFields: {
          mutualConnections: {
            $setIntersection: [
              { $ifNull: ["$connections", []] },
              userConnections
            ]
          }
        }
      },
      {
        $addFields: {
          mutualCount: {
            $size: "$mutualConnections"
          }
        }
      },
      {
        $sort: {
          mutualCount: -1,
          createdAt: -1,
          _id: 1
        }
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          avatar: { $first: "$avatar" },
          headline: { $first: "$headline" },
          mutualCount: { $first: "$mutualCount" },
          createdAt: { $first: "$createdAt" }
        }
      },
      {
        $sort: {
          mutualCount: -1,
          createdAt: -1,
          _id: 1
        }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          headline: 1,
          mutualCount: 1
        }
      }
    ]);

    return res.status(200).json(suggestions);

  } catch (err) {
    console.error("Suggestion error:", err);

    return res.status(500).json({
      message: "Failed to load connection suggestions"
    });
  }
};

const getMutualConnections = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({
    message: "Invalid user ID"
  });
}
    const targetId = req.params.id;
    const userId = req.user._id;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).select("connections").lean(),
      User.findById(targetId).select("connections").lean()
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentSet = new Set(
  (currentUser.connections || [])
    .map(id => id.toString())
);

const mutualIds =
  (targetUser.connections || [])
    .filter(id =>
      currentSet.has(id.toString())
    );

    const mutualUsers = await User.find({
      _id: { $in: mutualIds }
    }).select("name avatar headline");

    return res.json(mutualUsers);

  } catch (err) {
  console.error("Mutual connection error:",err);
  return res.status(500).json({
    message: "Mutual connection error"
  });
}
};


const getConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .populate("connections","name avatar headline")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const uniqueConnections = [
      ...new Map(
        (user.connections || []).map(connection => [
          connection._id.toString(),
          connection
        ])
      ).values()
    ];
    return res.json(uniqueConnections);
  } catch (err) {
    console.error("Get connections error:", err);
    return res.status(500).json({
      message: "Failed to load connections"
    });
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getRequests,
  getPeopleYouMayKnow,
  getMutualConnections,
  getConnections
};