export const toRoleSummaryDto = (role) => ({
    id: String(role._id),
    code: role.code,
    name: role.name,
});

export function toUserDto(user) {
    return {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        roles: (user.roles || []).filter((r) => r && r.code).map(toRoleSummaryDto),
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export function toRoleDto(role, userCount = 0) {
    return {
        id: String(role._id),
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: [...role.permissions],
        userCount,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
    };
}
