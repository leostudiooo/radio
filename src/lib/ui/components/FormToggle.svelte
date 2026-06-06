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

<label class="group inline-flex cursor-pointer items-center gap-[var(--space-2)] select-none">
	<input type="checkbox" {disabled} {checked} onchange={handleChange} class="sr-only" />
	<span
		class="font-mono text-[var(--color-accent)] text-[var(--text-body)] transition-colors duration-100"
	>
		{checked ? '[x]' : '[ ]'}
	</span>
	<span
		class="text-[var(--color-text-secondary)] text-[var(--text-body)] transition-colors duration-100 group-hover:text-[var(--color-text-primary)]"
	>
		{label}
	</span>
</label>
