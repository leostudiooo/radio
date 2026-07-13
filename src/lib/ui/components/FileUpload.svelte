<script lang="ts">
	import { Upload, File as FileIcon } from '@lucide/svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		accept?: string;
		disabled?: boolean;
		onfile?: (file: File) => void;
	}

	let { accept, disabled = false, onfile }: Props = $props();

	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) {
			selectedFile = file;
			onfile?.(file);
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			selectedFile = file;
			onfile?.(file);
		}
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div
	class="flex flex-col gap-[var(--space-3)]"
	role="group"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<label
		class="flex cursor-pointer flex-col items-center justify-center gap-[var(--space-2)] border-2 border-dashed p-[var(--space-8)] transition-colors duration-150"
		class:border-[var(--color-accent)]={dragOver}
		class:bg-[var(--color-accent-subtle)]={dragOver}
		class:border-[var(--color-border)]={!dragOver}
		class:bg-[var(--color-elevated)]={!dragOver}
	>
		<Upload size={24} class="text-[var(--color-text-muted)]" />
		<span class="text-[var(--color-text-secondary)] text-[var(--text-body)]"
			>{localeStore.translation.common.upload}</span
		>
		<input type="file" {accept} {disabled} onchange={handleInput} class="sr-only" />
	</label>
	{#if selectedFile}
		<div
			class="flex items-center gap-[var(--space-2)] border border-[var(--color-border)] bg-[var(--color-elevated)] px-[var(--space-3)] py-[var(--space-2)]"
		>
			<FileIcon size={16} class="text-[var(--color-text-muted)]" />
			<span class="flex-1 truncate text-[var(--color-text-primary)] text-[var(--text-body)]"
				>{selectedFile.name}</span
			>
			<span class="text-[var(--color-text-muted)] text-[var(--text-body)]"
				>{formatSize(selectedFile.size)}</span
			>
		</div>
	{/if}
</div>
