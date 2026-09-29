import type { HouseRecord } from '../../core/domain/models';
import type { ReminderStatus } from '../../core/native/house-native';

export function needsReminderRepair(
  record: HouseRecord,
  status?: ReminderStatus,
): boolean {
  if (!status) return false;
  const schedule = status.schedules.find((item) => item.recordId === record.id);
  return (
    schedule?.planningState === 'cancelFailed' ||
    (!!record.reminder &&
      (schedule?.planningState !== 'scheduled' ||
        !schedule.nextTriggerAtMillis ||
        (record.reminder.deliveryMode === 'punctualWithSound' &&
          schedule.isExact === false)))
  );
}
