// Kiểm tra quyền phía giao diện (chỉ để ẩn/hiện, backend vẫn là nơi quyết định)
export const can = (me, perm) => !!me && me.permissions.includes(perm);
export const sameId = (a, b) => String(a) === String(b);
