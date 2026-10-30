import mongoose from 'mongoose';
import './role.js';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: /^\S+@\S+\.\S+$/,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        phone: {
            type: String,
            default: null,
            match: [/^\+[1-9]\d{7,14}$/, 'Số điện thoại theo định dạng E.164, ví dụ +84912345678'],
        },
        passwordHash: { type: String, required: true, select: false },
        status: {
            type: String,
            enum: ['active', 'locked', 'deleted'],
            default: 'active',
        },
        roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
