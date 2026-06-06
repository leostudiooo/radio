export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
}

function createToastStore() {
	let toasts = $state<Toast[]>([]);

	function add(message: string, type: ToastType = 'info') {
		const id = crypto.randomUUID();
		const toast: Toast = { id, message, type };
		toasts = [...toasts, toast];

		setTimeout(() => {
			remove(id);
		}, 4000);

		return id;
	}

	function remove(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	return {
		get toasts() {
			return toasts;
		},
		add,
		remove,
		success: (message: string) => add(message, 'success'),
		error: (message: string) => add(message, 'error'),
		info: (message: string) => add(message, 'info')
	};
}

export const toastStore = createToastStore();
