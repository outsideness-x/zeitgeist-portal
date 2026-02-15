export const normalizePage = (page: number | undefined, pageSize: number | undefined, maxPageSize = 50) => {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.max(1, Math.min(maxPageSize, pageSize ?? 20));
  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
};
