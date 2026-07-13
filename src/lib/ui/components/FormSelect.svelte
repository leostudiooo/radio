<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		label: string;
		value?: string;
		options: Option[];
		error?: string;
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		onchange?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(''),
		options,
		error = '',
		required = false,
		disabled = false,
		placeholder = '',
		onchange
	}: Props = $props();

	const selectId = `select-${Math.random().toString(36).slice(2, 9)}`;

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value;
		onchange?.(value);
	}
</script>

<div class="flex flex-col gap-[var(--space-1)]">
	<label
		for={selectId}
		class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
	>
		{label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
	</label>
	<div class="relative">
		<select
			id={selectId}
			{required}
			{disabled}
			{value}
			onchange={handleChange}
			class="input-field appearance-none pr-[var(--space-10)]"
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>{placeholder}</option>
			{/if}
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<span
			class="pointer-events-none absolute top-1/2 right-[var(--space-3)] -translate-y-1/2 text-[var(--color-text-muted)]"
		>
			<ChevronDown size={16} />
		</span>
	</div>
	{#if error}
		<span class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{error}</span>
	{/if}
</div>
