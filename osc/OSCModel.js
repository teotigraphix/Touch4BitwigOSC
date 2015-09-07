// Written by Jürgen Moßgraber - mossgrabers.de
// (c) 2014-2015
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

OSCModel.prototype.keysTranslation = null;
OSCModel.prototype.drumsTranslation = null;

function OSCModel (scales)
{
    if (scales == null)
        return;

    //Model.call (this, 70, scales, 8, 8, 8);

    var userCCStart = 70;
    var numTracks = 8;
    var numScenes = 8;
    var numSends = 8;

    //--------------------------------------------------------------------------

    this.numTracks = numTracks ? numTracks : 8;
    this.numScenes = numScenes ? numScenes : 8;
    this.numSends  = numSends  ? numSends  : 6;

    this.application = new ApplicationProxy ();

    this.addApplicationExtras (this.application.application);
    this.currentProjectName = "";

    this.transport = new TransportProxy ();
    this.groove = new GrooveProxy ();
    this.masterTrack = new MasterTrackProxy ();
    this.trackBank = new TrackBankProxy (this.numTracks, this.numScenes, this.numSends);
    this.effectTrackBank = new EffectTrackBankProxy (this.numTracks, this.numScenes, this.trackBank);
    this.userControlBank = new UserControlBankProxy (userCCStart);

    this.cursorDevice = new CursorDeviceProxy (host.createEditorCursorDevice (this.numSends), this.numSends);
    this.arranger = new ArrangerProxy ();
    this.mixer = new MixerProxy ();
    this.sceneBank = new SceneBankProxy (this.numScenes);

    // this.browser = new BrowserProxy (this.cursorDevice);

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
