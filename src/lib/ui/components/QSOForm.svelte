<script lang="ts">
	import { goto } from '$app/navigation';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore } from '$lib/ui/stores/settings.svelte';
	import { BANDS, MODES, CONTINENTS, ADIF_QSL_STATUS } from '$lib/logic/types/qso';
	import { validateQSO } from '$lib/logic/validation';
	import { lookupCallsign } from '$lib/logic/data/callsign';
	import type { QSO, QSOInsert, ValidationResult } from '$lib/logic/types/qso';

	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import FormInput from '$lib/ui/components/FormInput.svelte';
	import FormSelect from '$lib/ui/components/FormSelect.svelte';
	import FormDate from '$lib/ui/components/FormDate.svelte';
	import FormTime from '$lib/ui/components/FormTime.svelte';
	import FormToggle from '$lib/ui/components/FormToggle.svelte';
	import CollapsibleSection from '$lib/ui/components/CollapsibleSection.svelte';
	import ValidationErrors from '$lib/ui/components/ValidationErrors.svelte';
	import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import { SITE_CONFIG } from '$lib/config';

	interface Props {
		formMode: 'create' | 'edit';
		initialData?: QSO;
		profileId: string;
		onsubmit: (data: QSOInsert) => Promise<void>;
		ondelete?: () => Promise<void>;
	}

	let { formMode, initialData, profileId, onsubmit, ondelete }: Props = $props();

	const PHONE_MODES = new Set(['SSB', 'FM', 'AM']);

	const BAND_FREQ: Record<string, number> = {
		'160m': 1.85,
		'80m': 3.75,
		'60m': 5.357,
		'40m': 7.15,
		'30m': 10.125,
		'20m': 14.175,
		'17m': 18.118,
		'15m': 21.225,
		'12m': 24.94,
		'10m': 28.5,
		'6m': 50.15,
		'4m': 70.15,
		'2m': 145.5,
		'70cm': 435,
		'23cm': 1295
	};

	const FREQ_BAND_RANGES: Array<{ min: number; max: number; band: string }> = [
		{ min: 1.8, max: 2.0, band: '160m' },
		{ min: 3.5, max: 4.0, band: '80m' },
		{ min: 5.0, max: 5.5, band: '60m' },
		{ min: 7.0, max: 7.3, band: '40m' },
		{ min: 10.0, max: 10.15, band: '30m' },
		{ min: 14.0, max: 14.35, band: '20m' },
		{ min: 18.0, max: 18.17, band: '17m' },
		{ min: 21.0, max: 21.45, band: '15m' },
		{ min: 24.0, max: 24.99, band: '12m' },
		{ min: 28.0, max: 29.7, band: '10m' },
		{ min: 50.0, max: 54.0, band: '6m' },
		{ min: 70.0, max: 71.0, band: '4m' },
		{ min: 144.0, max: 148.0, band: '2m' },
		{ min: 430.0, max: 440.0, band: '70cm' },
		{ min: 1240.0, max: 1300.0, band: '23cm' }
	];

	function freqToBand(freqMhz: number): string {
		for (const r of FREQ_BAND_RANGES) {
			if (freqMhz >= r.min && freqMhz <= r.max) return r.band;
		}
		return '';
	}

	function utcNow(): string {
		return new Date().toISOString().slice(0, 19) + 'Z';
	}

	function defaultRST(mode: string): string {
		return PHONE_MODES.has(mode) ? '59' : '599';
	}

	const bandOptions = BANDS.map((b) => ({ value: b, label: b }));
	const modeOptions = MODES.map((m) => ({ value: m, label: m }));
	const contOptions = CONTINENTS.map((c) => ({ value: c, label: c }));
	const qslStatusOptions = ADIF_QSL_STATUS.map((s) => ({ value: s, label: s }));
	const t = $derived(localeStore.translation);

	const qslViaOptions = $derived([
		{ value: '', label: '\u2014' },
		{ value: 'B', label: t.qso.qslViaBureau },
		{ value: 'D', label: t.qso.qslViaDirect },
		{ value: 'E', label: t.qso.qslViaElectronic },
		{ value: 'M', label: t.qso.qslViaManager }
	]);

	let callsign = $state('');
	let timeOn = $state(formMode === 'create' ? utcNow() : '');
	let band = $state('');
	let freq = $state('');
	let qsoMode = $state('');
	let rstSent = $state('');
	let rstRcvd = $state('');
	let isEyeball = $state(false);

	let datePart = $derived.by(() => {
		if (!settingsStore.useLocalTime) return timeOn.slice(0, 10);
		const d = new Date(timeOn);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	});
	let timePart = $derived.by(() => {
		if (!settingsStore.useLocalTime) return timeOn.slice(11, 16);
		const d = new Date(timeOn);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	});

	function handleDateChange(newDate: string) {
		if (!settingsStore.useLocalTime) {
			timeOn = `${newDate}T${timePart}:00Z`;
		} else {
			const d = new Date(timeOn);
			const [y, m, day] = newDate.split('-').map(Number);
			d.setFullYear(y, m - 1, day);
			timeOn = d.toISOString().slice(0, 19) + 'Z';
		}
		saved = false;
	}

	function handleTimeChange(newTime: string) {
		if (!settingsStore.useLocalTime) {
			timeOn = `${datePart}T${newTime}:00Z`;
		} else {
			const d = new Date(timeOn);
			const [h, m] = newTime.split(':').map(Number);
			d.setHours(h, m, 0, 0);
			timeOn = d.toISOString().slice(0, 19) + 'Z';
		}
		saved = false;
	}

	let optName = $state('');
	let optQth = $state('');
	let optGrid = $state('');
	let optPower = $state('');
	let optComment = $state('');
	let optPropMode = $state('');

	let timeOff = $state('');

	let optSubmode = $state('');
	let optSatName = $state('');
	let optOperator = $state('');

	let optLatitude = $state('');
	let optLongitude = $state('');
	let optAntAz = $state('');
	let optAntEl = $state('');
	let optDistance = $state('');

	let optDxcc = $state('');
	let optCountry = $state('');
	let optCqZone = $state('');
	let optItuZone = $state('');
	let optCont = $state('');

	let optQslSent = $state('');
	let optQslSentVia = $state('');
	let optQslRcvd = $state('');
	let optQslRcvdVia = $state('');
	let optLotwQslSent = $state('');
	let optLotwQslRcvd = $state('');
	let optEqslQslSent = $state('');
	let optEqslQslRcvd = $state('');

	let errors = $state<ValidationResult['errors']>([]);
	let submitting = $state(false);
	let saved = $state(false);
	let showDeleteConfirm = $state(false);

	let datePartOff = $derived.by(() => {
		if (!timeOff) return '';
		if (!settingsStore.useLocalTime) return timeOff.slice(0, 10);
		const d = new Date(timeOff);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	});
	let timePartOff = $derived.by(() => {
		if (!timeOff) return '';
		if (!settingsStore.useLocalTime) return timeOff.slice(11, 16);
		const d = new Date(timeOff);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	});

	function handleDateOffChange(newDate: string) {
		if (!timeOff) {
			timeOff = `${newDate}T00:00:00Z`;
		} else if (!settingsStore.useLocalTime) {
			timeOff = `${newDate}T${timePartOff}:00Z`;
		} else {
			const d = new Date(timeOff);
			const [y, m, day] = newDate.split('-').map(Number);
			d.setFullYear(y, m - 1, day);
			timeOff = d.toISOString().slice(0, 19) + 'Z';
		}
		saved = false;
	}

	function handleTimeOffChange(newTime: string) {
		if (!timeOff) {
			const today = new Date().toISOString().slice(0, 10);
			timeOff = `${today}T${newTime}:00Z`;
		} else if (!settingsStore.useLocalTime) {
			timeOff = `${datePartOff}T${newTime}:00Z`;
		} else {
			const d = new Date(timeOff);
			const [h, m] = newTime.split(':').map(Number);
			d.setHours(h, m, 0, 0);
			timeOff = d.toISOString().slice(0, 19) + 'Z';
		}
		saved = false;
	}

	let lookupTimer: ReturnType<typeof setTimeout> | null = null;
	let lookingUp = $state(false);

	function handleCallsignInput(value: string) {
		callsign = value;
		saved = false;
		if (formMode !== 'create') return;
		if (lookupTimer) clearTimeout(lookupTimer);
		if (value.trim().length >= 3) {
			lookingUp = true;
			lookupTimer = setTimeout(async () => {
				const info = await lookupCallsign(value);
				if (info) {
					if (info.name && !optName) optName = info.name;
					if (info.grid_square && !optGrid) optGrid = info.grid_square;
				}
				lookingUp = false;
			}, 500);
		} else {
			lookingUp = false;
		}
	}

	function handleBandChange(value: string) {
		band = value;
		saved = false;
		if (formMode === 'create' && value && BAND_FREQ[value]) {
			freq = String(BAND_FREQ[value]);
		}
	}

	function handleFreqInput(value: string) {
		freq = value;
		saved = false;
		if (formMode === 'create') {
			const num = parseFloat(value);
			if (!isNaN(num) && !isEyeball) {
				const detected = freqToBand(num);
				if (detected) band = detected;
			}
		}
	}

	function handleModeChange(value: string) {
		if (formMode === 'create') {
			const prevMode = qsoMode;
			qsoMode = value;
			saved = false;
			if (prevMode === '' || rstSent === defaultRST(prevMode)) {
				rstSent = defaultRST(value);
			}
			if (prevMode === '' || rstRcvd === defaultRST(prevMode)) {
				rstRcvd = defaultRST(value);
			}
		} else {
			qsoMode = value;
		}
	}

	function buildFormData(): QSOInsert {
		const normalizedTimeOn = timeOn.includes('T')
			? timeOn
			: `${timeOn.replace(/\//g, '-')}T00:00:00Z`;

		return {
			profile_id: profileId,
			callsign: callsign.trim().toUpperCase(),
			time_on: normalizedTimeOn,
			time_off: timeOff || undefined,
			band: isEyeball ? undefined : band || undefined,
			freq: isEyeball ? undefined : freq ? parseFloat(freq) : undefined,
			mode: qsoMode || undefined,
			rst_sent: rstSent || undefined,
			rst_rcvd: rstRcvd || undefined,
			is_eyeball: isEyeball,
			name: optName || undefined,
			qth: optQth || undefined,
			grid_square: optGrid || undefined,
			tx_pwr: optPower ? parseInt(optPower, 10) : undefined,
			comment: optComment || undefined,
			prop_mode: optPropMode || undefined,
			submode: optSubmode || undefined,
			sat_name: optSatName || undefined,
			operator: optOperator || undefined,
			latitude: optLatitude ? parseFloat(optLatitude) : undefined,
			longitude: optLongitude ? parseFloat(optLongitude) : undefined,
			ant_az: optAntAz ? parseFloat(optAntAz) : undefined,
			ant_el: optAntEl ? parseFloat(optAntEl) : undefined,
			distance: optDistance ? parseFloat(optDistance) : undefined,
			dxcc: optDxcc ? parseInt(optDxcc, 10) : undefined,
			country: optCountry || undefined,
			cq_zone: optCqZone ? parseInt(optCqZone, 10) : undefined,
			itu_zone: optItuZone ? parseInt(optItuZone, 10) : undefined,
			cont: optCont || undefined,
			qsl_sent: optQslSent || undefined,
			qsl_sent_via: optQslSentVia || undefined,
			qsl_rcvd: optQslRcvd || undefined,
			qsl_rcvd_via: optQslRcvdVia || undefined,
			lotw_qsl_sent: optLotwQslSent || undefined,
			lotw_qsl_rcvd: optLotwQslRcvd || undefined,
			eqsl_qsl_sent: optEqslQslSent || undefined,
			eqsl_qsl_rcvd: optEqslQslRcvd || undefined
		};
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errors = [];
		saved = false;

		const data = buildFormData();
		const result = validateQSO(data);
		if (!result.valid) {
			errors = result.errors;
			return;
		}

		submitting = true;
		try {
			await onsubmit(data);
			if (formMode === 'create') {
				saved = true;
			}
		} catch {
			if (formMode === 'create') {
				errors = [{ field: '_submit', code: 'REQUIRED' }];
			}
		} finally {
			submitting = false;
		}
	}

	function populateForm(data: QSO) {
		callsign = data.callsign ?? '';
		timeOn = data.time_on ?? '';
		band = data.band ?? '';
		freq = data.freq != null ? String(data.freq) : '';
		qsoMode = data.mode ?? '';
		rstSent = data.rst_sent ?? '';
		rstRcvd = data.rst_rcvd ?? '';
		isEyeball = data.is_eyeball ?? false;
		optName = data.name ?? '';
		optQth = data.qth ?? '';
		optGrid = data.grid_square ?? '';
		optPower = data.tx_pwr != null ? String(data.tx_pwr) : '';
		optComment = data.comment ?? '';
		optPropMode = data.prop_mode ?? '';
		timeOff = data.time_off ?? '';
		optSubmode = data.submode ?? '';
		optSatName = data.sat_name ?? '';
		optOperator = data.operator ?? '';
		optLatitude = data.latitude != null ? String(data.latitude) : '';
		optLongitude = data.longitude != null ? String(data.longitude) : '';
		optAntAz = data.ant_az != null ? String(data.ant_az) : '';
		optAntEl = data.ant_el != null ? String(data.ant_el) : '';
		optDistance = data.distance != null ? String(data.distance) : '';
		optDxcc = data.dxcc != null ? String(data.dxcc) : '';
		optCountry = data.country ?? '';
		optCqZone = data.cq_zone != null ? String(data.cq_zone) : '';
		optItuZone = data.itu_zone != null ? String(data.itu_zone) : '';
		optCont = data.cont ?? '';
		optQslSent = data.qsl_sent ?? '';
		optQslSentVia = data.qsl_sent_via ?? '';
		optQslRcvd = data.qsl_rcvd ?? '';
		optQslRcvdVia = data.qsl_rcvd_via ?? '';
		optLotwQslSent = data.lotw_qsl_sent ?? '';
		optLotwQslRcvd = data.lotw_qsl_rcvd ?? '';
		optEqslQslSent = data.eqsl_qsl_sent ?? '';
		optEqslQslRcvd = data.eqsl_qsl_rcvd ?? '';
	}

	$effect(() => {
		if (formMode === 'edit' && initialData) {
			populateForm(initialData);
		}
	});

	function logAnother() {
		callsign = '';
		band = '';
		freq = '';
		qsoMode = '';
		rstSent = '';
		rstRcvd = '';
		optName = '';
		optQth = '';
		optGrid = '';
		optPower = '';
		optComment = '';
		optPropMode = '';
		timeOff = '';
		optSubmode = '';
		optSatName = '';
		optOperator = '';
		optLatitude = '';
		optLongitude = '';
		optAntAz = '';
		optAntEl = '';
		optDistance = '';
		optDxcc = '';
		optCountry = '';
		optCqZone = '';
		optItuZone = '';
		optCont = '';
		optQslSent = '';
		optQslSentVia = '';
		optQslRcvd = '';
		optQslRcvdVia = '';
		optLotwQslSent = '';
		optLotwQslRcvd = '';
		optEqslQslSent = '';
		optEqslQslRcvd = '';
		timeOn = utcNow();
		errors = [];
		saved = false;
	}

	const numericType = $derived(formMode === 'create' ? 'number' : 'text');
</script>

<svelte:head>
	<title>{formMode === 'create' ? t.qso.newQSO : t.qso.editQSO}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

{#if formMode === 'create' && saved}
	<PageHeader title={t.qso.newQSO} />
	<div class="flex flex-col items-center gap-[var(--space-4)] py-[var(--space-12)] sm:flex-row">
		<Button variant="primary" onclick={logAnother}>{t.qso.logAnother}</Button>
		<Button variant="secondary" onclick={() => goto('/qso')}>{t.qso.viewList}</Button>
	</div>
{:else}
	{#if formMode === 'edit' && ondelete}
		<PageHeader title={t.qso.editQSO}>
			{#snippet action()}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						showDeleteConfirm = true;
					}}>{t.common.delete}</Button
				>
			{/snippet}
		</PageHeader>
	{:else}
		<PageHeader title={formMode === 'create' ? t.qso.newQSO : t.qso.editQSO} />
	{/if}

	<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--space-6)] pb-24 lg:pb-6">
		<ValidationErrors {errors} namespace="qso" />

		<FormToggle
			label="{t.qso.eyeball} - {t.qso.eyeballDescription}"
			checked={isEyeball}
			onchange={(val) => {
				isEyeball = val;
				saved = false;
			}}
		/>

		<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
			<div class="sm:col-span-2">
				{#if formMode === 'create'}
					<FormInput
						label={t.qso.callsign}
						value={callsign}
						placeholder={t.common.placeholder.callsign}
						required={true}
						oninput={handleCallsignInput}
					/>
					{#if lookingUp}
						<span
							class="mt-[var(--space-1)] inline-flex items-center gap-[var(--space-1)] text-[var(--color-text-muted)] text-[var(--text-body)]"
						>
							<LoadingSpinner size="sm" />
						</span>
					{/if}
				{:else}
					<FormInput
						label={t.qso.callsign}
						bind:value={callsign}
						placeholder={t.common.placeholder.callsign}
						required={true}
					/>
				{/if}
			</div>

			<FormDate label={t.qso.date} value={datePart} required={true} onchange={handleDateChange} />

			<FormTime label={t.qso.time} value={timePart} required={true} onchange={handleTimeChange} />

			<FormDate label={t.qso.dateOff} value={datePartOff} onchange={handleDateOffChange} />

			<FormTime label={t.qso.timeOff} value={timePartOff} onchange={handleTimeOffChange} />

			{#if !isEyeball}
				{#if formMode === 'create'}
					<FormSelect
						label={t.qso.band}
						value={band}
						options={bandOptions}
						placeholder={t.common.select.band}
						required={true}
						onchange={handleBandChange}
					/>

					<FormInput
						label={t.qso.freq}
						value={freq}
						placeholder={t.common.placeholder.freq}
						oninput={handleFreqInput}
					>
						{#snippet suffix()}
							<span class="text-[var(--text-body)]">{t.common.unit.mhz}</span>
						{/snippet}
					</FormInput>
				{:else}
					<FormSelect
						label={t.qso.band}
						bind:value={band}
						options={bandOptions}
						placeholder={t.common.select.band}
						required={true}
					/>

					<FormInput label={t.qso.freq} bind:value={freq} placeholder={t.common.placeholder.freq}>
						{#snippet suffix()}
							<span class="text-[var(--text-body)]">{t.common.unit.mhz}</span>
						{/snippet}
					</FormInput>
				{/if}
			{/if}

			{#if formMode === 'create'}
				<FormSelect
					label={t.qso.mode}
					value={qsoMode}
					options={modeOptions}
					placeholder={t.common.select.mode}
					onchange={handleModeChange}
				/>
			{:else}
				<FormSelect
					label={t.qso.mode}
					bind:value={qsoMode}
					options={modeOptions}
					placeholder={t.common.select.mode}
				/>
			{/if}

			<div class="grid grid-cols-2 gap-[var(--space-4)] sm:col-span-2">
				{#if formMode === 'create'}
					<FormInput
						label={t.qso.rstSent}
						value={rstSent}
						oninput={(v) => {
							rstSent = v;
							saved = false;
						}}
					/>
					<FormInput
						label={t.qso.rstRcvd}
						value={rstRcvd}
						oninput={(v) => {
							rstRcvd = v;
							saved = false;
						}}
					/>
				{:else}
					<FormInput label={t.qso.rstSent} bind:value={rstSent} />
					<FormInput label={t.qso.rstRcvd} bind:value={rstRcvd} />
				{/if}
			</div>
		</div>

		{#if formMode === 'create'}
			<CollapsibleSection title={t.qso.sectionDetails}>
				<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
					<FormInput label={t.qso.name} bind:value={optName} />
					<FormInput label={t.qso.qth} bind:value={optQth} />
					<FormInput label={t.qso.gridSquare} bind:value={optGrid} />
					<FormInput label={t.qso.power} bind:value={optPower} placeholder={t.common.unit.watts} />
					<FormInput label={t.qso.propMode} bind:value={optPropMode} />
					<FormInput label={t.qso.submode} bind:value={optSubmode} />
					<FormInput label={t.qso.satName} bind:value={optSatName} />
					<FormInput label={t.qso.operator} bind:value={optOperator} />
					<div class="sm:col-span-2">
						<FormInput label={t.qso.comment} bind:value={optComment} />
					</div>
				</div>
			</CollapsibleSection>
		{:else}
			<CollapsibleSection title={t.qso.optionalFields}>
				<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
					<FormInput label={t.qso.name} bind:value={optName} />
					<FormInput label={t.qso.qth} bind:value={optQth} />
					<FormInput label={t.qso.gridSquare} bind:value={optGrid} />
					<FormInput label={t.qso.power} bind:value={optPower} placeholder={t.common.unit.watts} />
					<FormInput label={t.qso.propMode} bind:value={optPropMode} />
					<div class="sm:col-span-2">
						<FormInput label={t.qso.comment} bind:value={optComment} />
					</div>
				</div>
			</CollapsibleSection>

			<CollapsibleSection title={t.qso.sectionDetails}>
				<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
					<FormInput label={t.qso.submode} bind:value={optSubmode} />
					<FormInput label={t.qso.satName} bind:value={optSatName} />
					<FormInput label={t.qso.operator} bind:value={optOperator} />
				</div>
			</CollapsibleSection>
		{/if}

		<CollapsibleSection title={t.qso.sectionLocation}>
			<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
				<FormInput label={t.qso.latitude} type={numericType} bind:value={optLatitude} />
				<FormInput label={t.qso.longitude} type={numericType} bind:value={optLongitude} />
				<FormInput label={t.qso.antAz} type={numericType} bind:value={optAntAz} />
				<FormInput label={t.qso.antEl} type={numericType} bind:value={optAntEl} />
				<FormInput label={t.qso.distance} type={numericType} bind:value={optDistance} />
			</div>
		</CollapsibleSection>

		<CollapsibleSection title={t.qso.sectionGeography}>
			<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
				<FormInput label={t.qso.dxcc} type={numericType} bind:value={optDxcc} />
				<FormInput label={t.qso.country} bind:value={optCountry} />
				<FormInput label={t.qso.cqZone} type={numericType} bind:value={optCqZone} />
				<FormInput label={t.qso.ituZone} type={numericType} bind:value={optItuZone} />
				<FormSelect label={t.qso.continent} bind:value={optCont} options={contOptions} />
			</div>
		</CollapsibleSection>

		<CollapsibleSection title={t.qso.sectionQsl}>
			<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
				<FormSelect label={t.qso.qslSent} bind:value={optQslSent} options={qslStatusOptions} />
				<FormSelect label={t.qso.qslSentVia} bind:value={optQslSentVia} options={qslViaOptions} />
				<FormSelect label={t.qso.qslRcvd} bind:value={optQslRcvd} options={qslStatusOptions} />
				<FormSelect label={t.qso.qslRcvdVia} bind:value={optQslRcvdVia} options={qslViaOptions} />
				<FormSelect
					label={t.qso.lotwQslSent}
					bind:value={optLotwQslSent}
					options={qslStatusOptions}
				/>
				<FormSelect
					label={t.qso.lotwQslRcvd}
					bind:value={optLotwQslRcvd}
					options={qslStatusOptions}
				/>
				<FormSelect
					label={t.qso.eqslQslSent}
					bind:value={optEqslQslSent}
					options={qslStatusOptions}
				/>
				<FormSelect
					label={t.qso.eqslQslRcvd}
					bind:value={optEqslQslRcvd}
					options={qslStatusOptions}
				/>
			</div>
		</CollapsibleSection>

		<div class="flex items-center gap-[var(--space-3)]">
			<Button type="submit" variant="primary" disabled={submitting}>
				{#if submitting}
					<LoadingSpinner size="sm" />
				{:else}
					{t.common.save}
				{/if}
			</Button>
			{#if formMode === 'edit'}
				<Button variant="ghost" onclick={() => goto('/qso')}>{t.common.cancel}</Button>
			{/if}
		</div>
	</form>

	{#if formMode === 'edit' && ondelete}
		<ConfirmDialog
			bind:open={showDeleteConfirm}
			title={t.qso.deleteConfirm}
			message={t.qso.deleteMessage}
			confirmLabel={t.common.delete}
			cancelLabel={t.common.cancel}
			onconfirm={() => {
				ondelete();
			}}
		/>
	{/if}
{/if}
