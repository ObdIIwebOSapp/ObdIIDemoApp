enyo.depends(
	"$enyo-lib/networkalerts/",
	
	"AppMain.js",

	"controls/Gauge.js",
	"controls/Speedometer.js",
	"controls/Tachometer.js",
	"controls/Economymeter.js",
	"controls/BluetoothErrorUI.js",
	"controls/BluetoothDeviceSelector.js",
	
	"models/Elm327Proxy.js",
	"models/Elm327ProxySimulator.js",
	"models/BluetoothSppClient.js",
	"models/ObdIIPidResponse.js",
	
	"AboutPopup.js",
	
	"css/Car.css"
);
