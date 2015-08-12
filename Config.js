// ------------------------------
// Static configurations
// ------------------------------

// Inc/Dec of knobs
Config.fractionValue     = 1;
Config.fractionMinValue  = 0.5;
Config.maxParameterValue = 128;


// ------------------------------
// Editable configurations
// ------------------------------

Config.RECEIVE_HOST = 0;
Config.RECEIVE_PORT = 1;
Config.SEND_HOST    = 2;
Config.SEND_PORT    = 3;

Config.receiveHost = '127.0.0.1';
Config.receivePort = 8000;
Config.sendHost    = '127.0.0.1';
Config.sendPort    = 9000;


Config.init = function ()
{
    var prefs = host.getPreferences ();

    Config.receiveHostSetting = prefs.getStringSetting ('Host', 'Receive from (Script restart required)', 15, '127.0.0.1');
    Config.receiveHostSetting.addValueObserver (function (value)
    {
        Config.receiveHost = value;
        Config.notifyListeners (Config.RECEIVE_HOST);
    });
    
    Config.receivePortSetting = prefs.getNumberSetting ('Port', 'Receive from (Script restart required)', 0, 65535, 1, '', 8000);
    Config.receivePortSetting.addRawValueObserver (function (value)
    {
        Config.receivePort = Math.floor (value);
        Config.notifyListeners (Config.RECEIVE_PORT);
    });
    
    Config.sendHostSetting = prefs.getStringSetting ('Host', 'Send to', 15, '127.0.0.1');
    Config.sendHostSetting.addValueObserver (function (value)
    {
        Config.sendHost = value;
        Config.notifyListeners (Config.SEND_HOST);
    });
    
    Config.sendPortSetting = prefs.getNumberSetting ('Port', 'Send to', 0, 65535, 1, '', 9000);
    Config.sendPortSetting.addRawValueObserver (function (value)
    {
        Config.sendPort = Math.floor (value);
        Config.notifyListeners (Config.SEND_PORT);
    });
};


// ------------------------------
// Property listeners
// ------------------------------

Config.listeners = [];
for (var i = 0; i <= Config.SEND_PORT; i++)
    Config.listeners[i] = [];

Config.addPropertyListener = function (property, listener)
{
    Config.listeners[property].push (listener);
};

Config.notifyListeners = function (property)
{
    var ls = Config.listeners[property];
    for (var i = 0; i < ls.length; i++)
        ls[i].call (null);
};

function Config () {}
