/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, $L */

enyo.kind({
	name: "Tachometer",
	kind: "Gauge",	
	scale: 10000,
    minimum: 0,
    maximum: 10000,
	maxAngle: 215,

	components: [{
		name: "background",
		kind: enyo.Control,
		className: "tach-background"
	}, {
		name: "needle",
		kind: enyo.Control,
		className: "tach-needle"
	}, {
		name: "needleCover",
		kind: enyo.Control,
		className: "tach-needlecover"
	}]	
});
