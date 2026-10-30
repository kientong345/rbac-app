import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    buildErrorDetail,
    buildPaginationMeta,
    escapeRegex,
    isValidObjectId,
    parsePagination,
    parseSortQuery,
    sendErrorResponse,
    validateAllowedFields,
} from '../utils/http.js';
import { toRoleSummaryDto, toUserDto } from '../utils/dto.js';
import { User } from '../models/user.js';
import { Role } from '../models/role.js';
import { loadUser, loadRole } from '../middleware/preload.js';
import { getMissingPermissions, isLastSuperAdmin } from '../utils/rbac.js';

const router = express.Router();
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

router.use(requireAuth);

const isSelfTarget = (req) => req.targetUser._id.equals(req.user._id);

const forbidSelfAction = (req, res, message) =>
    isSelfTarget(req) ? sendErrorResponse(res, 403, 'SELF_ACTION_FORBIDDEN', message) : null;

const forbidEscalation = (req, res, requiredCodes) => {
    const missing = getMissingPermissions(requiredCodes, req.permissions);
    return missing.length
        ? sendErrorResponse(res, 403, 'PRIVILEGE_ESCALATION', `Vượt quyền của bạn (thiếu: ${missing.join(', ')}).`)
        : null;
};

router.get('/', requirePermission('users:read'), async (req, res) => {
    const q = req.query;
    const details = [];
    const { page, limit } = parsePagination(q, details);
    const sort = parseSortQuery(q.sort || '-createdAt', ['fullName', 'email', 'createdAt', 'lastLoginAt'], details);
    if (q.status && !['active', 'locked'].includes(q.status))
        details.push(buildErrorDetail('status', 'INVALID_VALUE', 'status phải là active hoặc locked.'));
    if (q.roleId && !isValidObjectId(q.roleId))
        details.push(buildErrorDetail('roleId', 'INVALID_VALUE', 'roleId không phải ObjectId hợp lệ.'));
    if (q.q !== undefined && String(q.q).trim().length < 2)
        details.push(buildErrorDetail('q', 'INVALID_VALUE', 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.'));

    if (details.length) return sendErrorResponse(res, 400, 'INVALID_QUERY_PARAMETER', 'Tham số truy vấn không hợp lệ.', details);

    const filter = { status: q.status || { $ne: 'deleted' } };
    if (q.roleId) filter.roles = q.roleId;
    if (q.q) {
        const re = { $regex: escapeRegex(String(q.q).trim()), $options: 'i' };
        filter.$or = [{ fullName: re }, { email: re }];
    }

    const [items, totalItems] = await Promise.all([
        User.find(filter)
            .sort({ ...sort, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('roles'),
        User.countDocuments(filter),
    ]);
    res.json({
        data: items.map(toUserDto),
        meta: buildPaginationMeta(page, limit, totalItems),
    });
});

router.post('/', requirePermission('users:create'), async (req, res) => {
    const body = req.body || {};
    const details = validateAllowedFields(body, ['email', 'fullName', 'phone', 'password', 'roleIds']);
    if (!body.password) details.push(buildErrorDetail('password', 'REQUIRED', 'Mật khẩu không được để trống.'));
    else if (!PASSWORD_RE.test(body.password))
        details.push(buildErrorDetail('password', 'WEAK_PASSWORD', 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.'));
    if (body.roleIds !== undefined && (!Array.isArray(body.roleIds) || !body.roleIds.every(isValidObjectId))) {
        details.push(buildErrorDetail('roleIds', 'INVALID_VALUE', 'roleIds phải là mảng ObjectId hợp lệ.'));
    }

    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    let assignedRoles = [];
    const roleIds = [...new Set(body.roleIds || [])];
    if (roleIds.length) {
        if (!req.permissions.has('roles:assign'))
            return sendErrorResponse(res, 403, 'FORBIDDEN', 'Gán role khi tạo người dùng cần quyền roles:assign.');
        assignedRoles = await Role.find({ _id: { $in: roleIds } });
        if (assignedRoles.length !== roleIds.length)
            return sendErrorResponse(res, 400, 'ROLE_NOT_FOUND', 'Có role không tồn tại trong roleIds.');

        if (forbidEscalation(req, res, assignedRoles.flatMap((r) => r.permissions))) return;
    } else {
        assignedRoles = await Role.find({ code: 'member' });
    }

    const user = await User.create({
        email: body.email,
        fullName: body.fullName,
        phone: body.phone ?? null,
        passwordHash: await bcrypt.hash(body.password, 10),
        roles: assignedRoles.map((r) => r._id),
    });

    await user.populate('roles');
    res.status(201).location(`${req.baseUrl}/${user._id}`).json(toUserDto(user));
});

router.get('/:userId', requirePermission('users:read'), loadUser, (req, res) => {
    res.json(toUserDto(req.targetUser));
});

router.patch('/:userId', requirePermission('users:update'), loadUser, async (req, res) => {
    const body = req.body || {};
    const details = validateAllowedFields(body, ['fullName', 'phone', 'email', 'status']);
    if ('status' in body && !['active', 'locked'].includes(body.status))
        details.push(buildErrorDetail('status', 'INVALID_VALUE', 'status chỉ nhận active hoặc locked.'));
    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    const targetUser = req.targetUser;
    if (body.status === 'locked') {
        if (forbidSelfAction(req, res, 'Không thể tự khóa tài khoản của chính mình.')) return;
        if (targetUser.status === 'active' && (await isLastSuperAdmin(targetUser)))
            return sendErrorResponse(res, 409, 'LAST_SUPER_ADMIN', 'Không thể khóa super-admin đang hoạt động cuối cùng.');
    }

    for (const field of ['fullName', 'phone', 'email', 'status']) {
        if (field in body) targetUser[field] = body[field];
    }
    await targetUser.save();
    res.json(toUserDto(targetUser));
});

router.delete('/:userId', requirePermission('users:delete'), loadUser, async (req, res) => {
    if (forbidSelfAction(req, res, 'Không thể tự xóa tài khoản của chính mình.')) return;
    if (await isLastSuperAdmin(req.targetUser))
        return sendErrorResponse(res, 409, 'LAST_SUPER_ADMIN', 'Không thể xóa super-admin đang hoạt động cuối cùng.');

    req.targetUser.status = 'deleted';
    await req.targetUser.save();
    res.status(204).end();
});

router.get('/:userId/roles', requirePermission('users:read'), loadUser, (req, res) => {
    const data = (req.targetUser.roles || []).filter((r) => r && r.code).map(toRoleSummaryDto);
    res.json({ data, meta: { totalItems: data.length } });
});

router.put('/:userId/roles/:roleId', requirePermission('roles:assign'), loadUser, loadRole, async (req, res) => {
    if (forbidEscalation(req, res, req.targetRole.permissions)) return;
    await User.updateOne({ _id: req.targetUser._id }, { $addToSet: { roles: req.targetRole._id } });
    res.status(204).end();
});

router.delete('/:userId/roles/:roleId', requirePermission('roles:assign'), loadUser, loadRole, async (req, res) => {
    if (forbidSelfAction(req, res, 'Không thể tự gỡ vai trò của chính mình.')) return;
    if (forbidEscalation(req, res, req.targetRole.permissions)) return;
    if (req.targetRole.code === 'super-admin' && (await isLastSuperAdmin(req.targetUser)))
        return sendErrorResponse(res, 409, 'LAST_SUPER_ADMIN', 'Không thể gỡ vai trò super-admin khỏi super-admin cuối cùng.');

    await User.updateOne({ _id: req.targetUser._id }, { $pull: { roles: req.targetRole._id } });
    res.status(204).end();
});

export default router;
