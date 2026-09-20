package com.appfactory.hausakte.nativecore

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import expo.modules.kotlin.Promise
import java.io.File

// Only the current in-process caller owns a completion. Restored activities have
// no caller and are deliberately ignored. Each token completes at most once.
internal class ScanCompletion {
    private var token: String? = null
    private var promise: Promise? = null
    @Synchronized fun begin(id: String, caller: Promise): Boolean {
        if (promise != null) return false
        token = id; promise = caller
        return true
    }
    @Synchronized fun owns(id: String?) = id != null && token == id && promise != null
    @Synchronized fun finish(id: String?, result: String?, error: String? = null) {
        if (!owns(id)) return
        val caller = promise
        promise = null; token = null
        if (error == null) caller?.resolve(result)
        else caller?.reject("SCAN_UNAVAILABLE", error, null)
    }
    @Synchronized fun abandon() { promise = null; token = null }
}

class ScanActivity : ComponentActivity() {
    private val token get() = intent.getStringExtra("scan_token")
    private val launcher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        if (!completion.owns(token)) { finish(); return@registerForActivityResult }
        try {
            if (result.resultCode != Activity.RESULT_OK || result.data == null) {
                completion.finish(token, null)
            } else {
                val pdf = GmsDocumentScanningResult.fromActivityResultIntent(result.data)?.pdf
                    ?: throw IllegalStateException("Der Scanner hat keine PDF zurückgegeben.")
                require(pdf.pageCount in 1..20) { "Der Scan darf höchstens 20 Seiten enthalten." }
                val target = File(cacheDir, "scan-${token}.pdf")
                contentResolver.openInputStream(pdf.uri).use { input ->
                    requireNotNull(input)
                    target.outputStream().use { output -> input.copyTo(output) }
                }
                completion.finish(token, android.net.Uri.fromFile(target).toString())
            }
        } catch (error: Exception) { completion.finish(token, null, error.message ?: "Scan fehlgeschlagen.") }
        finish()
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!completion.owns(token)) { finish(); return }
        if (savedInstanceState != null) return
        val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false).setPageLimit(20)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG, GmsDocumentScannerOptions.RESULT_FORMAT_PDF)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL).build()
        GmsDocumentScanning.getClient(options).getStartScanIntent(this)
            .addOnSuccessListener { sender ->
                if (completion.owns(token)) {
                    try { launcher.launch(IntentSenderRequest.Builder(sender).build()) }
                    catch (error: Exception) { completion.finish(token, null, error.message); finish() }
                } else finish()
            }.addOnFailureListener { error ->
                completion.finish(token, null, "Scanner nicht verfügbar. Google Play Services und beim ersten Start einen Download prüfen. PDF-Import bleibt möglich. ${error.localizedMessage.orEmpty()}")
                finish()
            }
    }
    companion object { internal val completion = ScanCompletion() }
}
