package com.appfactory.hausakte.nativecore

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import java.io.File
import java.util.UUID

class HouseNativeModule : Module() {
    private var previews: PdfPreviewStore? = null
    @Synchronized private fun previewStore(): PdfPreviewStore = previews ?: PdfPreviewStore(context).also { previews = it }
    private val context get() = requireNotNull(appContext.reactContext)
    override fun definition() = ModuleDefinition {
        Name("HouseNative")
        AsyncFunction("openPdfPreview") { uri: String -> previewStore().open(uri) }
        AsyncFunction("renderPdfPage") { session: String, index: Int, width: Int -> previewStore().render(session, index, width) }
        AsyncFunction("closePdfPreview") { session: String -> previewStore().close(session) }
        AsyncFunction("printPdf") { uri: String, name: String ->
            val file = privateDocument(context, uri)
            val activity = requireNotNull(appContext.currentActivity)
            val manager = activity.getSystemService(android.content.Context.PRINT_SERVICE) as android.print.PrintManager
            manager.print(name, OriginalPdfPrintAdapter(file, name), null)
            Unit
        }.runOnQueue(Queues.MAIN)
        AsyncFunction("saveBackupFile") { uri: String, name: String, promise: Promise ->
            try {
                val file = privateDocument(context, uri)
                val token = UUID.randomUUID().toString()
                if (!SaveDocumentActivity.begin(token, SaveDocumentActivity.Pending(file, name, promise))) {
                    promise.reject("SAVE_BUSY", "Eine Speicherortauswahl ist bereits geöffnet.", null)
                } else {
                    try { requireNotNull(appContext.currentActivity).startActivity(Intent(context, SaveDocumentActivity::class.java).putExtra("save_token", token)) }
                    catch (_: Exception) { SaveDocumentActivity.finish(token, false, "Die Speicherortauswahl konnte nicht geöffnet werden.") }
                }
            } catch (_: Exception) { promise.reject("SAVE_SOURCE", "Die vorbereitete Backup-Datei ist nicht verfügbar.", null) }
        }.runOnQueue(Queues.MAIN)
        AsyncFunction("deriveBackupKey") { password: String, salt: String, iterations: Int ->
            PasswordKey.derive(password, salt, iterations)
        }
        AsyncFunction("scan") { promise: Promise ->
            val token = UUID.randomUUID().toString()
            if (!ScanActivity.completion.begin(token, promise)) {
                promise.reject("SCAN_BUSY", "Ein Scan ist bereits geöffnet.", null)
            } else {
                try {
                    requireNotNull(appContext.currentActivity).startActivity(
                        Intent(context, ScanActivity::class.java).putExtra("scan_token", token))
                } catch (error: Exception) { ScanActivity.completion.finish(token, null, "Scanner konnte nicht geöffnet werden. PDF-Import bleibt möglich.") }
            }
        }.runOnQueue(Queues.MAIN)
        OnDestroy { ScanActivity.completion.abandon(); previews?.closeAll() }
        AsyncFunction("validatePdf") { uri: String ->
            val file = File(requireNotNull(Uri.parse(uri).path))
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                PdfRenderer(descriptor).use { renderer ->
                    require(renderer.pageCount in 1..2000) { "Leere oder zu umfangreiche PDF." }
                    for (index in 0 until renderer.pageCount) {
                        renderer.openPage(index).use { page ->
                            val bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888)
                            try { page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY) }
                            finally { bitmap.recycle() }
                        }
                    }
                    renderer.pageCount
                }
            }
        }
        AsyncFunction("openPdf") { uri: String ->
            val file = File(requireNotNull(Uri.parse(uri).path))
            val shared = FileProvider.getUriForFile(context, context.packageName + ".house.files", file)
            val intent = Intent(Intent.ACTION_VIEW).setDataAndType(shared, "application/pdf")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }.runOnQueue(Queues.MAIN)
        AsyncFunction("syncReminders") { json: String ->
            val desired = JSONArray(json)
            val ids = mutableSetOf<String>()
            val warnings = mutableListOf<String>()
            for (index in 0 until desired.length()) {
                val reminder = requireNotNull(StoredReminder.fromJson(desired.getJSONObject(index).toString()))
                ids.add(reminder.recordId)
                if (!ReminderScheduler.update(context, reminder)) warnings.add("${reminder.label}: Erinnerung konnte nicht geplant werden.")
                if (ReminderNotifier.availability(context, reminder.isPunctual) != ReminderAvailability.AVAILABLE) warnings.add("${reminder.label}: Benachrichtigungen sind nicht freigegeben.")
                if (reminder.isPunctual && !ReminderScheduler.canScheduleExact(context)) warnings.add("${reminder.label}: Ohne Freigabe für genaue Alarme erinnert Android möglicherweise später.")
            }
            ReminderStore.all(context).filter { !ids.contains(it.recordId) }.forEach {
                if (!ReminderScheduler.cancel(context, it.recordId)) warnings.add("Eine alte Erinnerung konnte nicht vollständig entfernt werden.")
            }
            warnings
        }
        AsyncFunction("reminderStatus") {
            mapOf("notifications" to ReminderNotifier.notificationsEnabled(context),
                "exact" to ReminderScheduler.canScheduleExact(context),
                "doNotDisturb" to ReminderNotifier.doNotDisturbEnabled(context),
                "schedules" to ReminderStore.all(context).map { ReminderScheduler.status(context, it.recordId) })
        }
        AsyncFunction("acknowledge") { id: String -> ReminderNotifier.acknowledge(context, id) }
        AsyncFunction("testReminder") { punctual: Boolean ->
            ReminderNotifier.showTest(context, null, "Hausakte", "house", "Test", null, null, punctual)
        }
        AsyncFunction("openReminderSettings") { exact: Boolean ->
            context.startActivity(reminderSettingsIntent(context, exact))
        }.runOnQueue(Queues.MAIN)
        OnActivityEntersForeground { ReminderScheduler.rescheduleAll(context) }
    }
}
