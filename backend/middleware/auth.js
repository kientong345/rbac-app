import jwt from 'jsonwebtoken';
import { sendErrorResponse } from '../utils/http.js';
import { User } from '../models/user.js';

export async function requireAuth(req, res, next) {
    const match = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
    if (!match) return sendErrorResponse(res, 401, 'UNAUTHENTICATED', 'Thiếu access token. Gửi header Authorization: Bearer <token>.');

    let payload;
    try {
        payload = jwt.verify(match[1], process.env.JWT_SECRET);
    } catch (err) {
        return err.name === 'TokenExpiredError'
            ? sendErrorResponse(res, 401, 'TOKEN_EXPIRED', 'Access token đã hết hạn. Vui lòng đăng nhập lại.')
            : sendErrorResponse(res, 401, 'INVALID_TOKEN', 'Access token không hợp lệ.');
    }

    const user = await User.findById(payload.sub).populate('roles');
    if (!user || user.status !== 'active') return sendErrorResponse(res, 401, 'INVALID_TOKEN', 'Phiên đăng nhập không còn hiệu lực.');
    req.user = user;
    req.permissions = new Set(user.roles.flatMap((r) => r.permissions));
    next();
}

export function requirePermission(...codes) {
    return (req, res, next) => {
        const missing = codes.filter((c) => !req.permissions.has(c));
        if (missing.length)
            return sendErrorResponse(res, 403, 'FORBIDDEN', `Bạn không có quyền thực hiện thao tác này (cần: ${missing.join(', ')}).`);
        next();
    };
}
