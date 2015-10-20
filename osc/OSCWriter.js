// Written by Jürgen Moßgraber - mossgrabers.de
// (c) 2014-2015
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

OSCWriter.TRACK_ATTRIBS = [ "exists", "activated", "selected", "isGroup", "name", "volumeStr", "volume", "panStr", "pan", "color", "vu", "mute", "solo", "recarm", "monitor", "autoMonitor", "canHoldNotes", "sends", "slots", "crossfadeMode" ];
OSCWriter.DEVICE_LAYER_ATTRIBS = [ "exists", "activated", "selected", "name", "volumeStr", "volume", "panStr", "pan", "vu", "mute", "solo", "sends" ];
OSCWriter.FXPARAM_ATTRIBS = [ "name", "valueStr", "value" ];
OSCWriter.EMPTY_TRACK =
{
    exists: false,
    activated: true,
    selected: false,
    name: '',
    volumeStr: '',
    volume: 0,
    panStr: '',
    pan: 0,
    color: 0,
    vu: 0,
    mute: false,
    solo: false,
    recarm: false,
    monitor: false,
    autoMonitor: false,
    canHoldNotes: false,
    sends: [],
    slots: [],
    crossfadeMode: 'AB'
};

OSCWriter.NOTE_STATE_COLORS = [];

OSCWriter.NOTE_STATE_COLOR_OFF = [ 0, 0, 0 ]; // Black
OSCWriter.NOTE_STATE_COLOR_ON  = [ 0, 1, 0 ]; // Green
OSCWriter.NOTE_STATE_COLOR_REC = [ 1, 0, 0 ]; // Red

OSCWriter.NOTE_STATE_COLORS[Scales.SCALE_COLOR_OFF]          = [ 0, 0, 0 ]; // Black
OSCWriter.NOTE_STATE_COLORS[Scales.SCALE_COLOR_OCTAVE]       = [ 0.2666666805744171 , 0.7843137383460999 , 1 ]; // Ocean Blue
OSCWriter.NOTE_STATE_COLORS[Scales.SCALE_COLOR_NOTE]         = [ 1, 1, 1 ]; // White
OSCWriter.NOTE_STATE_COLORS[Scales.SCALE_COLOR_OUT_OF_SCALE] = [ 0, 0, 0 ]; // Black

/**
 *
 * @param model {OSCModel}
 * @param oscPort {integer}
 * @constructor
 */
function OSCWriter (model, oscPort)
{
    /**
     * @type {OSCModel}
     */
    this.model = model;
    
    this.oldValues = {};
    this.messages = [];
}

OSCWriter.prototype.flush = function (dump)
{
    //
    // Transport
    //

    var trans = this.model.getTransport ();
    this.sendOSC ('/play', trans.isPlaying, dump);
    this.sendOSC ('/record', trans.isRecording, dump);
    this.sendOSC ('/overdub', trans.isOverdub, dump);
    this.sendOSC ('/overdub/launcher', trans.isLauncherOverdub, dump);
    this.sendOSC ('/repeat', trans.isLooping, dump);
    this.sendOSC ('/punchIn', trans.punchIn, dump);
    this.sendOSC ('/punchOut', trans.punchOut, dump);
    this.sendOSC ('/click', trans.isClickOn, dump);
    this.sendOSC ('/preroll', trans.getPreroll (), dump);
    this.sendOSC ('/tempo/raw', trans.getTempo (), dump);
    this.sendOSC ('/crossfade', trans.getCrossfade (), dump);
    this.sendOSC ('/autowrite', trans.isWritingArrangerAutomation, dump);
    this.sendOSC ('/autowrite/launcher', trans.isWritingClipLauncherAutomation, dump);
    this.sendOSC ('/automationWriteMode', trans.automationWriteMode, dump);
    this.sendOSC ('/position', trans.getPositionText ());

    //
    // Frames
    //

    var app = this.model.getApplication ();
    this.sendOSC ('/layout', app.getPanelLayout ().toLowerCase (), dump);

    var arrange = this.model.getArranger ();
    this.sendOSC ('/arranger/cueMarkerVisibility', arrange.areCueMarkersVisible (), dump);
    this.sendOSC ('/arranger/playbackFollow', arrange.isPlaybackFollowEnabled (), dump);
    this.sendOSC ('/arranger/trackRowHeight', arrange.hasDoubleRowTrackHeight (), dump);
    this.sendOSC ('/arranger/clipLauncherSectionVisibility', arrange.isClipLauncherVisible (), dump);
    this.sendOSC ('/arranger/timeLineVisibility', arrange.isTimelineVisible (), dump);
    this.sendOSC ('/arranger/ioSectionVisibility', arrange.isIoSectionVisible (), dump);
    this.sendOSC ('/arranger/effectTracksVisibility', arrange.areEffectTracksVisible (), dump);

    var mix = this.model.getMixer ();
    this.sendOSC ('/mixer/clipLauncherSectionVisibility', mix.isClipLauncherSectionVisible (), dump);
    this.sendOSC ('/mixer/crossFadeSectionVisibility', mix.isCrossFadeSectionVisible (), dump);
    this.sendOSC ('/mixer/deviceSectionVisibility', mix.isDeviceSectionVisible (), dump);
    this.sendOSC ('/mixer/sendsSectionVisibility', mix.isSendSectionVisible (), dump);
    this.sendOSC ('/mixer/ioSectionVisibility', mix.isIoSectionVisible (), dump);
    this.sendOSC ('/mixer/meterSectionVisibility', mix.isMeterSectionVisible (), dump);
    
    //
    // Master-/Track(-commands)
    //

    var trackBank = this.model.getTrackBank ();
    for (var i = 0; i < trackBank.numTracks; i++)
        this.flushTrack ('/track/' + (i + 1) + '/', trackBank.getTrack (i), dump);
    this.flushTrack ('/master/', this.model.getMasterTrack (), dump);
    var selectedTrack = trackBank.getSelectedTrack ();
    if (selectedTrack == null)
        selectedTrack = OSCWriter.EMPTY_TRACK;
    this.flushTrack ('/track/selected/', selectedTrack, dump);
    this.flushSendNames ('/send/', dump);

    //
    // Scenes
    //

    var sceneBank = this.model.getSceneBank ();
    for (var i = 0; i < sceneBank.numScenes; i++)
        this.flushScene ('/scene/' + (i + 1) + '/', sceneBank.getScene (i), dump);

    //
    // Device / Primary Device
    //
    var cd = this.model.getCursorDevice ();
    this.flushDevice ('/device/', cd, dump);
    for (var i = 0; i < cd.numDeviceLayers; i++)
        this.flushDeviceLayers ('/device/layer/' + (i + 1) + '/', cd.getLayerOrDrumPad (i), dump);
    this.flushDevice ('/primary/', trackBank.primaryDevice, dump);

    //
    // Browser
    //

    this.flushBrowser ('/browser/', this.model.getBrowser (), dump);

    //
    // User
    //
    
    var user = this.model.getUserControlBank ();
	for (var i = 0; i < cd.numParams; i++)
        this.flushFX ('/user/param/' + (i + 1) + '/', user.getUserParam (i), dump);

    //
    // Notes
    //
    
    this.flushNotes (dump);

    // Send all collected messages
    if (this.messages.length == 0)
        return;
    var data = new OSCMessage ().buildBundle (this.messages);
    host.sendDatagramPacket (Config.sendHost, Config.sendPort, data);
};

OSCWriter.prototype.flushTrack = function (trackAddress, track, dump)
{
    for (var a = 0; a < OSCWriter.TRACK_ATTRIBS.length; a++)
    {
        var p = OSCWriter.TRACK_ATTRIBS[a];
        switch (p)
        {
            case 'sends':
                if (!track.sends)
                    continue;
                for (var j = 0; j < this.model.numSends; j++)
                {
                    var s = track.sends[j];
                    for (var q in s)
                        this.sendOSC (trackAddress + 'send/' + (j + 1) + '/' + q, s[q], dump);
                }
                break;

            case 'slots':
                if (!track.slots)
                    continue;
                for (var j = 0; j < this.model.numScenes; j++)
                {
                    var s = track.slots[j];
                    for (var q in s)
                    {
                        var address = trackAddress + 'clip/' + (j + 1) + '/' + q;
                        switch (q)
                        {
                            case 'color':
                                var color = AbstractTrackBankProxy.getColorEntry (s[q]);
                                if (color)
                                    this.sendOSCColor (address, color[0], color[1], color[2], dump);
                                break;
                            default:
                                this.sendOSC (address, s[q], dump);
                                break;
                        }
                    }
                }
                break;

            case 'color':
                var color = AbstractTrackBankProxy.getColorEntry (track[p]);
                if (color)
                    this.sendOSCColor (trackAddress + p, color[0], color[1], color[2], dump);
                break;

            case 'crossfadeMode':
                this.sendOSC (trackAddress + p + '/A', track[p] == 'A', dump);
                this.sendOSC (trackAddress + p + '/B', track[p] == 'B', dump);
                this.sendOSC (trackAddress + p + '/AB', track[p] == 'AB', dump);
                break;

            case 'vu':
                if (Config.enableVUMeters)
                    this.sendOSC (trackAddress + p, track[p], dump);
                break;

            default:
                this.sendOSC (trackAddress + p, track[p], dump);
                break;
        }
    }
};

OSCWriter.prototype.flushSendNames = function (sendAddress, dump)
{
    var fxTrackBank = this.model.getEffectTrackBank ();
    var isFX = this.model.getCurrentTrackBank () === fxTrackBank;
    for (var i = 0; i < this.model.numSends; i++)
    {
        var fxTrack = fxTrackBank.getTrack (i);
        var isEmpty = isFX || !fxTrack.exists;
        this.sendOSC (sendAddress + (i + 1) + '/name', isEmpty ? "" : fxTrack.name, dump);
    }
};

OSCWriter.prototype.flushScene = function (sceneAddress, scene, dump)
{
    this.sendOSC (sceneAddress + 'exists', scene.exists, dump);
    this.sendOSC (sceneAddress + 'name', scene.name, dump);
    this.sendOSC (sceneAddress + 'selected', scene.selected, dump);
};

OSCWriter.prototype.flushDevice = function (deviceAddress, device, dump)
{
    var selDevice = device.getSelectedDevice ();
    this.sendOSC (deviceAddress + 'name', selDevice.name, dump);
    this.sendOSC (deviceAddress + 'bypass', !selDevice.enabled, dump);
    for (var i = 0; i < device.numParams; i++)
    {
        var oneplus = i + 1;
        this.flushFX (deviceAddress + 'param/' + oneplus + '/', device.getFXParam (i), dump);
        this.flushFX (deviceAddress + 'common/' + oneplus + '/', device.getCommonParam (i), dump);
        this.flushFX (deviceAddress + 'envelope/' + oneplus + '/', device.getEnvelopeParam (i), dump);
        this.flushFX (deviceAddress + 'macro/' + oneplus + '/', device.getMacroParam (i), dump);
        this.flushFX (deviceAddress + 'modulation/' + oneplus + '/', device.getModulationParam (i), dump);
    }
};

OSCWriter.prototype.flushBrowser = function (browserAddress, browser, dump)
{
    var session = browser.getActiveSession ();
    this.sendOSC (browserAddress + 'isActive', session != null, dump);
    if (session == null)
        return;

    // Filter Columns
    for (var i = 0; i < session.numFilterColumns; i++)
    {
        var filterAddress = browserAddress + 'filter/' + (i + 1) + '/';
        var column = session.getFilterColumn (i);
        this.sendOSC (filterAddress + 'exists', column.exists, dump);
        this.sendOSC (filterAddress + 'name', column.name, dump);
        for (var j = 0; j < session.numFilterColumnEntries; j++)
        {
            this.sendOSC (filterAddress + 'item/' + (j + 1) + '/exists', column.items[j].exists, dump);
            this.sendOSC (filterAddress + 'item/' + (j + 1) + '/name', column.items[j].name, dump);
            this.sendOSC (filterAddress + 'item/' + (j + 1) + '/hits', column.items[j].hits, dump);
            this.sendOSC (filterAddress + 'item/' + (j + 1) + '/isSelected', column.items[j].isSelected, dump);
        }
    }

    // Presets
    var presetAddress = browserAddress + 'preset/';
    column = session.getResultColumn ();
    for (var i = 0; i < session.numResults; i++)
    {
        this.sendOSC (presetAddress + (i + 1) + '/exists', column[i].exists, dump);
        this.sendOSC (presetAddress + (i + 1) + '/name', column[i].name, dump);
        this.sendOSC (presetAddress + (i + 1) + '/hits', column[i].hits, dump);
        this.sendOSC (presetAddress + (i + 1) + '/isSelected', column[i].isSelected, dump);
    }
};

OSCWriter.prototype.flushDeviceLayers = function (deviceAddress, device, dump)
{
    for (var a = 0; a < OSCWriter.DEVICE_LAYER_ATTRIBS.length; a++)
    {
        var p = OSCWriter.DEVICE_LAYER_ATTRIBS[a];
        switch (p)
        {
            case 'sends':
                if (!device.sends)
                    continue;
                for (var j = 0; j < this.model.numSends; j++)
                {
                    var s = device.sends[j];
                    for (var q in s)
                        this.sendOSC (deviceAddress + 'send/' + (j + 1) + '/' + q, s[q], dump);
                }
                break;

            case 'vu':
                if (Config.enableVUMeters)
                    this.sendOSC (deviceAddress + p, device[p], dump);
                break;

            default:
                this.sendOSC (deviceAddress + p, device[p], dump);
                break;
        }
    }
};

OSCWriter.prototype.flushFX = function (fxAddress, fxParam, dump)
{
    for (var a = 0; a < OSCWriter.FXPARAM_ATTRIBS.length; a++)
    {
        var p = OSCWriter.FXPARAM_ATTRIBS[a];
        this.sendOSC (fxAddress + p, fxParam[p], dump);
	}
};

OSCWriter.prototype.flushNotes = function (noteAddress, dump)
{
    var isKeyboardEnabled = this.canSelectedTrackHoldNotes ();
    var isRecording = this.model.hasRecordingState ();
    var scales = this.model.getScales();
    for (var i = 0; i < 127; i++)
    {
        var color = isKeyboardEnabled ? (this.model.pressedKeys[i] > 0 ?
            (isRecording ? OSCWriter.NOTE_STATE_COLOR_REC : OSCWriter.NOTE_STATE_COLOR_ON) :
            OSCWriter.NOTE_STATE_COLORS[scales.getColor (this.model.keysTranslation, i)]) :
            OSCWriter.NOTE_STATE_COLOR_OFF;
        this.sendOSCColor (noteAddress + i + '/color', color[0], color[1], color[2], dump);
    }
};

OSCWriter.prototype.canSelectedTrackHoldNotes = function ()
{
    var t = this.model.getCurrentTrackBank ().getSelectedTrack ();
    return t != null && t.canHoldNotes;
};

OSCWriter.prototype.sendOSC = function (address, value, dump)
{
    if (!dump)
    {
        if (value instanceof Array)
        {
            if (this.compareArray (address, value))
                return;
        }
        else if (this.oldValues[address] === value)
            return;
    }

    this.oldValues[address] = value;

    // Convert boolean values to integer for client compatibility
    if (value instanceof Array)
    {
        for (var i = 0; i < value.length; i++)
            value[i] = this.convertBooleanToInt (value[i]);
    }
    else
        value = this.convertBooleanToInt (value);

    var msg = new OSCMessage ();
    msg.init (address, value);
    this.messages.push (msg.build ());
};

OSCWriter.prototype.sendOSCColor = function (address, red, green, blue, dump)
{
    this.sendOSC (address, "RGB(" + red + "," + green + "," + blue + ")", dump);
};

OSCWriter.prototype.convertBooleanToInt = function (value)
{
    return typeof (value) == 'boolean' ? (value ? 1 : 0) : value;
};

OSCWriter.prototype.compareArray = function (address, value)
{
    if (!(address in this.oldValues) || value.length != this.oldValues[address])
        return false;
    for (var i = 0; i < value.length; i++)
    {
        if (value[i] != this.oldValues[address][i])
            return false;
    }
    return true;
};
