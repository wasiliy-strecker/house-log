package com.appfactory.hausakte.nativecore

import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider

internal fun pdfShareIntent(context: Context, uris: List<String>): Intent {
    require(uris.size in 1..20) { "Keine oder zu viele Protokollteile." }
    val shared = ArrayList(uris.map { uri ->
        val file = privateDocument(context, uri)
        require(file.extension.equals("pdf", ignoreCase = true)) { "Nur PDFs können als Protokoll geteilt werden." }
        FileProvider.getUriForFile(context, context.packageName + ".house.files", file)
    })
    val clips = ClipData.newUri(context.contentResolver, "Hausprotokoll", shared.first())
    shared.drop(1).forEach { clips.addItem(ClipData.Item(it)) }
    val intent = Intent(Intent.ACTION_SEND_MULTIPLE).setType("application/pdf")
        .putParcelableArrayListExtra(Intent.EXTRA_STREAM, shared)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    intent.clipData = clips
    return Intent.createChooser(intent, "Alle Protokollteile teilen")
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
}
