package com.appfactory.hausakte.nativecore

import android.content.Context
import org.json.JSONObject
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.TemporalAdjusters

internal const val REMINDER_STATUS_CHANGED =
    "com.appfactory.hausakte.nativecore.REMINDER_STATUS_CHANGED"

internal data class StoredReminder(
    val recordId: String,
    val label: String,
    val category: String,
    val categoryLabel: String,
    val latestValue: String?,
    val latestUnit: String?,
    val interval: String,
    val day: Int,
    val month: Int?,
    val hour: Int,
    val minute: Int,
    val deliveryMode: String,
    val startsAtMillis: Long? = null,
) {
    val isPunctual: Boolean
        get() = deliveryMode == "punctualWithSound"

    fun toJson(): String = JSONObject()
        .put("recordId", recordId)
        .put("label", label)
        .put("category", category)
        .put("categoryLabel", categoryLabel)
        .put("latestValue", latestValue)
        .put("latestUnit", latestUnit)
        .put("interval", interval)
        .put("day", day)
        .put("month", month)
        .put("hour", hour)
        .put("minute", minute)
        .put("deliveryMode", deliveryMode)
        .put("startsAtMillis", startsAtMillis)
        .toString()

    // Content and delivery-mode changes must not skip an outstanding occurrence.
    fun nextTriggerForUpdate(
        previous: StoredReminder?,
        pendingTriggerAtMillis: Long?,
        nowMillis: Long,
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): Long {
        if (previous != null && pendingTriggerAtMillis != null && sameTiming(previous)) {
            return pendingTriggerAtMillis
        }
        return nextTriggerAfter(nowMillis, zoneId)
    }

    private fun sameTiming(other: StoredReminder): Boolean {
        if (recordId != other.recordId || interval != other.interval) return false
        if (interval == "hourly") return startsAtMillis == other.startsAtMillis
        if (interval == "minutely" && BuildConfig.DEBUG) return true
        if (hour != other.hour || minute != other.minute) return false
        return when (interval) {
            "daily", "minutely" -> true
            "weekly", "monthly" -> day == other.day
            else -> day == other.day && month == other.month
        }
    }

    fun nextTriggerAfter(
        nowMillis: Long,
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): Long {
        if (interval == "hourly") {
            val start = requireNotNull(startsAtMillis) {
                "An hourly reminder needs a start timestamp"
            }
            if (start > nowMillis) return start
            val hourMillis = 60L * 60L * 1000L
            return start + ((nowMillis - start) / hourMillis + 1L) * hourMillis
        }
        val now = Instant.ofEpochMilli(nowMillis).atZone(zoneId)
        val time = LocalTime.of(hour.coerceIn(0, 23), minute.coerceIn(0, 59))
        val candidate = when (interval) {
            "minutely" -> if (BuildConfig.DEBUG) {
                nextMinutely(now)
            } else {
                nextDaily(now, time, zoneId)
            }
            "daily" -> nextDaily(now, time, zoneId)
            "weekly" -> nextWeekly(now, time, zoneId)
            "yearly" -> nextYearly(now, time, zoneId)
            else -> nextMonthly(now, time, zoneId)
        }
        return candidate.toInstant().toEpochMilli()
    }

    private fun nextMinutely(now: ZonedDateTime): ZonedDateTime =
        now.withSecond(0).withNano(0).plusMinutes(1)

    private fun nextDaily(
        now: ZonedDateTime,
        time: LocalTime,
        zoneId: ZoneId,
    ): ZonedDateTime {
        var date = now.toLocalDate()
        var candidate = atLocal(date, time, zoneId)
        if (!candidate.isAfter(now)) {
            date = date.plusDays(1)
            candidate = atLocal(date, time, zoneId)
        }
        return candidate
    }

    private fun nextWeekly(
        now: ZonedDateTime,
        time: LocalTime,
        zoneId: ZoneId,
    ): ZonedDateTime {
        val weekday = DayOfWeek.of(day.coerceIn(1, 7))
        var date = now.toLocalDate().with(TemporalAdjusters.nextOrSame(weekday))
        var candidate = atLocal(date, time, zoneId)
        if (!candidate.isAfter(now)) {
            date = date.plusWeeks(1)
            candidate = atLocal(date, time, zoneId)
        }
        return candidate
    }

    private fun nextMonthly(
        now: ZonedDateTime,
        time: LocalTime,
        zoneId: ZoneId,
    ): ZonedDateTime {
        var yearMonth = YearMonth.from(now)
        var date = safeDate(yearMonth)
        var candidate = atLocal(date, time, zoneId)
        if (!candidate.isAfter(now)) {
            yearMonth = yearMonth.plusMonths(1)
            date = safeDate(yearMonth)
            candidate = atLocal(date, time, zoneId)
        }
        return candidate
    }

    private fun nextYearly(
        now: ZonedDateTime,
        time: LocalTime,
        zoneId: ZoneId,
    ): ZonedDateTime {
        val safeMonth = (month ?: 1).coerceIn(1, 12)
        var year = now.year
        var date = safeDate(YearMonth.of(year, safeMonth))
        var candidate = atLocal(date, time, zoneId)
        if (!candidate.isAfter(now)) {
            year += 1
            date = safeDate(YearMonth.of(year, safeMonth))
            candidate = atLocal(date, time, zoneId)
        }
        return candidate
    }

    private fun safeDate(yearMonth: YearMonth): LocalDate =
        yearMonth.atDay(day.coerceIn(1, yearMonth.lengthOfMonth()))

    private fun atLocal(
        date: LocalDate,
        time: LocalTime,
        zoneId: ZoneId,
    ): ZonedDateTime = ZonedDateTime.of(date, time, zoneId)

    companion object {
        fun fromJson(value: String): StoredReminder? = try {
            val json = JSONObject(value)
            StoredReminder(
                recordId = json.getString("recordId"),
                label = json.getString("label"),
                category = json.optString("category", "other"),
                categoryLabel = json.optString("categoryLabel", "Sonstiges"),
                latestValue = json.optString("latestValue", "")
                    .takeIf { it.isNotBlank() },
                latestUnit = json.optString("latestUnit", "")
                    .takeIf { it.isNotBlank() },
                interval = json.getString("interval"),
                day = json.getInt("day"),
                month = if (json.isNull("month")) null else json.getInt("month"),
                hour = json.getInt("hour"),
                minute = json.getInt("minute"),
                deliveryMode = json.optString("deliveryMode", "normal"),
                startsAtMillis = if (json.isNull("startsAtMillis")) null
                    else json.getLong("startsAtMillis"),
            ).takeIf { it.interval != "hourly" || it.startsAtMillis != null }
        } catch (_: Exception) {
            null
        }
    }
}

internal object ReminderStore {
    private const val preferencesName = "house_reminder_state"
    private const val schedulePrefix = "schedule:"
    private const val lastTriggeredPrefix = "last_triggered:"
    private const val nextTriggerPrefix = "next_trigger:"
    private const val planningStatePrefix = "planning_state:"
    private const val exactPrefix = "exact:"
    private const val deliveryFailurePrefix = "delivery_failure:"

    private fun preferences(context: Context) =
        context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

    fun save(context: Context, reminder: StoredReminder, nextTriggerAtMillis: Long, exact: Boolean) {
        preferences(context).edit()
            .putString(schedulePrefix + reminder.recordId, reminder.toJson())
            .putLong(nextTriggerPrefix + reminder.recordId, nextTriggerAtMillis)
            .putString(planningStatePrefix + reminder.recordId, "scheduled")
            .putBoolean(exactPrefix + reminder.recordId, exact)
            .apply()
    }

    fun planningFailed(context: Context, reminder: StoredReminder, triggerAt: Long) {
        // Keep the desired schedule for retries, but never report it as accepted.
        preferences(context).edit()
            .putString(schedulePrefix + reminder.recordId, reminder.toJson())
            .putLong(nextTriggerPrefix + reminder.recordId, triggerAt)
            .putString(planningStatePrefix + reminder.recordId, "failed")
            .remove(exactPrefix + reminder.recordId)
            .apply()
    }

    fun cancelFailed(context: Context, recordId: String) {
        preferences(context).edit().putString(planningStatePrefix + recordId, "cancelFailed").apply()
    }

    fun planningState(context: Context, recordId: String): String =
        preferences(context).getString(planningStatePrefix + recordId, null)
            ?: if (find(context, recordId) == null) "none" else "unknown"

    fun isExact(context: Context, recordId: String): Boolean? =
        if (preferences(context).contains(exactPrefix + recordId))
            preferences(context).getBoolean(exactPrefix + recordId, false) else null

    fun deliveryFailed(context: Context, recordId: String): Boolean =
        preferences(context).getBoolean(deliveryFailurePrefix + recordId, false)

    fun setDeliveryFailed(context: Context, recordId: String, failed: Boolean) {
        preferences(context).edit().putBoolean(deliveryFailurePrefix + recordId, failed).apply()
    }

    fun nextTrigger(context: Context, recordId: String): Long? {
        val key = nextTriggerPrefix + recordId
        val values = preferences(context)
        return if (values.contains(key)) values.getLong(key, 0L) else null
    }

    fun find(context: Context, recordId: String): StoredReminder? {
        val value = preferences(context).getString(schedulePrefix + recordId, null)
            ?: return null
        return StoredReminder.fromJson(value)
    }

    fun all(context: Context): List<StoredReminder> = preferences(context).all
        .filterKeys { it.startsWith(schedulePrefix) }
        .values
        .mapNotNull { value -> (value as? String)?.let(StoredReminder::fromJson) }

    fun remove(context: Context, recordId: String) {
        preferences(context).edit()
            .remove(schedulePrefix + recordId)
            .remove(lastTriggeredPrefix + recordId)
            .remove(nextTriggerPrefix + recordId)
            .remove(planningStatePrefix + recordId)
            .remove(exactPrefix + recordId)
            .remove(deliveryFailurePrefix + recordId)
            .apply()
    }

    fun setLastTriggered(context: Context, recordId: String, timestamp: Long) {
        preferences(context).edit()
            .putLong(lastTriggeredPrefix + recordId, timestamp)
            .apply()
    }

    fun lastTriggered(context: Context, recordId: String): Long? {
        val key = lastTriggeredPrefix + recordId
        val values = preferences(context)
        return if (values.contains(key)) values.getLong(key, 0L) else null
    }
}
