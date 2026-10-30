import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Permission } from './models/permission.js';
import { Role } from './models/role.js';
import { User } from './models/user.js';

const PERMISSIONS = [
    ['users:read', 'Xem danh sách và chi tiết người dùng'],
    ['users:create', 'Tạo người dùng'],
    ['users:update', 'Sửa thông tin, khóa/mở khóa người dùng'],
    ['users:delete', 'Xóa người dùng'],
    ['roles:read', 'Xem role và quyền của role'],
    ['roles:create', 'Tạo role'],
    ['roles:update', 'Sửa role, thay bộ quyền của role'],
    ['roles:delete', 'Xóa role'],
    ['roles:assign', 'Gán / gỡ role cho người dùng'],
    ['permissions:read', 'Xem danh mục quyền'],
].map(([code, description]) => ({
    code,
    resource: code.split(':')[0],
    action: code.split(':')[1],
    description,
}));

const ROLES = [
    {
        code: 'super-admin',
        name: 'Quản trị viên tối cao',
        isSystem: true,
        permissions: PERMISSIONS.map((p) => p.code),
    },
    {
        code: 'user-manager',
        name: 'Quản lý người dùng',
        isSystem: true,
        permissions: ['users:read', 'users:create', 'users:update', 'roles:read', 'roles:assign', 'permissions:read'],
    },
    {
        code: 'auditor',
        name: 'Kiểm toán viên',
        isSystem: true,
        permissions: ['users:read', 'roles:read', 'permissions:read'],
    },
    {
        code: 'member',
        name: 'Thành viên',
        isSystem: true,
        permissions: [],
    },
    {
        code: 'shift-leader',
        name: 'Trưởng ca DevCafe',
        isSystem: false,
        permissions: ['users:read', 'users:update', 'roles:read'],
    },
];

// Lưu ý: Đổi dòng đầu tiên thành MSSV và Họ tên thật của bạn
const USERS = [
    {
        email: '20225000@sis.hust.edu.vn',
        fullName: 'Nguyễn Văn Quản Trị',
        phone: '+84901234567',
        password: 'Admin@2026',
        roles: ['super-admin'],
    },
    {
        email: '20225001@sis.hust.edu.vn',
        fullName: 'Trần Thị Quản Lý',
        phone: '+84901234568',
        password: 'Admin@2026',
        roles: ['user-manager'],
    },
    {
        email: '20225002@sis.hust.edu.vn',
        fullName: 'Lê Văn Kiểm Toán',
        phone: '+84901234569',
        password: 'Admin@2026',
        roles: ['auditor'],
    },
    {
        email: '20225003@sis.hust.edu.vn',
        fullName: 'Phạm Minh Trưởng Ca',
        phone: '+84901234570',
        password: 'Admin@2026',
        roles: ['shift-leader'],
    },
    {
        email: '20225005@sis.hust.edu.vn',
        fullName: 'Vũ Đức Thành Viên',
        phone: '+84901234572',
        password: 'Admin@2026',
        roles: ['member'],
    },
];

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all([Permission.deleteMany({}), Role.deleteMany({}), User.deleteMany({})]);
    await Promise.all([Permission.init(), Role.init(), User.init()]); // tạo unique index
    await Permission.insertMany(PERMISSIONS);
    const roles = await Role.insertMany(ROLES);
    const roleId = Object.fromEntries(roles.map((r) => [r.code, r._id]));
    for (const u of USERS) {
        await User.create({
            email: u.email,
            fullName: u.fullName,
            phone: u.phone ?? null,
            passwordHash: await bcrypt.hash(u.password, 10),
            roles: u.roles.map((code) => roleId[code]),
        });
    }
    console.log(`Đã tạo ${PERMISSIONS.length} quyền, ${roles.length} role, ${USERS.length} người dùng.`);
    await mongoose.disconnect();
})();
