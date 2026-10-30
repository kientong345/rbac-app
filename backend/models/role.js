import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: [/^[a-z][a-z0-9-]{2,49}$/, 'Mã role: chữ thường, số, gạch nối; 3–50 ký tự; bắt đầu bằng chữ'],
            immutable: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        description: { type: String, default: null },
        isSystem: { type: Boolean, default: false, immutable: true },
        permissions: { type: [String], default: [] },
    },
    { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);
