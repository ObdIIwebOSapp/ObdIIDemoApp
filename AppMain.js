/*jslint white: false, undef: true, eqeqeq: true */ 
/*global window, enyo, $L, JSON, Elm327Proxy, ObdIIPid */

enyo.kind({
	name: "AppMain",
	kind: enyo.VFlexBox,
	simulator: true,	//set to true in order to enable the simulation mode
	pack: "center",
	components: [{
		name: "dials",
		kind: enyo.HFlexBox,
		pack: "center",
		components: [{
			name: "speedometer",
			kind: "Speedometer"
		},{
			name: "tachometer",
			kind: "Tachometer"
		}]
	},{
		kind: enyo.HFlexBox,
		pack: "center",
		components: [{
			name: "economymeter",
			kind: "Economymeter",
			showing: false
		}]
	}, {
		name: "appMenu",
		kind: enyo.AppMenu,
		components: [{
			caption: $L("About"),
			onclick: "_showAbout"
		}]
	}, {
	}, {
		name: "aboutPopup",
		kind: "AboutPopup",
		lazy: true
	}, {
		name: "connectionErrHandler",
		kind: "BluetoothErrorUI",
		onTryAgain: "initializeCarTalk",
		onResumeObdInit: "resumeCarTalkInit"
	}, {
		name: "deviceSelector",
		kind: "BluetoothDeviceSelector",
		onSelect: "deviceSelected"
	}, {
		name: "carTalk",
		kind: "Elm327Proxy",
		onConnected: "carTalkConnected",
		onDisconnected: "carTalkDisconnected",
		onDeviceList: "needToSelectDevice",
		onReadResponse: "_handleReadResponse",
		onStatus: "_handleStatus",
		onError: "_handleCarTalkError"
	}, {
		name: "carTalkSimulator",
		kind: "Elm327ProxySimulator",
		onConnected: "carTalkConnected",
		onDisconnected: "carTalkDisconnected",
		onReadResponse: "_handleReadResponse",
		onStatus: "_handleStatus",
		onError: "_handleCarTalkError"
	}, {
		name: "appEvents",
		kind: enyo.ApplicationEvents,
		onUnload: "handleUnload"
	}, { 
		name: "networkAlerts",
		kind: "NetworkAlerts",
		onTap: "_networkAlertResponse"
	}],
	
	create: function() {
		this.inherited(arguments);
		this.speed = 0;
		this.rpm = 0;
		this.intakeAirTemp = 0;
		this.timeouts = [];
		
		if (this.simulator) {
			this._enableSimulation();
		} else {
			this.elmDevice = this.$.carTalk;
		}		

		// Keep the screen on while the app is running
		if (window.PalmSystem) {
			window.PalmSystem.setWindowProperties({blockScreenTimeout:true});
		}
		
		// This should ask the user to setup the bluetooth connection
		this.$.networkAlerts.push({type: "Bluetooth"});
	},

	rendered: function() {
		this.inherited(arguments);
		this._resizeDials();
	},
	
	resizeHandler: function() {
		this.inherited(arguments);
		this._resizeDials();
	},
	
	// When the application is tossed, make sure to close the BT connection
	handleUnload: function() {
		this.$.carTalk.deinitialize();
	},
	
	initializeCarTalk: function() {
		//Note: Bluetooth is on at this point...
		this.elmDevice.initialize();
	},
	
	// Tells the ELM proxy to retry connecting to car's OBD
	resumeCarTalkInit: function(inSender, inDetails) {
		this.elmDevice.resumeInitCommands();
	},

	carTalkConnected: function(inSender, inDetails) {
		this.log("Connected");
		
		this.elmDevice.startPolling(ObdIIPid.engineRpm); //engineRpm === "01 0C"
		this.elmDevice.startPolling(ObdIIPid.vehicleSpeed); //vehicleSpeed === "01 0D"
		
		//Get list of supported PIDs (between 1-20) to see if 10 (MAF) is supported)
		this.elmDevice.getPid(ObdIIPid.supportedPids1);
	},

	carTalkDisconnected: function() {
		// Show a dialog when disconnect (intentional or unintended)
		this.warn("Got disconnected notification");
		this.$.connectionErrHandler.processError({
			errorCode: Elm327Proxy.kErrorBtDisconnected
		});

		for (var pid in this.timeouts) {
			window.clearTimeout(this.timeouts[pid]);
		}
		this.timeouts = [];
	},
	
	needToSelectDevice: function(inSender, inData) {
		this.$.deviceSelector.setData(inData);
		this.$.deviceSelector.openAtCenter(inData);
	},
	
	deviceSelected: function(inSender, inData) {
		this.elmDevice.connectToDevice(inData);
	},

	//
	// Pseudo private functions below 
	//
	
	_enableSimulation: function() {
		this.elmDevice = this.$.carTalkSimulator;
		this.elmDevice.initialize();
		this.carTalkConnected();
	},
	
	_networkAlertResponse: function (inSender, inResponse) {
		// {response: <<"BT-On", "BT-Error", "BT-StartingUp", "BT-UserCancelled">>}
		if (inResponse.response === "BT-On" || inResponse.response === "BT-StartingUp") {
			this.initializeCarTalk();
		}
	},

	_handleReadResponse: function(inSender, inData) {
		//this.log("ReadResponse: "+JSON.stringify(inData));
		//this.log("PID:"+inData.pid);
		
		switch (inData.pid) {
		case ObdIIPid.engineRpm:
			this.rpm = inData.value;
 			this.$.tachometer.animate(inData.value);
 			break;

		case ObdIIPid.vehicleSpeed:
			this.speed = inData.value;
			this.$.speedometer.animate(inData.value);
			break;

		case ObdIIPid.mafAirFlowRate:
			this.$.economymeter.animate(inData.value, this.speed);
			if (this.elmDevice.isConnected()) {
				var that = this;
				this.timeouts[inData.pid] = window.setTimeout(function() {
					that.elmDevice.getPid(inData.pid);
				}, 1000);
			}
			break;

		case ObdIIPid.intakeAirTemp:
			this.intakeAirTemp = inData.value;
			if (this.elmDevice.isConnected()) {
				var that = this;
				this.timeouts[inData.pid] = window.setTimeout(function() {
					that.elmDevice.getPid(inData.pid);
				}, 1000);
			}
		break;
		case ObdIIPid.mapPressure:
			if (this.intakeAirTemp) {
				this.$.economymeter.aniMap(inData.value, this.intakeAirTemp, this.rpm, this.speed);
			}
			if (this.elmDevice.isConnected()) {
				var that = this;
				this.timeouts[inData.pid] = window.setTimeout(function() {
					that.elmDevice.getPid(inData.pid);
				}, 1000);
			}
		break;

		case ObdIIPid.supportedPids1:
			if (inData.value[ObdIIPid.mafAirFlowRate]) {
				// Kickstart the MAF requests
				this.elmDevice.getPid(ObdIIPid.mafAirFlowRate); //mafAirFlowRate === "01 10"
				this.$.economymeter.show();
			} 
			break;
		}
	},
	
	// scale the dials so they fit in landscae or portrait orientation
	_resizeDials: function() {
		var b = this.getBounds();
		if (b.height > b.width) {
			this.$.dials.applyStyle("-webkit-transform", "scale(0.70)");
		} else {
			this.$.dials.applyStyle("-webkit-transform", "scale(1.0)");
		}
	},

	_handleCarTalkError: function(inSender, inDetails) {
		this.$.connectionErrHandler.processError(inDetails);		
	},
	
	_showAbout: function() {
		this.$.aboutPopup.open();
	}
});
