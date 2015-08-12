// Written by Jürgen Moßgraber - mossgrabers.de
// (c) 2014
// Licensed under LGPLv3 - http://www.gnu.org/licenses/lgpl-3.0.txt

function OSCMessage ()
{
    this.address = "";
    this.types   = null;
    this.values  = [];
    this.data    = null;
}

OSCMessage.prototype.init = function (address, param, type)
{
    this.address = address;
    this.types = [];
    if (param != null)
    {
        switch (typeof (param))
        {
            case 'string':
                this.types.push ('s');
                this.values.push (param);
                break;

            case 'boolean':
                this.types.push (param ? 'T' : 'F');
                break;

            case 'number':
                if (type)
                    this.types.push (type);
                else
                {
                    if (param % 1 === 0) // Is Integer ?
                        this.types.push ('i');
                    else
                        this.types.push ('f');
                }
                this.values.push (param);
                break;

            default:
                println ("Unsupported object type: " + typeof (param));
                break;
        }
    }
    else
        this.types.push ('N');
};

OSCMessage.prototype.parse = function (data)
{
    this.data = data;
    this.streamPos = 0;
    
    this.address = this.readString ();
    this.streamPos = this.address.length;
    this.skipToFourByteBoundary ();
    
    // Is it an OSC bundle?
    if (this.address == "#bundle")
        return this.readBundle ();

    this.types = this.readTypes ();
    if (this.types == null)
        return;
    
    this.skipToFourByteBoundary ();
    
	for (var i = 0; i < this.types.length; i++)
    {
        if (this.types[i] == '[')
        {
            // This is an array -> read it
            this.values.push (this.readArray (this.types, ++i));
            // Increment i to the end of the array
            while (this.types[i] != ']')
                i++;
        } 
        else
            this.values.push (this.readArgument (this.types[i]));

        this.skipToFourByteBoundary ();
    }
    
    return null;
};

OSCMessage.prototype.build = function ()
{
    this.data = [];

    this.writeString (this.address);
    this.alignToFourByteBoundary ();
    
    this.data.push (','.charCodeAt (0));
    for (var i = 0; i < this.types.length; i++)
        this.data.push (this.types[i].charCodeAt (0));
    this.alignToFourByteBoundary ();
    
    for (var i = 0; i < this.values.length; i++)
    {
        switch (this.types[i])
        {
            case 's':
                this.writeString (this.values[i]);
                break;
                
            case 'r':
            case 'i':
                this.writeInteger (this.values[i]);
                break;
                
            case 'f':
                this.writeFloat (this.values[i]);
                break;
                
            default:
                host.errorln ("Unknown OSC value type: " + this.types[i]);
                break;
        }
        this.alignToFourByteBoundary ();
    }
    
    return this.data;
};


//
// PRIVATE
//

OSCMessage.prototype.readBundle = function ()
{
    this.readTimeTag ();
    
    // Read OSC messages in the bundle
    var messages = [];
    while (this.streamPos < this.data.length)
    {
        var messageData = this.readBlob ();
        if (messageData == null)
            continue;
        var msg = new OSCMessage ();
        var result = msg.parse (messageData);
        if (result == null)
            result = [ msg ];
        for (var i = 0; i < result.length; i++)
            messages.push (result[i]);
    }
    
    return messages;
};

OSCMessage.prototype.readTypes = function ()
{
    // No arguments ?
    if (this.data.length <= this.streamPos)
        return null;

    // The next byte should be a ',', but some legacy code may omit it
    // in case of no arguments, referring to "OSC Messages" in:
    // http://opensoundcontrol.org/spec-1_0
    if (String.fromCharCode (this.data[this.streamPos]) != ',')
        return null;

    this.streamPos++;
    
    // Read in the types
    var types = this.readString ();
    
    // No arguments
    if (types.length == 0)
        return null;
    
    var typesChars = [];
    for (var i = 0; i < types.length; i++) 
        typesChars.push (types[i]);
    this.streamPos += types.length;
    return typesChars;
};

OSCMessage.prototype.readArgument = function (type)
{
    switch (type)
    {
        // Required support OSC 1.0
        case 'i':
            return this.readInteger ();
        case 'f':
            return this.readFloat ();
        case 's':
            return this.readString ();
        case 'b':
            return this.readBlob ();

        // Required support OSC 1.1
        case 'u':
            return this.readUnsignedInteger ();
        case 'T':
            return true;
        case 'F':
            return false;
        case 'N':
            return null;
        case 'I':
            // I Impulse: (aka “bang”)
            return null;
        case 't':
            return this.readTimeTag ();
            
        // Optional support
        case 'h':
            return this.readLong ();
        case 'd':
            return this.readDouble ();
        case 'S':
            return this.readString ();
        case 'c':
            // TODO
            println ("Unsupported character parameter");
            return null;
        case 'r':
            // TODO
            println ("Unsupported color parameter");
            return null;
        case 'm':
            return this.readMidi ();

        default:
            println ("Invalid or not yet supported OSC type: '" + type + "'");
            return null;
    }
};

// 32-bit big-endian unsigned integer
OSCMessage.prototype.readUnsignedInteger = function ()
{
    // TODO
    println ("OSCMessage.prototype.readUnsignedInteger not implemented.");
    return "TODO";
};

// 32-bit big-endian signed 2’s complement integer
OSCMessage.prototype.readInteger = function ()
{
    return this.readBigInteger (4);
};

OSCMessage.prototype.writeInteger = function (value)
{
    var pos = this.data.length;
    for (var i = 0; i < 4; i++)
    {
        this.data[pos + 3 - i] = value & 255;
        if (this.data[pos + 3 - i] >= 128)
            this.data[pos + 3 - i] = this.data[pos + 3 - i] - 256;
        value = value >> 8;
    }
};

OSCMessage.prototype.readLong = function ()
{
    return this.readBigInteger (8);
};

OSCMessage.prototype.readBigInteger = function (numberOfBytes)
{
    var value = 0;
    for (var i = this.streamPos; i < this.streamPos + numberOfBytes; i++)
        value = value * 256 + (this.data[i] < 0 ? 256 + this.data[i] : this.data[i]);
    this.streamPos += numberOfBytes;
    return value;
};

OSCMessage.prototype.readFloat = function ()
{
    // 32-bit big-endian IEEE 754 floating point number, see
    // http://en.wikipedia.org/wiki/Single-precision_floating-point_format

    // Extract the sign
    var sign = (this.data[this.streamPos] & 0x80) ? -1 : 1;

    // Extract the exponent
    var exponent = this.data[this.streamPos] & 0x7F;
	exponent = exponent << 1;
    if ((this.data[this.streamPos + 1] & 0x80) != 0)
        exponent += 0x01;
    if (exponent != 0)
        exponent = Math.pow (2, exponent - 127);

    // Extract the 23 bit significand
    var num = 0;
    var mask = 0x40;
    for (var i = 1; i < 8; i++)
    {
        if ((this.data[this.streamPos + 1] & mask) != 0)
            num += 1 / Math.pow (2, i);
        mask = mask >> 1;
    }
    mask = 0x80;
    for (var j = 0; j < 8; j++)
    {
        if((this.data[this.streamPos + 2] & mask) != 0)
            num += 1 / Math.pow (2, j + 8);
        mask = mask >> 1;
    }
    mask = 0x80;
    for (var k = 0; k < 8; k++)
    {
        if ((this.data[this.streamPos + 2] & mask) != 0)
            num += 1 / Math.pow (2, k + 16);
        mask = mask >> 1;
    }
    var significand = num + 1;    
    
    this.streamPos += 4;

    return sign * significand * exponent;
};

OSCMessage.prototype.writeFloat = function (value)
{
    if (value == 0)
    {
        for (var i = 0; i < 4; i++);
            this.data.push (0);
        return;
    }

    var sign = value < 0 ? "1" : "0";

    value = Math.abs (value);

    // Find the power of 2 which is bigger than the given value
    var exponent = 0;
    if (value > 0)
    {
        // Search upwards
        while (Math.pow (2, exponent) < value)
            exponent++;
        exponent -= 1;
    }
    else
    {
        // Search downwards
        while (Math.pow (2, exponent) > value)
            exponent--;
        exponent += 1;
    }

    // Calculate power of 2 fractions for 23 bits
    var significand = 0;
    while (significand < 1 || significand >= 2)
    {
        significand = value / Math.pow (2, exponent);
        exponent--;
    }
    exponent++;
    var bias = exponent + 127;
    significand -= 1;

    // Convert to binary
    var biasBin = bias.toString (2);
    if (biasBin.length != 8)
    {
        biasBin = "0000000" + biasBin;
        biasBin = biasBin.substr (biasBin.length - 8, biasBin.length);
    }
    var significandBin = significand.toString (2);
    if (significandBin.length < 26)
        significandBin += "00000000000000000000000";
    significandBin = significandBin.substr (2, 23);

    var result = sign + biasBin + significandBin;
    for (var i = 0; i < 4; i++)
    {
        var b = parseInt (result.substr (8 * i, 8), 2);
        if (b > 127)
            b = b - 256;
        this.data.push (b);
    }
};

OSCMessage.prototype.readDouble = function ()
{
    // TODO
    println ("OSCMessage.prototype.readDouble not implemented.");
    return "TODO";
};

// A sequence of non-null ASCII characters followed by a null, followed by
// 0-3 additional null characters to make the total number of bits a multiple
// of 32. 
OSCMessage.prototype.readString = function ()
{
    var pos = this.streamPos;
    var str = "";
    while (pos < this.data.length && this.data[pos] != 0)
    {
        str += String.fromCharCode (this.data[pos]);
        pos++;
    }
    return str;
};

OSCMessage.prototype.writeString = function (str)
{
    for (var i = 0; i < str.length; i++)
        this.data.push (str.charCodeAt (i));
};

// A uint32 size count, followed by that many 8-bit bytes of arbitrary binary
// data, followed by 0-3 additional zero bytes to make the total number of bits
// a multiple of 32.
OSCMessage.prototype.readBlob = function ()
{
    var numberOfBytes = this.readInteger ();
    if (this.streamPos + numberOfBytes > this.data.length)
    {
        println ("OSC Blob with size greater than data length detected:");
        var d = "";
        for (var i = 0; i < this.data.length; i++)
            d += this.data[i] + " * ";
        println (d);
        return null;
    }
    
    var buffer = [];
    for (var i = 0; i < numberOfBytes; i++)
        buffer[i] = this.data[this.streamPos + i];
    this.streamPos += numberOfBytes;
    
    // This is different then all other OSC alignments!
    // If already 32bit aligned no additional 4 bytes are added
    var mod = this.streamPos % 4;
    if (mod != 0)
        this.streamPos += (4 - mod);

    return buffer;
};

// 64-bit big-endian fixed-point time tag
OSCMessage.prototype.readTimeTag = function ()
{
    // TODO Results never tested - Only used in Bundles to skip the date!
    
    var millisSince1970 = this.readInteger ();
    /* var fractionsOfASecond = */ this.readInteger ();
    
    // Do it immediatly
    if (millisSince1970 == 0)
        return null;

    return new Date (millisSince1970);
};

OSCMessage.prototype.readMidi = function ()
{
    // 4 byte MIDI message. Bytes from MSB to LSB are: port id, status byte, data1, data2
    // TODO
    println ("OSCMessage.prototype.readMidi not implemented.");
    return "TODO";
};

OSCMessage.prototype.skipToFourByteBoundary = function ()
{
    // If we are already at a 4 byte boundary, we need to move to the next one
    var mod = this.streamPos % 4;
    this.streamPos += (4 - mod);
};

OSCMessage.prototype.alignToFourByteBoundary = function ()
{
    var upper = 4 - (this.data.length % 4);
	for (var i = 0; i < upper; i++)
        this.data.push (0);
};
