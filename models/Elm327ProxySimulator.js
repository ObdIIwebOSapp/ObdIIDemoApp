/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, Elm327Proxy, JSON, Math, parseInt, window, $L */

enyo.kind({
	name: "Elm327ProxySimulator",
	kind: "Elm327Proxy",
	components: [{}], // don't inherit the btsppclient component since this simulates responses coming over BT
	
	create: function() {
		this.inherited(arguments);
	},

	_resetInternalStructures: function() {
	},

	initialize: function() {
	},

	isConnected: function() {
		return true;
	},
	
	resumeInitCommands: function() {
	},
	
	deinitialize: function() {
	},
	
	getPid: function(pid) {
		switch(pid) {
			case ObdIIPid.supportedPids1:
				this.doReadResponse({
					pid: ObdIIPid.supportedPids1,
					value: {
						"01 01": true,
						"01 04": true,
						"01 05": true,
						"01 0C": true,
						"01 0D": true,
						"01 11": true,
						"01 20": true,
						"01 10": true //it will simulates the MAF. If you wanna test without the graph remove this line.
					}
				});
				break;
			case ObdIIPid.mafAirFlowRate:
				this._simulateCarPlxFuelRate();
				break;
			}
	},

	startPolling: function(pid) {
		switch(pid) {
			case ObdIIPid.engineRpm: 
				this._simulateCarPlxRpm();
				break;				
			case ObdIIPid.vehicleSpeed: 
				this._simulateCarPlxSpeed();
				break;
		}
	},

	stopPolling: function(pid) {
	},

	_simulateCarPlxRpm: function () {
		var time = 250;
		var n = 1;
		var code = ObdIIPid.engineRpm;
		var values = [748.5, 566, 513.75, 918.25, 4082.25, 5153.25, 10000, 3941.5, 2922.5, 1924, 1200.25, 878.5, 634.25, 532.25, 529.25, 570, 577.5, 620.5];
		
		var that = this;
		
		for (i= 0; i < values.length; i++) {
			setTimeout(function(value) {
				return function(){
					that.doReadResponse({
						pid: code,
						value: value
					});
				}
			}(values[i]), time*n++);
		}
		
		setTimeout(function() {
			that._simulateCarPlxRpm();
		}, time*n++);
	},

	_simulateCarPlxSpeed: function () {
		var time = 450;
		var n = 1;
		var code = ObdIIPid.vehicleSpeed;
		var values = [10, 20, 40, 100, 120, 65, 30, 10, 0];
		var that = this;
		
		for (i= 0; i < values.length; i++) { 		
			setTimeout(function(val) {
				return function(){
					that.doReadResponse({
						pid: code,
						value: val
					});
				}
			}(values[i]), time*n++);
		}
		
		setTimeout(function() {
			that._simulateCarPlxSpeed();
		}, time*n++);
	},
	
	_simulateCarPlxFuelRate: function () {
		var code = ObdIIPid.mafAirFlowRate;
		this.doReadResponse({pid: code, value: Math.random()*3000 + 1000});
	}
});
