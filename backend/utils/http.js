import mongoose from 'mongoose';

export function sendErrorResponse(res, status, code, message, details) {
    const error = { code, message };
    if (details && details.length) error.details = details;
    return res.status(status).json({ error });
}

export const buildErrorDetail = (field, issue, message) => ({
    field,
    issue,
    message,
});

export function validateAllowedFields(body, allowedFields = []) {
    return Object.keys(body || {})
        .filter((key) => !allowedFields.includes(key))
        .map((key) => buildErrorDetail(key, 'FIELD_NOT_ALLOWED', `Trường '${key}' không được phép gửi lên endpoint này.`));
}

export const isValidObjectId = (id) => mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

export function parsePagination(query, details = []) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 10 : Number(query.limit);
    const errors = [];
    if (!Number.isInteger(page) || page < 1) errors.push(buildErrorDetail('page', 'INVALID_VALUE', 'page phải là số nguyên ≥ 1.'));
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        errors.push(buildErrorDetail('limit', 'OUT_OF_RANGE', 'limit phải trong khoảng 1–100.'));
    details.push(...errors);
    return { page, limit, errors };
}

export function parseSortQuery(rawSort, allowedFields, details = []) {
    const sort = {};
    const errors = [];
    for (const part of String(rawSort)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        const field = part.replace(/^-/, '');
        if (!allowedFields.includes(field)) {
            errors.push(buildErrorDetail('sort', 'FIELD_NOT_SORTABLE', `Không sắp xếp được theo '${field}'.`));
            continue;
        }
        sort[field] = part.startsWith('-') ? -1 : 1;
    }
    details.push(...errors);
    return sort;
}

export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildPaginationMeta = (page, limit, totalItems) => ({
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
});
