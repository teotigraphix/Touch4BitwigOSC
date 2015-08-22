
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

        case 'automationOverride':
            this.transport.resetAutomationOverrides ();
            break;

        default:
            println ('Unhandled OSC Command: ' + msg.address + ' ' + value);
            break;
    }
};
