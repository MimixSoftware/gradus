const multer = require("multer");
const AppError = require("../utils/AppError");

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
	if (!file.mimetype.startsWith("image/")) {
		return cb(new AppError("Only image files are allowed.", 400));
	}

	cb(null, true);
}

const avatarUpload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 2 * 1024 * 1024
	}
});

module.exports = avatarUpload;