import { toast } from 'sonner';

export const notify = {
  success: (message: string, options?: { description?: string; duration?: number }) =>
    toast.success(message, {
      duration: options?.duration ?? 3000,
      description: options?.description,
    }),

  error: (message: string, options?: { description?: string; duration?: number }) =>
    toast.error(message, {
      duration: options?.duration ?? 5000,
      description: options?.description,
    }),

  warning: (message: string, options?: { description?: string; duration?: number }) =>
    toast.warning(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
    }),

  info: (message: string, options?: { description?: string; duration?: number }) =>
    toast.info(message, {
      duration: options?.duration ?? 3000,
      description: options?.description,
    }),

  loading: (message: string) => toast.loading(message),

  dismiss: (id?: string | number) => toast.dismiss(id),

  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string | ((err: unknown) => string) }
  ) => toast.promise(promise, msgs),
};
