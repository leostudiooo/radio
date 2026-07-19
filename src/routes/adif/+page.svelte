<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore } from '$lib/ui/stores/settings.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { parseADIF, exportADIF } from '$lib/logic/adif';
	import { bulkCreateQSOs, getQSOs } from '$lib/logic/data/qso';
	import { runAuthenticated } from '$lib/logic/auth';
	import {
		DATABASE_WRITE_DEADLINE_MS,
		FILE_READ_DEADLINE_MS,
		withDeadline
	} from '$lib/logic/deadline';
	import { BANDS, MODES } from '$lib/logic/types/qso';
	import type { QSOInsert, QSO } from '$lib/logic/types/qso';
	import type { Column } from '$lib/ui/components/DataTable';
	import { buildQSOFilter } from '$lib/ui/utils/filters';

	import AdminGuard from '$lib/ui/components/AdminGuard.svelte';
	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import DataTable from '$lib/ui/components/DataTable.svelte';
	import FileUpload from '$lib/ui/components/FileUpload.svelte';
	import SegmentedToggle from '$lib/ui/components/SegmentedToggle.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import FormInput from '$lib/ui/components/FormInput.svelte';
	import FormSelect from '$lib/ui/components/FormSelect.svelte';
	import FormDate from '$lib/ui/components/FormDate.svelte';
	import CollapsibleSection from '$lib/ui/components/CollapsibleSection.svelte';
	import { SITE_CONFIG } from '$lib/config';

	const t = $derived(localeStore.translation);

	const bandOptions = $derived([
		{ value: '', label: t.qso.allBands },
		...BANDS.map((b) => ({ value: b, label: b }))
	]);
	const modeOptions = $derived([
		{ value: '', label: t.qso.allModes },
		...MODES.map((m) => ({ value: m, label: m }))
	]);

	type ImportStep = 'upload' | 'preview' | 'result';
	type ActiveTab = 'import' | 'export';

	let activeTab = $state<ActiveTab>('import');
	let importStep = $state<ImportStep>('upload');
	let parsedQSOs = $state<QSOInsert[]>([]);
	let importSuccess = $state(0);
	let importErrors = $state(0);
	let importErrorDetails = $state<string[]>([]);
	let importing = $state(false);
	let importProcessed = $state(0);
	let importController: AbortController | null = null;
	let parsingFile = $state(false);
	const MAX_ADIF_FILE_SIZE = 10 * 1024 * 1024;

	let filterCallsign = $state('');
	let filterBand = $state('');
	let filterMode = $state('');
	let filterDateFrom = $state('');
	let filterDateTo = $state('');
	let exporting = $state(false);

	const previewColumns: Column[] = $derived([
		{ key: 'callsign', header: t.qso.callsign },
		{
			key: 'time_on',
			header: t.qso.date,
			format: (v: unknown) => {
				const iso = String(v ?? '');
				if (!iso) return '';
				if (!settingsStore.useLocalTime) return iso.slice(0, 10);
				const d = new Date(iso);
				return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			}
		},
		{
			key: 'time_on',
			header: t.qso.time,
			format: (v: unknown) => {
				const iso = String(v ?? '');
				if (!iso) return '';
				if (!settingsStore.useLocalTime) {
					const m = iso.match(/T(\d{2}:\d{2})/);
					return m ? m[1] : '';
				}
				const d = new Date(iso);
				return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
			}
		},
		{ key: 'band', header: t.qso.band },
		{ key: 'mode', header: t.qso.mode }
	]);

	function readFile(file: File): Promise<string> {
		return withDeadline(
			'read ADIF file',
			FILE_READ_DEADLINE_MS,
			(signal) =>
				new Promise((resolve, reject) => {
					const reader = new FileReader();
					const abort = () => reader.abort();
					signal.addEventListener('abort', abort, { once: true });
					reader.onload = () => resolve(String(reader.result ?? ''));
					reader.onerror = () => reject(reader.error ?? new Error('ADIF file read failed'));
					reader.onabort = () => reject(signal.reason ?? new Error('ADIF file read aborted'));
					reader.onloadend = () => signal.removeEventListener('abort', abort);
					reader.readAsText(file);
				})
		);
	}

	async function handleFile(file: File) {
		if (file.size > MAX_ADIF_FILE_SIZE) {
			toastStore.error(t.adif.fileTooLarge);
			return;
		}

		parsingFile = true;
		try {
			const qsos = parseADIF(await readFile(file));
			if (qsos.length === 0) {
				toastStore.error(t.adif.parseError);
				return;
			}
			parsedQSOs = qsos;
			importStep = 'preview';
		} catch {
			toastStore.error(t.adif.readFailed);
		} finally {
			parsingFile = false;
		}
	}

	async function handleImport() {
		if (importing) return;
		importing = true;
		importProcessed = 0;
		importController = new AbortController();
		try {
			const result = await runAuthenticated(
				supabase,
				'import ADIF',
				(operationSignal) =>
					bulkCreateQSOs(supabase, parsedQSOs, {
						signal: operationSignal,
						onProgress: (processed) => {
							importProcessed = processed;
						}
					}),
				Math.min(
					30 * 60 * 1000,
					Math.max(DATABASE_WRITE_DEADLINE_MS, parsedQSOs.length * DATABASE_WRITE_DEADLINE_MS)
				),
				importController.signal
			);
			importSuccess = result.success.length;
			importErrors = result.errors.length;
			importErrorDetails = result.errors.map(({ qso, kind }) => `${qso.callsign || '?'}: ${kind}`);
			importStep = 'result';
			toastStore.success(
				t.adif.importResult
					.replace('{success}', String(importSuccess))
					.replace('{errors}', String(importErrors))
			);
		} catch {
			toastStore.error(t.common.error);
		} finally {
			importing = false;
			importController = null;
		}
	}

	function cancelImport() {
		importController?.abort();
	}

	function resetImport() {
		cancelImport();
		importStep = 'upload';
		parsedQSOs = [];
		importSuccess = 0;
		importErrors = 0;
		importErrorDetails = [];
		importProcessed = 0;
	}

	async function handleExport() {
		exporting = true;
		try {
			const result = await getQSOs(
				supabase,
				buildQSOFilter({
					callsign: filterCallsign,
					band: filterBand,
					mode: filterMode,
					dateFrom: filterDateFrom,
					dateTo: filterDateTo
				}),
				{ field: 'time_on', direction: 'desc' },
				1,
				10000
			);
			const qsos = result.data as QSO[];

			if (qsos.length === 0) {
				toastStore.info(t.adif.noQSOsToExport);
				return;
			}

			const adifContent = exportADIF(qsos);
			const now = new Date();
			const dateStr = [
				now.getFullYear(),
				String(now.getMonth() + 1).padStart(2, '0'),
				String(now.getDate()).padStart(2, '0')
			].join('');
			const filename = `${SITE_CONFIG.callsign}_qso_${dateStr}.adif`;

			const blob = new Blob([adifContent], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);

			toastStore.success(t.adif.exported.replace('{count}', String(qsos.length)));
		} catch {
			toastStore.error(t.common.error);
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:head>
	<title>{t.adif.importTitle} / {t.adif.exportTitle}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<AdminGuard>
	<PageHeader title={t.adif.title} />

	<div class="mb-[var(--space-6)]">
		<SegmentedToggle
			options={[
				{ value: 'import', label: t.adif.importTitle },
				{ value: 'export', label: t.adif.exportTitle }
			]}
			value={activeTab}
			onchange={(v) => {
				activeTab = v as ActiveTab;
			}}
		/>
	</div>

	{#if activeTab === 'import'}
		<div class="mb-[var(--space-6)] flex gap-[var(--space-2)]">
			{#each [['upload', t.adif.importStep1], ['preview', t.adif.importStep2], ['result', t.adif.importStep3]] as [step, label], i}
				<div class="flex items-center gap-[var(--space-2)]">
					<span
						class="inline-flex h-6 w-6 items-center justify-center font-medium text-[var(--text-aux)]"
						style={importStep === step ? 'color: var(--color-text-on-accent)' : ''}
						class:bg-[var(--color-accent)]={importStep === step}
						class:bg-[var(--color-surface)]={importStep !== step}
						class:text-[var(--color-text-muted)]={importStep !== step}
						class:border={importStep !== step}
						class:border-[var(--color-border)]={importStep !== step}>{i + 1}</span
					>
					<span
						class="text-[var(--text-body)]"
						class:text-[var(--color-text-primary)]={importStep === step}
						class:text-[var(--color-text-muted)]={importStep !== step}>{label}</span
					>
				</div>
				{#if i < 2}
					<span class="mx-[var(--space-1)] self-center text-[var(--color-text-muted)]">/</span>
				{/if}
			{/each}
		</div>

		{#if importStep === 'upload'}
			<div class="max-w-lg">
				<FileUpload accept=".adi,.adif" disabled={parsingFile} onfile={handleFile} />
			</div>
		{:else if importStep === 'preview'}
			<div class="flex flex-col gap-[var(--space-4)]">
				<p class="text-[var(--color-text-secondary)] text-[var(--text-body)]">
					{t.adif.foundInFile.replace('{count}', String(parsedQSOs.length))}
				</p>

				<DataTable
					columns={previewColumns}
					data={parsedQSOs.slice(0, 10) as unknown as Record<string, unknown>[]}
					keyExtractor={(row) => String(row.callsign ?? '') + String(row.time_on ?? '')}
					emptyMessage=""
				/>

				{#if parsedQSOs.length > 10}
					<p class="text-[var(--color-text-muted)] text-[var(--text-aux)]">
						{t.adif.showingFirstOf
							.replace('{count}', '10')
							.replace('{total}', String(parsedQSOs.length))}
					</p>
				{/if}

				<div class="flex gap-[var(--space-3)]">
					<Button variant="primary" onclick={handleImport} disabled={importing}>
						{importing ? t.common.loading : t.adif.importAll}
					</Button>
					<Button variant="secondary" onclick={importing ? cancelImport : resetImport}>
						{importing ? t.adif.cancelImport : t.common.cancel}
					</Button>
				</div>
				{#if importing}
					<p class="text-[var(--color-text-secondary)] text-[var(--text-body)]">
						{t.adif.importProgress
							.replace('{processed}', String(importProcessed))
							.replace('{total}', String(parsedQSOs.length))}
					</p>
				{/if}
			</div>
		{:else if importStep === 'result'}
			<div class="flex flex-col gap-[var(--space-4)]">
				<p class="text-[var(--color-text-secondary)] text-[var(--text-body)]">
					{t.adif.importResult
						.replace('{success}', String(importSuccess))
						.replace('{errors}', String(importErrors))}
				</p>

				<div class="flex gap-[var(--space-4)]">
					<div
						class="card-panel flex flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-3)]"
					>
						<span class="font-semibold text-[var(--color-text-primary)] text-[var(--text-title)]"
							>{importSuccess}</span
						>
						<span
							class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-aux)] uppercase"
							>{t.adif.importedLabel}</span
						>
					</div>
					{#if importErrorDetails.length > 0}
						<ul
							class="flex flex-col gap-[var(--space-1)] text-[var(--color-status-invalid)] text-[var(--text-body)]"
						>
							{#each importErrorDetails as detail}
								<li>{detail}</li>
							{/each}
						</ul>
					{/if}
					{#if importErrors > 0}
						<div
							class="card-panel flex flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-3)]"
						>
							<span
								class="font-semibold text-[var(--color-status-invalid)] text-[var(--text-title)]"
								>{importErrors}</span
							>
							<span
								class="tracking-wide text-[var(--color-text-muted)] text-[var(--text-aux)] uppercase"
								>{t.adif.errorsLabel}</span
							>
						</div>
					{/if}
				</div>

				<Button variant="secondary" onclick={resetImport}>
					{t.adif.done}
				</Button>
			</div>
		{/if}
	{:else if activeTab === 'export'}
		<div class="flex max-w-2xl flex-col gap-[var(--space-6)]">
			<CollapsibleSection title={t.adif.filterDescription}>
				<div class="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
					<FormInput
						label={t.qso.callsign}
						value={filterCallsign}
						placeholder={t.common.search}
						oninput={(v) => {
							filterCallsign = v;
						}}
					/>
					<FormSelect
						label={t.qso.band}
						value={filterBand}
						options={bandOptions}
						onchange={(v) => {
							filterBand = v;
						}}
					/>
					<FormSelect
						label={t.qso.mode}
						value={filterMode}
						options={modeOptions}
						onchange={(v) => {
							filterMode = v;
						}}
					/>
					<FormDate
						label={t.adif.dateFrom}
						value={filterDateFrom}
						onchange={(v) => {
							filterDateFrom = v;
						}}
					/>
					<FormDate
						label={t.adif.dateTo}
						value={filterDateTo}
						onchange={(v) => {
							filterDateTo = v;
						}}
					/>
				</div>
			</CollapsibleSection>

			<Button variant="primary" onclick={handleExport} disabled={exporting}>
				{exporting ? t.common.loading : t.adif.exportADIF}
			</Button>
		</div>
	{/if}
</AdminGuard>
