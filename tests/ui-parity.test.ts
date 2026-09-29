import { expect, it } from 'vitest';
import {
  calendarCells,
  localDate,
  parseDateInput,
} from '../src/core/ui/date-time-model';
import { needsReminderRepair } from '../src/features/records/reminder-repair';
import type { ReminderStatus } from '../src/core/native/house-native';
import { record } from './support';

it('uses local dates, Monday-first calendars and rejects invalid typed dates', () => {
  const date = localDate('2024-02-29');
  expect([
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
  ]).toEqual([2024, 1, 29, 0]);
  const first = new Date(2000, 0, 1),
    last = new Date(2100, 11, 31);
  expect(parseDateInput('29.02.2024', first, last)).toEqual(date);
  for (const value of [
    '29.02.2023',
    '31.04.2024',
    '1.1.1999',
    '1.1.2101',
    '2024-02-29',
  ])
    expect(parseDateInput(value, first, last)).toBeNull();
  expect(calendarCells(new Date(2024, 1, 1)).slice(0, 7)).toEqual([
    null,
    null,
    null,
    1,
    2,
    3,
    4,
  ]);
  expect(calendarCells(new Date(2024, 1, 1)).filter(Boolean)).toHaveLength(29);
});

it('offers repair for missing, failed and inexact schedules without changing a valid schedule', () => {
  const r = record({
    reminder: {
      interval: 'daily',
      day: 1,
      month: 1,
      hour: 9,
      minute: 0,
      startsAtMillis: Date.now(),
      deliveryMode: 'punctualWithSound',
    },
  });
  const status: ReminderStatus = {
    notifications: true,
    exact: true,
    doNotDisturb: false,
    schedules: [],
  };
  expect(needsReminderRepair(r)).toBe(false);
  expect(needsReminderRepair(r, status)).toBe(true);
  status.schedules.push({
    recordId: r.id,
    planningState: 'scheduled',
    nextTriggerAtMillis: Date.now() + 100000,
    isExact: true,
    deliveryFailed: false,
    isNotificationActive: false,
    lastTriggeredAtMillis: null,
  });
  expect(needsReminderRepair(r, status)).toBe(false);
  status.schedules[0]!.isExact = false;
  expect(needsReminderRepair(r, status)).toBe(true);
  r.reminder!.deliveryMode = 'normal';
  expect(needsReminderRepair(r, status)).toBe(false);
  r.reminder = null;
  status.schedules[0]!.planningState = 'cancelFailed';
  expect(needsReminderRepair(r, status)).toBe(true);
  status.schedules = [];
  expect(needsReminderRepair(r, status)).toBe(false);
});
