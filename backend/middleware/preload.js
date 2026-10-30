import { User } from '../models/user.js';
import { Role } from '../models/role.js';
import { isValidObjectId, sendErrorResponse } from '../utils/http.js';

export async function loadUser(req, res, next) {
    const { userId } = req.params;
    const user = isValidObjectId(userId) ? await User.findOne({ _id: userId, status: { $ne: 'deleted' } }).populate('roles') : null;
    if (!user) return sendErrorResponse(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
    req.targetUser = user;
    req.target = user;
    next();
}

export async function loadRole(req, res, next) {
    const { roleId } = req.params;
    const role = isValidObjectId(roleId) ? await Role.findById(roleId) : null;
    if (!role) return sendErrorResponse(res, 404, 'ROLE_NOT_FOUND', 'Không tìm thấy vai trò.');
    req.targetRole = role;
    req.role = role;
    next();
}
