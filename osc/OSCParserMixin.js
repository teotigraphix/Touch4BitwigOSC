
OSCParser.prototype.superParse = OSCParser.prototype.parse;

OSCParser.prototype.parse = function (msg)
{
    OSCParser.prototype.superParse.call(this, msg);

    var oscParts = msg.address.split ('/');
    oscParts.shift (); // Remove first empty element
    if (oscParts.length == 0)
        return;

    var value = msg.values == null ? null : msg.values[0];

    switch (oscParts.shift ())
    {
        case 'automationOverride':
            this.transport.resetAutomationOverrides ();
            break;
    }
};
