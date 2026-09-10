package com.panya.agent

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class PanyaSpeechModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening: Boolean = false

    override fun getName(): String = "PanyaSpeechModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun isRecognitionAvailable(promise: Promise) {
        val available = SpeechRecognizer.isRecognitionAvailable(reactContext)
        promise.resolve(available)
    }

    @ReactMethod
    fun startListening(locale: String?, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
                    promise.reject("UNAVAILABLE", "Speech recognition is not available on this device.")
                    return@runOnUiThread
                }

                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext).apply {
                        setRecognitionListener(this@PanyaSpeechModule)
                    }
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    val lang = if (!locale.isNullOrBlank()) locale else Locale.getDefault().toLanguageTag()
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
                }

                speechRecognizer?.startListening(intent)
                isListening = true
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("START_ERROR", e.localizedMessage, e)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                speechRecognizer?.stopListening()
                isListening = false
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.localizedMessage, e)
            }
        }
    }

    @ReactMethod
    fun destroy(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = null
                isListening = false
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("DESTROY_ERROR", e.localizedMessage, e)
            }
        }
    }

    // React Native EventEmitter required stubs
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // RecognitionListener Callbacks
    override fun onReadyForSpeech(params: Bundle?) {
        val map = Arguments.createMap().apply {
            putBoolean("ready", true)
        }
        sendEvent("onSpeechReady", map)
    }

    override fun onBeginningOfSpeech() {
        val map = Arguments.createMap().apply {
            putBoolean("started", true)
        }
        sendEvent("onSpeechStart", map)
    }

    override fun onRmsChanged(rmsdB: Float) {}

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        isListening = false
        val map = Arguments.createMap().apply {
            putBoolean("ended", true)
        }
        sendEvent("onSpeechEnd", map)
    }

    override fun onError(error: Int) {
        isListening = false
        val errorMessage = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected"
            else -> "Unknown speech error ($error)"
        }
        val map = Arguments.createMap().apply {
            putInt("code", error)
            putString("message", errorMessage)
        }
        sendEvent("onSpeechError", map)
    }

    override fun onResults(results: Bundle?) {
        isListening = false
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val array = Arguments.createArray()
        matches?.forEach { array.pushString(it) }

        val firstMatch = if (!matches.isNullOrEmpty()) matches[0] else ""

        val map = Arguments.createMap().apply {
            putArray("results", array)
            putString("value", firstMatch)
            putString("transcript", firstMatch)
            putBoolean("isFinal", true)
        }
        sendEvent("onSpeechResults", map)
        sendEvent("onSpeechResult", map)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val array = Arguments.createArray()
        matches?.forEach { array.pushString(it) }

        val firstMatch = if (!matches.isNullOrEmpty()) matches[0] else ""

        val map = Arguments.createMap().apply {
            putArray("results", array)
            putString("value", firstMatch)
            putString("transcript", firstMatch)
            putBoolean("isFinal", false)
        }
        sendEvent("onSpeechPartialResults", map)
        sendEvent("onSpeechResult", map)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}
}
