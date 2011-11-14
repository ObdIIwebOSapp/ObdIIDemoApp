/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, $L */

/**
 * Display the list of Bluetooth OBD devices that are trusted.
 */
enyo.kind({
	name: "BluetoothDeviceSelector",
	kind: enyo.Popup,
	dismissWithClick: false,
	modal: true,
	scrimWhenModal: true,
	events: {
		onSelect: ""
	},
	components: [{
		content: $L("Choose the OBD device to use")
	}, {
		kind: enyo.Repeater,
		onSetupRow: "_listSetupRow"
	}],

	setData: function(inData) {
		this.deviceList = inData;
	},
	
	_listSetupRow: function(inSender, inIndex) {
		if (inIndex < this.deviceList.length) {
			return {
				kind: enyo.Item,
				onclick: "_itemClick",
				components: [{
					content: this.deviceList[inIndex].name
				}]
			};
		} else {
			return null;
		}
	},

	_itemClick: function(inSender) {
		this.doSelect(this.deviceList[inSender.rowIndex]);
		this.close();
	}
});