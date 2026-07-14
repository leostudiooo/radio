<script lang="ts">
	import type { QSO } from '$lib/logic/types/qso';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore } from '$lib/ui/stores/settings.svelte';
	import { formatDate, formatTime } from '$lib/ui/utils/format';
	import StatusBadge from './StatusBadge.svelte';

	interface Props {
		qso: QSO;
	}

	let { qso }: Props = $props();
	const t = $derived(localeStore.translation);

	const DASH = '\u2014';

	function formatTimestamp(iso: string): string {
		try {
			return `${formatDate(iso, { useLocalTime: settingsStore.useLocalTime })} ${formatTime(iso, { useLocalTime: settingsStore.useLocalTime })}`;
		} catch {
			return DASH;
		}
	}

	function fmt(value: string | number | boolean | null | undefined): string {
		if (value === null || value === undefined || value === '') return DASH;
		return String(value);
	}
</script>

<div class="flex flex-col gap-[var(--space-8)]">
	<!-- Primary Info -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionDetails}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.confirmation}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{#if qso.verified_at}<StatusBadge status="confirmed" label="CFM" />{:else}{DASH}{/if}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.callsign}
				</dt>
				<dd class="font-mono text-[var(--color-text-primary)] text-[var(--text-subtitle)]">
					{qso.callsign}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.date}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{formatDate(qso.time_on, { useLocalTime: settingsStore.useLocalTime })}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.time}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{formatTime(qso.time_on, { useLocalTime: settingsStore.useLocalTime })}
				</dd>
			</div>
			{#if qso.time_off}
				<div>
					<dt
						class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
					>
						{t.qso.timeOff}
					</dt>
					<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
						{formatTime(qso.time_off!, { useLocalTime: settingsStore.useLocalTime })}
					</dd>
				</div>
			{/if}
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.band}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.band)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.freq}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{qso.freq ? `${qso.freq} MHz` : DASH}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.mode}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.mode)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.rstSent}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.rst_sent)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.rstRcvd}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.rst_rcvd)}
				</dd>
			</div>
		</dl>
	</section>

	<!-- QSL Status -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionQsl}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.qslSent}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.qsl_sent)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.qslSentVia}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.qsl_sent_via)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.qslRcvd}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.qsl_rcvd)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.qslRcvdVia}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.qsl_rcvd_via)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.lotwQslSent}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.lotw_qsl_sent)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.lotwQslRcvd}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.lotw_qsl_rcvd)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.eqslQslSent}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.eqsl_qsl_sent)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.eqslQslRcvd}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.eqsl_qsl_rcvd)}
				</dd>
			</div>
		</dl>
	</section>

	<!-- Station Info -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionStation}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.name}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.name)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.qth}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.qth)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.gridSquare}
				</dt>
				<dd class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.grid_square)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.power}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{qso.tx_pwr ? `${qso.tx_pwr} W` : DASH}
				</dd>
			</div>
			{#if qso.comment}
				<div class="md:col-span-2">
					<dt
						class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
					>
						{t.qso.comment}
					</dt>
					<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{qso.comment}</dd>
				</div>
			{/if}
		</dl>
	</section>

	<!-- Geography -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionGeography}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.country}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.country)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.dxcc}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.dxcc)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.cqZone}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.cq_zone)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.ituZone}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.itu_zone)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.continent}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.cont)}</dd>
			</div>
		</dl>
	</section>

	<!-- Technical -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionTechnical}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.propMode}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.prop_mode)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.satName}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.sat_name)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.submode}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">{fmt(qso.submode)}</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.operator}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{fmt(qso.operator)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.distance}
				</dt>
				<dd class="text-[var(--color-text-primary)] text-[var(--text-body)]">
					{qso.distance ? `${qso.distance} km` : DASH}
				</dd>
			</div>
			{#if qso.latitude !== null && qso.latitude !== undefined}
				<div>
					<dt
						class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
					>
						{t.qso.latitude}
					</dt>
					<dd class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]">
						{qso.latitude}
					</dd>
				</div>
			{/if}
			{#if qso.longitude !== null && qso.longitude !== undefined}
				<div>
					<dt
						class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
					>
						{t.qso.longitude}
					</dt>
					<dd class="font-mono text-[var(--color-text-primary)] text-[var(--text-body)]">
						{qso.longitude}
					</dd>
				</div>
			{/if}
		</dl>
	</section>

	<!-- Metadata -->
	<section>
		<h2 class="mb-[var(--space-3)] font-semibold tracking-wide text-[var(--text-aux)] uppercase">
			{t.qso.sectionMetadata}
		</h2>
		<dl class="grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-3)] md:grid-cols-2">
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.createdAt}
				</dt>
				<dd class="text-[var(--color-text-secondary)] text-[var(--text-body)]">
					{formatTimestamp(qso.created_at)}
				</dd>
			</div>
			<div>
				<dt class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-body)] uppercase">
					{t.qso.updatedAt}
				</dt>
				<dd class="text-[var(--color-text-secondary)] text-[var(--text-body)]">
					{formatTimestamp(qso.updated_at)}
				</dd>
			</div>
		</dl>
	</section>
</div>
