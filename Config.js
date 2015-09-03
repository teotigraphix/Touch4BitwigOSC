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

Config.RECEIVE_HOST          = 0;
Config.RECEIVE_PORT          = 1;
Config.SEND_HOST             = 2;
Config.SEND_PORT             = 3;
Config.ACTIVATE_FIXED_ACCENT = 4;
Config.FIXED_ACCENT_VALUE    = 5;
Config.ENABLE_VU_METERS      = 6;

Config.receiveHost       = '127.0.0.1';
Config.receivePort       = 8000;
Config.sendHost          = '127.0.0.1';
Config.sendPort          = 9000;
Config.accentActive      = false;                       // Accent button active
Config.fixedAccentValue  = 127;                         // Fixed velocity value for accent
Config.enableVUMeters    = false;


Config.init = function ()
{
    var prefs = host.getPreferences ();

    ///////////////////////////
    // Network

    // Bitwig receives WIFI device messages on this port/ip
    Config.receiveHostSetting = prefs.getStringSetting ('Host', 'Device to DAW', 15, '127.0.0.1');
    Config.receiveHostSetting.addValueObserver (function (value)
    {
        Config.receiveHost = value;
        Config.notifyListeners (Config.RECEIVE_HOST);
    });
    
    Config.receivePortSetting = prefs.getNumberSetting ('Port', 'Device to DAW', 0, 65535, 1, '', 8000);
    Config.receivePortSetting.addRawValueObserver (function (value)
    {
        Config.receivePort = Math.floor (value);
        Config.notifyListeners (Config.RECEIVE_PORT);
    });

    // WIFI device receives Bitwig messages on this port/ip
    Config.sendHostSetting = prefs.getStringSetting ('Host', 'DAW to Device', 15, '127.0.0.1');
    Config.sendHostSetting.addValueObserver (function (value)
    {
        Config.sendHost = value;
        Config.notifyListeners (Config.SEND_HOST);
    });
    
    Config.sendPortSetting = prefs.getNumberSetting ('Port', 'DAW to Device', 0, 65535, 1, '', 9000);
    Config.sendPortSetting.addRawValueObserver (function (value)
    {
        Config.sendPort = Math.floor (value);
        Config.notifyListeners (Config.SEND_PORT);
    });
    
    ///////////////////////////
    // Accent

    Config.accentActiveSetting = prefs.getEnumSetting ("Activate Fixed Accent", "Fixed Accent", [ "Off", "On" ], "Off");
    Config.accentActiveSetting.addValueObserver (function (value)
    {
        Config.accentActive = value == "On";
        Config.notifyListeners (Config.ACTIVATE_FIXED_ACCENT);
    });
    
    Config.accentValueSetting = prefs.getNumberSetting ("Fixed Accent Value", "Fixed Accent", 1, 127, 1, "", 127);
    Config.accentValueSetting.addRawValueObserver (function (value)
    {
        Config.fixedAccentValue = value;
        Config.notifyListeners (Config.FIXED_ACCENT_VALUE);
    });
    
    ///////////////////////////
    // Workflow

    Config.enableVUMetersSetting = prefs.getEnumSetting ("VU Meters", "Workflow", [ "Off", "On" ], "Off");
    Config.enableVUMetersSetting.addValueObserver (function (value)
    {
        Config.enableVUMeters = value == "On";
        Config.notifyListeners (Config.ENABLE_VU_METERS);
    });

    // Added

    Config.enableKeyboardSetting = prefs.getEnumSetting ("Keyboard", "Workflow", [ "Off", "On" ], "Off");
    Config.enableKeyboardSetting.addValueObserver (function (value)
    {
        Config.enableKeyboard = value == "On";
        Config.notifyListeners (Config.ENABLE_KEYBOARD);
    });
};


// ------------------------------
// Property listeners
// ------------------------------

Config.ENABLE_KEYBOARD      = 7;
Config.CONFIG_COUNT         = 7;

Config.listeners = [];
for (var i = 0; i <= Config.CONFIG_COUNT; i++)
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

Config.setAccentEnabled = function (enabled)
{
    Config.accentActiveSetting.set (enabled ? "On" : "Off");
};

Config.setAccentValue = function (value)
{
    Config.accentValueSetting.setRaw (value);
};

Config.setVUMetersEnabled = function (enabled)
{
    Config.enableVUMetersSetting.set (enabled ? "On" : "Off");
};

function Config () {}

// Added

Config.setKeyboardEnabled = function (enabled)
{
    Config.enableKeyboardSetting.set (enabled ? "On" : "Off");
};
