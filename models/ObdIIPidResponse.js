/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, Elm327Proxy, JSON, Math, parseInt, window, $L */


var ObdIIPid = {
	coolantTemp:      "01 05",
	mapPressure:      "01 0B",
	engineRpm:        "01 0C",
	vehicleSpeed:     "01 0D",
	intakeAirTemp:    "01 0F",
	throttlePosition: "01 11",
	fuelLevel:        "01 2F",
	ambientAirTemp:   "01 46",
	fuelType:         "01 51",
	ethanolPercent:   "01 52",
	hybridBatteryLife:"01 5B",
	engineFuelRate:   "01 5E",
	mafAirFlowRate:	  "01 10",
	supportedPids1:   "01 00",
	supportedPids2:   "01 20", 
	supportedPids3:   "01 40" 
};

var ObdIIPidResponse = {
	// A response will look something like this "41 0C 1A F8 ^M^M>"
	// Everything after the first two bytes is data (e.g., "1A F8")
	regexp: /^([0-9A-F][0-9A-F] [0-9A-F][0-9A-F])(( [0-9A-F][0-9A-F])+)/,
	
	/*
	 * Supported PIDs
	 */
	// Supported PIDs 01-20
	"41 00": {
		description: $L("Supported PIDs (01-20)"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._supportedPids(value, 1, "01 00");
		}
	},
	// Engine coolant temperature
	"41 05": {
		description: $L("Engine coolant temperature"),
		formatterFunc: function(value, metric) {
			return ObdIIPidResponse._temperature(value, metric, "01 05");
		}
	},
	//Intake manifold absolute pressure
	"41 0B": {
		description: $L("Intake map"),
		formatterFunc: function(value) {
			value = parseInt(value, 16);
			return {
				value: value,
				units: "kPa",
				pid: "01 0B"
			};
		}
	},
	// Engine RPM
	"41 0C": {
		description: $L("Engine rpm"),
		formatterFunc: function(value) {
			value = parseInt(value, 16);
			return {
				value: (value / 4),
				maxValue: 16383.75,
				units: "rpm",
				pid: "01 0C"
			};
		}
	},
	// Vehicle speed
	"41 0D": {
		description: $L("Vehicle speed"),
		formatterFunc: function(value, metric) {
			value = parseInt(value, 16);
			var maxValue = 255;
			var units = "km/h";
			if (metric !== true) {
				units = "mph";
				value = Math.round(value / 1.609);
				maxValue = 158;
			}
			return {
				value: value,
				maxValue: maxValue,
				units: units,
				pid: "01 0D"
			};
		}
	},
	// Intake Air Temperature
	"41 0F": {
		description: $L("Intake air temperature"),
		formatterFunc: function(value) {
			//value = parseInt(value, 16) + 273.15;
			value = (value - 40) + 273.15;//See OBD II standards then converting C to K
			return {
				value: value,
				units: "K",
				pid: "01 0F"
			};
		}
	},
	// MAF
	"41 10": {
		description: $L("MAF air flow rate"),
		formatterFunc: function(value) {
			value = parseInt(value, 16);
			return {
				value: value,
				maxValue : 655.35,
				units : "g/s",
				pid: "01 10"
			};
		}
	},
	// Throttle position
	"41 11": {
		description: $L("Throttle position"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._percentage(value, false, "01 11");
		}
	},
	// Supported PIDs 21-40
	"41 20": {
		description: $L("Supported PIDs (21-40)"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._supportedPids(value, 0x21, "01 20");
		}
	},
	// Fuel Level Input
	"41 2F": {
		description: $L("Fuel Level Input"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._percentage(value, false, "01 2F");
		}
	},
	// Supported PIDs 41-60
	"41 40": {
		description: $L("Supported PIDs (41-60)"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._supportedPids(value, 0x41, "01 40");
		}
	},
	// Ambient air temperature
	"41 46": {
		description: $L("Ambient air tempurature"),
		formatterFunc: function(value, metric) {
			return ObdIIPidResponse._temperature(value, metric, "01 46");
		}
	},
	// Fuel Type
	"41 51": {
		description: $L("Fuel type"),
		formatterFunc: function(value) {
			return {
				value: ObdIIPidResponse.kFuelTypes[value] || value,
				maxValue: "",
				units: "",
				pid: "01 51"
			};
		}
	},
	// Ethanol fuel %
	"41 52": {
		description: $L("Ethanol fuel %"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._percentage(value, false, "01 52");
		}
	},
	// Hybrid battery pack remaining life
	"41 5B": {
		description: $L("Hybrid battery pack remaining life"),
		formatterFunc: function(value) {
			return ObdIIPidResponse._percentage(value, false, "01 5B");
		}
	},
	// Engine oil temperature
	"41 5C": {
		description: $L("Engine oil temperature"),
		formatterFunc: function(value, metric) {
			return ObdIIPidResponse._temperature(value, metric, "01 5C");
		}
	},
	// Engine fuel rate
	"41 5E": {
		description: $L("Engine fuel rate"),
		formatterFunc: function(value, metric) {
			value = parseInt(value, 16) / 20;
			var units = "L/h";
			var maxValue = 3212.75;
			if (metric !== true) {
				units = "gph";//Gallons per Hour
				value = value * 0.264172051;//.26... Gallons per Liter
				maxValue = 848.72;
			}
			return {
				value: Math.round(value * 100) / 100,
				maxValue: maxValue,
				units: units,
				pid: "01 5E"
			};
		}
	},
	
	_percentage: function(value, metric, pid) {
		value = parseInt(value, 16);
		return {
			value: Math.round(value / 2.55),
			maxValue: 100,
			units: "%",
			pid: pid
		};
	},
	
	_temperature: function(value, metric, pid) {
		value = parseInt(value, 16) - 40;
		var maxValue = 215;
		var units = "C";
		if (metric !== true) {
			units = "F";
			value = Math.round(value * 1.8) + 32;
			maxValue = 419;
		}
		return {
			value: value,
			maxValue: maxValue,
			units: units,
			pid: pid
		};
	},
	
	_supportedPids: function(value, supportedPID, pid) {
		value = parseInt(value, 16);
		var i, bitflag = 0x80000000, supportedPids = {};
		while (bitflag > 0) {
			if (value & bitflag) {
				if (supportedPID < 16) {
					supportedPids["01 0" + supportedPID.toString(16).toUpperCase()] = true;
				} else {
					supportedPids["01 " + supportedPID.toString(16).toUpperCase()] = true;
				}
			}
			++supportedPID;
			bitflag = bitflag >>> 1;
		}

		return {
			value: supportedPids,
			units: "pids",
			pid: pid
		};
	},
	/*
	 * Other structures
	 */
	kFuelTypes: {
		"01":    "Gasoline",
		"02":    "Methanol",
		"03":    "Ethanol",
		"04":    "Diesel",
		"05":    "LPG",
		"06":    "CNG",
		"07":    "Propane",
		"08":    "Electric",
		"09":    "Bifuel running Gasoline",
		"0A":    "Bifuel running Methanol",
		"0B":    "Bifuel running Ethanol",
		"0C":    "Bifuel running LPG",
		"0D":    "Bifuel running CNG",
		"0E":    "Bifuel running Prop",
		"0F":    "Bifuel running Electricity",
		"10":    "Bifuel mixed gas/electric",
		"11":    "Hybrid gasoline",
		"12":    "Hybrid Ethanol",
		"13":    "Hybrid Diesel",
		"14":    "Hybrid Electric",
		"15":    "Hybrid Mixed fuel",
		"16":    "Hybrid Regenerative"
	}
};

