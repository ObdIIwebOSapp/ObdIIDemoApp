/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, Elm327Proxy, setTimeout, $L */

/**
 * This component displays appropriate error UI and monitors BT so it can send TryAgain when the problem is resolved.
 */
enyo.kind({
	name: "BluetoothErrorUI",
	kind: enyo.Component,
	events: {
		onTryAgain: "",
		onResumeObdInit: ""
	},
	components: [{
		name: "btDeviceNotConnectedDialog",
		kind: enyo.Dialog,
		components: [{
			style: "text-align:center;",
			content: $L("The OBDII Device is turned off or not plugged in to your car. Please make sure it has power and try again.")
		}, {
			layoutKind: enyo.HFlexLayout,
			pack: "center",
			components: [{
				kind: enyo.Button,
				caption: $L("Try Again"),
				onclick: "_tryAgain"
			}]
		}]
	}, {		
		name: "btDeviceDisconnectedDialog",
		kind: enyo.Dialog,
		components: [{
			style: "text-align:center;",
			content: $L("The OBDII Device has turned off or is out of Bluetooth range.")
		}, {
			layoutKind: enyo.HFlexLayout,
			pack: "center",
			components: [{
				kind: enyo.Button,
				caption: $L("Reconnect"),
				onclick: "_tryAgain"
			}]
		}]
	}, {
		name: "elmUnableToConnectToObdDialog",
		kind: enyo.Dialog,
		components: [{
			style: "text-align:center;",
			content: $L("Unable to connect. Make sure your ignition is on and try again.")
		}, {
			layoutKind: enyo.HFlexLayout,
			pack: "center",
			components: [{
				kind: enyo.Button,
				caption: $L("Try Again"),
				onclick: "_resumeObdInit"
			}]
		}]
	}, {
		name: "btDeviceNotFoundDialog",
		kind: enyo.Dialog,
		components: [{
			style: "text-align:center;",
			content: $L("The OBDII Device has not been added to your Bluetooth trusted list. To add it, launch the Bluetooth application, tap on 'Add Device' and choose 'Other' for the type.")
		}, {
			layoutKind: enyo.HFlexLayout,
			pack: "center",
			components: [{
				kind: enyo.Button,
				caption: $L("Launch Bluetooth"),
				onclick: "_launchBtApp"
			}]
		}, {
			name: "btAppLauncher",
			kind: enyo.PalmService,
			service: "palm://com.palm.applicationManager/",
			method: "launch",
			params: {"id":"com.palm.app.bluetooth"}
		}]
	}, {
		name: "btUnknownErrorDialog",
		kind: enyo.Dialog,
		components: [{
			style: "text-align:center;",
			content: $L("An unexpected problem occured.")
		}, {
			layoutKind: enyo.HFlexLayout,
			pack: "center",
			components: [{
				kind: enyo.Button,
				caption: $L("Try Again"),
				onclick: "_tryAgain"
			}]
		}]
	}],
	
	processError: function(inDetails) {
		// Make sure the BT "error" property is also in "errorCode"
		inDetails.errorCode = inDetails.errorCode || inDetails.error;
		
		var err = inDetails.errorText || inDetails.errorCode || JSON.stringify(inDetails);
		this.error(err);

		if (this.openDialog && this.openDialog.close) {
			this.error("Warning: force-closing error dialog "+this.openDialog.name);
			this.openDialog.close();
		}

		switch (inDetails.errorCode) {
		case Elm327Proxy.kErrorElmDeviceNotFound:
			// Note this calls _watchForTrustedPairing() to monitor BT for when a suitable device is paired
			this.openDialog = this.$.btDeviceNotFoundDialog;
			this.openDialog.open();
			break;
			
		case Elm327Proxy.kErrorElmUnableToConnect:
			this.openDialog = this.$.elmUnableToConnectToObdDialog;
			this.openDialog.open();
			break;
			
		case Elm327Proxy.kErrorBtCouldNotConnect:
			this.openDialog = this.$.btDeviceNotConnectedDialog;
			this.openDialog.open();
			break;
			
		case Elm327Proxy.kErrorBtDisconnected:
			this.openDialog = this.$.btDeviceDisconnectedDialog;
			this.openDialog.open();
			break;
			
		default:
			// Show a generic error dialog and try again
			this.openDialog = this.$.btUnknownErrorDialog;
			this.openDialog.open();
			break;
		}
	},

	_tryAgain: function() {
		this.openDialog.close();
		this.openDialog = undefined;
		this.doTryAgain();
	},

	_resumeObdInit: function() {
		this.openDialog.close();
		this.openDialog = undefined;
		this.doResumeObdInit();
	},

	_launchBtApp: function() {
		this.openDialog.close();
		this.openDialog = undefined;
		this.$.btAppLauncher.call();
		this._watchForTrustedPairing();
	},

	_watchForTrustedPairing: function() {
		// Dynamically creating the component since the way to unsubscribe is to destroy it.
		if (!this.$.btSubscribePair) {
			//TODO: should probably add a timeout in case nothing happens after a minute or two.
			this.createComponent({
				name: "btSubscribePair",
				kind: enyo.PalmService,
				service: "palm://com.palm.bluetooth/gap/",
				method: "subscribepair",
				params: { subscribe: true },
				subscribe: true,
				onSuccess: "_handlePairingNotification",
				onFailure: "_handlePairingFailure"
			});
			this.$.btSubscribePair.call();
		}
	},

	_handlePairingFailure: function(inSender, inResponse) {
		this.log(JSON.stringify(inResponse));
		if (this.$.btSubscribePair) {
			this.$.btSubscribePair.destroy();
		}
		//TODO: send back error letting the user know that there's something seriously wrong
		// and they should reset the device.
	},

	_handlePairingNotification: function(inSender, inResponse) {
		this.log(JSON.stringify(inResponse));
		if (inResponse && inResponse.notification === "notifnpaired") {
			// All the ELM327 devices have no Service Class bits set and the Major and Minor Device classes are "unknown", hence "0x1F00"
			if (inResponse.cod === 0x1F00) {
				if (inResponse.error) {
					//TODO: couldn't pair so display "ur screwed" dlg
				} else {
					this.$.btSubscribePair.destroy(); // According to the docs this is how to cancel a subscription
					this.doTryAgain();
				}
			}
		}
	}
});