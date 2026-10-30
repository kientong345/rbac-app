export const can = (me, perm) => !!me && me.permissions.includes(perm);
export const sameId = (a, b) => String(a) === String(b);
export const exceedsMe = (me, perms) => perms.some((p) => !me.permissions.includes(p));
export const fieldErrors = (err) => Object.fromEntries(err.details.map((d) => [d.field, d.message]));
