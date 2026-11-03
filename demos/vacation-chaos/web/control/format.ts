import type { Booking, Snapshot } from '../../src/show/engine';

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const spent = (s: Snapshot) => (s.booked.flight?.price ?? 0) + (s.booked.hotel?.price ?? 0);
export const bookings = (s: Snapshot) => [s.booked.flight, s.booked.hotel].filter((b): b is Booking => b !== null);
