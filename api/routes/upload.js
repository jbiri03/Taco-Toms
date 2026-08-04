import express from 'express';
import multer from 'multer';

const router = express.Router();

// TEST routes
router.get('/test', (req, res) => {
  res.json({ message: 'Upload router GET is mounted and working' });
});

router.post('/test', (req, res) => {
  console.log('POST /upload/test route hit');
  res.json({ message: 'Upload POST test works' });
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/admin/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// Real photo route
router.post('/photo', upload.single('photo'), (req, res) => {
  console.log('Upload route hit, file:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'Photo uploaded successfully',
    filePath: 'admin/uploads/' + req.file.filename
  });
});

export default router;