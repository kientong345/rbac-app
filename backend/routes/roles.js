import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { User } from '../models/user.js';
import { loadRole } from '../middleware/preload.js';
import {
    buildErrorDetail,
    buildPaginationMeta,
    escapeRegex,
    parsePagination,
    parseSortQuery,
    sendErrorResponse,
    validateAllowedFields,
} from '../utils/http.js';
import { toRoleDto } from '../utils/dto.js';
import { Role } from '../models/role.js';
import { Permission } from '../models/permission.js';
import { getMissingPermissions } from '../utils/rbac.js';

const router = express.Router();
router.use(requireAuth);

const countAssignedUsers = (roleId) => User.countDocuments({ roles: roleId, status: { $ne: 'deleted' } });

async function countAssignedUsersByRoleIds(roleIds) {
    if (!roleIds.length) return new Map();
    const rows = await User.aggregate([
        { $match: { status: { $ne: 'deleted' }, roles: { $in: roleIds } } },
        { $unwind: '$roles' },
        { $match: { roles: { $in: roleIds } } },
        { $group: { _id: '$roles', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.count]));
}

const forbidEscalation = (req, res, requiredCodes, actionMsg) => {
    const missing = getMissingPermissions(requiredCodes, req.permissions);
    return missing.length ? sendErrorResponse(res, 403, 'PRIVILEGE_ESCALATION', `${actionMsg}: ${missing.join(', ')}.`) : null;
};

async function rejectInvalidPermissions(res, permissionCodes) {
    if (!Array.isArray(permissionCodes) || !permissionCodes.every((p) => typeof p === 'string')) {
        return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', [
            buildErrorDetail('permissions', 'INVALID_TYPE', 'permissions phải là mảng mã quyền.'),
        ]);
    }
    const uniqueCodes = [...new Set(permissionCodes)];
    const existingDocs = await Permission.find({ code: { $in: uniqueCodes } }).select('code').lean();
    const knownSet = new Set(existingDocs.map((p) => p.code));
    const unknownCodes = uniqueCodes.filter((code) => !knownSet.has(code));
    if (unknownCodes.length) {
        return sendErrorResponse(
            res,
            400,
            'PERMISSION_NOT_FOUND',
            'Có mã quyền không tồn tại trong danh mục.',
            unknownCodes.map((code) => buildErrorDetail('permissions', 'NOT_FOUND', `Quyền '${code}' không tồn tại.`))
        );
    }
    return null;
}

router.get('/', requirePermission('roles:read'), async (req, res) => {
    const q = req.query;
    const details = [];
    const { page, limit } = parsePagination(q, details);
    const sort = parseSortQuery(q.sort || 'name', ['name', 'code', 'createdAt'], details);
    if (q.q !== undefined && String(q.q).trim().length < 2)
        details.push(buildErrorDetail('q', 'INVALID_VALUE', 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.'));
    if (details.length) return sendErrorResponse(res, 400, 'INVALID_QUERY_PARAMETER', 'Tham số truy vấn không hợp lệ.', details);

    const filter = {};
    if (q.q) {
        const re = { $regex: escapeRegex(String(q.q).trim()), $options: 'i' };
        filter.$or = [{ name: re }, { code: re }];
    }

    const [items, totalItems] = await Promise.all([
        Role.find(filter)
            .sort({ ...sort, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Role.countDocuments(filter),
    ]);
    const userCountMap = await countAssignedUsersByRoleIds(items.map((r) => r._id));
    res.json({
        data: items.map((r) => toRoleDto(r, userCountMap.get(String(r._id)) || 0)),
        meta: buildPaginationMeta(page, limit, totalItems),
    });
});

router.post('/', requirePermission('roles:create'), async (req, res) => {
    const body = req.body || {};
    const details = validateAllowedFields(body, ['code', 'name', 'description', 'permissions']);
    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    const permissionCodes = body.permissions === undefined ? [] : body.permissions;
    if (await rejectInvalidPermissions(res, permissionCodes)) return;
    if (forbidEscalation(req, res, permissionCodes, 'Không thể cấp quyền mà bạn không có')) return;

    const role = await Role.create({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        isSystem: false,
        permissions: [...new Set(permissionCodes)],
    });
    res.status(201).location(`${req.baseUrl}/${role._id}`).json(toRoleDto(role, 0));
});

router.get('/:roleId', requirePermission('roles:read'), loadRole, async (req, res) => {
    res.json(toRoleDto(req.targetRole, await countAssignedUsers(req.targetRole._id)));
});

router.patch('/:roleId', requirePermission('roles:update'), loadRole, async (req, res) => {
    const body = req.body || {};
    const details = validateAllowedFields(body, ['name', 'description']);
    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    if ('name' in body) req.targetRole.name = body.name;
    if ('description' in body) req.targetRole.description = body.description ?? null;
    await req.targetRole.save();
    res.json(toRoleDto(req.targetRole, await countAssignedUsers(req.targetRole._id)));
});

router.delete('/:roleId', requirePermission('roles:delete'), loadRole, async (req, res) => {
    if (req.targetRole.isSystem) return sendErrorResponse(res, 409, 'SYSTEM_ROLE_PROTECTED', 'Không thể xóa vai trò hệ thống.');
    if ((await countAssignedUsers(req.targetRole._id)) > 0)
        return sendErrorResponse(res, 409, 'ROLE_IN_USE', 'Không thể xóa vai trò đang được gán cho người dùng.');

    await req.targetRole.deleteOne();
    res.status(204).end();
});

router.get('/:roleId/permissions', requirePermission('roles:read'), loadRole, async (req, res) => {
    const data = await Permission.find({ code: { $in: req.targetRole.permissions } })
        .select('-_id code resource action description')
        .sort({ resource: 1, code: 1 })
        .lean();
    res.json({ data, meta: { totalItems: data.length } });
});

router.put('/:roleId/permissions', requirePermission('roles:update'), loadRole, async (req, res) => {
    const body = req.body || {};
    const details = validateAllowedFields(body, ['permissions']);
    if (details.length) return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);

    if (await rejectInvalidPermissions(res, body.permissions)) return;
    if (req.targetRole.isSystem)
        return sendErrorResponse(res, 409, 'SYSTEM_ROLE_PROTECTED', 'Không thể thay đổi bộ quyền của vai trò hệ thống.');

    const nextPermissions = [...new Set(body.permissions)];
    const diffPermissions = [...new Set(req.targetRole.permissions).symmetricDifference(new Set(nextPermissions))];
    if (forbidEscalation(req, res, diffPermissions, 'Không thể thêm/bớt quyền mà bạn không có')) return;

    req.targetRole.permissions = nextPermissions;
    await req.targetRole.save();
    res.json(toRoleDto(req.targetRole, await countAssignedUsers(req.targetRole._id)));
});

export default router;
