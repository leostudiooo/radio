<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		value?: string;
		placeholder?: string;
		error?: string;
		type?: string;
		required?: boolean;
		disabled?: boolean;
		prefix?: Snippet;
		suffix?: Snippet;
		oninput?: (value: string) => void;
		onchange?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(''),
		placeholder = '',
		error = '',
		type = 'text',
		required = false,
		disabled = false,
		prefix,
		suffix,
		oninput,
		onchange
	}: Props = $props();

	const inputId = `input-${Math.random().toString(36).slice(2, 9)}`;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		oninput?.(value);
	}

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange?.(target.value);
	}
</script>

<div class="flex min-w-0 flex-col gap-[var(--space-1)]">
	<label
		for={inputId}
		class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
	>
		{label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
	</label>
	<div
		class="input-field flex items-center focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent-medium)]"
	>
		{#if prefix}
			<span class="text-[var(--color-text-muted)]">{@render prefix()}</span>
		{/if}
		<input
			id={inputId}
			{type}
			{placeholder}
			{required}
			{disabled}
			{value}
			oninput={handleInput}
			onchange={handleChange}
			class="min-w-0 flex-1 bg-transparent text-[var(--color-text-primary)] text-[var(--text-body)] outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-40"
		/>
		{#if suffix}
			<span class="text-[var(--color-text-muted)]">{@render suffix()}</span>
		{/if}
	</div>
	{#if error}
		<span class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{error}</span>
	{/if}
</div>
