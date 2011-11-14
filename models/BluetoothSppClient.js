/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, JSON */

/**
 * BluetoothSppClient provides an interface to the bluetooth SPP service.
 * 
 * 1. Call initialize() to start the connect process.
 * 2. Handle onDeviceList, which returns a list of available (trusted) BT devices
 * 3. When onConnected is called, you're ready to read/write. (Watch for the response onReadResponse/onWriteResponse) 
 * 4. Call disconnect() to close and disconnect
 */
enyo.kind({
	name: "BluetoothSppClient",
	kind: enyo.Component,
	events: {
		onDeviceList: "",
		onConnected: "",
		onDisconnected: "",
		onReadResponse: "",
		onWriteResponse: "",
		onError: "",
		onStatus: ""
	},
	components: [{
		name: "getTrustedDevices",
		kind: enyo.PalmService,
		service: "palm://com.palm.bluetooth/gap/",
		method: "gettrusteddevices",
		onSuccess: "doDeviceList",
		onFailure: "_handleDeviceListFailure"
	}, {
		kind: enyo.PalmService,
		service: "palm://com.palm.bluetooth/spp/",
		components: [{
			name: "connect",
			method: "connect",
			//It is not necessary to have a onSuccess because result comes in sppNotifications
			onFailure: "_sppConnectFailure"
		}, {
			name: "disconnect",
			method: "disconnect",
			//It is not necessary to have a onSuccess because result comes in sppNotifications
			onFailure: "_sppDisconnectFailure"
		}, {
			name: "selectService",
			method: "selectservice",
			//It is not necessary to have a onSuccess because result comes in sppNotifications
			onFailure: "_sppSelectFailure"
		}]
	}, {
		kind: enyo.PalmService,
		service: "palm://com.palm.service.bluetooth.spp/",
		components: [{
			name: "openSppPort",
			method: "open",
			onSuccess: "_sppOpenPortResult",
			onFailure: "_sppOpenPortFailure"
		}, {
			name: "closeSppPort",
			method: "close",
			onSuccess: "_sppClosePortResult",
			onFailure: "_sppClosePortFailure"
		}, {
			name: "writeSppPort",
			method: "write",
			onSuccess: "doWriteResponse",
			onFailure: "_sppWriteFailure"
		}, {
			name: "readSppPort",
			method: "read",
			onSuccess: "doReadResponse",
			onFailure: "_sppReadFailure"
		}]
	}],

	create: function() {
		this.inherited(arguments);
		this.connected = false;
	},
	
	initialize: function() {
		this.doStatus({message:"initializing..."});
		
		if (!this.$.subscribeNotifications) {
			// Dynamically creating this because the service component needs to be destroyed 
			// to unsubscribe from a service call. 
			this.createComponent({
				name: "subscribeNotifications",
				kind: enyo.PalmService,
				service: "palm://com.palm.bluetooth/spp/",
				method: "subscribenotifications",
				params: { subscribe: true },
				subscribe: true,
				onSuccess: "_sppNotificationsResult",
				onFailure: "_sppNotificationsFailure"
			});
			this.$.subscribeNotifications.call();
		}
		
		// gettrusteddevices to get a list of paired devices from the Bluetooth service.
		this.$.getTrustedDevices.call({});
	},
	
	connect: function(address) {
		this.address = address; 
		this.$.connect.call({address: address});
	},
	
	disconnect: function(inRequest) {
		//this.doStatus({message:"disconnect requested: instanceId="+this.sppInstanceId+", address="+this.address});
		if (this.sppInstanceId) {
			this.$.closeSppPort.call({instanceId: this.sppInstanceId});
		} else if (this.address) {
			this.$.disconnect.call({address: this.address});
			this.address = undefined;
		}
	},

	write: function(data) {
		this.$.writeSppPort.call({
			instanceId: this.sppInstanceId,
			data: data,
			dataLength: data.length
		});
	},

	read: function(bytesToRead) {
		this.$.readSppPort.call({
			instanceId: this.sppInstanceId,
			dataLength: bytesToRead
		});
	},

	_sppNotificationsResult: function(inSender, inResponse, inRequest) {
		this.log("sppNotificationsResult: "+JSON.stringify(inResponse));
		
		if (inResponse.notification === "notifnconnected") {
			if (inResponse.error > 0) {
				this.doError(inResponse);
			} else if (!this.connected) {
				this.connected = true;
				this.sppInstanceId = inResponse.instanceId;
				this.doStatus({message:"opening port "+this.sppInstanceId});
				this.$.openSppPort.call({instanceId: this.sppInstanceId});
			} else {
				this.doStatus({message:"already connected to instanceId="+this.sppInstanceId});
			}
		} else if (inResponse.notification === "notifndisconnected") {
			this.doStatus({message:"disconnected: instanceId="+this.sppInstanceId});
			this.connected = false;
			this.address = undefined;
			this.sppInstanceId = undefined;
			if (this.$.subscribeNotifications) {
				this.$.subscribeNotifications.destroy();
			}
			this.doDisconnected();
		} else if (inResponse.notification === "notifnservicenames") {
			this.doStatus({message:"servicenames notification: instanceId="+inResponse.instanceId+", service="+inResponse.services[0]});
			this.$.selectService.call({
				instanceId: inResponse.instanceId,
				servicename: inResponse.services[0]
			});
		}
	},
	
	_sppOpenPortResult: function(inSender, inResponse, inRequest) {
		this.doStatus({message:"port ready: "+this.sppInstanceId});
		this.doConnected();
	},

	_sppClosePortResult: function(inSender, inResponse, inRequest) {
		if (this.address) {
			this.$.disconnect.call({address: this.address});
			this.address = undefined;
		}
	},

	//////////
	// failure handlers //
	//////////
	_sppNotificationsFailure: function(inSender, inResponse, inRequest) {
		this.doError(inResponse);
		//TODO: failure probably means BT powered down, so disconnect
		this.connected = false;
		this.sppInstanceId = undefined;
		if (this.$.subscribeNotifications) {
			this.$.subscribeNotifications.destroy();
		}
		this.doDisconnected();
	},
	
	_handleDeviceListFailure: function(inSender, inResponse, inRequest) {
		this.error("deviceListFailure "+JSON.stringify(inResponse));
		this.doError(inResponse);
	},
	
	_sppConnectFailure: function(inSender, inResponse, inRequest) {
		this.error("sppConnectFailure "+JSON.stringify(inResponse));
		this.doError(inResponse);
	},
	
	_sppSelectFailure: function(inSender, inResponse, inRequest) {
		this.error("sppSelectFailure "+JSON.stringify(inResponse));
		this.doError(inResponse);
	},

	_sppOpenPortFailure: function(inSender, inResponse, inRequest) {
		this.error("sppOpenPortFailure "+JSON.stringify(inResponse));
		this.doError(inResponse);
	},
	
	_sppClosePortFailure: function(inSender, inResponse, inRequest) {
		this.error("sppClosePortFailure "+JSON.stringify(inResponse));
		this.doError(inResponse);
	},
	
	_sppReadFailure: function(inSender, inResponse, inRequest) {
		this.error("sppReadFailure "+JSON.stringify(inResponse));
		if (this.connected) {
			this.doError(inResponse);
		}
	},
	
	_sppWriteFailure: function(inSender, inResponse, inRequest) {
		this.error("sppWriteFailure "+JSON.stringify(inResponse));
		if (this.connected) {
			this.doError(inResponse);
		}
	}
	
});
