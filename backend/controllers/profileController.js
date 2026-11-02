const User = require("../models/User");
const notify = require("../utils/notify");

const viewProfile = async (req, res) => {
  try {

    const profileUser = await User.findById(req.params.id);

    if (!profileUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      req.user &&
      req.user.role === "recruiter" &&
      profileUser._id.toString() !== req.user.id
    ) {
      await notify(req, {
        recipient: profileUser._id,
        sender: req.user.id,
        type: "profile_view",
        message: "viewed your profile",
        link: `/user/profile.html?id=${req.user.id}`
      });
    }

    res.json(profileUser);

  } catch (err) {
    console.error("VIEW PROFILE ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  viewProfile
};