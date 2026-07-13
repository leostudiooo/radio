<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import {
		confirmQSOByCode,
		getQSOByVerificationCode,
		normalizeVerificationCode,
		type PublicQSOInfo
	} from '$lib/logic/qso-verification';
	import { formatDate, formatTime } from '$lib/ui/utils/format';
	import { SITE_CONFIG } from '$lib/config';
	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import StatusBadge from '$lib/ui/components/StatusBadge.svelte';

	const t = $derived(localeStore.translation);
	const code = $derived($page.params.code ?? '');
	let qso: PublicQSOInfo | null = $state(null);
	let loading = $state(true);
	let confirming = $state(false);
	let error = $state('');
	let confirmed = $state(false);

	onMount(async () => {
		if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(normalizeVerificationCode(code))) {
			error = t.qso.invalidVerificationCode;
			loading = false;
			return;
		}

		try {
			qso = await getQSOByVerificationCode(supabase, code);
			if (!qso) error = t.qso.invalidVerificationCode;
		} catch {
			error = t.qso.verificationLoadFailed;
		} finally {
			loading = false;
		}
	});

	async function handleConfirm() {
		confirming = true;
		error = '';
		try {
			const result = await confirmQSOByCode(supabase, code);
			if (!result) {
				error = t.qso.invalidVerificationCode;
				return;
			}
			qso = result.qso;
			confirmed = !result.alreadyVerified;
		} catch {
			error = t.qso.verificationLoadFailed;
		} finally {
			confirming = false;
		}
	}
</script>

<svelte:head>
	<title>{t.qso.verificationTitle}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<PageHeader title={t.qso.verificationTitle} subtitle={t.qso.verificationDescription} />

	{#if loading}
		<div class="flex justify-center py-[var(--space-12)]"><LoadingSpinner size="lg" /></div>
	{:else if error && !qso}
		<EmptyState icon="⚠" message={error} />
	{:else if qso}
		<div class="card-panel flex flex-col gap-[var(--space-6)] p-[var(--space-6)]">
			<div class="flex items-center justify-between gap-[var(--space-4)]">
				<div>
					<p class="text-[var(--color-text-muted)] text-[var(--text-body)]">{t.common.station}</p>
					<p class="font-mono text-[var(--text-subtitle)]">
						{SITE_CONFIG.callsign} ↔ {qso.callsign}
					</p>
				</div>
				{#if qso.verified_at}<StatusBadge status="confirmed" label="CFM" />{/if}
			</div>

			<dl class="grid grid-cols-2 gap-[var(--space-4)]">
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.date}</dt>
					<dd>{formatDate(qso.time_on)}</dd>
				</div>
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.time}</dt>
					<dd>{formatTime(qso.time_on)}</dd>
				</div>
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.band}</dt>
					<dd>{qso.band ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.mode}</dt>
					<dd>{qso.mode ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.rstSent}</dt>
					<dd>{qso.rst_sent ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-[var(--color-text-muted)]">{t.qso.rstRcvd}</dt>
					<dd>{qso.rst_rcvd ?? '—'}</dd>
				</div>
			</dl>

			{#if error}<p class="text-[var(--color-status-invalid)]">{error}</p>{/if}
			{#if qso.verified_at}
				<div class="border-l-2 border-[var(--color-status-confirmed)] pl-[var(--space-4)]">
					<p class="text-[var(--color-status-confirmed)]">
						{confirmed ? t.qso.confirmationSuccess : t.qso.alreadyConfirmed}
					</p>
					<p class="text-[var(--color-text-secondary)]">
						{t.qso.confirmedOn.replace('{date}', new Date(qso.verified_at).toLocaleString())}
					</p>
				</div>
			{:else}
				<div><Button disabled={confirming} onclick={handleConfirm}>{t.qso.confirmQSO}</Button></div>
			{/if}
		</div>
	{/if}
</div>
