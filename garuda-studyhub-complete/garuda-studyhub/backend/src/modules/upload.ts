import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  material: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'],
  notice: ['.pdf'],
  thumbnail: ['.jpg', '.jpeg', '.png', '.webp'],
};

function allowedExt(fileName: string, kind: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return (ALLOWED_TYPES[kind] || ALLOWED_TYPES.material).includes(ext);
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(UPLOAD_ROOT, _file.fieldname === 'avatar' ? 'avatars' : 'files');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB
});

// POST /api/upload?type=material|avatar|notice|thumbnail
router.post(
  '/',
  requireAuth,
  (req, _res, next) => {
    const kind = String(req.query.type || 'material');
    if (!ALLOWED_TYPES[kind]) return next(new ApiError(400, 'Invalid upload type', 'BAD_REQUEST'));
    next();
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No file provided (field name: file)', 'NO_FILE');
    const kind = String(req.query.type || 'material');
    if (!allowedExt(req.file.originalname, kind)) {
      fs.unlinkSync(req.file.path);
      throw new ApiError(400, `File type not allowed for ${kind}. Allowed: ${(ALLOWED_TYPES[kind] || []).join(', ')}`, 'BAD_FILE_TYPE');
    }
    const url = `/uploads/${req.file.fieldname === 'avatar' ? 'avatars' : 'files'}/${req.file.filename}`;
    ok(res, {
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 201);
  })
);

export default router;
