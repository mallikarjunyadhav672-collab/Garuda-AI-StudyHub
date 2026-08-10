import { Router } from 'express';
import authRoutes from './modules/auth';
import userRoutes from './modules/users';
import jobRoutes from './modules/jobs';
import materialRoutes from './modules/materials';
import mockRoutes from './modules/mocks';
import quizRoutes from './modules/quiz';
import affairRoutes from './modules/affairs';
import videoRoutes from './modules/videos';
import aiRoutes from './modules/ai';
import notificationRoutes from './modules/notifications';
import adminRoutes from './modules/admin';
import uploadRoutes from './modules/upload';
import contactRoutes from './modules/contact';
import testimonialRoutes from './modules/testimonials';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/materials', materialRoutes);
router.use('/mocks', mockRoutes);
router.use('/quiz', quizRoutes);
router.use('/affairs', affairRoutes);
router.use('/videos', videoRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/contact', contactRoutes);
router.use('/testimonials', testimonialRoutes);

export default router;
