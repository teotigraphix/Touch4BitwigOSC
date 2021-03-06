
OSCWriter.TRACK_ATTRIBS = [ "exists", "activated", "selected", "isGroup", "name",
    "volumeStr", "volume", "panStr", "pan", "color", "vu", "mute", "solo", "recarm",
    "monitor", "autoMonitor", "canHoldNotes", "sends", "slots", "crossfadeMode" ];

OSCWriter.DEVICE_LAYER_ATTRIBS = [ "exists", "activated", "selected", "name",
    "volumeStr", "volume", "panStr", "pan", "vu", "mute", "solo", "sends" ];

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

OSCWriter.prototype.flush = function (dump)
{
    this.flushTransport (dump);
    this.flushApplication (dump);
    this.flushArranger (dump);
    this.flushMixer (dump);

    this.flushMasterTrack (dump);
    this.flushTracks (dump);
    this.flushSelectedTrack (dump);
    this.flushSends (dump);

    this.flushScenes (dump);

    this.flushDevices (dump);
    this.flushBrowser ('/browser/', this.model.getBrowser (), dump);

    //var session = this.model.getBrowser ().getActiveSession ();
    //if (session != null)
    //{
    //    this.sendOSC ('/browserComplete', true, true);
    //}

    this.flushUserDevice (dump);

    if (Config.enableKeyboard)
    {
        this.flushNotes (dump);
    }

    // Send all collected messages
    if (this.messages.length == 0)
        return;

    //~~this.sendOSC ('/project/name', this.model.currentProjectName, dump);

    var data = new OSCMessage ().buildBundle (this.messages);
    host.sendDatagramPacket (Config.sendHost, Config.sendPort, data);

    this.oldValues['/flushComplete'] = undefined;
    this.sendOSC ('/flushComplete', true, dump);
    data = new OSCMessage ().buildBundle (this.messages);
    host.sendDatagramPacket (Config.sendHost, Config.sendPort, data);
};

// TEMP

OSCWriter.prototype.flushBrowser = function (browserAddress, browser, dump)
{
    var session = browser.getActiveSession ();

    if (session == null)
    {
        this.sendOSC (browserAddress + 'isActive', false, dump);
        return;
    }

    this.sendOSC (browserAddress + 'isActive', true, dump);

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

    this.sendOSC ('/browserComplete', true, dump);
};

//--------------------------------------
// Transport
//--------------------------------------

//OSCWriter.prototype.super_flushTransport = OSCWriter.prototype.flushTransport;

OSCWriter.prototype.flushTransport = function (dump)
{
    //OSCParser.prototype.super_flushTransport.call(this, msg);
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

    // Added

    this.sendOSC ('/numerator', trans.getNumerator(), dump);
    this.sendOSC ('/denominator', trans.getDenominator(), dump);
    this.sendOSC ('/automationOverride', trans.isAutomationOverride, dump);
};

//--------------------------------------
// Application
//--------------------------------------

OSCWriter.prototype.flushApplication = function (dump)
{
    var app = this.model.getApplication ();
    this.sendOSC ('/layout', app.getPanelLayout ().toLowerCase (), dump);

    // Added

    this.sendOSC ('/active', app.isEngineActive(), dump);
};

//--------------------------------------
// Arranger
//--------------------------------------

OSCWriter.prototype.flushArranger = function (dump)
{
    var arrange = this.model.getArranger ();
    this.sendOSC ('/arranger/cueMarkerVisibility', arrange.areCueMarkersVisible (), dump);
    this.sendOSC ('/arranger/playbackFollow', arrange.isPlaybackFollowEnabled (), dump);
    this.sendOSC ('/arranger/trackRowHeight', arrange.hasDoubleRowTrackHeight (), dump);
    this.sendOSC ('/arranger/clipLauncherSectionVisibility', arrange.isClipLauncherVisible (), dump);
    this.sendOSC ('/arranger/timeLineVisibility', arrange.isTimelineVisible (), dump);
    this.sendOSC ('/arranger/ioSectionVisibility', arrange.isIoSectionVisible (), dump);
    this.sendOSC ('/arranger/effectTracksVisibility', arrange.areEffectTracksVisible (), dump);
};

//--------------------------------------
// Mixer
//--------------------------------------

OSCWriter.prototype.flushMixer = function (dump)
{
    var mix = this.model.getMixer ();
    this.sendOSC ('/mixer/clipLauncherSectionVisibility', mix.isClipLauncherSectionVisible (), dump);
    this.sendOSC ('/mixer/crossFadeSectionVisibility', mix.isCrossFadeSectionVisible (), dump);
    this.sendOSC ('/mixer/deviceSectionVisibility', mix.isDeviceSectionVisible (), dump);
    this.sendOSC ('/mixer/sendsSectionVisibility', mix.isSendSectionVisible (), dump);
    this.sendOSC ('/mixer/ioSectionVisibility', mix.isIoSectionVisible (), dump);
    this.sendOSC ('/mixer/meterSectionVisibility', mix.isMeterSectionVisible (), dump);
};

//--------------------------------------
// MasterTrack
//--------------------------------------

OSCWriter.prototype.flushMasterTrack = function (dump)
{
    this.flushTrack ('/master/', this.model.getMasterTrack (), dump);
};

//--------------------------------------
// Track
//--------------------------------------

OSCWriter.prototype.flushTracks = function (dump)
{
    var trackBank = this.model.getCurrentTrackBank ();

    for (var i = 0; i < trackBank.numTracks; i++)
        this.flushTrack ('/track/' + (i + 1) + '/', trackBank.getTrack (i), dump);

    // Added

    this.sendOSC('/track/canScrollTracksUp', trackBank.canScrollTracksUp(), dump);
    this.sendOSC('/track/canScrollTracksDown', trackBank.canScrollTracksDown(), dump);
};

//--------------------------------------
// SelectedTrack
//--------------------------------------

OSCWriter.prototype.flushSelectedTrack = function (dump)
{
    var trackBank = this.model.getCurrentTrackBank ();
    var selectedTrack = trackBank.getSelectedTrack ();
    if (selectedTrack == null)
        selectedTrack = OSCWriter.EMPTY_TRACK;
   // this.flushTrack ('/track/selected/', selectedTrack, dump);
};

//--------------------------------------
// TrackSends
//--------------------------------------

OSCWriter.prototype.flushSends = function (dump)
{
    this.flushSendNames ('/send/', dump);
};

//--------------------------------------
// Scenes
//--------------------------------------

OSCWriter.prototype.flushScenes = function (dump)
{
    var sceneBank = this.model.getSceneBank ();
    for (var i = 0; i < sceneBank.numScenes; i++)
        this.flushScene ('/scene/' + (i + 1) + '/', sceneBank.getScene (i), dump);
};

//--------------------------------------
// Device
//--------------------------------------

OSCWriter.prototype.flushDevices = function (dump)
{
    var cd = this.model.getCursorDevice ();
    var trackBank = this.model.getTrackBank ();
    //var selDevice = cd.getSelectedDevice ();

    var cd = this.model.getCursorDevice ();
    this.flushDevice ('/device/', cd, dump);
    for (var i = 0; i < cd.numDeviceLayers; i++)
        this.flushDeviceLayers ('/device/layer/' + (i + 1) + '/', cd.getLayerOrDrumPad (i), dump);
    this.flushDevice ('/primary/', trackBank.primaryDevice, dump);

    // Added

    this.sendOSC('/device/expand', cd.isExpanded(), dump);
    this.sendOSC('/device/window', cd.isWindowOpen(), dump);
    this.sendOSC('/device/macroVisible', cd.isMacroSectionVisible(), dump);
    this.sendOSC('/device/paramVisible', cd.isParameterPageSectionVisible(), dump);
    this.sendOSC('/device/window', cd.isWindowOpen(), dump);

    this.sendOSC('/device/canSelectPrevious', cd.canSelectPreviousFX(), dump);
    this.sendOSC('/device/canSelectNext', cd.canSelectNextFX(), dump);
    var name = cd.getSelectedParameterPageName();
    if (name != null && name != "")
        this.sendOSC('/device/param/selectedPageName', cd.getSelectedParameterPageName(), dump);

    var pages = cd.getParameterPageNames();
    var result = [];
    if (pages != null)
    {
        for (var i = 0; i < pages.length; i++)
        {
            result[i] = pages[i];
        }
    }

    this.sendOSC('/device/param/pageNames', result.length == 0 ? "" : result.join(','), dump);

    var name = cd.getSelectedParameterPageName();
    if (name != null && name != "")
        this.sendOSC('/device/param/selectedPageName', cd.getSelectedParameterPageName(), dump);
};

OSCWriter.prototype.flushUserDevice = function (dump)
{
    var cd = this.model.getCursorDevice ();
    var user = this.model.getUserControlBank ();
    for (var i = 0; i < cd.numParams; i++)
        this.flushFX ('/user/param/' + (i + 1) + '/', user.getUserParam (i), dump);
};

OSCWriter.prototype.flushTrack = function (trackAddress, track, dump)
{
    //println("OSCWriter.prototype.flushTrack() Mixed");

    for (var a = 0; a < OSCWriter.TRACK_ATTRIBS.length; a++)
    {
        var p = OSCWriter.TRACK_ATTRIBS[a];
        switch (p)
        {
            case 'sends':
                if (!track.sends)
                    continue;
                for (var j = 0; j < 8; j++)
                {
                    var s = track.sends[j];
                    for (var q in s)
                        this.sendOSC (trackAddress + 'send/' + (j + 1) + '/' + q, s[q], dump);
                }
                break;

            case 'slots':
                if (!track.slots)
                    continue;
                for (var j = 0; j < 8; j++)
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
                // Added
                else
                    this.sendOSCColor(trackAddress + p, 0, 0, 0, dump);
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

OSCWriter.prototype.flushNotes = function (dump)
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
        this.sendOSCColor ('/vkb_midi/note/' + i + '/color', color[0], color[1], color[2], dump);
    }
};