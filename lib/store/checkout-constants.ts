import "server-only";

const CHECKOUT_DUE_HOURS = 72;

export function checkoutDueDate(from = new Date()): Date {
  return new Date(from.getTime() + CHECKOUT_DUE_HOURS * 60 * 60 * 1000);
}

export { CHECKOUT_DUE_HOURS };
