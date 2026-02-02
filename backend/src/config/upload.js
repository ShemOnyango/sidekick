const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('./logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create agency-specific folder
    const agencyId = req.user?.Agency_ID || 'unknown';
    const agencyDir = path.join(uploadDir, `agency-${agencyId}`);
    
    if (!fs.existsSync(agencyDir)) {
      fs.mkdirSync(agencyDir, { recursive: true });
    }
    
    // Create date-based folder
    const today = new Date();
    const dateDir = path.join(agencyDir, today.toISOString().split('T')[0]);
    
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
    
    cb(null, dateDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `pin-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  
  // Check MIME type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    files: 1 // Only one file at a time
  }
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed.'
      });
    }
  }
  
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only image files (jpg, jpeg, png, gif, webp) are allowed.'
    });
  }
  
  logger.error('File upload error:', err);
  res.status(500).json({
    success: false,
    error: 'File upload failed'
  });
};

// Helper function to get public URL
const getPublicUrl = (filePath) => {
  if (!filePath) {return null;}
  
  const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
  return `/uploads${relativePath}`;
};

module.exports = {
  upload,
  handleUploadError,
  getPublicUrl
};