import { toast as sonnerToast } from "sonner";

/** Fixed-position toast notifications (sonner). Prefer over inline page banners. */
export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
};
