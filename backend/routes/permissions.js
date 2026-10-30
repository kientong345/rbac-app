import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { Permission } from '../models/permission.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('permissions:read'), async (req, res) => {
    const filter = req.query.resource ? { resource: String(req.query.resource).trim() } : {};
    const data = await Permission.find(filter)
        .select('-_id code resource action description')
        .sort({ resource: 1, code: 1 })
        .lean();
    res.json({ data, meta: { totalItems: data.length } });
});

export default router;
