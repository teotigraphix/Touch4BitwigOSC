
OSCWriter.TRACK_ATTRIBS = [
    "exists", "activated", "selected", "name",
    "volumeStr", "volume", "panStr", "pan", "color",
    "vu", "mute", "solo", "recarm", "monitor", "autoMonitor",
    "canHoldNotes", "sends", "slots", "crossfadeMode" ];

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
    //println("OSCWriter.prototype.flush() Mixed");
    this.flushTransport (dump);
    this.flushApplication (dump);
    this.flushArranger (dump);
    this.flushMixer (dump);

    this.flushMasterTrack (dump);
    this.flushTracks (dump);
    this.flushSelectedTrack (dump);

    this.flushDevice (dump);
    this.flushPrimaryDevice (dump);
    this.flushUserDevice (dump);

    if (Config.enableKeyboard)
    {
        this.flushNotes (dump);
    }

    // Send all collected messages
    if (this.messages.length == 0)
        return;

    var data = new OSCMessage ().buildBundle (this.messages);
    host.sendDatagramPacket (Config.sendHost, Config.sendPort, data);
};

OSCWriter.prototype.flushTransport = function (dump)
{
    var trans = this.model.getTransport ();

    this.sendOSC ('/position', trans.getPositionText(), dump);
    this.sendOSC ('/numerator', trans.getNumerator(), dump);
    this.sendOSC ('/denominator', trans.getDenominator(), dump);
    this.sendOSC ('/automationOverride', trans.isAutomationOverride, dump);

    //----------------------------------
    // original
    //----------------------------------
    this.sendOSC ('/play', trans.isPlaying, dump);
    this.sendOSC ('/record', trans.isRecording, dump);
    this.sendOSC ('/overdub', trans.isOverdub, dump);
    this.sendOSC ('/overdub/launcher', trans.isLauncherOverdub, dump);
    this.sendOSC ('/repeat', trans.isLooping, dump);
    this.sendOSC ('/click', trans.isClickOn, dump);
    this.sendOSC ('/preroll', trans.getPreroll (), dump);
    this.sendOSC ('/tempo/raw', trans.getTempo (), dump);
    this.sendOSC ('/crossfade', trans.getCrossfade (), dump);
    this.sendOSC ('/autowrite', trans.isWritingArrangerAutomation, dump);
    this.sendOSC ('/autowrite/launcher', trans.isWritingClipLauncherAutomation, dump);
    this.sendOSC ('/automationWriteMode', trans.automationWriteMode, dump);
};

OSCWriter.prototype.flushApplication = function (dump)
{
    var app = this.model.getApplication ();
    this.sendOSC ('/active', app.isEngineActive(), dump);

    //----------------------------------
    // original
    //----------------------------------
    this.sendOSC ('/layout', app.getPanelLayout ().toLowerCase (), dump);
};

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

OSCWriter.prototype.flushMasterTrack = function (dump)
{
    this.flushTrack ('/master/', this.model.getMasterTrack (), dump);
};

OSCWriter.prototype.flushTracks = function (dump)
{
    var trackBank = this.model.getCurrentTrackBank ();

    this.sendOSC('/track/canScrollTracksUp', trackBank.canScrollTracksUp(), dump);
    this.sendOSC('/track/canScrollTracksDown', trackBank.canScrollTracksDown(), dump);

    //----------------------------------
    // original
    //----------------------------------
    for (var i = 0; i < trackBank.numTracks; i++)
        this.flushTrack ('/track/' + (i + 1) + '/', trackBank.getTrack (i), dump);
};

OSCWriter.prototype.flushSelectedTrack = function (dump)
{
    var trackBank = this.model.getCurrentTrackBank ();
    var selectedTrack = trackBank.getSelectedTrack ();
    if (selectedTrack == null)
        selectedTrack = OSCWriter.EMPTY_TRACK;
    this.flushTrack ('/track/selected/', selectedTrack, dump);
};

OSCWriter.prototype.flushDevice = function (dump)
{
    var cd = this.model.getCursorDevice ();
    var selDevice = cd.getSelectedDevice ();

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

    //----------------------------------
    // original
    //----------------------------------
    this.sendOSC ('/device/name', selDevice.name, dump);
    this.sendOSC ('/device/bypass', !selDevice.enabled, dump);
    for (var i = 0; i < cd.numParams; i++)
    {
        var oneplus = i + 1;
        this.flushFX ('/device/param/' + oneplus + '/', cd.getFXParam (i), dump);
        this.flushFX ('/device/common/' + oneplus + '/', cd.getCommonParam (i), dump);
        this.flushFX ('/device/envelope/' + oneplus + '/', cd.getEnvelopeParam (i), dump);
        this.flushFX ('/device/macro/' + oneplus + '/', cd.getMacroParam (i), dump);
        this.flushFX ('/device/modulation/' + oneplus + '/', cd.getModulationParam (i), dump);
    }
    //this.sendOSC ('/device/category', cd.categoryProvider.selectedItemVerbose, dump);
    //this.sendOSC ('/device/creator', cd.creatorProvider.selectedItemVerbose, dump);
    //this.sendOSC ('/device/preset', cd.presetProvider.selectedItemVerbose, dump);
};

OSCWriter.prototype.flushPrimaryDevice = function (dump)
{
    var cd = this.model.getCursorDevice ();
    var selDevice = cd.getSelectedDevice ();
    this.sendOSC ('/primary/name', selDevice.name, dump);
    this.sendOSC ('/primary/bypass', !selDevice.enabled, dump);
    for (var i = 0; i < cd.numParams; i++)
    {
        var oneplus = i + 1;
        this.flushFX ('/primary/param/' + oneplus + '/', cd.getFXParam (i), dump);
        this.flushFX ('/primary/common/' + oneplus + '/', cd.getCommonParam (i), dump);
        this.flushFX ('/primary/envelope/' + oneplus + '/', cd.getEnvelopeParam (i), dump);
        this.flushFX ('/primary/macro/' + oneplus + '/', cd.getMacroParam (i), dump);
        this.flushFX ('/primary/modulation/' + oneplus + '/', cd.getModulationParam (i), dump);
    }
    //this.sendOSC ('/primary/category', cd.categoryProvider.selectedItemVerbose, dump);
    //this.sendOSC ('/primary/creator', cd.creatorProvider.selectedItemVerbose, dump);
    //this.sendOSC ('/primary/preset', cd.presetProvider.selectedItemVerbose, dump);
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