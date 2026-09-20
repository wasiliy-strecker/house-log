package com.appfactory.hausakte.nativecore

import expo.modules.kotlin.Promise
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class CalendarAndScannerTest {
    @Test fun nativePasswordDerivationMatchesOpenSslWithUnicode() {
        assertEquals("f2301eb4e771957c77bf0b24519cd0624017347b00adb74addc2a426db8883a4",
            PasswordKey.derive("Synthetisches Passwort ä🔑", "00112233445566778899aabbccddeeff", 600000))
    }
    private val berlin = ZoneId.of("Europe/Berlin")
    private fun reminder(interval: String = "monthly", day: Int = 31, month: Int? = 2, hour: Int = 9) = StoredReminder(
        "house", "Haus", "house", "Haus", null, null, interval, day, month, hour, 30, "normal", 1000L)
    @Test fun monthlyClampsToLastDayAndYearlyHandlesLeapYears() {
        val monthly = reminder().nextTriggerAfter(Instant.parse("2026-02-01T00:00:00Z").toEpochMilli(), berlin)
        assertEquals("2026-02-28T08:30:00Z", Instant.ofEpochMilli(monthly).toString())
        val yearly = reminder("yearly", 29).nextTriggerAfter(Instant.parse("2027-03-01T00:00:00Z").toEpochMilli(), berlin)
        assertEquals("2028-02-29T08:30:00Z", Instant.ofEpochMilli(yearly).toString())
    }
    @Test fun daylightSavingGapAndTimezoneAreRecomputed() {
        val daily = reminder("daily", hour = 2)
        val before = Instant.parse("2026-03-28T23:00:00Z").toEpochMilli()
        assertEquals("2026-03-29T01:30:00Z", Instant.ofEpochMilli(daily.nextTriggerAfter(before, berlin)).toString())
        assertNotEquals(daily.nextTriggerAfter(before, berlin), daily.nextTriggerAfter(before, ZoneId.of("America/New_York")))
    }
    @Test fun hourlyUsesItsStartAnchorAndUpdatesDoNotSkipDelayedOccurrence() {
        val hourly = reminder("hourly")
        assertEquals(3601000L, hourly.nextTriggerAfter(1001L, berlin))
        val original = reminder()
        assertEquals(100L, original.copy(label = "Neuer Name").nextTriggerForUpdate(original, 100L, 10000L, berlin))
    }
    @Test fun weeklySchedulesTheChosenWeekday() {
        assertEquals("2026-09-21T07:30:00Z", Instant.ofEpochMilli(reminder("weekly", 1).nextTriggerAfter(Instant.parse("2026-09-20T00:00:00Z").toEpochMilli(), berlin)).toString())
    }
    private class Result : Promise {
        var resolved = 0
        var rejected = 0
        override fun resolve(value: Any?) { resolved++ }
        override fun reject(code: String?, message: String?, cause: Throwable?) { rejected++ }
    }
    @Test fun scannerIgnoresOrphanAndDuplicateResults() {
        val completion = ScanCompletion(); val caller = Result()
        completion.finish("orphan", null)
        assertTrue(completion.begin("one", caller)); assertFalse(completion.begin("two", Result()))
        completion.finish("wrong-token", "file://wrong")
        assertEquals(0, caller.resolved)
        completion.finish("one", null); completion.finish("one", "file://late")
        assertEquals(1, caller.resolved); assertFalse(completion.owns("one"))
    }
    @Test fun lostProcessAndStartFailureCanBeRetried() {
        val completion = ScanCompletion(); val old = Result()
        completion.begin("one", old); completion.abandon(); completion.finish("one", "file://orphan")
        assertEquals(0, old.resolved)
        val next = Result(); assertTrue(completion.begin("two", next)); completion.finish("two", null, "unavailable")
        assertEquals(1, next.rejected); assertTrue(completion.begin("three", Result()))
    }
}
