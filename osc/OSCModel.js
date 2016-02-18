// Written by Jürgen Moßgraber - mossgrabers.de
// (c) 2014-2015
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

OSCModel.prototype.keysTranslation = null;
OSCModel.prototype.drumsTranslation = null;

BrowserSessionProxy.prototype.handleIsActive = function (active)
{
    this.isActive = active;
    println("B active " + active);
};

function OSCModel (scales)
{
    if (scales == null)
        return;

    //Model.call (this, 70, scales, 8, 8, 8);

    var userCCStart = 70;
    var numTracks = 8;
    var numScenes = 8;
    var numSends = 8;
    var numFilterColumns = 6;
    var numFilterColumnEntries = 16;
    var numResults = 16;
    var hasFlatTrackList = true;
    var numParams = 8;
    var numDevicesInBank = 8;
    var numDeviceLayers = 8;
    var numDrumPadLayers = 16;

    //--------------------------------------------------------------------------

    this.numTracks              = numTracks ? numTracks : 8;
    this.numScenes              = numScenes ? numScenes : 8;
    this.numSends               = numSends  ? numSends  : 6;
    this.numFilterColumns       = numFilterColumns ? numFilterColumns : 6;
    this.numFilterColumnEntries = numFilterColumnEntries ? numFilterColumnEntries : 16;
    this.numResults             = numResults ? numResults : 16;
    this.hasFlatTrackList       = hasFlatTrackList ? true : false;
    this.numParams              = numParams ? numParams : 8;
    this.numDevicesInBank       = numDevicesInBank ? numDevicesInBank : 8;
    this.numDeviceLayers        = numDeviceLayers ? numDeviceLayers : 8;
    this.numDrumPadLayers       = numDrumPadLayers ? numDrumPadLayers : 16;

    this.application = new ApplicationProxy ();
    this.transport = new TransportProxy ();
    this.groove = new GrooveProxy ();
    this.masterTrack = new MasterTrackProxy ();
    this.trackBank = new TrackBankProxy (this.numTracks, this.numScenes, this.numSends, this.hasFlatTrackList);
    this.effectTrackBank = new EffectTrackBankProxy (this.numTracks, this.numScenes, this.trackBank);
    if (userCCStart >= 0)
        this.userControlBank = new UserControlBankProxy (userCCStart);

    this.cursorDevice = new CursorDeviceProxy (host.createEditorCursorDevice (this.numSends), this.numSends);
    this.arranger = new ArrangerProxy ();
    this.mixer = new MixerProxy ();
    this.sceneBank = new SceneBankProxy (this.numScenes);

    this.browser = new BrowserProxy (this.cursorDevice, this.numFilterColumns, this.numFilterColumnEntries, this.numResults);

    this.currentTrackBank = this.trackBank;

    this.scales = scales;

    /**
     * @type {OSCParser}
     */
    this.parser = null;

    /**
     * @type {OSCWriter}
     */
    this.writer = null;

    //--------------------------------------------------------------------------

    this.pressedKeys = initArray (0, 128);
    
    var tb = this.getTrackBank ();
    tb.addNoteListener (doObject (this, function (pressed, note, velocity)
    {
        // Light notes send from the sequencer
        for (var i = 0; i < 128; i++)
        {
            if (this.keysTranslation[i] == note)
                this.pressedKeys[i] = pressed ? velocity : 0;
        }
    }));
    tb.addTrackSelectionListener (doObject (this, function (index, isSelected)
    {
        this.clearPressedKeys ();
    }));
}
OSCModel.prototype = new Model ();

/**
 *
 * @param {Application} application
 */
OSCModel.prototype.addApplicationExtras = function (application)
{
    application.addProjectNameObserver (doObject (this, OSCModel.prototype.handleProjectNameObserver), 100);
};

OSCModel.prototype.handleProjectNameObserver = function (name)
{
    //println(">>> Flushing for new Project " + name);
    this.currentProjectName = name;
    this.writer.flush (true);
};

OSCModel.prototype.updateNoteMapping = function ()
{
    this.drumsTranslation = this.scales.getDrumMatrix ();
    this.keysTranslation = this.scales.getNoteMatrix (); 
};

OSCModel.prototype.clearPressedKeys = function ()
{
    for (var i = 0; i < 128; i++)
        this.pressedKeys[i] = 0;
};
