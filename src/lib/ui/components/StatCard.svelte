<script lang="ts">
	interface Props {
		value: string | number;
		label: string;
	}

	let { value, label }: Props = $props();
</script>

<div class="card-panel flex flex-col gap-[var(--space-1)] p-[var(--space-4)]">
	<span class="font-mono font-semibold text-[var(--color-text-primary)] text-[var(--text-title)]">
		{value}
	</span>
	<span class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
		{label}
	</span>
</div>
