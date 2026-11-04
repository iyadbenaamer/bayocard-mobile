package expo.modules.inappupdates

import android.app.Activity
import androidx.core.os.bundleOf
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class InAppUpdatesModule : Module() {
    private val manager: AppUpdateManager by lazy {
        AppUpdateManagerFactory.create(context)
    }

    // Reports a flexible update's background download progress, so JS can
    // offer the "restart to install" prompt once it reaches "downloaded".
    private val installStateListener = InstallStateUpdatedListener { state ->
        sendEvent(
            "onInstallStatusChange",
            bundleOf("status" to installStatusName(state.installStatus())),
        )
    }

    override fun definition() = ModuleDefinition {
        Name("InAppUpdates")

        Events("onInstallStatusChange")

        OnStartObserving {
            manager.registerListener(installStateListener)
        }

        OnStopObserving {
            manager.unregisterListener(installStateListener)
        }

        // Rejects when Play can't answer for this install (e.g. it wasn't
        // installed from Google Play, or the device has no Play Store).
        AsyncFunction("checkForUpdate") { promise: Promise ->
            manager.appUpdateInfo
                .addOnSuccessListener { info -> promise.resolve(toBundle(info)) }
                .addOnFailureListener { err ->
                    promise.reject("ERR_IN_APP_UPDATE_CHECK", err.message, err)
                }
        }

        // One function per update type rather than a single one taking the
        // type as an argument: expo-modules-core only injects the Promise
        // when it's a function's sole parameter.
        AsyncFunction("startImmediateUpdate") { promise: Promise ->
            startUpdate(AppUpdateType.IMMEDIATE, promise)
        }

        AsyncFunction("startFlexibleUpdate") { promise: Promise ->
            startUpdate(AppUpdateType.FLEXIBLE, promise)
        }

        // Installs a downloaded flexible update; Play restarts the app.
        AsyncFunction("completeUpdate") { promise: Promise ->
            manager.completeUpdate()
                .addOnSuccessListener { promise.resolve(null) }
                .addOnFailureListener { err ->
                    promise.reject("ERR_IN_APP_UPDATE_COMPLETE", err.message, err)
                }
        }
    }

    private val context
        get() = requireNotNull(appContext.reactContext) {
            "React Application Context is null"
        }

    // Resolves to "accepted", "canceled", "failed", or "unavailable" when
    // Play has no update of that type to offer right now. Fetches fresh
    // AppUpdateInfo each time, since Play only lets a given info start one
    // flow.
    private fun startUpdate(updateType: Int, promise: Promise) {
        val activity = appContext.currentActivity
        if (activity == null) {
            promise.resolve("unavailable")
            return
        }
        manager.appUpdateInfo
            .addOnSuccessListener { info ->
                if (canStart(info, updateType)) {
                    manager
                        .startUpdateFlow(info, activity, AppUpdateOptions.defaultOptions(updateType))
                        .addOnSuccessListener { resultCode ->
                            promise.resolve(resultName(resultCode))
                        }
                        .addOnFailureListener { err ->
                            promise.reject("ERR_IN_APP_UPDATE_START", err.message, err)
                        }
                } else {
                    promise.resolve("unavailable")
                }
            }
            .addOnFailureListener { err ->
                promise.reject("ERR_IN_APP_UPDATE_CHECK", err.message, err)
            }
    }

    // An immediate update the user already started but left (e.g. by
    // backgrounding the app) reports as in-progress and must be resumed
    // rather than treated as nothing to do.
    private fun canStart(info: AppUpdateInfo, updateType: Int): Boolean =
        when (info.updateAvailability()) {
            UpdateAvailability.UPDATE_AVAILABLE -> info.isUpdateTypeAllowed(updateType)
            UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS ->
                updateType == AppUpdateType.IMMEDIATE
            else -> false
        }

    private fun toBundle(info: AppUpdateInfo) = bundleOf(
        "updateAvailability" to availabilityName(info.updateAvailability()),
        "installStatus" to installStatusName(info.installStatus()),
        "immediateAllowed" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
        "flexibleAllowed" to info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
        "availableVersionCode" to info.availableVersionCode(),
    )

    private fun availabilityName(availability: Int) = when (availability) {
        UpdateAvailability.UPDATE_AVAILABLE -> "available"
        UpdateAvailability.UPDATE_NOT_AVAILABLE -> "not-available"
        UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> "in-progress"
        else -> "unknown"
    }

    private fun installStatusName(status: Int) = when (status) {
        InstallStatus.PENDING -> "pending"
        InstallStatus.DOWNLOADING -> "downloading"
        InstallStatus.DOWNLOADED -> "downloaded"
        InstallStatus.INSTALLING -> "installing"
        InstallStatus.INSTALLED -> "installed"
        InstallStatus.FAILED -> "failed"
        InstallStatus.CANCELED -> "canceled"
        else -> "unknown"
    }

    private fun resultName(resultCode: Int) = when (resultCode) {
        Activity.RESULT_OK -> "accepted"
        Activity.RESULT_CANCELED -> "canceled"
        else -> "failed"
    }
}
