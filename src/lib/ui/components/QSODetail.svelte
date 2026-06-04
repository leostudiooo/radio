<script lang="ts">
  import type { QSO } from '$lib/logic/types/qso';

  interface Props {
    qso: QSO;
    isAdmin: boolean;
  }

  let { qso, isAdmin }: Props = $props();

  const DASH = '\u2014';

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return DASH;
    }
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return DASH;
    }
  }

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
      QSO Details
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Callsign</dt>
        <dd class="text-[var(--text-heading)] text-[var(--color-text-primary)] font-[var(--font-mono)]">{qso.callsign}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Date</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatDate(qso.time_on)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Time On</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatTime(qso.time_on)}</dd>
      </div>
      {#if qso.time_off}
        <div>
          <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Time Off</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{formatTime(qso.time_off!)}</dd>
        </div>
      {/if}
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Band</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.band)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Frequency</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.freq ? `${qso.freq} MHz` : DASH}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Mode</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.mode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">RST Sent</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.rst_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">RST Received</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.rst_rcvd)}</dd>
      </div>
    </dl>
  </section>

  <!-- QSL Status -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      QSL Status
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">QSL Sent</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">QSL Sent Via</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_sent_via)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">QSL Received</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_rcvd)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">QSL Received Via</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qsl_rcvd_via)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">LoTW Sent</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.lotw_qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">LoTW Received</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.lotw_qsl_rcvd)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">eQSL Sent</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.eqsl_qsl_sent)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">eQSL Received</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.eqsl_qsl_rcvd)}</dd>
      </div>
    </dl>
  </section>

  <!-- Station Info -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      Station Info
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Name</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.name)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">QTH</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.qth)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Grid Square</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-[var(--font-mono)]">{fmt(qso.grid_square)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Power</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.tx_pwr ? `${qso.tx_pwr} W` : DASH}</dd>
      </div>
      {#if qso.comment}
        <div class="md:col-span-2">
          <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Comment</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.comment}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <!-- Geography -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      Geography
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Country</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.country)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">DXCC</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.dxcc)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">CQ Zone</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.cq_zone)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">ITU Zone</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.itu_zone)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Continent</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.cont)}</dd>
      </div>
    </dl>
  </section>

  <!-- Technical -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      Technical
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Prop Mode</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.prop_mode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Satellite</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.sat_name)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Submode</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.submode)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Operator</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{fmt(qso.operator)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Distance</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-primary)]">{qso.distance ? `${qso.distance} km` : DASH}</dd>
      </div>
      {#if qso.latitude !== null && qso.latitude !== undefined}
        <div>
          <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Latitude</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-[var(--font-mono)]">{qso.latitude}</dd>
        </div>
      {/if}
      {#if qso.longitude !== null && qso.longitude !== undefined}
        <div>
          <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Longitude</dt>
          <dd class="text-[var(--text-body)] text-[var(--color-text-primary)] font-[var(--font-mono)]">{qso.longitude}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <!-- Metadata -->
  <section>
    <h2 class="text-[var(--text-aux)] uppercase tracking-wide font-semibold mb-[var(--space-3)]">
      Metadata
    </h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Created</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{formatTimestamp(qso.created_at)}</dd>
      </div>
      <div>
        <dt class="text-[var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">Updated</dt>
        <dd class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{formatTimestamp(qso.updated_at)}</dd>
      </div>
    </dl>
  </section>
</div>
