/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, $L */

enyo.kind({
	name: "Gauge",
	kind: enyo.HFlexBox,
	//Default values
	scale: 100,
    minimum: 0,
    maximum: 120,
	initAngle: -130,
	maxAngle: 260,
	
	create: function() {
		this.inherited(arguments);

		this.$.needle.applyStyle("-webkit-transform", "rotate("+this.initAngle+"deg)");
		//it has to be at least 400 ms
		this.$.needle.applyStyle("-webkit-transition-duration", "450ms");
		this.$.needle.applyStyle("-webkit-animation-timing-function", "linear");
	},
	
	/**
	 * It animates the needle using CSS only based on a pre defined -webkit-transition-duration
	 * @param {Object} value
	 */
	animate: function(value) {
		var speedAngle = (this.initAngle) + (value * this.maxAngle / this.maximum);
		
		/* rotate image */		
		this.$.needle.applyStyle("-webkit-transform", "rotate("+speedAngle+"deg) translateZ(1px)");
	}
});
