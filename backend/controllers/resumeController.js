const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const Comment = require("../models/comment");
const openai = require("../config/openai");

const generateAIAnalysis = async (resume) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    const skills = Array.isArray(resume.skills)
      ? resume.skills.join(", ")
      : resume.skills || "";

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Analyze this resume.

Return ONLY valid JSON:

{
  "summary": "Professional summary",
  "atsScore": 85,
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
}

Name: ${resume.name || ""}
Title: ${resume.title || ""}
Skills: ${skills}
Experience:${JSON.stringify(resume.experience || [],null,2)}
Education:${JSON.stringify( resume.education || [], null, 2)}
Projects:${JSON.stringify( resume.projects || [], null,2)}
Certifications:${JSON.stringify(resume.certifications || [],null,2)}
Summary: ${resume.summary || ""}
`
    });

    const text = response.output_text || "{}";

    try {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleaned);

      return {
        summary: result.summary || "",
        atsScore: Math.min(
          100,
          Math.max(
            0,
            Number(result.atsScore) || 0
          )
        ),
        suggestions: Array.isArray(result.suggestions)
          ? result.suggestions
          : []
      };

    } catch (parseError) {
      console.error(
        "JSON Parse Error:",
        parseError
      );

      return null;
    }

  } catch (err) {
    if (err.status === 401) {
      console.warn("⚠ OpenAI authentication failed: Invalid or missing API key.");
    } else {
      console.error(
        "AI Analysis Error:",
        err.message || err
      );
    }

    return null;
  }
};

const createResume = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = req.user._id;
    let resume = await Resume.findOne({ user: userId });
    const isNewResume = !resume;

    if (resume) {
      // Save the previous version before updating.
      resume.versions.push({
        name: resume.name,
        title: resume.title,
        summary: resume.summary,
        aiSummary: resume.aiSummary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        projects: resume.projects,
        certifications: resume.certifications,
        atsScore: resume.atsScore,
        createdAt: new Date()
      });

      if (resume.versions.length > 20) {
        resume.versions.shift();
      }

      const allowedFields = [
        "name",
        "title",
        "email",
        "phone",
        "location",
        "linkedin",
        "github",
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
        "certifications",
        "isPublic"
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          resume[field] = req.body[field];
        }
      });

      await resume.save();
    } else {
      const allowedFields = [
        "name",
        "title",
        "email",
        "phone",
        "location",
        "linkedin",
        "github",
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
        "certifications",
        "isPublic"
      ];

      const resumeData = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          resumeData[field] = req.body[field];
        }
      });

      resume = await Resume.create({
        ...resumeData,
        user: userId
      });
    }

    // Generate AI analysis when an API key is configured.
    if (process.env.OPENAI_API_KEY) {
      const aiResult = await generateAIAnalysis(resume);

      if (aiResult) {
        resume.aiSummary = aiResult.summary || "";
        resume.atsScore = Number(aiResult.atsScore) || 0;
        resume.aiSuggestions = Array.isArray(aiResult.suggestions)
          ? aiResult.suggestions
          : [];

        await resume.save();
      }
    }

    return res.status(isNewResume ? 201 : 200).json({
      success: true,
      message: isNewResume
        ? "Resume created successfully"
        : "Resume updated successfully",
      data: resume
    });

  } catch (err) {
    console.error("Create/Update Resume Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to save resume",
      error: err.message
    });
  }
};


const getResume = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    const resume = await Resume.findById(id).populate("user", "name email");

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    if ( resume.user._id.toString() !==req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    res.json({
      success: true,
      data: resume
    });

  } catch (err) {
    console.error("Get Resume Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch resume"
    });
  }
};

const updateResume = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    const existingResume = await Resume.findById(id);

    if (!existingResume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    if (existingResume.user.toString() !==req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    existingResume.versions.push({
  name: existingResume.name,
  title: existingResume.title,
  summary: existingResume.summary,
  aiSummary: existingResume.aiSummary,
  skills: existingResume.skills,
  experience: existingResume.experience,
  education: existingResume.education,
  projects: existingResume.projects,
  certifications: existingResume.certifications,
  atsScore: existingResume.atsScore,
  createdAt: new Date()
});

    if (existingResume.versions.length > 20) {
      existingResume.versions.shift();
    }

    await existingResume.save();
    const allowedFields = [
  "name",
  "title",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications"
];

const updates = {};

allowedFields.forEach(field => {
  if (req.body[field] !== undefined) {
    updates[field] = req.body[field];
  }
});
    const updatedResume = await Resume.findByIdAndUpdate( id,{$set: updates}, { new: true, runValidators: true});

    const shouldRegenerate = ["name","title","skills","summary","experience","education","projects","certifications"
    ].some(field => updates[field] !== undefined);

    if (shouldRegenerate &&process.env.OPENAI_API_KEY) {
      const aiResult = await generateAIAnalysis(updatedResume);

      if (aiResult) {
        updatedResume.aiSummary =aiResult.summary || "";
        updatedResume.atsScore =Number(aiResult.atsScore) || 0;
        updatedResume.aiSuggestions =Array.isArray(aiResult.suggestions)? aiResult.suggestions: [];
        await updatedResume.save();
      }
    }

    res.json({
      success: true,
      data: updatedResume
    });

  } catch (err) {
    console.error("Update Resume Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: err.message
    });
  }
};

const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    const existingResume = await Resume.findById(id);

    if (!existingResume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    // Ownership check
    if (
      existingResume.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await Resume.findByIdAndDelete(id);
    await Comment.deleteMany({
      resume: id
    });

    res.json({
      success: true,
      message: "Resume deleted successfully"
    });

  } catch (err) {
    console.error("Delete Resume Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete resume",
      error: err.message
    });
  }
};

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (
      !allowedTypes.includes(
        req.file.mimetype
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only PDF and DOC/DOCX files are allowed"
      });
    }

    const filePath =`/uploads/resumes/${req.file.filename}`;

    if (req.body.resumeId) {
  const resume = await Resume.findById(
    req.body.resumeId
  );

  if (!resume) {
    return res.status(404).json({
      success: false,
      message: "Resume not found"
    });
  }

  if (resume.user.toString() !==req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized"
    });
  }

  resume.resumeFile = filePath;
  await resume.save();
}

    res.json({
      success: true,
      message:"Resume uploaded successfully",
      fileName:req.file.filename,
      originalName:req.file.originalname,
      size:req.file.size,
      path: filePath
    });

  } catch (err) {
    console.error("Upload Resume Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to upload resume"
    });
  }
};

const getPublicResume = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    const resume = await Resume.findById(id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    if (!resume.isPublic) {
      return res.status(403).json({
        success: false,
        message:
          "This resume is private"
      });
    }

    res.json({
      success: true,
      data: resume
    });

  } catch (err) {
    console.error("Public Resume Error:", err);

    res.status(500).json({
      success: false,
      message:
        "Failed to load resume"
    });
  }
};

const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    const comments =await Comment.find({resume: id}).sort({createdAt: -1});

    res.json({
      success: true,
      count: comments.length,
      data: comments
    });

  } catch (err) {
    console.error("Get Comments Error:", err);

    res.status(500).json({
      success: false,
      message:
        "Failed to load comments"
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Resume ID"
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Comment text is required"
      });
    }

    const resume =await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message:
          "Resume not found"
      });
    }

    const comment =await Comment.create({
        resume: id,
        name:name?.trim() || "Anonymous",
        text:text.trim()
      });

    res.status(201).json({
      success: true,
      data: comment
    });

  } catch (err) {
    console.error("Add Comment Error:", err);

    res.status(500).json({
      success: false,
      message:
        "Failed to add comment"
    });
  }
};

module.exports = {
  createResume,
  getResume,
  updateResume,
  deleteResume,
  uploadResume,
  getPublicResume,
  getComments,
  addComment
};