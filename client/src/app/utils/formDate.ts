
/**
 * @function formatDate
 * @description Convierte una fecha ISO en un formato legible DD/MM/YYYY - HH:mm.
 * @param {string | undefined} isoDate - Fecha en formato ISO.
 * @returns {string} Fecha formateada.
 */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  
  // Verificamos si la fecha es válida
  if (isNaN(date.getTime())) return '';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}