package com.appfactory.hausakte.nativecore

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioManager
import android.os.SystemClock
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

internal object ReminderScheduler {
    private const val fireAction =
        "com.appfactory.hausakte.nativecore.FIRE_HOUSE_REMINDER"

    fun update(context: Context, reminder: StoredReminder): Boolean {
        val triggerAt = reminder.nextTriggerForUpdate(
            ReminderStore.find(context, reminder.recordId),
            ReminderStore.nextTrigger(context, reminder.recordId),
            System.currentTimeMillis(),
        )
        return scheduleAt(context, reminder, triggerAt)
    }

    fun scheduleNext(context: Context, reminder: StoredReminder): Boolean =
        scheduleAt(context, reminder, reminder.nextTriggerAfter(System.currentTimeMillis()))

    private fun scheduleAt(context: Context, reminder: StoredReminder, triggerAt: Long): Boolean {
        return try {
            val alarmManager = context.getSystemService(AlarmManager::class.java)
            val operation = requireNotNull(firePendingIntent(context, reminder.recordId, false))
            val exact = reminder.isPunctual && canScheduleExact(context)
            if (exact) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        operation,
                    )
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, operation)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    operation,
                )
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, operation)
            }
            // Persist only after Android accepts the alarm. Reusing the PendingIntent
            // replaces its alarm without losing a due but delayed occurrence.
            ReminderStore.save(context, reminder, triggerAt, exact)
            true
        } catch (_: Exception) {
            // A queued old alarm must not deliver a new, unaccepted schedule.
            ReminderStore.planningFailed(context, reminder, triggerAt)
            false
        }
    }

    fun cancelPending(context: Context, recordId: String) {
        val operation = firePendingIntent(context, recordId, true) ?: return
        context.getSystemService(AlarmManager::class.java).cancel(operation)
        operation.cancel()
    }

    fun cancel(context: Context, recordId: String): Boolean {
        ReminderStore.remove(context, recordId)
        return try {
            cancelPending(context, recordId)
            ReminderNotifier.acknowledge(context, recordId)
            true
        } catch (_: Exception) {
            ReminderStore.cancelFailed(context, recordId)
            false
        }
    }

    fun status(context: Context, recordId: String, activeIds: Set<String> = ReminderNotifier.activeRecordIds(context)): Map<String, Any?> = mapOf(
        "recordId" to recordId,
        "isNotificationActive" to activeIds.contains(recordId),
        "lastTriggeredAtMillis" to ReminderStore.lastTriggered(context, recordId),
        "nextTriggerAtMillis" to ReminderStore.nextTrigger(context, recordId),
        "planningState" to ReminderStore.planningState(context, recordId),
        "isExact" to ReminderStore.isExact(context, recordId),
        "deliveryFailed" to ReminderStore.deliveryFailed(context, recordId),
    )

    fun rescheduleAll(context: Context, clockChanged: Boolean = false) {
        ReminderStore.all(context).forEach { reminder ->
            if (clockChanged) {
                scheduleNext(context, reminder)
            } else {
                update(context, reminder)
            }
        }
    }

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java)
            .canScheduleExactAlarms()
    }

    private fun firePendingIntent(
        context: Context,
        recordId: String,
        onlyIfExisting: Boolean,
    ): PendingIntent? {
        val intent = Intent(context, HouseReminderReceiver::class.java)
            .setAction(fireAction)
            .setData(
                Uri.Builder()
                    .scheme("hausakte")
                    .authority("reminder")
                    .appendPath(recordId)
                    .build(),
            )
            .putExtra("record_id", recordId)
        var flags = PendingIntent.FLAG_IMMUTABLE
        flags = flags or if (onlyIfExisting) {
            PendingIntent.FLAG_NO_CREATE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(
            context,
            stableRequestCode(recordId, 0),
            intent,
            flags,
        )
    }
}

internal enum class ReminderAvailability(val wireValue: String) {
    AVAILABLE("available"),
    APP_BLOCKED("appBlocked"),
    CHANNEL_BLOCKED("channelBlocked"),
    UNKNOWN("unknown"),
}

internal object ReminderNotifier {
    private const val normalChannelId = "hausakte_reminders"
    private const val alarmChannelId = "hausakte_alarm_reminders_v1"
    private const val recordNotificationId = 1001
    private const val testNotificationId = 2001
    private const val recordTagPrefix = "meter:"
    private const val testTag = "reminder:test"

    fun channelId(punctual: Boolean): String = if (punctual) alarmChannelId else normalChannelId

    fun availability(context: Context, punctual: Boolean): ReminderAvailability = try {
        if (!notificationsEnabled(context)) {
            ReminderAvailability.APP_BLOCKED
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Reusing the same IDs preserves the user's channel preferences.
            ensureChannels(context)
            val manager = context.getSystemService(NotificationManager::class.java)
            val channel = manager.getNotificationChannel(channelId(punctual))
            val groupBlocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && channel?.group != null) {
                manager.getNotificationChannelGroup(channel.group)?.isBlocked == true
            } else {
                false
            }
            when {
                channel == null -> ReminderAvailability.UNKNOWN
                channel.importance == NotificationManager.IMPORTANCE_NONE || groupBlocked ->
                    ReminderAvailability.CHANNEL_BLOCKED
                else -> ReminderAvailability.AVAILABLE
            }
        } else {
            ReminderAvailability.AVAILABLE
        }
    } catch (_: Exception) {
        ReminderAvailability.UNKNOWN
    }

    fun doNotDisturbEnabled(context: Context): Boolean? = try {
        // Reading the current filter needs no notification-policy access.
        when (context.getSystemService(NotificationManager::class.java).currentInterruptionFilter) {
            NotificationManager.INTERRUPTION_FILTER_ALL -> false
            NotificationManager.INTERRUPTION_FILTER_PRIORITY,
            NotificationManager.INTERRUPTION_FILTER_ALARMS,
            NotificationManager.INTERRUPTION_FILTER_NONE -> true
            else -> null
        }
    } catch (_: Exception) {
        null
    }

    fun notificationsEnabled(context: Context): Boolean {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.N ||
            manager.areNotificationsEnabled()
    }

    fun showRecord(
        context: Context,
        reminder: StoredReminder,
        postedAt: Long = System.currentTimeMillis(),
    ): Long? {
        if (availability(context, reminder.isPunctual) != ReminderAvailability.AVAILABLE) return null
        val channelId = channelId(reminder.isPunctual)
        val category = if (reminder.isPunctual) {
            NotificationCompat.CATEGORY_ALARM
        } else {
            NotificationCompat.CATEGORY_REMINDER
        }
        val latestReading = if (
            !reminder.latestValue.isNullOrBlank()
        ) {
            "Letzter Eintrag: ${reminder.latestValue} ${reminder.latestUnit.orEmpty()}".trim()
        } else {
            "Noch kein Eintrag"
        }
        val summary = "${reminder.categoryLabel} · $latestReading"
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(notificationIcon(reminder.category))
            .setColor(notificationColor(reminder.category))
            .setContentTitle("${reminder.categoryLabel} · ${reminder.label}")
            .setContentText(summary)
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "$latestReading\nJetzt Wartung, Reparatur oder Prüfung in der Hausakte eintragen.",
                ),
            )
            .apply { configureLegacySound(this, reminder.isPunctual) }
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(category)
            .setAutoCancel(true)
            .setWhen(postedAt)
            .setShowWhen(true)
            .setContentIntent(openRecordIntent(context, reminder.recordId))
            .build()
        context.getSystemService(NotificationManager::class.java).notify(
            recordTag(reminder.recordId),
            recordNotificationId,
            notification,
        )
        return postedAt
    }

    private fun notificationIcon(category: String): Int = when (category) {
        "electricity" -> R.drawable.ic_stat_house
        "electricityFeedIn" -> R.drawable.ic_stat_house
        "gas" -> R.drawable.ic_stat_house
        "water" -> R.drawable.ic_stat_house
        "coldWater" -> R.drawable.ic_stat_house
        "hotWater" -> R.drawable.ic_stat_house
        "heat" -> R.drawable.ic_stat_house
        "heatingCostAllocator" -> R.drawable.ic_stat_house
        "oil" -> R.drawable.ic_stat_house
        else -> R.drawable.ic_stat_house
    }

    private fun notificationColor(category: String): Int = when (category) {
        "electricity" -> Color.rgb(18, 102, 107)
        "electricityFeedIn" -> Color.rgb(18, 102, 107)
        "gas" -> Color.rgb(18, 102, 107)
        "water" -> Color.rgb(18, 102, 107)
        "coldWater" -> Color.rgb(18, 102, 107)
        "hotWater" -> Color.rgb(18, 102, 107)
        "heat" -> Color.rgb(18, 102, 107)
        "heatingCostAllocator" -> Color.rgb(18, 102, 107)
        "oil" -> Color.rgb(18, 102, 107)
        else -> Color.rgb(18, 102, 107)
    }

    fun migrateLegacyNotification(context: Context, reminder: StoredReminder) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val legacy = manager.activeNotifications.firstOrNull { notification ->
            notification.tag == null &&
                notification.id == stableRequestCode(reminder.recordId, 0)
        } ?: return
        manager.cancel(legacy.id)
        if (showRecord(context, reminder, legacy.postTime) != null) {
            ReminderStore.setLastTriggered(
                context,
                reminder.recordId,
                legacy.postTime,
            )
        }
    }

    fun showTest(
        context: Context,
        recordId: String?,
        label: String,
        category: String,
        categoryLabel: String,
        latestValue: String?,
        latestUnit: String?,
        punctual: Boolean,
    ): String {
        val availability = availability(context, punctual)
        if (availability != ReminderAvailability.AVAILABLE) return availability.wireValue
        val latestReading = if (!latestValue.isNullOrBlank()) {
            "Letzter Eintrag: $latestValue ${latestUnit.orEmpty()}".trim()
        } else {
            "Noch kein Eintrag"
        }
        val target = if (recordId.isNullOrBlank()) "die App" else "die Akte"
        val notification = NotificationCompat.Builder(
            context,
            channelId(punctual),
        )
            .setSmallIcon(notificationIcon(category))
            .setColor(notificationColor(category))
            .setContentTitle("Test: $categoryLabel · $label")
            .setContentText(latestReading)
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "$latestReading\nDas ist eine Test-Erinnerung. Tippen öffnet $target.",
                ),
            )
            .apply { configureLegacySound(this, punctual) }
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(
                if (punctual) {
                    NotificationCompat.CATEGORY_ALARM
                } else {
                    NotificationCompat.CATEGORY_REMINDER
                },
            )
            .setAutoCancel(true)
            .setTimeoutAfter(60_000L)
            .setContentIntent(
                if (recordId.isNullOrBlank()) {
                    openAppIntent(context)
                } else {
                    openRecordIntent(context, recordId)
                },
            )
            .build()
        return try {
            scheduleLegacyTestExpiry(context)
            context.getSystemService(NotificationManager::class.java).notify(
                testTag,
                testNotificationId,
                notification,
            )
            "posted"
        } catch (_: Exception) {
            "failed"
        }
    }

    fun acknowledge(context: Context, recordId: String) {
        context.getSystemService(NotificationManager::class.java)
            .cancel(recordTag(recordId), recordNotificationId)
    }

    fun activeRecordIds(context: Context): Set<String> {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return emptySet()
        return context.getSystemService(NotificationManager::class.java)
            .activeNotifications
            .mapNotNull { notification ->
                notification.tag
                    ?.takeIf { it.startsWith(recordTagPrefix) }
                    ?.removePrefix(recordTagPrefix)
            }
            .toSet()
    }

    private fun configureLegacySound(builder: NotificationCompat.Builder, punctual: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return
        val sound = RingtoneManager.getDefaultUri(if (punctual) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        builder.setSound(sound, if (punctual) AudioManager.STREAM_ALARM else AudioManager.STREAM_NOTIFICATION)
            .setVibrate(longArrayOf(0L, 200L, 100L, 200L))
    }

    internal const val expireTestAction = "com.appfactory.hausakte.nativecore.EXPIRE_REMINDER_TEST"

    private fun scheduleLegacyTestExpiry(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return
        val deadline = SystemClock.elapsedRealtime() + 60_000L
        val operation = PendingIntent.getBroadcast(context, 2002,
            Intent(context, HouseReminderReceiver::class.java).setAction(expireTestAction)
                .putExtra("deadline", deadline),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        context.getSystemService(AlarmManager::class.java).setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, operation)
    }

    fun expireTest(context: Context, intent: Intent) {
        // A previously queued expiration must not remove a newer test early.
        if (SystemClock.elapsedRealtime() < intent.getLongExtra("deadline", Long.MAX_VALUE)) return
        context.getSystemService(NotificationManager::class.java).cancel(testTag, testNotificationId)
    }

    private fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val normal = NotificationChannel(
            normalChannelId,
            "Hausakte-Erinnerungen",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Optionale Erinnerungen für regelmäßige Einträge."
            enableVibration(true)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
        }
        val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val alarm = NotificationChannel(
            alarmChannelId,
            "Pünktliche Hausakte-Erinnerungen",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Pünktliche Hausakte-Erinnerungen mit Alarmton."
            enableVibration(true)
            setSound(
                alarmSound,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
        }
        manager.createNotificationChannels(listOf(normal, alarm))
    }

    private fun openRecordIntent(context: Context, recordId: String): PendingIntent {
        val intent = (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW, Uri.parse("hausakte://")).setPackage(context.packageName))
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("hausakte://record/$recordId"))
            .putExtra("record_id", recordId)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(
            context,
            stableRequestCode(recordId, 1),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun openAppIntent(context: Context): PendingIntent {
        val intent = (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW, Uri.parse("hausakte://")).setPackage(context.packageName))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(
            context,
            stableRequestCode(testTag, 1),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun recordTag(recordId: String) = recordTagPrefix + recordId
}

internal fun stableRequestCode(value: String, salt: Int): Int {
    var hash = 0x811c9dc5L
    value.forEach { character ->
        hash = hash xor character.code.toLong()
        hash = (hash * 0x01000193L) and 0x7fffffffL
    }
    return ((hash + salt) and 0x7fffffffL).toInt().coerceAtLeast(1)
}
