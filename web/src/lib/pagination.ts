/**
 * Các số trang cần hiện trên thanh phân trang: luôn có trang đầu, trang cuối và các trang quanh trang hiện tại.
 * Khoảng trống một trang thì hiện luôn số đó, khoảng trống dài hơn thành "…" ('gap').
 */
export function pageNumberItems(page: number, totalPages: number): Array<number | 'gap'> {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push(p - pages[i - 1] === 2 ? p - 1 : 'gap');
    items.push(p);
  });
  return items;
}
