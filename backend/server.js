import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { buildErrorDetail, sendErrorResponse } from './utils/http.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        exposedHeaders: ['Location'],
    })
);

app.use(express.json({ limit: '100kb' }));

// routes
app.use('/api/v1', authRouter); // /auth/tokens, /me
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/roles', rolesRouter);
app.use('/api/v1/permissions', permissionsRouter);

app.use((req, res) => sendErrorResponse(res, 404, 'ENDPOINT_NOT_FOUND', `Không có endpoint ${req.method} ${req.path}.`));

// common error handler
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return sendErrorResponse(res, 400, 'MALFORMED_JSON', 'Body không phải JSON hợp lệ.');
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map((e) =>
            buildErrorDetail(e.path, e.kind === 'required' ? 'REQUIRED' : 'INVALID_VALUE', e.message)
        );
        return sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ.', details);
    }
    if (err.code === 11000) {
        if (err.keyPattern?.email) return sendErrorResponse(res, 409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');
        if (err.keyPattern?.code) return sendErrorResponse(res, 409, 'ROLE_CODE_EXISTS', 'Mã vai trò đã tồn tại.');
        return sendErrorResponse(res, 409, 'CONFLICT', 'Dữ liệu bị trùng.');
    }
    console.error(err);
    sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Đã có lỗi phía server. Vui lòng thử lại sau.');
});

const PORT = Number(process.env.PORT || 3001);

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    } catch (err) {
        console.error('MongoDB Error:', err.message);
        process.exit(1);
    }
})();
