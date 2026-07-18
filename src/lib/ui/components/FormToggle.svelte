<script lang="ts">
	interface Props {
		label: string;
		checked?: boolean;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	}

	let { label, checked = $bindable(false), disabled = false, onchange }: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		checked = target.checked;
		onchange?.(checked);
	}
</script>

<label
	class="group inline-flex items-center gap-[var(--space-2)] select-none {disabled
		? 'cursor-not-allowed opacity-40'
		: 'cursor-pointer'}"
>
	<input type="checkbox" {disabled} {checked} onchange={handleChange} class="peer sr-only" />
	<span
		style={checked ? 'color: var(--color-text-on-accent)' : ''}
		class="inline-flex min-w-[3ch] items-center justify-center border px-[var(--space-1)] py-[var(--space-0-5)] font-mono leading-[var(--line-height-tight)] font-semibold text-[var(--text-body)] transition-colors duration-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent)] peer-focus-visible:outline-none {checked
			? 'border-[var(--color-accent)] bg-[var(--color-accent)] group-hover:border-[var(--color-accent-hover)] group-hover:bg-[var(--color-accent-hover)]'
			: 'border-transparent text-[var(--color-text-primary)] group-hover:border-[var(--color-border-hover)] group-hover:bg-[var(--color-elevated)]'}"
	>
		{checked ? '[x]' : '[ ]'}
	</span>
	<span
		class="text-[var(--color-text-secondary)] text-[var(--text-body)] transition-colors duration-100 group-hover:text-[var(--color-text-primary)]"
	>
		{label}
	</span>
</label>
