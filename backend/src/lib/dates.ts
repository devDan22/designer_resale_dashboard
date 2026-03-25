export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
export const subMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() - n, 1);
