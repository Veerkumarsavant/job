const User = require("../models/User");
const Notification = require("../models/Notification");
const ProfileView = require("../models/profileView");
const notify = require("../utils/notify");

const viewProfile = async (req, res) => {
  try {

    const profileUser = await User.findById(req.params.id);

    if (!profileUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    
    if (
  req.user &&
  profileUser._id.toString() !== req.user.id
) {

      const existingView = await ProfileView.findOne({
        viewer: req.user.id,
        profile: profileUser._id
      });

      if (!existingView) {

        await ProfileView.create({
          viewer: req.user.id,
          profile: profileUser._id
        });

        await notify(req, {
          recipient: profileUser._id,
          sender: req.user.id,
          type: "profile_view",
          message: "viewed your profile",
          link: `/user/profile.html?id=${req.user.id}`
        });
      }
    }

    res.json(profileUser);

  } catch (err) {
    console.error("VIEW PROFILE ERROR:", err.message);

    res.status(500).json({
      message: "Server error"
    });
  }
};

const trackProfileView = async (req, res) => {
  try {

    const profileId = req.params.id;
    const viewerId = req.user.id;

    if (profileId === viewerId) {
      return res.json({
        message: "Self view ignored"
      });
    }

    const alreadyVisited = await User.exists({
      _id: profileId,
      "visitors.user": viewerId
    });

    const now = new Date();


    await User.updateOne(
      { _id: profileId },
      [
        {
          $set: {
            visitors: {
              $let: {
                vars: {
                  exists: {
                    $in: [viewerId, "$visitors.user"]
                  }
                },
                in: {
                  $cond: [
                    "$$exists",
                    {
                      $map: {
                        input: "$visitors",
                        as: "v",
                        in: {
                          $cond: [
                            { $eq: ["$$v.user", viewerId] },
                            { user: viewerId, date: now },
                            "$$v"
                          ]
                        }
                      }
                    },
                    {
                      $slice: [
                        {
                          $concatArrays: [
                            [{ user: viewerId, date: now }],
                            "$visitors"
                          ]
                        },
                        100
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );

    // Only notify first time
    if (!alreadyVisited) {

      await notify(req, {
        recipient: profileId,
        sender: viewerId,
        type: "profile_view",
        message: "viewed your profile",
        link: `/user/profile.html?id=${viewerId}`
      });

      const viewer = await User.findById(viewerId)
        .select("name headline")
        .lean();

      const io = req.app.get("io");

      if (io && viewer) {
        io.to(`profile_${profileId}`).emit("newVisitor", {
          name: viewer.name,
          headline: viewer.headline
        });
      }
    }

    res.json({
      message: "Profile view recorded"
    });

  } catch (err) {

    console.error("Track profile error:", err);

    res.status(500).json({
      message: err.message
    });

  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(`
  name
  email
  headline
  avatar
  cover
  resume
  location
  about
  phone
  address
  connections
  visitors
  education
  projects
  certificates
  skills
`)
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.connectionsCount = user.connections?.length || 0;
    user.visitorsCount = user.visitors?.length || 0;

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req,res)=>{
 try{

  const user = await User.findById(req.user.id);
  if(!user) return res.status(404).json({message:"User not found"});

  user.name = req.body.name ?? user.name;
  user.headline = req.body.headline ?? user.headline;
  user.location = req.body.location ?? user.location;
  user.about = req.body.about ?? user.about;
  user.email = req.body.email ?? user.email;
  user.phone = req.body.phone ?? user.phone;
  user.address = req.body.address ?? user.address;

  await user.save();

  res.json(user);

 }catch(err){
  res.status(500).json({message:err.message});
 }
};

const uploadCover = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cover = `covers/${req.file.filename}`;
    await user.save();

    res.json({ cover: user.cover });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select(`name headline location about avatar cover resume followers connections visitors education projects certificates skills`)
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.followersCount = user.followers?.length || 0;
    user.connectionsCount = user.connections?.length || 0;

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    if (targetId === userId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const result = await User.updateOne(
      { _id: targetId, followers: { $ne: userId } },
      { $addToSet: { followers: userId } }
    );

    const isNewFollow = result.modifiedCount > 0;

    if (isNewFollow) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { following: targetId } }
      );
      await Notification.updateOne(
        {
          recipient: targetId,
          sender: userId,
          type: "connection"
        },
        {
          $setOnInsert: {
            recipient: targetId,
            sender: userId,
            type: "connection",
            message: "started following you"
          }
        },
        { upsert: true }
      );



      
      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");
      const socketId = onlineUsers?.get(targetId);

      if (socketId && io) {
        const viewer = await User.findById(userId)
          .select("name")
          .lean();

        io.to(socketId).emit("notification", {
          message: `${viewer?.name || "Someone"} started following you`
        });
      }
    }

    res.json({
      message: isNewFollow ? "Followed successfully" : "Already following"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const connectUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    if (targetId === userId) {
      return res.status(400).json({ message: "Cannot connect to yourself" });
    }

    const result = await User.updateOne(
      { _id: targetId },
      { $addToSet: { connections: userId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isNewConnection = result.modifiedCount > 0;

    if (isNewConnection) {
      await Notification.updateOne(
        {
          recipient: targetId,
          sender: userId,
          type: "connection"
        },
        {
          $setOnInsert: {
            recipient: targetId,
            sender: userId,
            type: "connection",
            message: "sent you a connection request"
          }
        },
        { upsert: true }
      );

      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");
      const socketId = onlineUsers?.get(targetId);

      if (socketId && io) {
        io.to(socketId).emit("notification", {
          message: "sent you a connection request"
        });
      }
    }

    res.json({
      message: isNewConnection
        ? "Connection request sent"
        : "Already connected"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSuggestions = async (req,res)=>{
 try{

  const user = await User.findById(req.user.id);

  const suggested = await User.find({
   _id:{ $nin:[...(user.following || []), user._id] }
  })
  .limit(5)
  .select("name headline avatar");

  res.json(suggested);

 }catch(err){
  res.status(500).json({message:err.message});
 }
};

const getProfileVisitors = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("visitors")
      .populate("visitors.user", "name headline avatar")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const visitors = (user.visitors || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    res.json(visitors);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserStats = async (req,res)=>{
 try{

  const user = await User.findById(req.user.id);

  res.json({
   followers:user.followers?.length || 0,
   connections:user.connections?.length || 0,
   visitors:user.visitors?.length || 0
  });

 }catch(err){
  res.status(500).json({message:err.message});
 }
};

const addEducation = async (req,res)=>{
 const user = await User.findById(req.user.id);
 if(!user) return res.status(404).json({message:"User not found"});

 user.education.push(req.body);
 await user.save();

 res.json(user.education);
};

const addProject = async (req,res)=>{
 const user = await User.findById(req.user.id);
 if(!user) return res.status(404).json({message:"User not found"});

 user.projects.push(req.body);
 await user.save();

 res.json(user.projects);
};


const addCertificate = async (req, res) => {
  try {
    const { name, organization } = req.body;

    if (!name || !organization) {
      return res.status(400).json({
        message: "All fields required"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.certificates.push({
      name,
      organization 
    });

    await user.save();

    res.json(user.certificates);

  } catch (err) {
    console.error("Add certificate error:", err);
    res.status(500).json({ message: "Failed to add certificate" });
  }
};

const addSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill || typeof skill !== "string") {
      return res.status(400).json({ message: "Invalid skill" });
    }

    const user = await User.findById(req.user.id);
    const exists = user.skills.find(
      s => s.name.toLowerCase() === skill.toLowerCase()
    );

    if (!exists) {
      user.skills.push({ name: skill.trim() });
      await user.save();
    }

    res.json(user.skills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const uploadResume = async (req,res)=>{
 const user = await User.findById(req.user.id);
 if(!user) return res.status(404).json({message:"User not found"});

 user.resume = `/resumes/${req.file.filename}`;
 await user.save();

 res.json({
  resume: user.resume
});
};


const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
  _id: { $ne: req.user.id }
})
.select("name avatar headline");

    res.json(users);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
};

const uploadAvatar = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.avatar =
      `/uploads/avatars/${req.file.filename}`;

    await user.save();

    res.json({
      avatar: user.avatar
    });

  } catch (err) {

    console.error(
      "Avatar upload error:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};


const updateEducation = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const index = parseInt(req.params.index);

    const { field, value } = req.body;

    if (!user.education[index]) {
      return res.status(404).json({
        message: "Education not found"
      });
    }

    user.education[index][field] = value;

    await user.save();

    res.json(user.education);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

const deleteEducation = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.education.splice(req.params.index, 1);

    await user.save();

    res.json(user.education);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


const updateProject = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    const index = parseInt(req.params.index);

    const { field, value } = req.body;

    if (!user.projects[index]) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    user.projects[index][field] = value;

    await user.save();

    res.json(user.projects);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

const deleteProject = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    user.projects.splice(req.params.index, 1);

    await user.save();

    res.json(user.projects);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


const updateCertificate = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    const index = parseInt(req.params.index);

    const { field, value } = req.body;

    if (!user.certificates[index]) {
      return res.status(404).json({
        message: "Certificate not found"
      });
    }

    user.certificates[index][field] = value;

    await user.save();

    res.json(user.certificates);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

const deleteCertificate = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    user.certificates.splice(req.params.index, 1);

    await user.save();

    res.json(user.certificates);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


const updateSkill = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    const index = parseInt(req.params.index);

    const { value } = req.body;

    if (!user.skills[index]) {
      return res.status(404).json({
        message: "Skill not found"
      });
    }

    user.skills[index].name = value;

    await user.save();

    res.json(user.skills);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

const deleteSkill = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.skills.splice(req.params.index, 1);
    await user.save();
    res.json(user.skills);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });

  }

};


module.exports = {
 trackProfileView,
 getMe,
 updateProfile,
 getUser,
 followUser,
 connectUser,
 getSuggestions,
 getProfileVisitors,
 getUserStats,
 addEducation,
 addProject,
 addCertificate,
 addSkill,
 uploadResume,
 getAllUsers,
 uploadCover,
  updateEducation,
  deleteEducation,
  updateProject,
  deleteProject,
  updateCertificate,
  deleteCertificate,
  updateSkill,
  deleteSkill,
  viewProfile,
  uploadAvatar
};