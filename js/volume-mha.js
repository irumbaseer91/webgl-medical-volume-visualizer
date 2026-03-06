"use strict";

var MHA = function MHA(buffer){
    this.objecttype = null;
    this.ndims = null;
    this.binarydata = null;
    this.binarydatabyteordermsb = false; //Big-endian
    this.compresseddata = false;
    this.compresseddatasize = null;
    
    this.dimsize = null;

    this.elementtype = null;
    this.elementspacing = [1, 1, 1];
    this.elementsize = null;
    this.elementdatafile = null; //Last header line to parse

    this.offset = [0, 0, 0];
    this.transformmatrix = null;
    this.centerofrotation = null;
    this.anatomicalorientation = null;

    this._isvalidvolume = false;
    this._endheader = 0;

    this._datatype = null;
    this._voxelBytes = null;
    this._voxelChannels = null; //?
    this._voxelType = null;

    this._mhabuffer = buffer || null;
    this._headerarray = null;
    this._databuffer = null; //It may be in another file or be part of mhabuffer (elementdatafile)
}

MHA.prototype.parseHeader = function(){
    if(!this._mhabuffer){
        console.log("MHA buffer is not set.");
        return this._isvalidvolume = false;
    }

    var view = new Uint8Array(this._mhabuffer);

    var headerline = "";
    for(var count = 0; count < view.length; count++){
        var c = String.fromCharCode(view[count]);
        if(c == "\n"){
            var elements = headerline.trim().split(" ");
            var tag = elements[0].toLowerCase();
            switch(tag){
                //String
                case "objecttype":
                case "elementtype":
                case "elementdatafile":
                case "anatomicalorientation":
                    this[tag] = elements[2].toLowerCase();
                    break;
                
                //Boolean
                case "binarydata":
                case "binarydatabyteordermsb":
                case "compresseddata":
                    this[tag] = (elements[2].toLowerCase() == "true");
                    break;

                //Number
                case "ndims":
                case "compresseddatasize":
                    this[tag] = Number.parseFloat(elements[2]);
                    break;

                //Number array
                case "dimsize":
                case "offset":
                case "elementspacing":
                case "transformmatrix":
                case "centerofrotation":
                    this[tag] = [];
                    for(var i=2; i<elements.length; i++){
                        this[tag].push(Number.parseFloat(elements[i]));
                    }
                    break;
            }
            if(tag == "elementdatafile"){
                this._endheader = count;
                break;
            }
            headerline = "";
        }else{
            headerline += c;
        }
    }

    if(this.objecttype != "image"
        || this.ndims != 3
        || !this.dimsize
        || !this.elementtype
        || !this.elementdatafile){
            console.log("Missing essential information.")
            return this._isvalidvolume = false;
        }

    this._datatype = this.elementtype.slice(4);
    switch(this._datatype){
        case "char":
            this._voxelBytes = 1;
            this._voxelType = "I";
            break;
        case "uchar":
            this._voxelBytes = 1;
            this._voxelType = "UI";
            break;
        case "short":
            this._voxelBytes = 2;
            this._voxelType = "I";
            break;
        case "ushort":
            this._voxelBytes = 2;
            this._voxelType = "UI";
            break;
        case "int":
            this._voxelBytes = 4;
            this._voxelType = "I";
            break;
        case "uint":
            this._voxelBytes = 4;
            this._voxelType = "UI";
            break;
        case "float":
            this._voxelBytes = 2;
            this._voxelType = "F";
            break;
        case "double":
            this._voxelBytes = 4;
            this._voxelType = "F";
            break;
    }

    return this._isvalidvolume = true;
}

MHA.prototype.getVolume = function(){
    if(!this._isvalidvolume){
        console.log("MHA does not contain a valid volume");
        return null;
    }

    var databuffer;
    if(this.elementdatafile == "local"){
        databuffer = this._databuffer = this._mhabuffer.slice(this._endheader+1);
    }else{
        console.log("MHA external datafile support not implemented");
        return null;
    }

    if(this.compresseddata){
        var dataarray = new Uint8Array(databuffer);
        dataarray = pako.inflate(dataarray);
        databuffer = dataarray.buffer;
    }

    var volume = new Volume({
        width: this.dimsize[0],
        height: this.dimsize[1],
        depth: this.dimsize[2],
        widthSpacing: this.elementspacing[0],
        heightSpacing: this.elementspacing[1],
        depthSpacing: this.elementspacing[2],
        voxelBytes: this._voxelBytes,
        voxelChannels: this._voxelChannels,
        voxelType: this._voxelType,
        buffer: databuffer
    });

    return volume;
}

MHA.prototype.generateHeader = function(){
    if(!this._isvalidvolume){
        console.warn("Can't create MHA header from non valid volume.");
        return false;
    }

    var mhaheader = "";

    mhaheader += "ObjectType = Image\n";
    mhaheader += "BinaryData = True\n";
    mhaheader += "BinaryDataByteOrderMSB = False\n";
    mhaheader += "CompressedData = " + (this.compresseddata ? "True" : "False") + "\n";
    if(this.compresseddata) mhaheader += "CompressedDataSize = " + this.compresseddatasize + "\n";
    mhaheader += "NDims = 3\n";
    mhaheader += "DimSize = " + this.dimsize[0] + " " + this.dimsize[1] + " " + this.dimsize[2] + "\n";
    mhaheader += "ElementSpacing = " + this.elementspacing[0] + " " + this.elementspacing[1] + " " + this.elementspacing[2] + "\n";
    mhaheader += "ElementType = " + this.elementtype + "\n";
    mhaheader += "ElementDataFile = LOCAL\n";

    var enc = new TextEncoder();
    this._headerarray = enc.encode(mhaheader);
    return true;
}

/*
Creates a MHA object with its data (_mhabuffer) correctly generated. By default the dataset is compressed.
To store it locally check VolumeLoader.downloadArrayView
*/
MHA.fromVolume = function(volume, compress = true){
    if(!volume.isValid()){
        console.warn("Can't create MHA from a non valid volume.");
        return null;
    }

    var mha = new MHA();
    mha.objecttype = "Image";
    mha.binarydata = true;
    mha.binarydatabyteordermsb = false;
    mha.compresseddata = compress;
    mha.compresseddatasize = volume._data.length;
    mha.ndims = 3;
    mha.dimsize = [volume.width, volume.height, volume.depth];
    mha.elementspacing = [volume.widthSpacing, volume.heightSpacing, volume.depthSpacing];
    mha._voxelBytes = volume.voxelBytes;
    mha._voxelChannels = volume.voxelChannels;
    mha._voxelType = volume.voxelType;
    
    var datatype = "";
    switch(mha._voxelType){
        case "UI":
            datatype = "u";
        case "I":
            if(mha._voxelBytes == 1) datatype += "char";
            else if(mha._voxelBytes == 2) datatype += "short";
            else if(mha._voxelBytes == 4) datatype += "int";
            break;

        case "F":
            if(mha._voxelBytes == 2) datatype = "float";
            else if(mha._voxelBytes == 4) datatype = "double";
            break;
    }
    mha._datatype = datatype;
    mha.elementtype = "met_"+mha._datatype;
    mha.elementdatafile = "LOCAL";

    mha._isvalidvolume = true;
    mha.generateHeader();

    var databuffer = volume._buffer || volume._data.buffer;
    var dataarray = new Uint8Array(databuffer);
    if(compress){
        dataarray = pako.deflateRaw(dataarray);
        databuffer = dataarray.buffer;
    }
    mha._databuffer = databuffer;
    
    var mhaarray = new Uint8Array(mha._headerarray.byteLength + dataarray.byteLength);
    mhaarray.set(mha._headerarray);
    mhaarray.set(dataarray, mha._headerarray.byteLength);
    mha._mhabuffer = mhaarray.buffer;

    return mha;
}

