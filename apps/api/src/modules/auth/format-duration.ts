/**
 * Um prazo em segundos, escrito para uma pessoa ler: em horas quando fecha em
 * horas inteiras, e em minutos nos demais casos, arredondado para cima.
 */
export function formatDuration(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}
