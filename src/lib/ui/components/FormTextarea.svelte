<script lang="ts">
	interface Props {
		label: string;
		value?: string;
		placeholder?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		rows?: number;
		maxLength?: number;
		oninput?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(''),
		placeholder = '',
		error = '',
		required = false,
		disabled = false,
		rows = 3,
		maxLength,
		oninput
	}: Props = $props();

	const textareaId = `textarea-${Math.random().toString(36).slice(2, 9)}`;

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		oninput?.(value);
	}
</script>

<div class="flex flex-col gap-[var(--space-1)]">
	<label
		for={textareaId}
		class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
	>
		{label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
	</label>
	<textarea
		id={textareaId}
		{placeholder}
		{required}
		{disabled}
		{rows}
		maxlength={maxLength}
		{value}
		oninput={handleInput}
		class="input-field resize-y placeholder:text-[var(--color-text-muted)]"
	></textarea>
	{#if maxLength !== undefined}
		<span class="text-right text-[var(--color-text-muted)] text-[var(--text-aux)]"
			>{value.length}/{maxLength}</span
		>
	{/if}
	{#if error}
		<span class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{error}</span>
	{/if}
</div>
