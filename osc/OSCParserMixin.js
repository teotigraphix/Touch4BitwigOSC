
OSCParser.prototype.superParse = OSCParser.prototype.parse;

OSCParser.prototype.parse = function (msg)
{
    OSCParser.prototype.superParse.call(this, msg);

    var oscParts = msg.address.split ('/');
    oscParts.shift (); // Remove first empty element
    if (oscParts.length == 0)
        return;

    var value = msg.values == null ? null : msg.values[0];

    var app = this.model.getApplication ();

    switch (oscParts.shift ())
    {
        case 'active':
            app.toggleEngineActive ();
            break;


        case 'panel':
            //var app = this.model.getApplication ();
            switch (oscParts[0])
            {
                case 'browser':
                    app.toggleBrowserVisibility ();
                    break;
                case 'inspector':
                    app.toggleInspector ();
                    break;
            }
            break;

        //------------------------------
        // Transport
        //------------------------------

        case 'automationOverride':
            this.transport.resetAutomationOverrides ();
            break;

        case 'timeSignature':
            // TODO add to TransportProxy
            this.transport.transport.getTimeSignature ().set (value);
            break;

        default:
            //println ('Unhandled OSC Command: ' + msg.address + ' ' + value);
            break;
    }
};
