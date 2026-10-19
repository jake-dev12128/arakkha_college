
export const truncateText = (value, maxLength = 150) => {
  if (typeof value !== "string") return "";

  const text = value.trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
};
