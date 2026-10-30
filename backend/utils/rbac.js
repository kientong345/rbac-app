import { Role } from '../models/role.js';
import { User } from '../models/user.js';

export function getMissingPermissions(requiredCodes = [], grantedPermissions = []) {
    const grantedSet = grantedPermissions instanceof Set ? grantedPermissions : new Set(grantedPermissions);
    return [...new Set(requiredCodes)].filter((code) => !grantedSet.has(code));
}

export async function isLastSuperAdmin(targetUser) {
    const superAdminRole = await Role.findOne({ code: 'super-admin' }).select('_id').lean();
    if (!superAdminRole || !targetUser.roles.some((r) => String(r._id || r) === String(superAdminRole._id))) {
        return false;
    }
    const otherActiveCount = await User.countDocuments({
        _id: { $ne: targetUser._id },
        status: 'active',
        roles: superAdminRole._id,
    });
    return otherActiveCount === 0;
}
