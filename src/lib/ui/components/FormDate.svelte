<script lang="ts">
	interface Props {
		label: string;
		value?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(''),
		error = '',
		required = false,
		disabled = false,
		onchange
	}: Props = $props();

	const dateId = `date-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		onchange?.(value);
	}
</script>

<div class="flex flex-col gap-[var(--space-1)]">
	<label
		for={dateId}
		class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
	>
		{label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
	</label>
	<input
		id={dateId}
		type="date"
		{required}
		{disabled}
		{value}
		onchange={handleChange}
		class="input-field"
	/>
	{#if error}
		<span class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{error}</span>
	{/if}
</div>
