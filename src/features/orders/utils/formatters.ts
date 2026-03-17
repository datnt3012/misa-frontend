const VND_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const formatCurrency = (amount: number | string | undefined | null): string =>
  VND_FORMATTER.format(Number(amount) || 0);

export const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 8) return phone;
  return `${phone.slice(0, 3)}${'*'.repeat(4)}${phone.slice(-3)}`;
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim());
  return parts.length >= 2
    ? `${parts[parts.length - 2]} - ${parts[parts.length - 1]}`
    : address;
};

export const getFilenameFromContentDisposition = (cd?: string): string | null => {
  if (!cd) return null;
  const utf8 = cd.match(/filename\*\=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1]);
  const ascii = cd.match(/filename="([^"]+)"/i);
  return ascii ? ascii[1] : null;
};
