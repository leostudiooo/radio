<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		options: Option[];
		value: string;
		onchange: (value: string) => void;
	}

	let { options, value, onchange }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		const current = options.findIndex((o) => o.value === value);
		let next = -1;

		switch (e.key) {
			case 'ArrowLeft':
				next = current <= 0 ? options.length - 1 : current - 1;
				break;
			case 'ArrowRight':
				next = current >= options.length - 1 ? 0 : current + 1;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = options.length - 1;
				break;
			default:
				return;
		}

		e.preventDefault();
		onchange(options[next].value);
	}
</script>

<div
	class="card-panel inline-flex items-center p-[var(--space-0-5)]"
	role="radiogroup"
	tabindex="0"
	onkeydown={handleKeydown}
>
	{#each options as option}
		<button
			type="button"
			onclick={() => onchange(option.value)}
			role="radio"
			aria-checked={option.value === value}
			style={option.value === value ? 'color: var(--color-text-on-accent)' : ''}
			class="px-[var(--space-2)] py-[var(--space-0-5)] font-medium text-[var(--text-body)] transition-all duration-100 {option.value ===
			value
				? 'bg-[var(--color-accent)]'
				: 'text-[var(--color-text-secondary)]'}"
		>
			{option.label}
		</button>
	{/each}
</div>
