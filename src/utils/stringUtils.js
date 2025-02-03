export const truncateWithEllipsis = (str, maxLength) => {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
};
