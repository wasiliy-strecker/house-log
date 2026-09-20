package com.appfactory.hausakte.nativecore

import android.app.Application
import android.net.Uri
import expo.modules.kotlin.Promise
import java.io.File
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = Application::class)
class DocumentAccessTest {
    private val context get() = RuntimeEnvironment.getApplication()
    private class Result : Promise {
        var completions = 0
        var value: Any? = null
        var error: String? = null
        override fun resolve(value: Any?) { completions++; this.value = value }
        override fun reject(code: String?, message: String?, cause: Throwable?) { completions++; error = code }
    }
    @Test fun previewAndExportCanOnlyReadNonemptyPrivateFiles() {
        val valid = File(context.filesDir, "original.pdf").apply { writeBytes(byteArrayOf(1, 2, 3)) }
        assertEquals(valid.canonicalFile, privateDocument(context, Uri.fromFile(valid).toString()))
        val empty = File(context.cacheDir, "empty.pdf").apply { writeBytes(byteArrayOf()) }
        assertThrows(IllegalArgumentException::class.java) { privateDocument(context, Uri.fromFile(empty).toString()) }
        assertThrows(IllegalArgumentException::class.java) { privateDocument(context, "content://documents/example") }
        val outside = File(context.filesDir.parentFile, "outside.pdf").apply { writeBytes(byteArrayOf(1)) }
        assertThrows(IllegalArgumentException::class.java) { privateDocument(context, Uri.fromFile(outside).toString()) }
        assertThrows(IllegalArgumentException::class.java) { privateDocument(context, "file://${context.filesDir}/../outside.pdf") }
    }
    @Test fun duplicateAndOrphanSaveCallbacksAreIgnoredAndCancellationPreservesSource() {
        val source = File(context.cacheDir, "encrypted.habackup").apply { writeBytes(byteArrayOf(8, 7, 6)) }
        val result = Result()
        assertTrue(SaveDocumentActivity.begin("one", SaveDocumentActivity.Pending(source, source.name, result)))
        assertFalse(SaveDocumentActivity.begin("two", SaveDocumentActivity.Pending(source, source.name, Result())))
        assertNotNull(SaveDocumentActivity.takeForWrite("one"))
        assertNull(SaveDocumentActivity.takeForWrite("one"))
        assertNull(SaveDocumentActivity.takeForWrite("orphan"))
        SaveDocumentActivity.finish("one", false)
        SaveDocumentActivity.finish("one", true)
        SaveDocumentActivity.finish("orphan", false)
        assertEquals(1, result.completions)
        assertEquals("cancelled", (result.value as Map<*, *>)["status"])
        assertArrayEquals(byteArrayOf(8, 7, 6), source.readBytes())
        assertTrue(SaveDocumentActivity.begin("retry", SaveDocumentActivity.Pending(source, source.name, result)))
        SaveDocumentActivity.finish("retry", false, "Synthetic failure")
        assertEquals("SAVE_FAILED", result.error)
        assertTrue(source.exists())
    }
}
