import { requireNativeModule } from 'expo';
export type ReminderStatus = {
  notifications: boolean;
  exact: boolean;
  doNotDisturb: boolean | null;
  schedules: {
    recordId: string;
    nextTriggerAtMillis: number | null;
    planningState: string;
    isExact: boolean | null;
    deliveryFailed: boolean;
  }[];
};
export interface HouseNative {
  deriveBackupKey(
    password: string,
    salt: string,
    iterations: number,
  ): Promise<string>;
  scan(): Promise<string | null>;
  validatePdf(uri: string): Promise<number>;
  openPdf(uri: string): Promise<void>;
  syncReminders(json: string): Promise<string[]>;
  reminderStatus(): Promise<ReminderStatus>;
  acknowledge(id: string): Promise<void>;
  testReminder(punctual: boolean): Promise<string>;
  openReminderSettings(exact: boolean): Promise<void>;
}
export const houseNative = requireNativeModule<HouseNative>('HouseNative');
