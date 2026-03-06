"use strict"

var app = {
    node: null, //To use renderer we need to pass it a sceneNode
    renderer: null,
    camera: null,

    main_volume: null,
    volumes: {},
    tf: null,
    tfeditor:null,
    tfs:{},
    voxInt:{},
    

    uniforms: {},
    default_normalization: "real", //Can be "real", "normal" or "no"
    
     background_color: [0.0, 0.0, 0.0, 0.881],

    //Shaders stuff
    shader_name: null, //The name of the shader in use
    shader_fragment_expanded_code: null,
    shader: null,
    shader_files: {}, //All files of shader.glsl are stored here
    tf_name:'data/presets/AAA_body.csv',

    colormapfolder: "data/presets/",
    colormaps: {
        'AAA_body':'AAA_body.csv',
        'Carotids':'Carotids.csv',
        'Coronaries': 'Coronaries.csv',
        'CVRT':'CVRT.csv',
        'Heart_Cinematic':'Heart_Cinematic.csv',  
    },

    modes: {
        'Non-photorealistic': 'volume_shader',
        'Photorealistic: Gradient based ': 'volume_local_illumination',
        'Photorealistic: Surface BRDF':'surface_brdf',
    },
   
    mainMenu: {
        "File": ["load file","load dicom"],
        "View": ["volume detail"],    
    },
    cuttingPlane: {
        L:[-1,0,0,0],
        R:[1,0,0,0],
        A:[0,-1,0,0], 
        P:[0,1,0,0],
        S:[0,0,-1,0],
        I:[0,0,1,0],
    },
    cuttingActive: {
        L: false,
        R: false,
        A: false,
        P: false,
        S: false,
        I: false,
    },

    //Mouse state, used in camera controls
    _mouse: {
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        dwheel: 0,
        downx: 0,
		downy: 0,
		downcameraposition: null,
		downglobalposition: null,
		upglobalpoint: null,
        pressed: false,
		dragging: false,
		wheel: false,

        left: false,
        middle: false,
        right: false,
    },

    //Time
    _times: {},
    _last_time: 0,
    _now_time: 0,

    //Frame per seconds
    fps:0,
    _fps:0,

    
};

//Init, essential for correct behaviour of app
function init(){
    var canvas = document.getElementById("renderCanvas");
    var context = GL.create({version: 2, canvas: canvas});
    if( !context || context.webgl_version != 2 ){
	    alert("WebGL 2.0 not supported by your browser.");
    }
    
    //Mouse listeners
    gl.captureMouse(true);
    gl.captureKeys(true);
    context.onmousedown = context.onmousemove = context.onmouseup = context.onmousewheel = onMouse;

    loadShaderAtlas();

    app.renderer = new RD.Renderer(context);

    //Init node
    app.node = new RD.SceneNode();
    app.node._mesh = Mesh.cube({size: 2}); //Auxiliar geometry of size 2 so it goes from -1 to +1
    app.node.textures.volume = "volume_texture"; //Assign a texture with volume data to node. Textures assigned this way should be called "u_volume_texture" in the shader
    app.node.textures.tf = "tf_texture";//If a texture is defined in the shader it is important that you set a default one even if you are not using it
  // app.node.textures.tfs = "tf_texture";
    app.node.textures.diffuse = "diffuse_texture";
    app.node.textures.cube = "cube_texture";
    app.node.shader = "volume_shader";
    app.node.blend_mode = RD.BLEND_ALPHA;

    //Node uniforms
    app.node.uniforms.u_transperency = 1;
    app.node.uniforms.u_quality = 0.001;
    app.node.uniforms.u_brightness = 50.0;
    app.node.uniforms.u_levelOfDetail = 400;
    app.node.uniforms.u_background = [0.9, 0.9, 0.9, 1.0];
    app.node.uniforms.u_cuttingPlaneActive = false;
    app.node.uniforms.u_cuttingPlasne = [1,0,0,0];
    app.node.uniforms.u_segmentationActive = false;
    app.node.uniforms.u_mask = false;
    app.node.uniforms.u_lighting = false;
    app.node.uniforms.u_id_brdf = 1;
    app.node.uniforms.u_cuttingActiveL = app.cuttingActive.L
    app.node.uniforms.u_cuttingActiveR = app.cuttingActive.R;
    app.node.uniforms.u_cuttingActiveA = app.cuttingActive.A;
    app.node.uniforms.u_cuttingActiveP = app.cuttingActive.P;
    app.node.uniforms.u_cuttingActiveS = app.cuttingActive.S;
    app.node.uniforms.u_cuttingActiveI = app.cuttingActive.I;
    app.node.uniforms.u_cuttingPlaneL = app.cuttingPlane.L;
    app.node.uniforms.u_cuttingPlaneR = app.cuttingPlane.R;
    app.node.uniforms.u_cuttingPlaneA = app.cuttingPlane.A;
    app.node.uniforms.u_cuttingPlaneP = app.cuttingPlane.P;
    app.node.uniforms.u_cuttingPlaneS = app.cuttingPlane.S;
    app.node.uniforms.u_cuttingPlaneI = app.cuttingPlane.I;
 
    
    
    //Init camera
    app.camera = new RD.Camera();
     app.camera.perspective(40, gl.canvas.width / gl.canvas.height, 0.1, 1000 ); //fov, aspect ratio, near, far
   //  app.camera.orthographic(50, 1, 10000, gl.canvas.width / gl.canvas.height); //frestum size, near, far, aspect ratio
    app.camera.lookAt( [0,0,10], [0,0,0], [0,1,0] ); //position, target, up
    
    onResizeWindow();
    window.addEventListener('resize', onResizeWindow);
}

function extraInit(){
    //Usually datasets are stored in another orientation
    app.node.rotate(-DEG2RAD*90, [1,0,0]);

    for(var i=0; i<Object.keys(app.mainMenu).length;i++){
       var key = Object.keys(app.mainMenu)[i];
       var key_values = Object.values(app.mainMenu)[i];
       addMenu(key,key_values,"menubar");
    }
    
    //Left inputs to change uniforms
   addDropDown("Render Mode: ",app.modes,'renComponents');
   addUniformSpace('renComponents');
   addDropDown("Presets: ",app.colormaps, 'renComponents');
   addUniformSlider("Thresh: ", "u_threshold_value", 0.25, 0, 1, 0.001, "uniComponents"); 
   addUniformSlider("Transperency: ", "u_transperency", 1, 0, 1, 0.001, "uniComponents");
   addUniformSlider("Sample size: ", "u_quality", 0.008, 0.001, 0.5, 0.001, "uniComponents"); // sample rate, stepsize
   addUniformSlider("Brightness: ", "u_brightness", 50.0, 0.0, 100.0, 5.0, "uniComponents");


   addUniformTag('Light type: ', 'Lights');
   addUniformCheckbox('Ambient ','u_ambient_light', false, 'Lights');
   addUniformSlider('Factor ', 'u_amb_fac',0.43, 0, 1,0.001, 'Lights' );
   addUniformCheckbox('Point ','u_point_light', false, 'Lights');
   addUniformCheckbox('Directional ','u_directional_light', false, 'Lights');
   addUniformSpace('Lights');
   addUniformTag('Light position: ', 'Lights');
   addUniformSlider('X ', 'u_x',-1.6, -10.0, 10.0,0.1, 'Lights' );
   addUniformSlider('Y ', 'u_y',2.0, -10.0, 10.0,0.1, 'Lights' );
   addUniformSlider('Z ', 'u_z',-1.8, -10.0, 10.0,0.1, 'Lights' );
   addUniformSpace('Lights');

   addUniformTag('Material: ', 'Materials');
   addUniformSlider('Ambient: ', 'u_ambient', 0.1, 0, 1, 0.05, 'Materials');
   addUniformSlider('Diffuse: ', 'u_diffuse', 0.8, 0, 1, 0.05, 'Materials');
   addUniformSlider('Specular: ', 'u_specular', 0.3, 0, 1, 0.05, 'Materials');
   addUniformSlider('Specularity: ', 'u_shininessVal', 100.0, 0.0, 200.0, 1.0, 'Materials');
   addCuttingPlane("Cutting plane: ");
   
    //Selecting different shaders
    app.shader_name = "volume_shader";

    // Load sample transfer function lut6.png
    loadTFTexture("data/colormaps/mevisTF.png", "tf_texture");
    
    //Let the node know which textures to use in the shaders (from gl.textures)
    app.node.textures.mask = "mask_texture";
 
    //Load sample volumes 
    var url = "data/samples/case_12.mha";
    var ext = url.substring(url.lastIndexOf(".")+1);
    if(!(ext == "vl" || ext == "nii" || ext == "mha")){
        console.log("Unsupported format: " +ext);
    }
    console.log("Loading...");
    if(ext == "vl"){
        fetchVLVolume(url,"volume", true, "real");
    }else if(ext == "nii"){
        fetchNiftiVolume(url,"volume", true, "real");
    }else if(ext == "mha"){
        fetchMHAVolume(url,"volume", true, "real");
    }

    
}

//App loop so it renders on each frame
function loop(){
    app._last_time = app._now_time || 0;
    app._now_time = getTime();
    var dt = (app._now_time - app._last_time) * 0.001; //dt in seconds

    update(dt); //Mainly updates camera
    render();
    app._fps++;
    requestAnimationFrame(loop);
}

// compute frameperseconds
function computeFPS(){
    app.fps = app._fps;
    app._fps = 0;
    var fpsValue = app.fps + " fps";
    document.getElementById("dispFPS").value = fpsValue;// display frameperseconds to input text 
}

setInterval(computeFPS.bind(this), 1000);
 
function update(dt){
    var dx = app._mouse.dx;
    var dy = app._mouse.dy;
    var dw = app._mouse.dwheel;  

    //Update tfs textures
	for(var k of Object.keys(app.tfs)){
		app.tfs[k].update();
	}

    if(dx != 0 || dy != 0){
        if(app._mouse.left) orbitCamera(-0.3 * dt * dx, -0.3 * dt * dy);
        //else if(app._mouse.middle) TODO pan
        else if(app._mouse.right) rotateCamera(-0.3 * dt * dx, -0.3 * dt * dy);
    }
    if(dw != 0){
        zoomCamera(-10 * dt * dw)
    }

    //Reset mouse deltas
    app._mouse.dx = app._mouse.dy = app._mouse.dwheel = 0;
}

function render(){
    var camera = app.camera;
    var node = app.node;

    app.renderer.clear(app.background_color);
    if(Object.keys(app.volumes).length == 0) return; //No volumes set, nothing to see
    app.renderer.enableCamera(camera);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);

    node.updateGlobalMatrix(true);
    app.renderer.setModelMatrix(node._global_matrix);
    
    //Local camera pos
    var inverse_matrix = mat4.create();
	mat4.invert(inverse_matrix, node._global_matrix);
	var aux_vec4 = vec4.fromValues(camera.position[0], camera.position[1], camera.position[2], 1);
    vec4.transformMat4(aux_vec4, aux_vec4, inverse_matrix);
    node.uniforms.u_local_camera_position = vec3.fromValues(aux_vec4[0]/aux_vec4[3], aux_vec4[1]/aux_vec4[3], aux_vec4[2]/aux_vec4[3]);

    //Render node
    app.renderer.renderNode(node, camera);
}

init();
extraInit();
loop();

//Button to load input data
document.getElementById("fileLoadButton").addEventListener("click", loadVolume);
document.getElementById("fileLoadButtonDicom").addEventListener("click", loadVolumeDicom);

//Button to load segmented mask
document.getElementById("segmentationActive").addEventListener("change", loadSegmentation);

document.getElementById("maskUnloadButton").addEventListener("click", unLoadSegmentation);








