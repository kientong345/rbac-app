# RBAC Backend

REST API cho hệ thống quản lý người dùng & phân quyền. Node.js (ES Modules) + Express 5 + Mongoose + JWT.

## Cài đặt & chạy

```bash
cp .env.example .env
npm install
npm run seed     # XÓA dữ liệu cũ, tạo lại quyền / vai trò / tài khoản mẫu
npm run dev      # nodemon, http://localhost:3001
# hoặc: npm start
```

### Biến môi trường (`.env`)

| Biến | Ví dụ | Ý nghĩa |
| :--- | :--- | :--- |
| `PORT` | `3001` | Cổng server |
| `MONGODB_URI` | `mongodb+srv://...` | Chuỗi kết nối MongoDB |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài | Khóa ký access token |
| `ACCESS_TOKEN_TTL` | `3600` | Thời hạn token (giây) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5500` | Danh sách origin được phép, phân tách bằng dấu phẩy |

## Cấu trúc

```text
server.js            Khởi tạo app, CORS, mount routes, 404 JSON, error handler tập trung
seed.js              Dữ liệu mẫu
models/              Permission, Role, User
middleware/
  auth.js            requireAuth (xác thực JWT, nạp quyền từ DB), requirePermission(...codes)
  preload.js         loadUser / loadRole → req.targetUser / req.targetRole, 404 nếu không có
routes/              auth, users, roles, permissions
utils/
  http.js            sendErrorResponse, validateAllowedFields, parsePagination, parseSortQuery...
  dto.js             toUserDto, toRoleDto, toRoleSummaryDto (ẩn passwordHash, _id → id)
  rbac.js            getMissingPermissions, isLastSuperAdmin
```

## API (`/api/v1`)

Mọi endpoint trừ `POST /auth/tokens` cần header `Authorization: Bearer <token>`.

| Method | Endpoint | Quyền | Ghi chú |
| :--- | :--- | :--- | :--- |
| POST | `/auth/tokens` | — | `{ grantType: "password", email, password }` → `{ tokenType, accessToken, expiresIn }` |
| GET | `/me` | đăng nhập | Thông tin bản thân + `permissions[]` |
| GET | `/users` | `users:read` | `page, limit (≤100), q (≥2 ký tự), status, roleId, sort` |
| POST | `/users` | `users:create` (+ `roles:assign` nếu gửi `roleIds`) | Mặc định gán `member`. `201` + `Location` |
| GET | `/users/:userId` | `users:read` | |
| PATCH | `/users/:userId` | `users:update` | Chỉ nhận `fullName, phone, email, status` |
| DELETE | `/users/:userId` | `users:delete` | Xóa mềm (`status = deleted`), `204` |
| GET | `/users/:userId/roles` | `users:read` | |
| PUT | `/users/:userId/roles/:roleId` | `roles:assign` | Idempotent, `204` |
| DELETE | `/users/:userId/roles/:roleId` | `roles:assign` | `204` |
| GET | `/roles` | `roles:read` | `page, limit, q, sort`; mỗi vai trò kèm `userCount` |
| POST | `/roles` | `roles:create` | `code, name, description, permissions`. `201` + `Location` |
| GET | `/roles/:roleId` | `roles:read` | |
| PATCH | `/roles/:roleId` | `roles:update` | Chỉ nhận `name, description` |
| DELETE | `/roles/:roleId` | `roles:delete` | `204` |
| GET | `/roles/:roleId/permissions` | `roles:read` | Danh sách object Permission |
| PUT | `/roles/:roleId/permissions` | `roles:update` | Thay toàn bộ bộ quyền |
| GET | `/permissions` | `permissions:read` | Lọc `resource` |

Danh sách trả về dạng `{ data: [...], meta: { page, limit, totalItems, totalPages } }`.

## Quy tắc nghiệp vụ chính

| Quy tắc | Mã lỗi |
| :--- | :--- |
| Không cấp / gán / gỡ quyền mà mình không có (chống leo thang) | `403 PRIVILEGE_ESCALATION` |
| Không tự khóa, tự xóa, tự gỡ vai trò của chính mình | `403 SELF_ACTION_FORBIDDEN` |
| Không khóa / xóa / gỡ super-admin đang hoạt động cuối cùng | `409 LAST_SUPER_ADMIN` |
| Không xóa / đổi bộ quyền vai trò hệ thống | `409 SYSTEM_ROLE_PROTECTED` |
| Không xóa vai trò đang được gán | `409 ROLE_IN_USE` |
| Tài khoản bị khóa không đăng nhập được | `403 ACCOUNT_LOCKED` |
| Trường không nằm trong allow-list | `400 VALIDATION_ERROR` (`FIELD_NOT_ALLOWED`) |
| Trùng email / mã vai trò | `409 EMAIL_ALREADY_EXISTS` / `409 ROLE_CODE_EXISTS` |

## Định dạng lỗi

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không hợp lệ.",
    "details": [{ "field": "password", "issue": "WEAK_PASSWORD", "message": "..." }]
  }
}
```

Lỗi khác: `401 UNAUTHENTICATED | INVALID_TOKEN | TOKEN_EXPIRED | INVALID_CREDENTIALS`, `403 FORBIDDEN`, `404 USER_NOT_FOUND | ROLE_NOT_FOUND | ENDPOINT_NOT_FOUND`, `400 MALFORMED_JSON | INVALID_QUERY_PARAMETER | PERMISSION_NOT_FOUND`.

## Kiểm thử

Import [`postman_collection.json`](postman_collection.json) vào Postman, chạy `npm run seed` trước rồi **Run collection** theo thứ tự (các bước sau dùng token / id lưu từ bước trước).
