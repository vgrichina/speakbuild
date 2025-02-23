export const truncateWithEllipsis = (str, maxLength) => {
    if (!str || str.length <= maxLength) return str;
    
    const charsToShow = Math.floor((maxLength - 5) / 2);
    return str.slice(0, charsToShow) + ' ... ' + str.slice(-charsToShow);
};
