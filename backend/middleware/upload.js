const multer = require("multer");
const path = require("path");
const fs = require("fs");

// On Render, set UPLOAD_DIR=/var/data/uploads and attach a persistent disk
// mounted at /var/data. Locally, files remain in backend/uploads.
const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, "../uploads")
);

const avatarDir = path.join(uploadRoot, "avatars");
const coverDir = path.join(uploadRoot, "covers");
const resumeDir = path.join(uploadRoot, "resumes");
const postDir = path.join(uploadRoot, "posts");
const voiceDir = path.join(uploadRoot, "voices");
const logoDir = path.join(uploadRoot, "logos");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

[avatarDir, coverDir, resumeDir, postDir, voiceDir, logoDir].forEach(ensureDir);

const generateName = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed"));
};

function makeImageUpload(dir, sizeMB = 5) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) => cb(null, generateName(file))
    }),
    fileFilter: imageFilter,
    limits: { fileSize: sizeMB * 1024 * 1024 }
  });
}

const avatarUpload = makeImageUpload(avatarDir);
const coverUpload = makeImageUpload(coverDir);
const logoUpload = makeImageUpload(logoDir, 2);
const postUpload = makeImageUpload(postDir);

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumeDir),
    filename: (req, file, cb) => cb(null, generateName(file))
  }),
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only PDF/DOC/DOCX files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const voiceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, voiceDir),
    filename: (req, file, cb) => cb(null, generateName(file))
  }),
  fileFilter: (req, file, cb) => {
    file.mimetype && file.mimetype.startsWith("audio/")
      ? cb(null, true)
      : cb(new Error("Only audio files are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = {
  avatarUpload,
  coverUpload,
  logoUpload,
  resumeUpload,
  postUpload,
  voiceUpload
};
