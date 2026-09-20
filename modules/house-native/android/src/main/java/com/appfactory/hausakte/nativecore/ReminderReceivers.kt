package com.appfactory.hausakte.nativecore

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class HouseReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ReminderNotifier.expireTestAction) {
            ReminderNotifier.expireTest(context, intent)
            return
        }
        val recordId = intent.getStringExtra("record_id") ?: return
        if (ReminderStore.planningState(context, recordId) == "failed") return
        val reminder = ReminderStore.find(context, recordId) ?: return
        val nextTrigger = ReminderStore.nextTrigger(context, recordId)
        // A previously queued broadcast may arrive after an edit or delivery.
        if (nextTrigger != null && nextTrigger > System.currentTimeMillis()) return
        try {
            val postedAt = ReminderNotifier.showRecord(context, reminder)
            if (postedAt != null) {
                ReminderStore.setLastTriggered(context, recordId, postedAt)
                ReminderStore.setDeliveryFailed(context, recordId, false)
            } else if (ReminderNotifier.availability(context, reminder.isPunctual) == ReminderAvailability.UNKNOWN) {
                ReminderStore.setDeliveryFailed(context, recordId, true)
            }
        } catch (_: Exception) {
            ReminderStore.setDeliveryFailed(context, recordId, true)
        } finally {
            ReminderScheduler.scheduleNext(context, reminder)
            context.sendBroadcast(Intent(REMINDER_STATUS_CHANGED).setPackage(context.packageName))
        }
    }
}

class ReminderRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderScheduler.rescheduleAll(
            context,
            clockChanged = intent.action == Intent.ACTION_TIME_CHANGED ||
                intent.action == Intent.ACTION_TIMEZONE_CHANGED,
        )
        context.sendBroadcast(Intent(REMINDER_STATUS_CHANGED).setPackage(context.packageName))
    }
}
