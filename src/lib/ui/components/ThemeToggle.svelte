<script lang="ts">
	import { Monitor, Moon, Sun, type LucideIcon } from '@lucide/svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore, type ThemePreference } from '$lib/ui/stores/settings.svelte';

	interface ThemeOption {
		value: ThemePreference;
		label: string;
		icon: LucideIcon;
	}

	const t = $derived(localeStore.translation);
	const options: ThemeOption[] = $derived([
		{ value: 'system', label: t.common.themeSystem, icon: Monitor },
		{ value: 'light', label: t.common.themeLight, icon: Sun },
		{ value: 'dark', label: t.common.themeDark, icon: Moon }
	]);

	function handleKeydown(e: KeyboardEvent) {
		const current = options.findIndex((option) => option.value === settingsStore.themePreference);
		let next: number;

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
		settingsStore.setThemePreference(options[next].value);
	}
</script>

<div
	class="card-panel inline-flex items-center p-[var(--space-0-5)]"
	role="radiogroup"
	aria-label={t.common.theme}
	tabindex="0"
	onkeydown={handleKeydown}
>
	{#each options as option (option.value)}
		{@const Icon = option.icon}
		<button
			type="button"
			onclick={() => settingsStore.setThemePreference(option.value)}
			role="radio"
			aria-checked={option.value === settingsStore.themePreference}
			aria-label={option.label}
			title={option.label}
			style={option.value === settingsStore.themePreference
				? 'color: var(--color-text-on-accent)'
				: ''}
			class="p-[var(--space-2)] transition-all duration-100 {option.value ===
			settingsStore.themePreference
				? 'bg-[var(--color-accent)]'
				: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
		>
			<Icon size={16} />
		</button>
	{/each}
</div>
