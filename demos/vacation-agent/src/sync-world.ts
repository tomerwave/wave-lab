import type { Hotel } from './hotels.js';

export function syncWorldInPage(hotels: readonly Hotel[]): void {
  document.querySelectorAll<HTMLElement>('[data-availability-label]').forEach(node => {
    const hotel = hotels.find(item => item.id === node.dataset.hotel);
    if (!hotel) return;
    node.textContent = hotel.available ? 'יש חדרים פנויים' : 'אין חדרים פנויים';
    node.className = hotel.available ? 'meta' : 'sold-out';
  });
  document.querySelectorAll<HTMLElement>('[data-available][data-hotel]').forEach(node => {
    const hotel = hotels.find(item => item.id === node.dataset.hotel);
    if (hotel) node.dataset.available = String(hotel.available);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-testid="select-hotel"]').forEach(button => {
    const hotel = hotels.find(item => item.id === button.dataset.hotel);
    if (!hotel) return;
    button.disabled = !hotel.available;
    const status = button.closest('section')?.querySelector('.actions')?.previousElementSibling;
    if (status?.tagName !== 'P') return;
    status.textContent = hotel.available ? 'יש חדרים פנויים' : 'אין חדרים פנויים';
    status.className = hotel.available ? 'meta' : 'sold-out';
  });
}
