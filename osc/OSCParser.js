// Written by Jürgen Moßgraber - mossgrabers.de
// (c) 2014
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

function OSCParser (model, receiveHost, receivePort)
{
	this.model = model;
    
    this.transport = this.model.getTransport ();
    this.trackBank = this.model.getTrackBank ();
    this.masterTrack = this.model.getMasterTrack ();
    this.scales = this.model.getScales ();
    
    this.trackBank.setIndication (true);

    this.keysTranslation = null;
    this.drumsTranslation = null;
    this.updateNoteMapping ();
    
    this.port = host.getMidiInPort (0);
    this.noteInput = this.port.createNoteInput ("OSC Midi");
    
    host.addDatagramPacketObserver (receiveHost, receivePort, doObject (this, function (data)
    {
        var msg = new OSCMessage ();
        var messages = msg.parse (data);
        if (messages == null)
            messages = [ msg ];

        for (var i = 0; i < messages.length; i++)
        {
            /*
            println ("Address: " + messages[i].address);
            println ("Types: " + messages[i].types);
            println ("Values: " + messages[i].values);
            */
            this.parse (messages[i]);
        }
    }));
}

OSCParser.prototype.parse = function (msg)
{
	var oscParts = msg.address.split ('/');
	oscParts.shift (); // Remove first empty element
	if (oscParts.length == 0)
		return;
        
    var value = msg.values == null ? null : msg.values[0];
    println(msg.address);
	switch (oscParts.shift ())
	{
		case 'flush':
			writer.flush (true);
			break;

        case 'active':
            if (value == null)
                this.model.getApplication ().toggleEngineActive ();
            else
                this.model.getApplication ().setEngineActive (value != 0);
            break;
        //
        // Transport
        //
    
		case 'play':
            if (value == null || (value > 0 && !this.transport.isPlaying))
                this.transport.play ();
			break;

		case 'stop':
            if (value == null || (value > 0 && this.transport.isPlaying))
                this.transport.play ();
			break;

		case 'restart':
            if (value == null || value > 0)
                this.transport.restart ();
			break;

		case 'record':
            if (value == null || value > 0)
                this.transport.record ();
			break;

		case 'overdub':
            if (value != null && value == 0)
                return;
            if (oscParts.length > 0 && oscParts[0] == 'launcher')
                this.transport.toggleLauncherOverdub ();
            else
                this.transport.toggleOverdub ();
			break;

		case 'repeat':
            if (value == null)
                this.transport.toggleLoop ();
            else
                this.transport.setLoop (value != 0);
			break;
		
		case 'click':
            if (value == null)
                this.transport.toggleClick ();
            else
                this.transport.setClick (value != 0);
			break;
		
		case 'tempo':
			switch (oscParts[0])
            {
                case 'raw':
                    this.transport.setTempo (value);
                    break;
                case 'tap':
                    this.transport.tapTempo ();
                    break;
                case '+':
                    if (value == null)
                        value = 1;
                    this.transport.setTempo (this.transport.getTempo () + value);
                    break;
                case '-':
                    if (value == null)
                        value = 1;
                    this.transport.setTempo (this.transport.getTempo () - value);
                    break;
            }
			break;

		case 'time':
            this.transport.setPosition (value);
			break;

		case 'crossfade':
            this.transport.setCrossfade (value);
			break;

		case 'autowrite':
            if (oscParts.length > 0 && oscParts[0] == 'launcher')
                this.transport.toggleWriteClipLauncherAutomation ();
            else
                this.transport.toggleWriteArrangerAutomation ();
			break;
			
		case 'automationWriteMode':
            if (oscParts.length > 0)
                this.transport.setAutomationWriteMode (oscParts[0]);
			break;
            
        //
        // Frames
        //
    
       case 'layout':
            var app = this.model.getApplication ();
            if (oscParts.length > 0)
            {
                switch (oscParts[0])
                {
                    case 'arrange':
                        app.setPanelLayout ('ARRANGE');
                        break;
                    case 'mix':
                        app.setPanelLayout ('MIX');
                        break;
                    case 'edit':
                        app.setPanelLayout ('EDIT');
                        break;
                }
            }
            break;

        case 'panel':
            var app = this.model.getApplication ();
            switch (oscParts[0])
            {
                case 'noteEditor':
                    app.toggleNoteEditor (); 
                    break;
                case 'automationEditor':
                    app.toggleAutomationEditor ();
                    break;
                case 'devices':
                    app.toggleDevices ();
                    break;
                case 'mixer':
                    app.toggleMixer ();
                    break;
                case 'fullscreen':
                    app.toggleFullScreen ();
                    break;
            }
            break;
            
        case 'arranger':
            var arrange = this.model.getArranger ();
            switch (oscParts[0])
            {
                case 'cueMarkerVisibility':
                    arrange.toggleCueMarkerVisibility ();
                    break;
                case 'playbackFollow':
                    arrange.togglePlaybackFollow ();
                    break;
                case 'trackRowHeight':
                    arrange.toggleTrackRowHeight (); 
                    break;
                case 'clipLauncherSectionVisibility':
                    arrange.toggleClipLauncher ();
                    break;
                case 'timeLineVisibility':
                    arrange.toggleTimeLine ();
                    break;
                case 'ioSectionVisibility':
                    arrange.toggleIoSection ();
                    break;
                case 'effectTracksVisibility':
                    arrange.toggleEffectTracks ();
                    break;
            }
            break;
                
        case 'mixer':
            var mix = this.model.getMixer ();
            switch (oscParts[0])
            {
                case 'clipLauncherSectionVisibility':
                    mix.toggleClipLauncherSectionVisibility ();
                    break;
                case 'crossFadeSectionVisibility':
                    mix.toggleCrossFadeSectionVisibility ();
                    break;
                case 'deviceSectionVisibility':
                    mix.toggleDeviceSectionVisibility ();
                    break;
                case 'sendsSectionVisibility':
                    mix.toggleSendsSectionVisibility (); 
                    break;
                case 'ioSectionVisibility':
                    mix.toggleIoSectionVisibility ();
                    break;
                case 'meterSectionVisibility':
                    mix.toggleMeterSectionVisibility ();
                    break;
            }
            break;
			
        //
        // Scenes
        //
    
        case 'scene':
            var p = oscParts.shift ();
            switch (p)
            {
                case 'bank':
                    switch (oscParts.shift ())
                    {
                        case '+':
                            if (value == null || value > 0)
                                this.trackBank.scrollScenesPageDown ();
                            break;
                        case '-':
                            if (value == null || value > 0)
                                this.trackBank.scrollScenesPageUp ();
                            break;
                    }
                    break;
                case '+':
                    if (value == null || value > 0)
                        this.trackBank.scrollScenesDown ();
                    break;
                case '-':
                    if (value == null || value > 0)
                        this.trackBank.scrollScenesUp ();
                    break;
                default:
                    var scene = parseInt (p);
                    if (!scene)
                        return;
                    switch (oscParts.shift ())
                    {
                        case 'launch':
                            this.trackBank.launchScene (scene - 1);
                            break;
                    }
                    break;
            }
            break;
            
        //
        // Master-/Track(-commands)
        //
    
		case 'track':
			var trackNo = parseInt (oscParts[0]);
			if (isNaN (trackNo))
            {
                this.parseTrackCommands (oscParts, value);
				return;
            }
			oscParts.shift ();
			this.parseTrackValue (trackNo - 1, oscParts, value);
			break;

		case 'master':
			this.parseTrackValue (-1, oscParts, value);
			break;
            
        //
        // Device
        //
    
        case 'device':
            this.parseDeviceValue (this.model.getCursorDevice (), oscParts, value);
            break;

        case 'primary':
            this.parseDeviceValue (this.trackBank.primaryDevice, oscParts, value);
            break;

		case 'user':
			var part = oscParts.shift ();
            switch (part)
            {
                case 'param':
                    part = oscParts.shift ();
                    var no = parseInt (part);
                    this.parseUserValue (no - 1, oscParts, value);
                    break;
                case 'indicate':
                    if (oscParts[0] == 'param')
                    {
                        var userBank = this.model.getUserControlBank ();
                        for (var i = 0; i < userBank.numParams; i++)
                            userBank.getControl (i).setIndication (value != 0);
                    }
                    break;
                default:
                    println ('Unknown user command: ' + part);
                    break;
            }
            break;
            
        //
        // Keyboard
        //
    
        case 'vkb_midi':
            this.parseMidi (oscParts, value);
            break;
		
        //
        // Indicators
        //

        case 'indicate':
            var p = oscParts.shift ();
            var isVolume = p === 'volume';
            var isParam  = p === 'param';
            var isMacro  = p === 'macro';
            var tb = this.model.getCurrentTrackBank ();
            var cd = this.model.getCursorDevice ();
            for (var i = 0; i < 8; i++)
            {
                cd.getParameter (i).setIndication (isParam);
                cd.getMacro (i).getAmount ().setIndication (isMacro);
                tb.setVolumeIndication (i, isVolume);
                tb.setPanIndication (i, isVolume);
                this.masterTrack.setVolumeIndication (isVolume);
            }
            break;
            
        //
        // Actions
        //
        
        case 'action':
            if (oscParts.length == 0)
                return;
            var cmd = oscParts[0].replace (/-/g, ' ');
            try
            {
                this.model.getApplication ().getAction (cmd).invoke ();
            }
            catch (ex)
            {
                host.errorln ("Could not execute action: " + cmd);
            }
            break;

		default:
			println ('Unhandled OSC Command: ' + msg.address + ' ' + value);
			break;
	}
};

OSCParser.prototype.parseTrackCommands = function (parts, value)
{
    var p = parts.shift ();
	switch (p)
 	{
        case 'indicate':
            switch (parts.shift ())
            {
                case 'volume':
                    for (var i = 0; i < this.trackBank.numTracks; i++)
                        this.trackBank.setVolumeIndication (i, value != 0);
                    break;
                case 'pan':
                    for (var i = 0; i < this.trackBank.numTracks; i++)
                        this.trackBank.setPanIndication (i, value != 0);
                    break;
                case 'send':
                    var sendIndex = parseInt (parts[0]);
                    for (var i = 0; i < this.trackBank.numTracks; i++)
                        this.trackBank.setSendIndication (i, sendIndex - 1, value != 0);
                    break;
            }
            break;
    
        case 'bank':
            switch (parts.shift ())
            {
                case 'page':
                    if (parts.shift () == '+')
                    {
                        if (!this.trackBank.canScrollTracksDown ())
                            return;
                        this.trackBank.scrollTracksPageDown ();
                        scheduleTask (doObject (this, this.selectTrack), [ 0 ], 75);
                    }
                    else // '-'
                    {
                        if (!this.trackBank.canScrollTracksUp ())
                            return;
                        this.trackBank.scrollTracksPageUp ();
                        scheduleTask (doObject (this, this.selectTrack), [ 7 ], 75);
                    }
                    break;
            
                case '+':
                    this.trackBank.scrollTracksDown ();
                    break;
            
                case '-':
                    this.trackBank.scrollTracksUp ();
                    break;
            }
            break;
            
        case '+':
            var sel = this.trackBank.getSelectedTrack ();
            var index = sel == null ? 0 : sel.index + 1;
            if (index == this.trackBank.numTracks)
            {
                if (!this.trackBank.canScrollTracksDown ())
                    return;
                this.trackBank.scrollTracksPageDown ();
                scheduleTask (doObject (this, this.selectTrack), [0], 75);
            }
            this.selectTrack (index);
            break;
            
        case '-':
            var sel = this.trackBank.getSelectedTrack ();
            var index = sel == null ? 0 : sel.index - 1;
            if (index == -1)
            {
                if (!this.trackBank.canScrollTracksUp ())
                    return;
                this.trackBank.scrollTracksPageUp ();
                scheduleTask (doObject (this, this.selectTrack), [7], 75);
                return;
            }
            this.selectTrack (index);
            break;
            
        case 'add':
            switch (parts[0])
            {
                case 'audio': this.model.getApplication ().addAudioTrack (); break;
                case 'effect': this.model.getApplication ().addEffectTrack (); break;
                case 'instrument': this.model.getApplication ().addInstrumentTrack (); break;
            }
            break;
            
        case 'stop':
            this.model.getCurrentTrackBank ().getClipLauncherScenes ().stop ();
            break;
            
		default:
			println ('Unhandled Track Command: ' + p);
			break;
    }
};

OSCParser.prototype.parseTrackValue = function (trackIndex, parts, value)
{
    var p = parts.shift ();
	switch (p)
 	{
		case 'activated':
            if (value && value == 0)
                return;
            if (trackIndex == -1)
                this.masterTrack.setIsActivated (value != 0);
            else
                this.trackBank.setIsActivated (trackIndex, value != 0);
            break;

		case 'crossfadeMode':
            if (trackIndex >= 0 && value == 1)
                this.trackBank.setCrossfadeMode (trackIndex, parts.shift ());
            break;
    
		case 'select':
            if (value && value == 0)
                return;
            if (trackIndex == -1)
                this.masterTrack.select ();
            else
                this.trackBank.select (trackIndex);
			break;
			
		case 'volume':
            if (parts.length == 0)
            {
				var volume = parseFloat (value);
                if (trackIndex == -1)
                    this.masterTrack.setVolume (volume);
                else
                    this.trackBank.setVolume (trackIndex, volume);
            }
            else if (parts[0] == 'indicate')
            {
                if (trackIndex == -1)
                    this.masterTrack.setVolumeIndication (value != 0);
                else
                    this.trackBank.setVolumeIndication (trackIndex, value != 0);
            }
			break;
			
		case 'pan':
			if (parts.length == 0)
            {
				var pan = value;
                if (trackIndex == -1)
                    this.masterTrack.setPan (pan);
                else
                    this.trackBank.setPan (trackIndex, pan);
            }
            else if (parts[0] == 'indicate')
            {
                if (trackIndex == -1)
                    this.masterTrack.setPanIndication (value != 0);
                else
                    this.trackBank.setPanIndication (trackIndex, value != 0);
            }
			break;
			
		case 'mute':
			var mute = value == null ? null : parseInt (value);
            if (trackIndex == -1)
            {
                if (mute == null)
                    this.masterTrack.toggleMute ();
                else
                    this.masterTrack.setMute (mute > 0);
            }
            else
            {
                if (mute == null)
                    this.trackBank.toggleMute (trackIndex);
                else
                    this.trackBank.setMute (trackIndex, mute > 0);
			}
            break;
			
		case 'solo':
			var solo = value == null ? null : parseInt (value);
            if (trackIndex == -1)
            {
                if (solo == null)
                    this.masterTrack.toggleSolo ();
                else
                    this.masterTrack.setSolo (solo > 0);
            }
            else
            {
                if (solo == null)
                    this.trackBank.toggleSolo (trackIndex);
                else
                    this.trackBank.setSolo (trackIndex, solo > 0);
			}
            break;
			
		case 'recarm':
			var recarm = value == null ? null : parseInt (value);
            if (trackIndex == -1)
            {
                if (recarm == null)
                    this.masterTrack.toggleArm ();
                else
                    this.masterTrack.setArm (recarm > 0);
            }
            else
            {
                if (recarm == null)
                    this.trackBank.toggleArm (trackIndex);
                else
                    this.trackBank.setArm (trackIndex, recarm > 0);
			}
            break;
            
		case 'monitor':
			var monitor = value == null ? null : parseInt (value);
            var isAuto = parts.length > 0 && parts[0] == 'auto';
            if (trackIndex == -1)
            {
                if (monitor == null)
                    if (isAuto)
                        this.masterTrack.toggleAutoMonitor ();
                    else
                        this.masterTrack.toggleMonitor ();
                else
                    if (isAuto)
                        this.masterTrack.setAutoMonitor (monitor > 0);
                    else
                        this.masterTrack.setMonitor (monitor > 0);
            }
            else
            {
                if (monitor == null)
                    if (isAuto)
                        this.trackBank.toggleAutoMonitor (trackIndex);
                    else
                        this.trackBank.toggleMonitor (trackIndex);
                else
                    if (isAuto)
                        this.trackBank.setAutoMonitor (trackIndex, monitor > 0);
                    else
                        this.trackBank.setMonitor (trackIndex, monitor > 0);
            }
			break;

		case 'send':
			var sendNo = parseInt (parts.shift ());
			if (isNaN (sendNo))
				return;
			this.parseSendValue (trackIndex, sendNo - 1, parts, value);
			break;
            
        case 'clip':
            var p = parts.shift ();
			var clipNo = parseInt (p);
			if (isNaN (clipNo))
			{
                switch (p)
                {
                    case 'stop':
                        this.trackBank.getClipLauncherSlots (trackIndex).stop ();
                        break;
                    case 'returntoarrangement':
                        this.trackBank.getClipLauncherSlots (trackIndex).returnToArrangement ();
                        break;
                }
            }
            else
            {
                switch (parts.shift ())
                {
                    case 'select':
                        this.trackBank.getClipLauncherSlots (trackIndex).select (clipNo - 1);
                        break;
                    case 'launch':
                        this.trackBank.getClipLauncherSlots (trackIndex).launch (clipNo - 1);
                        break;
                    case 'record':
                        this.trackBank.getClipLauncherSlots (trackIndex).record (clipNo - 1);
                        break;
                }
            }
			break;
            
		default:
			println ('Unhandled Track Parameter: ' + p);
			break;
	}
};

OSCParser.prototype.parseSendValue = function (trackIndex, sendIndex, parts, value)
{
    var p = parts.shift ();
	switch (p)
 	{
		case 'volume':
            if (parts.length == 0)
                this.trackBank.setSend (trackIndex, sendIndex, value);
            else if (parts[0] == 'indicate')
                this.trackBank.setSendIndication (trackIndex, sendIndex, value != 0);
			break;

        default:
			println ('Unhandled Send Parameter value: ' + p);
			break;
	}
};

OSCParser.prototype.parseDeviceValue = function (cursorDevice, parts, value)
{
    var p = parts.shift ();
    switch (p)
    {
		case 'bypass':
            cursorDevice.toggleEnabledState ();
			break;

        case 'expand':
            cursorDevice.toggleExpanded ();
            break;

		case 'window':
            cursorDevice.toggleWindowOpen ();
			break;

        case 'macroVisible':
            cursorDevice.toggleMacroSectionVisible ();
            break;

        case 'paramVisible':
            cursorDevice.toggleParameterPageSectionVisible ();
            break;

        case 'reset':

            switch (parts.shift ())
            {
                case 'param':
                    var part = parts.shift ();
                    var index = parseInt(part); // index
                    cursorDevice.getParameter (index).reset ();
                    break;

                case 'common':
                    var part = parts.shift ();
                    var index = parseInt(part); // index
                    cursorDevice.getCommonParameter (index).reset ();
                    break;

                case 'envelope':
                    var part = parts.shift ();
                    var index = parseInt(part); // index
                    cursorDevice.getEnvelopeParameter (index).reset ();
                    break;

                case 'macro':
                    var part = parts.shift ();
                    var index = parseInt(part); // index
                    cursorDevice.getMacro (index).getAmount ().reset ();
                    break;
            }

            break;

        case 'indicate':
            switch (parts.shift ())
            {
                case 'param':
                    for (var i = 0; i < cursorDevice.numParams; i++)
                        cursorDevice.getParameter (i).setIndication (value != 0);
                    break;
                case 'common':
                    for (var i = 0; i < cursorDevice.numParams; i++)
                        cursorDevice.getCommonParameter (i).setIndication (value != 0);
                    break;
                case 'envelope':
                    for (var i = 0; i < cursorDevice.numParams; i++)
                        cursorDevice.getEnvelopeParameter (i).setIndication (value != 0);
                    break;
                case 'macro':
                    for (var i = 0; i < cursorDevice.numParams; i++)
                        cursorDevice.getMacro (i).getAmount ().setIndication (value != 0);
                    break;
            }
            break;
    
		case 'param':
			var part = parts.shift ();
            var paramNo = parseInt (part);
			if (isNaN (paramNo))
            {
                if (value == null || value > 0)
                {
                    switch (part)
                    {
                        case '+':
                            cursorDevice.nextParameterPage ();
                            break;
                        case '-':
                            cursorDevice.previousParameterPage ();
                            break;
                    }
                }
				return;
            }
			this.parseFXParamValue (cursorDevice, paramNo - 1, parts, value);
			break;
    
		case 'common':
			var part = parts.shift ();
            var no = parseInt (part);
			this.parseFXCommonValue (cursorDevice, no - 1, parts, value);
			break;
    
		case 'envelope':
			var part = parts.shift ();
            var no = parseInt (part);
			this.parseFXEnvelopeValue (cursorDevice, no - 1, parts, value);
			break;
    
		case 'macro':
			var part = parts.shift ();
            var no = parseInt (part);
			this.parseFXMacroValue (cursorDevice, no - 1, parts, value);
			break;
    
		case 'modulation':
			var part = parts.shift ();
            var no = parseInt (part);
			this.parseFXModulationValue (cursorDevice, no - 1, parts, value);
			break;
    
        case '+':
            if (value == null || value > 0)
                cursorDevice.selectNext ();
            break;

        case '-':
            if (value == null || value > 0)
                cursorDevice.selectPrevious ();
            break;

        case 'preset':
            if (value == null || value > 0)
            {
                switch (parts.shift ())
                {
                    case '+':
                        cursorDevice.switchToNextPreset ();
                        break;
                    case '-':
                        cursorDevice.switchToPreviousPreset ();
                        break;
                }
            }
            break;

        case 'category':
            if (value == null || value > 0)
            {
                switch (parts.shift ())
                {
                    case '+':
                        cursorDevice.switchToNextPresetCategory ();
                        break;
                    case '-':
                        cursorDevice.switchToPreviousPresetCategory ();
                        break;
                }
            }
            break;

        case 'creator':
            if (value == null || value > 0)
            {
                switch (parts.shift ())
                {
                    case '+':
                        cursorDevice.switchToNextPresetCreator ();
                        break;
                    case '-':
                        cursorDevice.switchToPreviousPresetCreator ();
                        break;
                }
            }
            break;

        default:
			println ('Unhandled Device Parameter: ' + p);
			break;
    }
};

OSCParser.prototype.parseFXParamValue = function (cursorDevice, fxparamIndex, parts, value)
{
	switch (parts[0])
 	{
		case 'value':
			if (parts.length == 1 && value != null)
				cursorDevice.setParameter (fxparamIndex, parseFloat (value));
			break;
            
        case 'indicate':
			if (parts.length == 1 && value != null)
                cursorDevice.getParameter (fxparamIndex).setIndication (value != 0);
            break;

        default:
			println ('Unhandled FX Parameter value: ' + parts[0]);
			break;
	}
};

OSCParser.prototype.parseFXCommonValue = function (cursorDevice, index, parts, value)
{
	switch (parts[0])
 	{
		case 'value':
			if (parts.length == 1 && value != null)
				cursorDevice.getCommonParameter (index).set (parseFloat (value), Config.maxParameterValue);
			break;
            
        case 'indicate':
			if (parts.length == 1 && value != null)
                cursorDevice.getCommonParameter (index).setIndication (value != 0);
            break;

        default:
			println ('Unhandled FX Parameter value: ' + parts[0]);
			break;
	}
};

OSCParser.prototype.parseFXEnvelopeValue = function (cursorDevice, index, parts, value)
{
	switch (parts[0])
 	{
		case 'value':
			if (parts.length == 1 && value != null)
                cursorDevice.getEnvelopeParameter (index).set (parseFloat (value), Config.maxParameterValue);
			break;
            
        case 'indicate':
			if (parts.length == 1 && value != null)
                cursorDevice.getEnvelopeParameter (index).setIndication (value != 0);
            break;

        default:
			println ('Unhandled FX Parameter value: ' + parts[0]);
			break;
	}
};

OSCParser.prototype.parseFXMacroValue = function (cursorDevice, index, parts, value)
{
	switch (parts[0])
 	{
		case 'value':
			if (parts.length == 1 && value != null)
				cursorDevice.getMacro (index).getAmount ().set (parseFloat (value), Config.maxParameterValue);
			break;
            
        case 'indicate':
			if (parts.length == 1 && value != null)
                cursorDevice.getMacro (index).getAmount ().setIndication (value != 0);
            break;

        default:
			println ('Unhandled FX Parameter value: ' + parts[0]);
			break;
	}
};

OSCParser.prototype.parseFXModulationValue = function (cursorDevice, index, parts, value)
{
	switch (parts[0])
 	{
		case 'value':
			if (parts.length == 1 && value != null)
            {
                var values = cursorDevice.getModulationParam (index);
                if ((value == 1 && !values.value) || (value == 0 && values.value))
                    cursorDevice.getModulationSource (index).toggleIsMapping ();
            }
			break;
            
        default:
			println ('Unhandled FX Parameter value: ' + parts[0]);
			break;
	}
};

OSCParser.prototype.parseUserValue = function (index, parts, value)
{
    switch (parts[0])
    {
        case 'value':
            if (parts.length == 1 && value != null)
                this.model.getUserControlBank ().getControl (index).set (parseFloat (value), Config.maxParameterValue);
            break;
            
        case 'indicate':
            if (parts.length == 1 && value != null)
                this.model.getUserControlBank ().getControl (index).setIndication (value != 0);
            break;

        default:
            println ('Unhandled FX Parameter value: ' + parts[0]);
            break;
    }
};

OSCParser.prototype.parseMidi = function (parts, value)
{
    var midiChannel = parseInt (parts.shift ());
    var p = parts.shift ();
    switch (p)
    {
        case 'note':
            var n = parts.shift ();
            switch (n)
            {
                case '+':
                    if (value == null || value > 0)
                    {
                        this.scales.incOctave ();
                        this.updateNoteMapping ();
                        displayNotification (this.scales.getRangeText ());
                    }
                    break;
            
                case '-':
                    if (value == null || value > 0)
                    {
                        this.scales.decOctave ();
                        this.updateNoteMapping ();
                        displayNotification (this.scales.getRangeText ());
                    }
                    break;
            
                default:
                    var note = parseInt (n);
                    var velocity = parseInt (value);
                    this.noteInput.sendRawMidiEvent (0x90 + midiChannel, this.keysTranslation[note], velocity);
            }
            break;
            
        case 'drum':
            var n = parts.shift ();
            switch (n)
            {
                case '+':
                    if (value == null || value > 0)
                    {
                        this.scales.incDrumOctave ();
                        this.updateNoteMapping ();
                        displayNotification (this.scales.getDrumRangeText ());
                    }
                    break;
            
                case '-':
                    if (value == null || value > 0)
                    {
                        this.scales.decDrumOctave ();
                        this.updateNoteMapping ();
                        displayNotification (this.scales.getDrumRangeText ());
                    }
                    break;
            
                default:
                    var note = parseInt (n);
                    var velocity = parseInt (value);
                    this.noteInput.sendRawMidiEvent (0x90 + midiChannel, this.drumsTranslation[note], velocity);
                    break;
            }
            break;
            
        default:
			println ('Unhandled Midi Parameter: ' + p);
            break;
    }
};

OSCParser.prototype.updateNoteMapping = function ()
{
    this.drumsTranslation = this.scales.getDrumMatrix ();
    this.keysTranslation = this.scales.getNoteMatrix (); 
};

OSCParser.prototype.selectTrack = function (index)
{
    this.trackBank.select (index);
};
