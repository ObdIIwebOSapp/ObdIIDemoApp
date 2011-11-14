/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, $L */

enyo.kind({
	name: "Speedometer",
	kind: "Gauge",
	scale: 100,
	minimum: 0,
	maximum: 120,
	maxAngle: 260,

	components: [{
		name: "background",
		kind: enyo.Control,
		className: "speedometer-background"
	}, {
		name: "needle",
		kind: enyo.Control,
		className: "speedometer-needle"
	}, {
		name: "needleCover",
		kind: enyo.Control,
		className: "speedometer-needlecover"
	}]	
});
