import { Router } from 'express';
import { z } from 'zod';
import { prep } from '../db/database.pool';
import { validate } from '../middleware';
import { asyncHandler, ok } from '../utils/helpers';

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(5, 'Feedback must be at least 5 characters').max(500),
  examDetails: z.string().trim().max(120).optional().or(z.literal('')),
});

function mapTestimonial(row: any) {
  return {
    id: row.id,
    name: row.name,
    rating: Number(row.rating),
    feedback: row.feedback,
    examDetails: row.exam_details || null,
    status: row.status,
    createdAt: row.created_at,
  };
}

router.get('/', asyncHandler(async (_req, res) => {
  const rows = await prep(
    `SELECT id, name, rating, feedback, exam_details, status, created_at
     FROM testimonials
     WHERE status = 'approved'
     ORDER BY created_at DESC`
  ).all();

  ok(res, { testimonials: rows.map(mapTestimonial) });
}));

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { name, rating, feedback, examDetails } = req.body;
    const info = await prep(
      `INSERT INTO testimonials (name, rating, feedback, exam_details, status)
       VALUES (?, ?, ?, ?, 'approved')`
    ).run(name.trim(), Number(rating), feedback.trim(), examDetails?.trim() || null);

    const row = await prep(
      `SELECT id, name, rating, feedback, exam_details, status, created_at
       FROM testimonials
       WHERE id = ?`
    ).get(info.lastInsertRowid || (info.insertId ?? 0));

    ok(res, { testimonial: mapTestimonial(row) }, 201);
  })
);

export default router;

