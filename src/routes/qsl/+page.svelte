<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { QSL_METHODS, QSL_STATUSES } from '$lib/logic/types/qsl';
	import { getQSLCards, updateQSLCard, getQSLStats } from '$lib/logic/data/qsl';
	import { runAuthenticated } from '$lib/logic/auth';
	import type { QSLCard, QSLMethod, QSLStatus, QSLStats } from '$lib/logic/types/qsl';
	import { nextQSLReceivedUpdate, nextQSLSentUpdate } from '$lib/logic/utils';
	import { formatDate } from '$lib/ui/utils/format';

	import StatCard from '$lib/ui/components/StatCard.svelte';
	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import StatusBadge from '$lib/ui/components/StatusBadge.svelte';
	import FilterBar from '$lib/ui/components/FilterBar.svelte';
	import FormSelect from '$lib/ui/components/FormSelect.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import { SITE_CONFIG } from '$lib/config';

	const t = $derived(localeStore.translation);

	const statusLabel: Record<QSLStatus, string> = $derived({
		pending: t.qsl.pending,
		sent: t.qsl.sent,
		received: t.qsl.received,
		confirmed: t.qsl.confirmed,
		invalid: t.qsl.invalid
	});

	const methodLabel: Record<QSLMethod, string> = $derived({
		paper: t.qsl.paper,
		lotw: t.qsl.lotw,
		eqsl: t.qsl.eqsl
	});

	const methodOptions = $derived([
		{ value: '', label: t.qsl.allMethods },
		...QSL_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))
	]);

	const statusOptions = $derived([
		{ value: '', label: t.qsl.allStatuses },
		...QSL_STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))
	]);

	let filterMethod = $state('');
	let filterStatus = $state('');
	let data = $state<QSLCard[]>([]);
	let stats = $state<QSLStats | null>(null);
	let initialLoaded = $state(false);
	let loadError = $state(false);
	let updatingId = $state<string | null>(null);

	async function loadData() {
		loadError = false;
		try {
			const filter: { method?: QSLMethod; status?: QSLStatus } = {};
			if (filterMethod) filter.method = filterMethod as QSLMethod;
			if (filterStatus) filter.status = filterStatus as QSLStatus;
			const [cards, s] = await Promise.all([getQSLCards(supabase, filter), getQSLStats(supabase)]);
			data = cards;
			stats = s;
		} catch {
			loadError = true;
		} finally {
			initialLoaded = true;
		}
	}

	$effect(() => {
		loadData();
	});

	function applyFilters() {
		loadData();
	}

	function clearFilters() {
		filterMethod = '';
		filterStatus = '';
		loadData();
	}

	async function cycleSentStatus(card: QSLCard) {
		updatingId = card.id;
		try {
			await runAuthenticated(supabase, 'update QSL card', () =>
				updateQSLCard(
					supabase,
					card.id,
					nextQSLSentUpdate(card, new Date().toISOString().slice(0, 10))
				)
			);
			toastStore.success(t.qsl.statusUpdated);
			await loadData();
		} catch {
			toastStore.error(t.qsl.updateFailed);
		} finally {
			updatingId = null;
		}
	}

	async function cycleReceivedStatus(card: QSLCard) {
		updatingId = card.id;
		try {
			await runAuthenticated(supabase, 'update QSL card', () =>
				updateQSLCard(
					supabase,
					card.id,
					nextQSLReceivedUpdate(card, new Date().toISOString().slice(0, 10))
				)
			);
			toastStore.success(t.qsl.statusUpdated);
			await loadData();
		} catch {
			toastStore.error(t.qsl.updateFailed);
		} finally {
			updatingId = null;
		}
	}

	function truncate(s: string | null | undefined, len = 30): string {
		if (!s) return '-';
		return s.length > len ? s.slice(0, len) + '...' : s;
	}

	function qsoMetadata(card: QSLCard): string {
		if (!card.qso) return card.qso_id.slice(0, 8);
		return [formatDate(card.qso.time_on), card.qso.band, card.qso.mode]
			.filter(Boolean)
			.join(' \u00B7 ');
	}

	function viaLabel(via: string): string {
		switch (via) {
			case 'B':
				return t.qso.qslViaBureau;
			case 'D':
				return t.qso.qslViaDirect;
			case 'E':
				return t.qso.qslViaElectronic;
			case 'M':
				return t.qso.qslViaManager;
			default:
				return via;
		}
	}
</script>

<svelte:head>
	<title>{t.qsl.management}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.qsl.management} />

{#if !initialLoaded}
	<div class="flex justify-center py-[var(--space-12)]">
		<LoadingSpinner size="lg" />
	</div>
{:else if loadError && data.length === 0}
	<EmptyState message={t.common.error}>
		{#snippet cta()}
			<Button variant="secondary" onclick={loadData}>{t.common.retry}</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="flex flex-col gap-[var(--space-6)]">
		<div class="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-4">
			<StatCard label={t.qsl.totalCards} value={stats?.total ?? 0} />
			<StatCard label={t.qsl.paper} value={stats?.byMethod.paper ?? 0} />
			<StatCard label={t.qsl.lotw} value={stats?.byMethod.lotw ?? 0} />
			<StatCard label={t.qsl.eqsl} value={stats?.byMethod.eqsl ?? 0} />
		</div>

		<FilterBar onclear={clearFilters}>
			<FormSelect
				label={t.qsl.method}
				value={filterMethod}
				options={methodOptions}
				onchange={(v) => {
					filterMethod = v;
					applyFilters();
				}}
			/>
			<FormSelect
				label={t.qsl.status}
				value={filterStatus}
				options={statusOptions}
				onchange={(v) => {
					filterStatus = v;
					applyFilters();
				}}
			/>
		</FilterBar>

		{#if data.length === 0}
			<EmptyState icon="✉️" message={t.qsl.noQSLCards} />
		{:else}
			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.qsoId}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.method}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.sentStatus}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.receivedStatus}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.sentDate}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.receivedDate}</th
							>
							<th
								class="px-[var(--space-3)] py-[0.625rem] text-left font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.notes}</th
							>
						</tr>
					</thead>
					<tbody>
						{#each data as card (card.id)}
							<tr
								class="border-b border-[var(--color-border)] transition-colors duration-100 hover:bg-[var(--color-surface)]"
								class:opacity-50={updatingId === card.id}
							>
								<td class="px-[var(--space-3)] py-[var(--space-3)]">
									<a
										href={resolve('/qso/[id]', { id: card.qso_id })}
										class="font-mono font-medium text-[var(--color-text-primary)] text-[var(--text-body)] hover:underline"
									>
										{card.qso?.callsign ?? card.qso_id.slice(0, 8)}
									</a>
									<div class="text-[var(--color-text-muted)] text-[var(--text-aux)]">
										{qsoMetadata(card)}
									</div>
								</td>
								<td
									class="px-[var(--space-3)] py-[var(--space-3)] font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
								>
									<span
										class="inline-block border border-[var(--color-border)] bg-[var(--color-elevated)] px-[var(--space-2)] py-[var(--space-0-5)] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] text-[var(--text-body)] uppercase"
									>
										{methodLabel[card.method]}
									</span>
								</td>
								<td class="px-[var(--space-3)] py-[var(--space-3)]">
									{#if authStore.isAdmin}
										<button
											type="button"
											onclick={() => cycleSentStatus(card)}
											class="cursor-pointer"
											title={t.qsl.cycleSentStatus}
										>
											<StatusBadge
												status={card.sent_status ?? 'pending'}
												label={statusLabel[card.sent_status ?? 'pending']}
											/>
										</button>
									{:else}
										<StatusBadge
											status={card.sent_status ?? 'pending'}
											label={statusLabel[card.sent_status ?? 'pending']}
										/>
									{/if}
									{#if card.sent_via}
										<div
											class="mt-[var(--space-1)] text-[var(--color-text-muted)] text-[var(--text-aux)]"
										>
											{viaLabel(card.sent_via)}
										</div>
									{/if}
								</td>
								<td class="px-[var(--space-3)] py-[var(--space-3)]">
									{#if authStore.isAdmin}
										<button
											type="button"
											onclick={() => cycleReceivedStatus(card)}
											class="cursor-pointer"
											title={t.qsl.cycleReceivedStatus}
										>
											<StatusBadge
												status={card.received_status ?? 'pending'}
												label={statusLabel[card.received_status ?? 'pending']}
											/>
										</button>
									{:else}
										<StatusBadge
											status={card.received_status ?? 'pending'}
											label={statusLabel[card.received_status ?? 'pending']}
										/>
									{/if}
									{#if card.received_via}
										<div
											class="mt-[var(--space-1)] text-[var(--color-text-muted)] text-[var(--text-aux)]"
										>
											{viaLabel(card.received_via)}
										</div>
									{/if}
								</td>
								<td
									class="px-[var(--space-3)] py-[var(--space-3)] font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
									>{formatDate(card.sent_date)}</td
								>
								<td
									class="px-[var(--space-3)] py-[var(--space-3)] font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
									>{formatDate(card.received_date)}</td
								>
								<td
									class="max-w-[200px] truncate px-[var(--space-3)] py-[var(--space-3)] font-mono text-[var(--color-text-secondary)] text-[var(--text-body)]"
									>{truncate(card.notes)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex flex-col gap-[var(--space-3)] lg:hidden">
				{#each data as card (card.id)}
					<div
						class="card-panel flex flex-col gap-[var(--space-2)] p-[var(--space-4)]"
						class:opacity-50={updatingId === card.id}
					>
						<div class="flex justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.qsoId}</span
							>
							<div class="flex flex-col items-end">
								<a
									href={resolve('/qso/[id]', { id: card.qso_id })}
									class="font-mono font-medium text-[var(--color-text-primary)] text-[var(--text-body)] hover:underline"
								>
									{card.qso?.callsign ?? card.qso_id.slice(0, 8)}
								</a>
								<span class="text-right text-[var(--color-text-muted)] text-[var(--text-aux)]">
									{qsoMetadata(card)}
								</span>
							</div>
						</div>
						<div class="flex justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.method}</span
							>
							<span class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
								>{methodLabel[card.method]}</span
							>
						</div>
						<div class="flex items-center justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.sentStatus}</span
							>
							<div class="flex flex-col items-end">
								{#if authStore.isAdmin}
									<button
										type="button"
										onclick={() => cycleSentStatus(card)}
										class="cursor-pointer"
										title={t.qsl.cycleSentStatus}
									>
										<StatusBadge
											status={card.sent_status ?? 'pending'}
											label={statusLabel[card.sent_status ?? 'pending']}
										/>
									</button>
								{:else}
									<StatusBadge
										status={card.sent_status ?? 'pending'}
										label={statusLabel[card.sent_status ?? 'pending']}
									/>
								{/if}
								{#if card.sent_via}
									<span
										class="mt-[var(--space-1)] text-[var(--color-text-muted)] text-[var(--text-aux)]"
									>
										{viaLabel(card.sent_via)}
									</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.receivedStatus}</span
							>
							<div class="flex flex-col items-end">
								{#if authStore.isAdmin}
									<button
										type="button"
										onclick={() => cycleReceivedStatus(card)}
										class="cursor-pointer"
										title={t.qsl.cycleReceivedStatus}
									>
										<StatusBadge
											status={card.received_status ?? 'pending'}
											label={statusLabel[card.received_status ?? 'pending']}
										/>
									</button>
								{:else}
									<StatusBadge
										status={card.received_status ?? 'pending'}
										label={statusLabel[card.received_status ?? 'pending']}
									/>
								{/if}
								{#if card.received_via}
									<span
										class="mt-[var(--space-1)] text-[var(--color-text-muted)] text-[var(--text-aux)]"
									>
										{viaLabel(card.received_via)}
									</span>
								{/if}
							</div>
						</div>
						<div class="flex justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.sentDate}</span
							>
							<span class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
								>{formatDate(card.sent_date)}</span
							>
						</div>
						<div class="flex justify-between gap-[var(--space-2)]">
							<span
								class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
								>{t.qsl.receivedDate}</span
							>
							<span class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]"
								>{formatDate(card.received_date)}</span
							>
						</div>
						{#if card.notes}
							<div class="flex justify-between gap-[var(--space-2)]">
								<span
									class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
									>{t.qsl.notes}</span
								>
								<span
									class="max-w-[200px] truncate text-right font-mono text-[var(--color-text-secondary)] text-[var(--text-body)]"
									>{truncate(card.notes)}</span
								>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="font-mono text-[var(--color-text-muted)] text-[var(--text-aux)]">
				{t.qso.totalCount.replace('{total}', String(data.length))}
			</div>
		{/if}
	</div>
{/if}
