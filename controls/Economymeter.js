/*jslint white: false, undef: true, eqeqeq: true */ 
/*global enyo, Elm327Proxy, $L */

enyo.kind({
	name:"Economymeter",
	kind: enyo.Control,
	nodeTag:"canvas",

	delta: 5,
	width: 500,
	height: 125,
	graphWidth: 470,
	graphHeight: 100,
	graphX: 30,
	graphY: 5,
	mpgSum: 0,
	mpgCount: 0,
	mpgMax: 75,
	pointsTilPlot: 5,
	graphColor: "#FFA500",
	strokeStyle: "#811603",
	
	mpgConstant: 1143.81, //magic number for converting to MPG TODO metric

	statics: {
		mpgTemplate: new enyo.g11n.Template($L("#{rate} MPG"))
	},

	create: function() {
		this.inherited(arguments);
		this.pointsPlotted = [];
		for (var i = 0; i < this.graphWidth/this.delta; i++) {
			this.pointsPlotted.push(0);
		}
		this.unplotted = [];
	},

	rendered: function() {
		this.canvas = this.hasNode();
		this._resetCanvas();
		this._draw(0, 0);
	},

	_resetCanvas: function() {
		if (this.canvas && this.canvas.height && this.height && this.width) {
			this.canvas.height = this.height;
			this.canvas.width = this.width;
			this.ctx = this.canvas.getContext("2d");
		}
	},
	
	_drawHorizontalLines: function() {
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		this.ctx.strokeStyle = this.strokeStyle;
		
		this.ctx.moveTo(this.graphX - this.delta + 1, (this.graphY + this.graphHeight * 0.25));
		this.ctx.lineTo(this.graphX + this.graphWidth - 1, (this.graphY + this.graphHeight * 0.25));
		
		this.ctx.moveTo(this.graphX - this.delta + 1, (this.graphY + this.graphHeight * 0.5));
		this.ctx.lineTo(this.graphX + this.graphWidth - 1, (this.graphY + this.graphHeight * 0.5));
		
		this.ctx.moveTo(this.graphX - this.delta + 1, (this.graphY + this.graphHeight * 0.75));
		this.ctx.lineTo(this.graphX + this.graphWidth - 1, (this.graphY + this.graphHeight * 0.75));
		
		this.ctx.moveTo(this.graphX - this.delta + 1, (this.graphY + this.graphHeight * 1));
		this.ctx.lineTo(this.graphX + this.graphWidth - 1, (this.graphY + this.graphHeight * 1));
		
		this.ctx.stroke();		
	},

	_drawAvarageLine: function() {
		var color = "#FFA500"; //orange
		var avg = this.mpgSum/this.mpgCount;
		var avgText = avg > this.mpgMax?Math.round(avg) + "+": Math.round(avg);
		avg = avg > this.mpgMax?this.mpgMax: avg;
		this.ctx.lineWidth = 1.5;
		this.ctx.beginPath();
		this.ctx.strokeStyle = color;
		this.ctx.moveTo(this.graphX - this.delta + 2, this.graphY + this.graphHeight - avg/this.mpgMax * this.graphHeight);
		this.ctx.lineTo(this.graphX + this.graphWidth, this.graphY + this.graphHeight - avg/this.mpgMax * this.graphHeight);
		this.ctx.stroke();

		this.ctx.textAlign = "right";
		this.ctx.font = "10pt Arial";
		if ((this.graphY + this.graphHeight - avg/this.mpgMax * this.graphHeight + 4.5) - (this.graphY + 10)  >= 12) {
			this.ctx.fillStyle = this.strokeStyle;
			this.ctx.fillText(this.mpgMax, this.graphX - 6, this.graphY + 30);
		}
		this.ctx.fillStyle = color;
		this.ctx.font = "12pt Arial";
		this.ctx.fillText(avgText, this.graphX - 6, this.graphY + this.graphHeight - avg/this.mpgMax * this.graphHeight + 4.5);

	},

	_plot: function(x,y) {
		y = y > this.mpgMax ? this.mpgMax:y;
		y = y / this.mpgMax * this.graphHeight;
		this.ctx.beginPath();
		this.ctx.strokeStyle = this.graphColor;
		this.ctx.lineWidth = this.delta + 1;

		x += this.graphX;
		this.ctx.moveTo(x, this.graphHeight  + this.graphY);
		this.ctx.lineTo(x, this.graphHeight + this.graphY - y);
		this.ctx.stroke();
	},

	animate: function(maf, vss) {
		if (!maf) {
			this.error("Invalid MAF value "+maf+", vss="+vss);
			return;
		}
		var rate = this.mpgConstant * vss / maf;
		// When coasting at high speed, the rate can get fantastically large. Limit the max to 100
		rate = rate > 100 ? 100:rate;
		this.mpgSum = this.mpgSum + rate;
		this.mpgCount++;
		this.unplotted.push(rate);
		if (this.unplotted.length >= this.pointsTilPlot) {
			var sum = 0;
			for(var i in this.unplotted) {
				sum += this.unplotted[i];
			}
			this.unplotted = [];
			rate = Math.round(sum/this.pointsTilPlot);
			this.pointsPlotted.push(rate);

			if (this.pointsPlotted.length * this.delta >= this.graphWidth) {
				this.pointsPlotted.shift();
			}
		}
		this._draw(rate);
	},

	aniMap: function(map, iat, rpm, vss) {
		//See Post #9 in http://www.mp3car.com/engine-management-obd-ii-engine-diagnostics-etc/75138-calculating-mpg-from-vss-and-maf-from-obd2.html
		console.log("TTY : " + map +", " + iat + ", " + rpm + ", " + vss);
		var imap = rpm * map / iat;
		var maf = (imap/120) * (75/100) * 2.4 * 28.98 / 8.314;
		this.animate(maf, vss);
	},

	_draw: function(rate) {
		this._resetCanvas();
		if (this.canvas && this.canvas.height && this.height && this.width) {
			this.ctx.textAlign = "right";
			this.ctx.fillStyle = "#FFFFFF";
			this.ctx.font = "18pt Arial";
			var rateString = Economymeter.mpgTemplate.evaluate({rate:Math.round(rate)});
			this.ctx.fillText(rateString, 285, 25); //TODO metric "K/L"
			this._drawHorizontalLines();
			for (var i in this.pointsPlotted) {
				this._plot(i * this.delta, this.pointsPlotted[i]);
			}
			this._drawAvarageLine();
		}
	}
});
