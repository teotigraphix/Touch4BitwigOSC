// Written by Jürgen Moßgraber - mossgrabers.de
//            Michael Schmalle - teotigraphix.com
// (c) 2014-2015
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

loadAPI (1);
load ("framework/helper/ClassLoader.js");
load ("framework/daw/ClassLoader.js");
load ("osc/ClassLoader.js");

load ("osc/OSCWriterMixin.js");
load ("osc/OSCParserMixin.js");

load ("Config.js");

host.defineController ("Teoti Graphix, LLC", "Touch4Bitwig", "0.1", "CB450840-526D-11E5-B970-0800200C9A66", "Michael Schmalle");
host.defineMidiPorts (1, 0);

var model = null;
var parser = null;
var writer = null;

String.prototype.getBytes = function () 
{
	var bytes = [];
	for (var i = 0; i < this.length; i++) 
		bytes.push (this.charCodeAt(i));
	return bytes;
};

function init ()
{
    Config.init ();

    var scales = new Scales (0, 128, 128, 1);
    scales.setChromatic (true);
	model = new OSCModel (scales);
	parser = new OSCParser (model, Config.receiveHost, Config.receivePort);
    writer = new OSCWriter (model);

    model.parser = parser;
    model.writer = writer;

    scheduleTask (function ()
    {
        writer.flush (true);
    }, null, 1000);

	println ("Initialized.");
}

function exit ()
{
}

function flush ()
{
    writer.flush ();
}
