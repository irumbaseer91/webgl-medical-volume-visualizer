"use strict"

//Byte formating
//https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

//Time
function startRecordingTime(name){
    if(!name) name = "_default";
    if(app._times[name]){
        console.log("Already redording " + name + " time.");
        return;
    }

    app._times[name] = getTime();
}



function stopRecordingTime(name){
    if(!name) name = "_default";
    if(!app._times[name]){
        console.log("Time " + name + " did never start.");
        return -1;
    }

    var now = getTime();
    var diff = now - app._times[name];
    delete app._times[name];
    return diff; //Difference in ms
}

//Uniforms GUI
//Helper functions to add a slider or checkbox on the left side
function  addUniformSlider(name, uniform_name, default_value, min_value, max_value, step, div_name){
    //Create HTML elements
    var container = document.getElementById(div_name);
    var div = document.createElement("div");

    var span = document.createElement("span");
    span.innerText = name;
    div.appendChild(span);

    var slider = document.createElement("input");
    slider.id = name + "_uniform_slider";
    slider.type = "range";
    slider.min = min_value.toString() || "0";
    slider.max = max_value.toString() || "1";
    slider.step = step.toString() || "0.1";
    slider.value = default_value.toString() || "1";
    slider.classList.add("slider");
    div.appendChild(slider);

    container.appendChild(div);
    
    var spinBox = document.createElement("INPUT");
    spinBox.setAttribute("type", "number");
    spinBox.setAttribute("min_value",slider.min);
    spinBox.setAttribute("max_value",slider.max);
    spinBox.setAttribute("step",slider.step);
    spinBox.setAttribute("value",slider.value);
    spinBox.classList.add("spinner");
    div.appendChild(spinBox);

    var mybr = document.createElement('br');
    mybr.classList.add('br1');
    container.appendChild(mybr);

  
    //Connect to node.uniforms
    function onSliderChange(){
        app.node.uniforms[uniform_name] = slider.valueAsNumber;
        spinBox.value=slider.value;    
    }
    function onSpinboxChange(){
        app.node.uniforms[uniform_name] = spinBox.valueAsNumber;  
        slider.value= spinBox.value;
    }
    slider.addEventListener("input", onSliderChange);
    spinBox.addEventListener("input",onSpinboxChange);
    app.node.uniforms[uniform_name] = slider.valueAsNumber || spinBox.valueAsNumber ;
}

function addUniformCheckbox(name, uniform_name, default_value, div_name){
    //Create HTML elements
    var container = document.getElementById(div_name);

    var div = document.createElement("div");

    var checkbox = document.createElement("input");
    checkbox.id = name + "_uniform_checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = default_value === true;
    div.appendChild(checkbox);

    var span = document.createElement("span");
    span.innerText = name;
    div.appendChild(span);

    container.appendChild(div); 

    //Connect to node.uniforms
    function onCheckboxChange(){
        app.node.uniforms[uniform_name] = checkbox.checked;
        if(app.node.uniforms.u_mask){
            fetchMHAVolume("data/samples/case_12_mask_resample.mha","mask", false, "no");
        }
    }
    checkbox.addEventListener("input", onCheckboxChange);
    app.node.uniforms[uniform_name] = checkbox.checked;
}
function addUniformTag(str, div_name){
    var container = document.getElementById(div_name);
    var para = document.createElement("p");
    var component = document.createTextNode(str);
    para.appendChild(component);
    para.classList.add("tag");
    container.appendChild(para);

}
 function addUniformSpace(div_name){
    var container = document.getElementById(div_name);
    var mybr = document.createElement('br');
    mybr.classList.add('br');
    container.appendChild(mybr);
 }

function addCuttingPlane(name){
    //Create HTML elements
    var container = document.getElementById("tools");
    var div = document.createElement("div");

    var span = document.createElement("span");
    span.innerText = name;
    div.appendChild(span);
    container.appendChild(div);
    var i;
    for(i=0; i<Object.keys(app.cuttingPlane).length;i++){
        addCheckBox(Object.keys(app.cuttingPlane)[i],"u_cuttingActive"+Object.keys(app.cuttingPlane)[i], false);
        addSlider(Object.keys(app.cuttingPlane)[i], "u_cuttingPlane"+Object.keys(app.cuttingPlane)[i],0.2,-1, 1, 0.01);
        if(i%2!=0){
        var linebreak = document.createElement("br");
        container.appendChild(linebreak);}
    }
   
    function addCheckBox(name,uniform_name,default_value){
        var checkbox = document.createElement("input");
        checkbox.id = name + "_uniform_checkbox";
        checkbox.type = "checkbox";
        checkbox.checked = default_value === true;
        container.appendChild(checkbox);
        
        var span = document.createElement("span");
        span.innerText = name;
        container.appendChild(span);
        
        function onCheckboxChange(){
            app.node.uniforms[uniform_name] = checkbox.checked;
        }

        checkbox.addEventListener("input", onCheckboxChange);
        app.node.uniforms[uniform_name] = checkbox.checked;
    }

    function addSlider(name, uniform_name, default_value, min_value, max_value, step){
        var slider = document.createElement("input");
        slider.id = name + "_uniform_slider";
         slider.type = "range";
         slider.min = min_value.toString() || "0";
         slider.max = max_value.toString() || "1";
         slider.step = step.toString() || "0.1";
         slider.value = default_value.toString() || "1";
         slider.classList.add("slider");
         container.appendChild(slider);

         function onCuttingSlider(){
             var plane = app.node.uniforms[uniform_name];
             plane[3] = slider.value;
             app.node.uniforms[uniform_name] = plane;
            }
           
        slider.addEventListener("input", onCuttingSlider);
    
    }
}

//open dialog box to load data
function openDialog(model_name, btn_name){
    // Get the modal
    var modal = document.getElementById(model_name);
    // Get the button that opens the modal
    var btn = document.getElementById(btn_name);
    // Get the <span> element that closes the modal
    if(modal.id == "myModal_file"){
        var span = document.getElementsByClassName("close")[0];
    }else if(modal.id == "myModal_folder"){
        var span = document.getElementsByClassName("close")[1];
    }else if(modal.id == "myModal_volInfo"){
        var span = document.getElementsByClassName("close")[3];
    }
    
    // When the user clicks on the button, open the modal
    btn.onclick = function() {
      modal.style.display = "block";
      if(btn.id == "volume detail"){
        // Set content inside the modal
        var modalContent = modal.querySelector(".modal-body");
        // Access properties of the app.main_volume object
        var mainVolume = app.main_volume;
        var content = "Volume Dimensions:<br>";
        content += "Width: " + mainVolume.width + "   ";
        content += "Height: " + mainVolume.height + "   ";
        content += "Depth: " + mainVolume.depth + "<br>";
        content += "Voxel spacing: " + "<br>";
        content += "Width: " + mainVolume.widthSpacing.toFixed(4) + "   ";
        content += "Height: " + mainVolume.heightSpacing.toFixed(4) + "   ";
        content += "Depth: " + mainVolume.depthSpacing.toFixed(4) + "<br>";

        // Add more properties as needed

        // Set the content inside the modal
        modalContent.innerHTML = content;

      }
    }
    
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      modal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }
}

function showHide(xdiv){
    var x = document.getElementById(xdiv);
    if(x.style.display === "none"){
        x.style.display = "block";
    } else{
        x.style.display = "none"; 
    }    
}
//Camera controls
function zoomCamera(d){
    app.camera.fov += d;
    
    if(app.camera.fov < 10) app.camera.fov = 10;
	else if(app.camera.fov > 100) app.camera.fov = 100;
}

function orbitCamera(dtop, dright){
	app.camera.orbit(dtop, app.camera._top);
	var front = app.camera.getFront();
	var up = vec3.clone(app.camera.up);
	vec3.normalize(front, front);
	vec3.normalize(up, up);
	var d = vec3.dot(front, up);
	if(!((d > 0.99 && dright > 0) || (d < -0.99 && dright < 0)))
		app.camera.orbit(dright, app.camera._right);
}

function rotateCamera(dtop, dright){
	app.camera.rotate(dtop, app.camera._top);
	app.camera.rotate(dright, app.camera._right);
}

//Mouse input
function onMouse(event){
    if(event.wheel){
        app._mouse.dwheel += event.wheel;
    }else{
        app._mouse.x = event.mousex;
        app._mouse.y = event.mousey;
        app._mouse.left = event.leftButton;
        app._mouse.middle = event.middleButton;
        app._mouse.right = event.rightButton;

        if(event.dragging){
            app._mouse.dx += event.deltax;
            app._mouse.dy += event.deltay;
        }
    }
}

//Canvas stuff
function onResizeWindow(){
	var rect = gl.canvas.getBoundingClientRect();
    gl.viewport(0, 0, rect.width, rect.height);
    gl.canvas.width = rect.width;
    gl.canvas.height = rect.height;
    app.camera.aspect = gl.canvas.width / gl.canvas.height;
}

//Shaders
function loadShaderAtlas(callback){
    var url = "data/demoShader.glsl"; //It is expected that all shaders are in this file

    //load shaders code from a file atlas
	GL.loadFileAtlas( url, function(files){
        app.shader_files = files;

        if(app.main_volume) reloadVolumeShader(app.shader_name); //Calls this function to set new shader
        if(callback) callback(); //Optional callback
    });
}

function reloadVolumeShader(shader_name){
    if(!app.shader_files){
        console.log("Shader files are not loaded yet.");
        return;
    }

    var vertex = app.shader_files[shader_name + ".vs"] || app.shader_files["volume_shader.vs"];
    var fragment = app.shader_files[shader_name + ".fs"] || app.shader_files["volume_shader.fs"];
    
    fragment = app.shader_fragment_expanded_code = expandShaderCustomMacros(fragment);
    
    gl.shaders["volume_shader"] = app.shader = new GL.Shader(vertex, fragment);

    //Be sure that all textures are defined in app.node
    for(var sampler of Object.keys(app.shader.samplers)){
        var texture_name = sampler.slice(2,-8);
        if(!app.node.textures[texture_name]){
            app.node.textures[texture_name] = "_";
        }
    }
}

function expandShaderCustomMacros(code){
    
    var final_code = "";
    var lines = code.split("\n");

    var volumes = {};

    for(var line of lines){
        var l = line.trim();
        if(l[0] == "#"){
            var words = l.split(" ");
            var macro = words[0].toLowerCase();
            switch(words[0]){
                case "#volume":
                    //#volume volume_name
                    if(words.length != 2){
                        l = "//Macro error: #volume has too few or too many arguments.\n";
                        l += "//#volume sintax: '#volume volume_name'\n";
                        break;
                    }

                    var volume_name = words[1].toLowerCase();
                    var volume = app.volumes[volume_name];
                
                    l = "";

                    if(!volume){
                        l = "//Volume " + volume_name + " is not defined, using a placeholder.\n";
                        volume = new Volume();
                    }

            
                    var texture_name = "u_" + volume_name + "_texture";
                    l += "uniform " + (volume.voxelType == "UI" ? "usampler3D" : volume.voxelType == "I" ? "isampler3D" : "sampler3D") + " " + texture_name + ";\n";
                    console.log(l);
                    l += "uniform vec3 u_" + volume_name + "_minmaxnormalize;\n";
                    console.log(l);
                    l += "uniform vec3 u_" + volume_name + "_resolution;\n";
                    console.log(l);
                    volumes[volume_name] = true;
                    console.log(volume_name);
                    break;

                case "#getvoxel":
                    //#getvoxel volume_name type variable_name uvw_name (declare)
                    //type may be float, vec2, vec3 or vec4
                    //declare can be written if variable_name has to be declared in the same line
                    if(words.length < 5){
                        l = "//Macro error: #getvoxel has too few arguments.\n";
                        l += "//#getvoxel syntax: '#getvoxel volume_name type variable_name uvw_name (declare)'\n";
                        break;
                    }

                    var volume_name = words[1].toLowerCase();
                    var type = words[2].toLowerCase();
                    var variable_name = words[3]; //It may contain upper case letters
                    var uvw_name = words[4];
                    var declare = words.length > 5 ? (words[5].toLowerCase() == "declare") : false;
                    console.log(volume_name , type, variable_name, uvw_name, declare);
                    
                    l = "";
                    if(!volumes[volume_name]){
                        l = "//Warning: volume " + volume_name + " has not been created using #volume macro.\n";
                    }
                    l += (declare ? type + " " : "") + variable_name + " = normalizeVoxel( vec4(texture(u_"+volume_name+"_texture, interpolationPosition("+uvw_name+", u_"+volume_name+"_resolution))), u_"+volume_name+"_minmaxnormalize)"+(type == "float" ? ".x" : type == "vec2" ? ".xy" : type == "vec3" ? ".xyz" : "")+";\n"; 
                    console.log(l);
                    break;

                case "#import":
                    var code_filename = words[1].toLowerCase();
                    var code = app.shader_files[code_filename];

                    if(!code) l = "//Import code " + code_filename + " not found.\n"
                    else l = code;
                    break;
                    
                //More custom macros can be added here
            }
        }
        final_code += l + "\n";

    }
    return final_code;
}

//Volumes
function setVolume(volume, volume_name = "volume", is_main = true, normalization){
    app.volumes[volume_name] = volume;
    if(is_main){
        app.main_volume = volume;
        app.node.scaling = [volume.width*volume.widthSpacing*0.01, volume.height*volume.heightSpacing*0.01, volume.depth*volume.depthSpacing*0.01];
    }

    gl.textures[volume_name + "_texture"] = volume.createTexture();
    setVolumeUniforms(volume_name, normalization);
    reloadVolumeShader(app.shader_name); 

   // loadTFFromCSV(app.tf_name, "tf_texture", "transfer_function");
    
}

function setVolumeUniforms(volume_name, normalization){
    var volume = app.volumes[volume_name];
    if(!volume){
        console.log("The volume " + volume_name + " does not exist.");
        return;
    }

    if(normalization === undefined) normalization = app.default_normalization;

    //Sets ._min and ._max of volume
    if(normalization == "real"){
        volume.computeMinMax();
    }else{
        //Use possible min and max of data type
        if(volume.voxelType == "UI"){
            volume._min = 0;
            volume._max = Math.pow(2, volume.voxelBytes * 8);
        }else if(volume.voxelType == "I"){
            volume._max = Math.pow(2, volume.voxelBytes * 8 - 1);
            volume._min = -(volume._max - 1);
        }else{ //For float it really depends on dataset
            volume._min = 0;
            volume._max = 1;
        }
    }
    app.voxInt.min = volume._min;
    app.voxInt.max = volume._max;
    app.node.uniforms["u_"+volume_name+"_minmaxnormalize"] = [volume._min, volume._max, normalization == "normal" ? 0 : 1];
    app.node.uniforms["u_"+volume_name+"_resolution"] = [volume.width, volume.height, volume.depth];
    
}

function addDropDown(name, arrayOptions, div_name){
    var container = document.getElementById(div_name);

    var span = document.createElement("span");
    span.innerText = name;
    container.appendChild(span);

    var selectList = document.createElement("select");
    selectList.id = name + "_uniform_drop";
    container.appendChild(selectList);
    selectList.classList.add("button-text");
    var linebreak = document.createElement("br");
    container.appendChild(linebreak);
    
    //Create and append the options
    for (var i = 0; i < Object.keys(arrayOptions).length; i++) {
        var option = document.createElement("option");
        option.setAttribute("value", Object.keys(arrayOptions)[i]);
        option.text = Object.keys(arrayOptions)[i];
        selectList.appendChild(option);
    }
    selectList.value= Object.keys(arrayOptions)[0];
    function onChange(){
        if(name == "Render Mode: "){
            app.shader_name = app.modes[selectList.value];
            setVolume(app.main_volume,"volume",true,app.normalization);
        } else if(name == "Presets: "){
            var item_selected = app.colormapfolder+app.colormaps[selectList.value];
            const extension = item_selected.split('.').pop();
            if(extension=='csv'){
                loadTFFromCSV(app.colormapfolder+app.colormaps[selectList.value], "tf_texture", "transfer_function");
                app.tf_name = app.colormapfolder+app.colormaps[selectList.value];
            }else{
                loadTFTexture(app.colormapfolder+app.colormaps[selectList.value], "tf_texture");    
            }    
        } else if(name== "Illumination: "){
            app.shader_name = app.illumination[selectList.value];
            setVolume(app.main_volume,"volume",true,app.normalization);
        } else if(name== "BRDF: "){
            app.node.uniforms.u_id_brdf = app.brdfs[selectList.value];
        }
        
    }
    selectList.addEventListener("change",onChange);
}


function loadTFTexture(url, texture_name = "loaded_texture", options = {}){
    if(gl.loadTexture(url, options, function(texture){
        gl.textures[texture_name] = gl.textures[url];
    })) 
    gl.textures[texture_name] = gl.textures[url];
}

function loadTFFromCSV(url, texture_name = "tf_texture", tf_object_name = null, width = 256, default_alpha = null){
    var minVal = app.voxInt.min;
    var maxVal = app.voxInt.max;
    
    fetch(url)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            var lines = text.split("\n");
            var points = [];
            //First line defined the information. For now the parser is hardcoded to have X, R, G, B (,A) as floats [0-1] in that order.
            for(var i=1; i<lines.length-1; i++){
                var elements = lines[i].split(",");
                var point = {
                    x: elements[0],
                    r: elements[1],
                    g: elements[2],
                    b: elements[3],
                    a: elements.length == 5 ?  elements[4]: default_alpha   ? default_alpha : 1.0,
                };
                points.push(point);  
            }
            const newLength = points.length + 2;
             
            const newPoints = [];
            for (let i = 0; i < newLength; i++) {
                if (i === 0) {
                    newPoints.push({...points[0], x: '0'});
                } else if (i === newLength - 1) {
                    newPoints.push({...points[points.length - 1], x: '1'});
                } else {
                    const item = points[i - 1];
                    const x = parseInt(item.x);
                    const a = parseFloat(item.a);
                    const normalizedX = (x - minVal) / (maxVal - minVal);
                    newPoints.push({...item, x: normalizedX.toString(), a: a.toString()});
                }
            }
                 
    
             
            app.tf = new TransferFunction();
            app.tf.width = width; //More or less resolution
            app.tf.fromPoints(newPoints);

            var tfecontainer = document.getElementById("tfeditor");
            app.tfeditor = new TFEditor({container: tfecontainer, visible: false}); // visible true to
            app.tfeditor.setTF(app.tf);

            texture_name = texture_name || ("tf_" + Object.keys(app.tfs).length);
            app.tfs[texture_name] = app.tf;
         
            gl.textures[texture_name] = app.tf.getTexture();
       
            if(tf_object_name){
                app[tf_object_name] = app.tf;
             
            }
        });
}

//If the csv does not define alpha values then the alpha will be default_alpha. If default_alpha is not defined it will be the x value.
function loadColormapFromCSV(url, texture_name = "tf_texture", tf_object_name = null, width = 100, default_alpha = null){
    fetch(url)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            var lines = text.split("\n");
            var points = [];

            //First line defined the information. For now the parser is hardcoded to have X, R, G, B (,A) as floats [0-1] in that order.
            for(var i=1; i<lines.length-1; i++){
                var elements = lines[i].split(",");

                var point = {
                    x: elements[0],
                    r: elements[1],
                    g: elements[2],
                    b: elements[3],
                    a: elements.length == 5 ?  elements[4]: default_alpha   ? default_alpha : 1.0,
                };
                points.push(point);
                
            }
       
            console.log(points);
         

            var tf = new TransferFunction();
            tf.width = width; //More or less resolution
            console.log('transfer function width: ',tf.width);
            tf.fromPoints(points);
            console.log(texture_name);
            gl.textures[texture_name] = tf.getTexture();

            if(tf_object_name){
                app[tf_object_name] = tf;
                console.log(app[tf_object_name]);
            }
        });
}

function displayTime(diff, id){
    var Div = id;
    var p = diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.";
    document.getElementById(Div).value = p;

}

// Loading volumes
function loadVolume(){
    var fileInput = document.getElementById("fileInput");
    var file = fileInput.files[0];

    if(!file){
        console.log("No file to load.");
        return;
    }

    var niftis = [];
    var vls = [];
    var mhas = [];
    var ext = file.name.substring(file.name.lastIndexOf(".")+1); //Get extension name
    if(ext == "vl"){
        vls.push(file);
    }else if(ext == "nii"){
        niftis.push(file);
    }else if(ext == "mha"){
        mhas.push(file);
    }else{
        console.log("File should be .vl, .nii or .mha");
    }
    if(vls.length > 0){
        loadVLVolume(file,"volume",true);
    }
    if(niftis.length > 0){
        loadNiftiVolume(file,"volume",true);
        
    } 
    if(mhas.length > 0){
        loadMhaVolume(file,"volume",true);

    }
}

function loadVLVolume(file, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.loadFile(file, function(buffer){
        var diff = stopRecordingTime(volume_name) / 1000;
        displayTime(diff,"loadTime");
        console.log("Volume " + volume_name + " of " + formatBytes(buffer.byteLength) + " loaded in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
        parseVLVolume(buffer, volume_name, is_main, normalization);
    })
}

function parseVLVolume(buffer, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.parseVLBuffers([buffer], function(response){
        if(response.status == VolumeLoader.DONE){
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"parseTime");
            console.log("Volume " + volume_name + " of " + formatBytes(response.volume._size) + " parsed in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
            setVolume(response.volume, volume_name, is_main, normalization);
        }else if(response.status == VolumeLoader.ERROR){
            console.log("Error: ", response.explanation);
        }
    });
}

function loadNiftiVolume(file, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.loadFile(file, function(buffer){
        var diff = stopRecordingTime(volume_name) / 1000;
        displayTime(diff,"loadTime");
        parseNiftiVolume(buffer, volume_name, is_main, normalization);
    })
}

function parseNiftiVolume(buffer, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.parseNiftiBuffers([buffer], function(response){
        if(response.status == VolumeLoader.DONE){
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"parseTime");
            setVolume(response.volume, volume_name, is_main, normalization);
        }else if(response.status == VolumeLoader.ERROR){
            console.log("Error: ", response.explanation);
        }
    });
}

function loadMhaVolume(file, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.loadFile(file, function(buffer){
        var diff = stopRecordingTime(volume_name) / 1000;
        displayTime(diff,"loadTime");
        console.log("Volume " + volume_name + " of " + formatBytes(buffer.byteLength) + " loaded in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
        parseMhaVolume(buffer, volume_name, is_main, normalization);
    })
}

function parseMhaVolume(buffer, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    var mha = new MHA(buffer);
    mha.parseHeader();
    var volume = mha.getVolume();
    var diff = stopRecordingTime(volume_name) / 1000;
    if(!volume) return;
    displayTime(diff,"parseTime");
    console.log("Volume " + volume_name + " of " + formatBytes(volume._size) + " parsed in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
  //  document.getElementById("parseTime").value = diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.";
    setVolume(volume, volume_name, is_main, normalization);
    
}

function loadVolumeDicom(){
    var folderInput = document.getElementById("folderInput");
    var files = folderInput.files;
    if(!files) {
        console.log("No dicom file to load.");
        return;
    }
    var dicoms = [];
    for(var file of files){
        var ext = file.name.substring(file.name.lastIndexOf(".")+1); //Get extension name
        if(ext == "dcm")
            dicoms.push(file);
        else
        console.log("File format is not .dcm: " + file);
    }
    if(dicoms.length > 0){
        loadDicomVolume(dicoms,"volume",true);
    }
}

function loadDicomVolume(file, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    var currentFile = 0;
    var totalFiles = file.length;
    var buffers = [];
    function readDicoms(){
        if(currentFile<totalFiles){
            VolumeLoader.loadFile(file[currentFile++],  onLoad);
           
        }
        else{
            parseDicomVolume(buffers, volume_name, is_main, normalization); 
        }
    }
    
    function onLoad(buffer){
        buffers.push(buffer);
        if(currentFile==totalFiles){
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"loadTime");
            
        }
        readDicoms();
    }
    readDicoms();
}

function parseDicomVolume(buffer, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    VolumeLoader.parseDicomBuffers(buffer, function(response){
        if(response.status == VolumeLoader.DONE){
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"parseTime");
            
            setVolume(response.volume, volume_name, is_main, normalization);
        }else if(response.status == VolumeLoader.ERROR){
            console.log("Error: ", response.explanation);
        }
    });
}

function fetchVLVolume(url, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    fetch(url)
        .then(function(response) {
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"loadTime");
            console.log("Volume " + volume_name + " of " + formatBytes(buffer.byteLength) + " loaded in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
            parseVLVolume(buffer, volume_name, is_main, normalization);
        });
}

function fetchMHAVolume(url, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    fetch(url)
        .then(function(response) {
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"loadTime");
           //  console.log("Volume " + volume_name + " of " + formatBytes(buffer.byteLength) + " loaded in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })+ "s.");
         
            startRecordingTime(volume_name);
            var mha = new MHA(buffer);
            mha.parseHeader();
            var volume = mha.getVolume();
            diff = stopRecordingTime(volume_name) / 1000;
            if(!volume) return;
           // displayTime(diff,"parseTime");
           // console.log("Volume " + volume_name + " of " + formatBytes(volume._size) + " parsed in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
          document.getElementById("parseTime").value = diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) +"s.";
            setVolume(volume, volume_name, is_main, normalization);

        });
}

function fetchNiftiVolume(url, volume_name = "volume", is_main = true, normalization){
    startRecordingTime(volume_name);
    fetch(url)
        .then(function(response) {
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            var diff = stopRecordingTime(volume_name) / 1000;
            displayTime(diff,"loadTime");
            console.log("Volume " + volume_name + " of " + formatBytes(buffer.byteLength) + " loaded in " + diff.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "s.");
            parseNiftiVolume(buffer, volume_name, is_main, normalization);
        });
}
//Load segmented mask
function loadSegmentation(){
    var btn = document.getElementById("maskLoadButton");
    app.node.uniforms.u_segmentationActive = this.checked;
    if(app.node.uniforms.u_segmentationActive){
        btn.disabled = false;
        btn.addEventListener("click",function(){
            var file = maskInput.files[0];
            var mhas = [];
            var ext = file.name.substring(file.name.lastIndexOf(".")+1); //Get extension name
            if(ext == "mha"){
                mhas.push(file);
            }else{
                console.log("File should be .mha");
            }
            if(mhas.length > 0){
                loadMhaVolume(file,"mask",false);
                app.shader_name = "volume_mask";
                setVolume(app.main_volume,"volume",false,app.normalization);
            }});
        }else{
            btn.disabled = true;
        }
}
//unload segmentation mask
function unLoadSegmentation(){
    app.shader_name = "volume_shader";
    setVolume(app.main_volume,"volume",false,app.normalization);

}

//Slow, for debugging. Do not add as an user option
function generateMHA(volume, file_name = "compressed_volume.mha", compress = true){
    var mha = MHA.fromVolume(volume, compress);
    VolumeLoader.downloadArrayView(new Uint8Array(mha._mhabuffer), file_name);
}

function loadTexture(url, texture_name = "loaded_texture", options = {}){
    gl.loadTexture(url,options, function(texture){
        gl.textures[texture_name] = gl.textures[url];
    })      
}
