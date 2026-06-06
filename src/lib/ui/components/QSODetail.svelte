<script lang="ts">
  import type { QSO } from '$lib/logic/types/qso';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { formatDate, formatTime } from '$lib/ui/utils/format';

  interface Props {
    qso: QSO;
    isAdmin: boolean;
  }

  let { qso, isAdmin }: Props = $props();
  const t = $derived(localeStore.translation);

  const DASH = '\u2014';

  function formatTimestamp(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionDetails}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.callsign}</dt>
        <dd class="text-[var(--text-subtitle)] text-[var(--color-text-primary)] font-mono">{qso.callsign}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.date}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatDate(qso.time_on)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.time}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatTime(qso.time_on)}</dd>
      </div>
      {#if qso.time_off}
        <div>
          <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.timeOff}</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatTime(qso.time_off!)}</dd>
        </div>
      {/if}
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.band}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.band)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.freq}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.freq ? `${qso.freq} MHz` : DASH}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.mode}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.mode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.rstSent}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.rst_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.rstRcvd}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.rst_rcvd)}</dd>
      </div>
    </dl>
  </section>

  <!-- QSL Status -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionQsl}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.qslSent}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.qslSentVia}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_sent_via)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.qslRcvd}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_rcvd)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.qslRcvdVia}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_rcvd_via)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.lotwQslSent}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.lotw_qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.lotwQslRcvd}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.lotw_qsl_rcvd)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.eqslQslSent}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.eqsl_qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.eqslQslRcvd}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.eqsl_qsl_rcvd)}</dd>
      </div>
    </dl>
  </section>

  <!-- Station Info -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionStation}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.name}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.name)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.qth}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qth)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.gridSquare}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-mono">{fmt(qso.grid_square)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.power}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.tx_pwr ? `${qso.tx_pwr} W` : DASH}</dd>
      </div>
      {#if qso.comment}
        <div class="md:col-span-2">
          <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.comment}</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.comment}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <!-- Geography -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionGeography}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.country}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.country)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.dxcc}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.dxcc)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.cqZone}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.cq_zone)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.ituZone}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.itu_zone)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.continent}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.cont)}</dd>
      </div>
    </dl>
  </section>

  <!-- Technical -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionTechnical}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.propMode}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.prop_mode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.satName}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.sat_name)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.submode}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.submode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.operator}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.operator)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.distance}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.distance ? `${qso.distance} km` : DASH}</dd>
      </div>
      {#if qso.latitude !== null && qso.latitude !== undefined}
        <div>
          <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.latitude}</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-mono">{qso.latitude}</dd>
        </div>
      {/if}
      {#if qso.longitude !== null && qso.longitude !== undefined}
        <div>
          <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.longitude}</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-mono">{qso.longitude}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <!-- Metadata -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      {t.qso.sectionMetadata}
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.createdAt}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{formatTimestamp(qso.created_at)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-body)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.qso.updatedAt}</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{formatTimestamp(qso.updated_at)}</dd>
      </div>
    </dl>
  </section>
</div>
