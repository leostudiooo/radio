import { describe, expect, it } from 'vitest';
import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';
import {
	activeEquipmentDefaults,
	applyQuickModeDefaults,
	composeQuickComment,
	initialQuickDefaults,
	powerOptions,
	recentFrequencyOptions
} from './quick-qso';

function createQSO(overrides: Partial<QSO> = {}): QSO {
	return {
		id: 'qso-1',
		profile_id: 'profile-1',
		callsign: 'K1ABC',
		time_on: '2026-07-13T12:00:00Z',
		band: '70cm',
		freq: 430.61,
		mode: 'FM',
		rst_sent: '59',
		rst_rcvd: '59',
		tx_pwr: 5,
		is_eyeball: false,
		created_at: '2026-07-13T12:00:00Z',
		updated_at: '2026-07-13T12:00:00Z',
		...overrides
	};
}

function createEquipment(overrides: Partial<Equipment> = {}): Equipment {
	return {
		id: 'eq-1',
		profile_id: 'profile-1',
		name: 'TH-D75',
		type: 'transceiver',
		is_active: true,
		created_at: '2026-07-13T12:00:00Z',
		...overrides
	};
}

describe('Quick QSO helpers', () => {
	it('defaults create mode to handheld FM logging values', () => {
		expect(initialQuickDefaults('create')).toEqual({
			logMode: 'quick',
			band: '70cm',
			mode: 'FM',
			rstSent: '59',
			rstRcvd: '59',
			power: '5'
		});
		expect(initialQuickDefaults('edit')).toMatchObject({
			logMode: 'standard',
			band: '',
			mode: ''
		});
	});

	it('fills blank fields when switching back to Quick mode without overwriting explicit values', () => {
		expect(
			applyQuickModeDefaults({
				logMode: 'standard',
				band: '',
				mode: '',
				rstSent: '',
				rstRcvd: '',
				power: ''
			})
		).toMatchObject({
			logMode: 'quick',
			band: '70cm',
			mode: 'FM',
			rstSent: '59',
			rstRcvd: '59',
			power: '5'
		});
		expect(
			applyQuickModeDefaults({
				logMode: 'standard',
				band: '2m',
				mode: 'AM',
				rstSent: '57',
				rstRcvd: '55',
				power: '2'
			})
		).toMatchObject({
			band: '2m',
			mode: 'AM',
			rstSent: '57',
			rstRcvd: '55',
			power: '2'
		});
	});

	it('builds frequency and power presets from recent QSOs before fallbacks', () => {
		const recent = [
			createQSO({ freq: 439.125, tx_pwr: 10 }),
			createQSO({ id: 'qso-2', freq: 430.61, tx_pwr: 5 }),
			createQSO({ id: 'qso-3', freq: 439.125, tx_pwr: 10 })
		];

		expect(recentFrequencyOptions(recent).slice(0, 3)).toEqual(['439.125', '430.61', '438']);
		expect(powerOptions(recent).slice(0, 3)).toEqual(['10', '5', '2']);
	});

	it('composes helper station fields into the comment without schema changes', () => {
		expect(
			composeQuickComment(
				{
					myRig: 'My rig',
					myAntenna: 'My antenna',
					otherRig: 'Other rig',
					otherPower: 'Other power',
					otherAntenna: 'Other antenna',
					otherQth: 'Other QTH'
				},
				{
					notes: 'Nice handheld QSO',
					myRig: 'TH-D75',
					myAntenna: 'Rubber duck',
					otherRig: 'UV-5R',
					otherPower: '5W',
					otherAntenna: '',
					otherQth: 'Pudong'
				}
			)
		).toBe(
			'Nice handheld QSO\nMy rig: TH-D75; My antenna: Rubber duck; Other rig: UV-5R; Other power: 5W; Other QTH: Pudong'
		);
	});

	it('selects active rig and antenna defaults from active equipment hints', () => {
		const defaults = activeEquipmentDefaults([
			createEquipment({ name: 'FT-991A' }),
			createEquipment({ id: 'eq-2', name: 'GP antenna', type: 'antenna' })
		]);

		expect(defaults).toEqual({ rig: 'FT-991A', antenna: 'GP antenna' });
	});
});
