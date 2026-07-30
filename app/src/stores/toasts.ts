import { defineStore } from 'pinia';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  timeout: number;
  /** When set, clicking the toast runs this instead of the default
   *  copy-message behavior (e.g. the update toast opens the download page). */
  onClick?: () => void;
}

let nextId = 1;

export const useToastsStore = defineStore('toasts', {
  state: () => ({
    items: [] as Toast[],
  }),
  actions: {
    push(message: string, kind: ToastKind = 'info', timeout = 2800, onClick?: () => void) {
      const id = nextId++;
      this.items.push({ id, message, kind, timeout, onClick });
      if (timeout > 0) {
        setTimeout(() => this.dismiss(id), timeout);
      }
      return id;
    },
    success(message: string, timeout = 2200, onClick?: () => void) {
      return this.push(message, 'success', timeout, onClick);
    },
    error(message: string, timeout = 5000) {
      return this.push(message, 'error', timeout);
    },
    info(message: string, timeout = 2800) {
      return this.push(message, 'info', timeout);
    },
    warning(message: string, timeout = 3500) {
      return this.push(message, 'warning', timeout);
    },
    dismiss(id: number) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
