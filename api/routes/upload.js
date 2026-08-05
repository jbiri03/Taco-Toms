import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// Multer now stores the uploaded file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function uploadToR2(file) {
  const ext = file.originalname.split('.').pop() || 'jpg';
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
}

// TEST routes
router.get('/test', (req, res) => {
  res.json({ message: 'Upload router GET is mounted and working' });
});

router.post('/test', (req, res) => {
  console.log('POST /upload/test route hit');
  res.json({ message: 'Upload POST test works' });
});

// Real photo route
router.post('/photo', upload.single('photo'), async (req, res) => {
  console.log('Upload route hit, file:', req.file);
  console.log('file:', req.file);
  console.log('body:', req.body);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const photoUrl = await uploadToR2(req.file);

    res.json({
      message: 'Photo uploaded successfully',
      filePath: photoUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

export default router;