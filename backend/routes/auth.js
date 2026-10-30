import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { buildErrorDetail, sendErrorResponse } from '../utils/http.js';
import { toUserDto } from '../utils/dto.js';
import { User } from '../models/user.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL || 3600);
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy_password_for_timing_safety', 10);

router.post('/auth/tokens', async (req, res) => {
    const { grantType, email, password } = req.body || {};
    const details = [];
    if (grantType !== 'password') details.push(buildErrorDetail('grantType', 'UNSUPPORTED', "grantType phải là 'password'."));
    if (!email) details.push(buildErrorDetail('email', 'REQUIRED', 'Thiếu email.'));
    if (!password) details.push(buildErrorDetail('password', 'REQUIRED', 'Thiếu mật khẩu.'));
    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    const user = await User.findOne({
        email: String(email).trim().toLowerCase(),
        status: { $ne: 'deleted' },
    }).select('+passwordHash');

    const isPasswordValid = await bcrypt.compare(String(password), user ? user.passwordHash : DUMMY_PASSWORD_HASH);
    if (!user || !isPasswordValid) {
        return sendErrorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    }

    if (user.status === 'locked') {
        return sendErrorResponse(res, 403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
    res.set('Cache-Control', 'no-store');
    res.json({ tokenType: 'Bearer', accessToken, expiresIn: ACCESS_TTL });
});

router.get('/me', requireAuth, (req, res) => {
    res.json({
        ...toUserDto(req.user),
        permissions: [...req.permissions].sort(),
    });
});

export default router;
