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
    isNotificationActive: boolean;
    lastTriggeredAtMillis: number | null;
  }[];
};
export type PdfSession = {
  session: string;
  pages: { width: number; height: number }[];
};
export interface HouseNative {
  openPdfPreview(uri: string): Promise<PdfSession>;
  renderPdfPage(session: string, index: number, width: number): Promise<string>;
  closePdfPreview(session: string): Promise<void>;
  printPdf(uri: string, name: string): Promise<void>;
  sharePdfs(uris: string[]): Promise<void>;
  saveBackupFile(
    uri: string,
    name: string,
  ): Promise<{ status: 'saved' | 'cancelled'; name: string }>;
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
