/**
 * Payment boundary — Spark build has no gateway.
 * Patients must never write payment documents in Firebase mode.
 */

import { getDataMode } from '../repositories';

export type PaymentResult =
  | { status: 'NOT_CONFIGURED'; message: string }
  | { status: 'LOCAL_TEST'; message: string; testOnly: true }
  | { status: 'ERROR'; message: string };

/**
 * Attempt to start payment for an appointment.
 * Firebase / production path: always NOT_CONFIGURED (no client payment writes).
 * Local mode only: returns a clearly labelled test result without claiming real money movement.
 */
export async function startPayment(_appointmentId: string): Promise<PaymentResult> {
  const mode = getDataMode();
  if (mode === 'firebase') {
    return {
      status: 'NOT_CONFIGURED',
      message:
        'Online payment is not configured. Your appointment stays as a request until an administrator records payment or confirms it. Patients cannot mark payments as paid.',
    };
  }
  return {
    status: 'LOCAL_TEST',
    testOnly: true,
    message:
      'Local development only: no real payment was processed. This is not a financial transaction.',
  };
}

export function isPaymentConfigured(): boolean {
  return false;
}
