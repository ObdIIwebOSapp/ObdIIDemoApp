/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, $L */


enyo.kind({
	name: "AboutPopup",
	kind: enyo.Popup,
	openClassName: "help-container",
	components: [{
		kind: enyo.HFlexBox,
		components: [{
			kind: enyo.Image,
			height: "32px",
			width: "32px",
			src: "icon.png"
		}, {
			content: $L("About"),
			style: "margin-left:7px; margin-top:3px;"
		}]
	}, {
		name: "appName",
		kind: enyo.Control,
		className: "help-body-title"
	}, {
		name: "appVersion",
		kind: enyo.Control,
		className: "help-body-text"
	}, {
		kind: enyo.Control,
		className: "help-body-text",
		content: $L("This application requires a Bluetooth enabled OBDII engine diagnostics tool to connect to your car's OBDII port. Example tools are <a href='http://www.plxkiwi.com/kiwibluetooth/hardware.html'>Kiwi Bluetooth</a> and <a href='http://www.scantool.net/obdlink-bluetooth.html'>OBDLink Bluetooth Scan Tool</a>."),
		allowHtml: true
	}, {
		kind: enyo.Control,
		className: "help-body-text",
		content: $L("Please note that the fuel economy graphing feature is only displayed if your car supports the MAF (air flow) PID. If your car does not, this graph and related information is not displayed.")
	}, {
		kind: enyo.Control,
		className: "help-body-text",
		content: $L("<a href='https://www.facebook.com/#!/pages/Obd-II-webOS-app/294154037267597?sk=info'>Give us feedback on the application</a>."),
		allowHtml: true
	}],
	
	open: function() {
		this.inherited(arguments);
		
		var info = enyo.fetchConfigFile("appinfo.json");
		this.$.appName.setContent(info.title);
		var version = (new enyo.g11n.Template($L("#{version} by #{vendor}"))).evaluate(info);
		this.$.appVersion.setContent(version);
	}
});
