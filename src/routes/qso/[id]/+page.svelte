<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore } from '$lib/ui/stores/settings.svelte';
	import { getQSOById } from '$lib/logic/data/qso';
	import { getQSOAdminVerificationCode, markQSOSentWithCode } from '$lib/logic/qso-verification';
	import type { QSO } from '$lib/logic/types/qso';
	import { formatDate, formatTime } from '$lib/ui/utils/format';
	import { createQsoDetailLoader } from '$lib/ui/utils/qso-detail-loader';
	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import QSODetail from '$lib/ui/components/QSODetail.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';

	const id = $derived($page.params.id!);
	const t = $derived(localeStore.translation);

	let qso: QSO | null = $state(null);
	let loading = $state(true);
	let notFound = $state(false);
	let verificationCode = $state<string | null>(null);
	let sendingCard = $state(false);
	let confirmationUrl = $state('');

	const detailLoader = createQsoDetailLoader(
		{
			getQSOById: (qsoId) => getQSOById(supabase, qsoId),
			getVerificationCode: (qsoId) => getQSOAdminVerificationCode(supabase, qsoId),
			getConfirmationOrigin: () => window.location.origin
		},
		(patch) => {
			if ('qso' in patch) qso = patch.qso ?? null;
			if ('loading' in patch) loading = patch.loading ?? false;
			if ('notFound' in patch) notFound = patch.notFound ?? false;
			if ('verificationCode' in patch) verificationCode = patch.verificationCode ?? null;
			if ('confirmationUrl' in patch) confirmationUrl = patch.confirmationUrl ?? '';
		}
	);

	$effect(() => {
		if (authStore.loading) return;
		const loadSecret = authStore.isAdmin;
		if (id) detailLoader.load(id, loadSecret);
	});

	async function handleSendQSLCard() {
		sendingCard = true;
		try {
			const result = await markQSOSentWithCode(supabase, id);
			verificationCode = result.code;
			toastStore.success(t.qso.qslCardSent);
		} catch {
			toastStore.error(t.qso.qslCardSendFailed);
		} finally {
			sendingCard = false;
		}
	}

	async function copyText(value: string) {
		await navigator.clipboard.writeText(value);
		toastStore.success(t.qso.copied);
	}

	let subtitle: string = $derived.by(() => {
		if (!qso) return '';
		const parts: string[] = [];
		const d = formatDate(qso.time_on, { useLocalTime: settingsStore.useLocalTime });
		const t = formatTime(qso.time_on, { useLocalTime: settingsStore.useLocalTime });
		if (d || t) parts.push([d, t].filter(Boolean).join(' '));
		if (qso.band) parts.push(qso.band);
		if (qso.mode) parts.push(qso.mode);
		return parts.join(' \u00B7 ');
	});
</script>

{#if loading}
	<div class="flex justify-center py-[var(--space-12)]">
		<LoadingSpinner size="lg" />
	</div>
{:else if notFound}
	<EmptyState message={t.qso.notFound} />
{:else if qso}
	<PageHeader title={qso.callsign} {subtitle}>
		{#snippet action()}
			{#if authStore.isAdmin}
				<div class="flex flex-wrap justify-end gap-[var(--space-2)]">
					{#if !verificationCode}
						<Button variant="secondary" disabled={sendingCard} onclick={handleSendQSLCard}>
							{t.qso.sendQSLCard}
						</Button>
					{/if}
					<a
						href={resolve('/qso/[id]/edit', { id })}
						style="color: var(--color-text-on-accent)"
						class="inline-flex items-center gap-[var(--space-2)] bg-[var(--color-accent)] px-[var(--space-4)] py-[var(--space-2)] font-medium text-[var(--text-body)] transition-opacity hover:opacity-90"
					>
						{t.common.edit}
					</a>
				</div>
			{/if}
		{/snippet}
	</PageHeader>
	{#if authStore.isAdmin && verificationCode}
		<div
			class="card-panel mb-[var(--space-6)] flex flex-col gap-[var(--space-3)] border-l-2 border-l-[var(--color-accent)] p-[var(--space-4)]"
		>
			<p class="text-[var(--color-text-secondary)]">{t.qso.confirmationPageUrl}</p>
			<div class="flex flex-wrap items-center gap-[var(--space-3)]">
				<code class="font-mono text-[var(--text-title)]">{verificationCode}</code>
				<Button size="sm" variant="secondary" onclick={() => copyText(verificationCode!)}
					>{t.qso.copyCode}</Button
				>
			</div>
			<div class="flex flex-wrap items-center gap-[var(--space-3)]">
				<code class="font-mono break-all text-[var(--text-body)]">{confirmationUrl}</code>
				<Button size="sm" variant="secondary" onclick={() => copyText(confirmationUrl)}
					>{t.qso.copyLink}</Button
				>
			</div>
		</div>
	{/if}
	<QSODetail {qso} />
{/if}
