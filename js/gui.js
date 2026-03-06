
function addMenu(tabName, subMenuList, divname){

    var cont = document.getElementById(divname);
    cont.classList.add("mainbar");

    var ul = document.createElement("ul");

    var li = document.createElement("li");
    li.innerHTML = tabName;

    var ul_submenu = document.createElement("ul");
    ul_submenu.classList.add("submenu");

    for(var i=0;i<subMenuList.length;i++){
        var li_submenu = document.createElement("li");
        li_submenu.innerHTML = subMenuList[i];
        li_submenu.id = subMenuList[i];
        ul_submenu.appendChild(li_submenu);
    }
    li.appendChild(ul_submenu);

    ul.appendChild(li);

    cont.appendChild(ul);

    function getEventTarget(e) {
        e = e || window.event;
        return e.target || e.srcElement; 
    }
    ul.onclick = function(event) {
        var target = getEventTarget(event);
       // console.log(target.innerHTML);
        if(target.innerHTML == "load file"){
            openDialog("myModal_file", "load file"); 
        }else if(target.innerHTML == "load dicom"){
            openDialog("myModal_folder", "load dicom");
        }else if(target.innerHTML == "Open segmentation"){
            openDialog("myModal_seg", "Open segmentation");
        }else if(target.innerHTML == "volume detail"){
            openDialog("myModal_volInfo", "volume detail");
        }
    }
}

var modal_new = document.getElementById("GUI");
modal_new.classList.add("modal");

let btns = document.querySelectorAll('.table-button');

for (var i of btns) {
  i.addEventListener('click', function() {
    if(this.id == "npr"){
        app.shader_name = "volume_shader";
        setVolume(app.main_volume,"volume",true,app.normalization);
        showHide("NPRContainer");
    }else if(this.id== "lighting"){
        showHide("lightingContainer");
        app.shader_name = "volume_local_illumination";
        setVolume(app.main_volume,"volume",true,app.normalization);
    }else if(this.id== "brdf"){
        showHide("BRDFContainer");
        app.shader_name = "surface_brdf";
        setVolume(app.main_volume,"volume",true,app.normalization);
    }

  });
}

const menuItems = document.querySelectorAll('.menu--item');

menuItems.forEach(item => {
  const icon = item.querySelector('i');
  icon.id = `${item.getAttribute('data-tooltip')}-icon`;
  icon.addEventListener('click', () => {
    const tooltip = item.getAttribute('data-tooltip');
    if (tooltip === 'reset') {
        app.camera.lookAt( [0,5,10], [0,0,0], [0,1,0] ); //position, target, up
    }else if (tooltip === 'orbit') {
        orbitCamera(0.05,0.01);
    }else if (tooltip === 'zoom In') {
        zoomCamera(-1.0);
    }else if (tooltip === 'zoom Out') {
        zoomCamera(1.0);
    }else if (tooltip === 'Light bulb') {
        showHide('Lights'); 
    }else if (tooltip === 'Material') {
        showHide('Materials'); 
    }
   
  });
});

