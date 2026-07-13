<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { formatVerificationCode, normalizeVerificationCode } from '$lib/logic/qso-verification';
	import { SITE_CONFIG } from '$lib/config';
	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import FormInput from '$lib/ui/components/FormInput.svelte';
	import Button from '$lib/ui/components/Button.svelte';

	const t = $derived(localeStore.translation);
	let code = $state('');
	let error = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const normalized = normalizeVerificationCode(code.trim());
		if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(normalized)) {
			error = t.qso.invalidVerificationCode;
			return;
		}

		error = '';
		void goto(resolve('/qso/confirm/[code]', { code: formatVerificationCode(normalized) }));
	}
</script>

<svelte:head>
	<title>{t.qso.verificationTitle}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<PageHeader title={t.qso.verificationTitle} subtitle={t.qso.verificationDescription} />

	<form
		class="card-panel flex flex-col gap-[var(--space-5)] p-[var(--space-6)]"
		onsubmit={handleSubmit}
	>
		<FormInput
			label={t.qso.verificationCode}
			value={code}
			placeholder="XXXX-XXXX"
			{error}
			required
			oninput={(value) => {
				code = value.toUpperCase();
				error = '';
			}}
		/>
		<p class="text-[var(--color-text-muted)] text-[var(--text-body)]">
			{t.qso.verificationHint}
		</p>
		<div>
			<Button type="submit">{t.qso.lookupVerification}</Button>
		</div>
	</form>
</div>
