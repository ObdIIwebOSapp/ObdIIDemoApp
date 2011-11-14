/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, Elm327Proxy, ObdIIPidResponse, JSON, Math, parseInt, window, $L */

/*
 * The ELM327 specsheet (including list of commands) can be found here www.elmelectronics.com/DSheets/ELM327DS.pdf
 * A complete list of PIDs and response values is here from http://en.wikipedia.org/wiki/OBD-II_PIDs#Standard_PIDs
 *  
 * "CAN ERROR" most likely means the engine is not running
 * 
 */

var Elm327InitSequence = [
	"AT Z\r",    // reset
	"AT Z\r",    // reset again, just to make sure. This is a workaround for CBT devices to make sure the buffer is empty
	"AT E0\r",   // turn off echo
	"AT L0\r",   // don't include \r in responses
	"AT SP 0\r", // auto-select the protocol
	"01 00\r"    // request the 1-20 pids just to test a request/response
];

enyo.kind({
	name: "Elm327Proxy",
	kind: enyo.Component,
	events: {
		// If there's more than one BT device to connect to, the list is sent up
		// with this event.
		onDeviceList: "",
		// sent when the ELM327 has established a connection to the car's OBDII
		onConnected: "",
		// sent when either the OBDII or the BT SPP connection is lost
		onDisconnected: "",
		// contains responses read from the bus. the event object includes the 
		// following properties: value, units, pid. for unknown and error 
		// responses, the "raw" property contains the raw response bytes
 		onReadResponse: "",
 		// errors on the OBDII or BT connection. 
		onError: "",
		onStatus: ""
	},
	statics: {
		kErrorInvalidDeviceList: -1,
		kErrorElmDeviceNotFound: -2,
		kErrorElmUnableToConnect:-3,
		kErrorBtDisconnected:    -4,
		kErrorBtCouldNotConnect:  263
	},
	components: [{
		name: "bluetooth",
		kind: "BluetoothSppClient",
		onDeviceList: "_handleDeviceListResult",
		onConnected: "_btConnected",
		onDisconnected: "_btDisconnected",
		onReadResponse: "_handleReadResponse",
		onStatus: "doStatus",
		onError: "doError"
	}],
	
	create: function() {
		this.inherited(arguments);
		this.initSequence = 0;
		this._resetInternalStructures();
	},

	initialize: function() {
		this._resetInternalStructures();
		this.$.bluetooth.initialize();
	},

	isConnected: function() {
		return this.elm327Connected;
	},
	
	resumeInitCommands: function() {
		this.initSequence = 0;
		this._resetInternalStructures();
		if (this.$.bluetooth.connected) {
			this._sendInitCommand();
		} else {
			// If BT isn't connected then the system needs to go thru the full connect & initialization sequence 
			this.initialize();
		}
	},
	
	deinitialize: function() {
		this._resetInternalStructures();
		this.$.bluetooth.disconnect();
	},
	
	connectToDevice: function(device) {
		this.doStatus({message:"connecting to "+device.name+" ("+device.address+")"});
		this.$.bluetooth.connect(device.address);
	},

	/*
	 * A one-off request to send a PID
	 */
	getPid: function(pid) {
		// Don't do anything if the pid is already in the polling list since it
		// will get called eventually thru that mechanism. 
		if (!this.pidPolling.list[pid]) {
			var alreadyQuerying = this._continueQuerying();
			this.singleQuery.push(pid);
			if (!alreadyQuerying) {
				this._startNextPidQuery();
			}
		}
	},
	
	/*
	 * Start sending a PID request very frequently. Use stopPolling() to stop. 
	 */
	startPolling: function(pid) {
		if (pid) {
			var alreadyQuerying = this._continueQuerying();
			if (this.pidPolling.list[pid]) {
				this.pidPolling.list[pid].refCount += 1;
			} else {
				this.pidPolling.list[pid] = { refCount: 1 };
				this.pidPolling.numActive += 1;
			}
			
			// If this is the one active PID, start the polling
			if (!alreadyQuerying) {
				this._startNextPidQuery();
			}
		}
	},

	stopPolling: function(pid) {
		if (pid) {
			if (this.pidPolling.list[pid]) {
				this.pidPolling.list[pid].refCount -= 1;
				if (this.pidPolling.list[pid].refCount === 0) {
					delete (this.pidPolling.list[pid]);
					this.pidPolling.numActive -= 1;
				}
			}
		}
	},

	_resetInternalStructures: function() {
		this.singleQuery = [];
		this.pidPolling = {
			numActive: 0,
			currentActive: undefined,
			list: {}
		};
		this.readBuffer = "";
		this.errorRetries = 0;
	},

	_sendPid: function(pid) {
		if (pid) {
			this.doStatus({message:"sending pid: "+pid});
			this.pidPolling.currentActive = pid;
			this.$.bluetooth.write(pid + "\r");
			var that = this;
			window.setTimeout(function() {
				that.$.bluetooth.read(100);
			}, 150);
		}
	},
	
	_btConnected: function(inSender, inDetails) {
		this.doStatus({message:"BT Connected"});
		// Initialize ELM327
		this.initSequence = 0;
		this._sendInitCommand();
	},
	
	_btDisconnected: function(inSender, inDetails) {
		this.initSequence = 0;
		this._resetInternalStructures();		
		this.doDisconnected();
	},

	_sendInitCommand: function() {
		this.doStatus({message:"init sending: "+Elm327InitSequence[this.initSequence]});
		this.$.bluetooth.write(Elm327InitSequence[this.initSequence]);
		var that = this;
		window.setTimeout(function() {
			that.$.bluetooth.read(100);
		}, 250);
	},

	_continueQuerying: function() {
		return (this.singleQuery.length > 0 || this.pidPolling.numActive > 0);
	},

	_startNextPidQuery: function() {
		if (this.singleQuery.length > 0) {
			var pid = this.singleQuery.shift();
			this._sendPid(pid);
		} else {
			var pids = Object.keys(this.pidPolling.list);
			if (this.pidPolling.numActive > 0 && pids.length > 0) {
				var i;
				for (i = 0; i < pids.length; i++) {
					if (pids[i] === this.pidPolling.currentActive) {
						break;
					}
				}
				
				if (i < pids.length) {
					i = i + 1;
				}
				if (i >= pids.length) {
					i = 0;
				}
	
				this._sendPid(pids[i]);
			}
		}
	},

	_handleReadResponse: function(inSender, inResponse, inRequest) {
		if (inResponse.returnValue) {
			this.readBuffer += inResponse.data;
			// Keep reading until we hit the end prompt
			if (this.readBuffer.indexOf(">") === -1 && inResponse.dataLength !== 0) {
				this.$.bluetooth.read(100);
			} else {
				var buff = this.readBuffer;
				//this.doStatus({message:"read: "+buff});
				//this.log("read: "+buff);
				this.readBuffer = "";
				if (buff.indexOf("UNABLE TO CONNECT") !== -1) {
					this.doError({
						errorSource: "elm327",
						errorCode: Elm327Proxy.kErrorElmUnableToConnect,
						errorText: buff
					});
				// "CAN ERROR" most likely means the engine is not running. However, it seems to randomly occur
				// while reading responses, so retry in those cases.
				} else if (buff.indexOf("CAN ERROR") !== -1) {
					this.log("Received CAN ERROR");
					if (this.elm327Connected && ++this.errorRetries < 5) {
						// Retry
						this._sendPid(this.pidPolling.currentActive);
					} else {
						this.doError({
							errorSource: "elm327",
							errorCode: Elm327Proxy.kErrorElmUnableToConnect,
							errorText: buff
						});
					}
				} else if (this.elm327Connected) {
					this.errorRetries = 0;
					var value = { raw: buff };
					var match = ObdIIPidResponse.regexp.exec(buff);
					if (match) {
						var responseObj = ObdIIPidResponse[match[1]];
						if (responseObj && responseObj.formatterFunc) {
							// need to concat the hex values together since the spaces are just ELM formatting
							var readValue = match[2].split(" ").join("");
							value = responseObj.formatterFunc(readValue);
						}
					}
					
					this.doReadResponse(value);

					if (this._continueQuerying()) {
						var func = this._startNextPidQuery.bind(this);
						window.setTimeout(func, 100);
					}
				} else {
					++this.initSequence;
					if (this.initSequence === Elm327InitSequence.length) {
						this.elm327Connected = true;
						this._resetInternalStructures();
						this.doConnected(); // ELM327 is connected and functioning
					} else {
						this._sendInitCommand();
					}
				}
			}
		} else {
			// This should never happen so log the error if it happens
			this.error("_handleReadResponse returnValue should have been true");
			this.error(JSON.stringify(inResponse));
		}
	},

	_handleDeviceListResult: function(inSender, inResponse, inRequest) {
		if (inResponse && Array.isArray(inResponse.trusteddevices)) {
			var i, devicesList = [];
			for (i=0; i<inResponse.trusteddevices.length; i++) {
				var device = inResponse.trusteddevices[i];
				this.log(JSON.stringify(device));
				// All the ELM327 devices have no Service Class bits set and the Major and Minor Device classes are "unknown"
				// This test will catch all such devices (even non-ELM327), but the other option is a hardcoded list of the
				// device names ("PLXDevices*", "ScanTool.net*", "CBT", and others)
				if (device.cod === 0x1F00) {
					devicesList.push(device);
				}
			}

			if (devicesList.length === 0) {
				var serviceNames = inResponse.trusteddevices.map(function(item) { return item.name; });
				this.doError({
					errorSource: "elm327",
					errorCode: Elm327Proxy.kErrorElmDeviceNotFound,
					errorText: "No OBDII device found in trusted list: " + serviceNames.toString()
				});
			} else if (devicesList.length === 1) {
				this.connectToDevice(devicesList[0]);
			} else {
				// Push the list up to user to choose which device to connect to.
				this.doDeviceList(devicesList);
			}
		} else {
			this.error("invalid response: "+JSON.stringify(inResponse));
			this.doError({
				errorSource: "elm327",
				errorCode: Elm327Proxy.kErrorInvalidDeviceList,
				errorText: "Invalid response from bluetooth service: " + JSON.stringify(inResponse)
			});
		}
	}
});
