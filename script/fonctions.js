let menu = null;
let modifyId = null;
let modifyNom = null;
let modifyLien = null;
const contextMenu = document.getElementById("context-menu");
const contextMenuManage = document.getElementById("context-menu-manage");
const contextMenuManageManage = document.getElementById("Manage");
const contextMenuManageModifyOpen = document.querySelectorAll(".iconmodify");
const contextMenuManageModify = document.getElementById("context-menu-modify");
const contextMenuManageModifyId = document.getElementById("idMenuAdd");
const contextMenuManageModifyNom = document.getElementById("NomMenuAdd");
const contextMenuManageModifyFrame = document.getElementById("FrameMenuAdd");
const contextMenuManageModifySelectLien = document.getElementById("selecthttp");
const contextMenuManageModifyLien = document.getElementById("LienMenuAdd");
const contextMenuManageAdd = document.getElementById("AddMenu");
const contextMenuManageModifySubmitAdd = document.getElementById("submitadd");
const contextMenuManageModifySubmitModify = document.getElementById("submitmodify");
const contextMenuManageModifyDelete = document.getElementById("delete");
const contextMenuManageClose = document.getElementById("CloseMenuManage");
const contextMenuClose = document.getElementById("CloseMenuAdd");
const scope = document.querySelector("div#t0 ul");
const view = document.querySelector("body");
const Vframe = document.getElementById("virtual");
const d = document.getElementsByClassName("draggable");
var onlongtouch;
var timer;
var touchduration = 500;



// Close all menu after left click to menu bar
scope.addEventListener("click", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
        contextMenuManage.classList.remove("visible");
        contextMenuManageModify.classList.remove("visible");
        Vframe.classList.remove("visible");
    }
});



// Close all menu after left click to virtual frame
Vframe.addEventListener("click", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
        contextMenuManage.classList.remove("visible");
        contextMenuManageModify.classList.remove("visible");
        Vframe.classList.remove("visible");
    }
});



//After left click to context menu close all menu
contextMenu.addEventListener('click', (e) => {
    e.preventDefault();
    contextMenu.classList.remove("visible");
    contextMenuManage.classList.remove("visible");
    contextMenuManageModify.classList.remove("visible");
    Vframe.classList.remove("visible");
});



//After left click to close button close contextMenuManage
contextMenuManageClose.addEventListener('click', (e) => {
    e.preventDefault();
    contextMenuManage.classList.remove("visible");
    contextMenuManageModify.classList.remove("visible");
    Vframe.classList.remove("visible");
});



//After left click to close button close contextMenuManageModify
contextMenuClose.addEventListener('click', (e) => {
    e.preventDefault();
    contextMenuManageModify.classList.remove("visible");
});



//determine id menu
scope.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu = (e.target.getAttribute('id'));
});



// Const calcultate position mouse for contextMenu
const normalizePozition = (mouseX, mouseY) => {
    let {
        left: scopeOffsetX,
        top: scopeOffsetY,
    } = scope.getBoundingClientRect();
    scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
    scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;
    const scopeX = mouseX - scopeOffsetX;
    const scopeY = mouseY - scopeOffsetY;
    const outOfBoundsOnX =
        scopeX + contextMenu.clientWidth > view.clientWidth;
    const outOfBoundsOnY =
        scopeY + contextMenu.clientHeight > view.clientHeight;
    let normalizedX = mouseX;
    let normalizedY = mouseY;
    if (outOfBoundsOnX) {
        normalizedX =
            scopeOffsetX + scope.clientWidth - contextMenu.clientWidth;
    }
    if (outOfBoundsOnY) {
        normalizedY =
            scopeOffsetY + scope.clientHeight - contextMenu.clientHeight;
    }
    return {
        normalizedX,
        normalizedY
    };
};



// Open context menu with position of const normalizePozition after right click
scope.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const {
        clientX: mouseX,
        clientY: mouseY
    } = event;
    const {
        normalizedX,
        normalizedY
    } = normalizePozition(mouseX, mouseY);
    contextMenu.classList.remove("visible");
    contextMenu.style.top = `${normalizedY}px`;
    contextMenu.style.left = `${normalizedX}px`;
    setTimeout(() => {
        contextMenu.classList.add("visible");
        Vframe.classList.add("visible");
    });
});



// Open context menu manage after left click
contextMenuManageManage.addEventListener("click", (e) => {
    e.preventDefault();
    contextMenuManage.classList.remove("visible");
    contextMenuManage.style.left = `25%`;
    setTimeout(() => {
        contextMenuManage.classList.add("visible");
        Vframe.classList.add("visible");
    });

});



// Open context menu modify after left click
contextMenuManageModifyOpen.forEach(e => {
    e.addEventListener('click', (e) => {
    
    modifyId = (e.target.parentElement.getAttribute('data-id'));
    modifyNom = (e.target.parentElement.getAttribute('data-nom'));
    modifyLien = (e.target.parentElement.getAttribute('data-lien'));
    modifyFrame = (e.target.parentElement.getAttribute('data-frame'));
    modifyImage = (e.target.parentElement.getAttribute('data-Img'));
    
    contextMenuManageModifySubmitModify.type = "submit";
    
    contextMenuManageModifySubmitAdd.type = "hidden";
    
    contextMenuManageModify.style.left = `25%`;
    contextMenuManageModify.style.right = `25%`;
    contextMenuManageModifyId.value = modifyId;
    contextMenuManageModifyNom.value = modifyNom;
    contextMenuManageModifyFrame.value = modifyFrame;
    contextMenuManageModifyDelete.style.transform = ``;
    contextMenuManageModifyDelete.style.padding = ``;
    contextMenuManageModifyDelete.style.margin = ``;
    
    contextMenuManageModify.classList.add("visible");
    Vframe.classList.add("visible");
    
    if(modifyLien.substring(0,5) == "https"){
        contextMenuManageModifySelectLien.value = "https://";
        contextMenuManageModifyLien.value = modifyLien.substring(8);
    }
    else {
        contextMenuManageModifySelectLien.value = "http://";
        contextMenuManageModifyLien.value = modifyLien.substring(7);
    }
    
    if(modifyFrame == "1"){
        contextMenuManageModifyFrame.checked = true;
        contextMenuManageModifyFrame.value = 1;
    }
    else {
        contextMenuManageModifyFrame.checked = false;
        contextMenuManageModifyFrame.value = 0;
    }
    });
});



// Open context menu add after left click button +
contextMenuManageAdd.addEventListener("click", (e) => {
    e.preventDefault();
    
    contextMenuManageModifySubmitAdd.type = "submit";
    contextMenuManageModifySubmitAdd.style.width = `100%`;
    contextMenuManageModifySubmitAdd.style.margin = `8px 0 0 0`;
    
    
    contextMenuManageModifySubmitModify.type = "hidden";
    
    contextMenuManageModifyId.value = "0";
    contextMenuManageModifyNom.value = "";
    contextMenuManageModifyLien.value = "";
    contextMenuManageModifyFrame.checked = true;
    contextMenuManageModifyFrame.value = 1;
    contextMenuManageModify.style.left = `25%`;
    contextMenuManageModify.style.right = `25%`;
    contextMenuManageModifyDelete.style.transform = `scale(0)`;
    contextMenuManageModifyDelete.style.padding = `0`;
    contextMenuManageModifyDelete.style.margin = `0`;
    contextMenuManageModify.classList.add("visible");
    Vframe.classList.add("visible");
});



function refresh() {
    const ifr = document.getElementsByName(menu)[0];
    ifr.src = ifr.getAttribute("data-src");
}



function fullscreen() {
    const ifr = document.getElementsByName(menu)[0];
    window.open(ifr.getAttribute("data-src"));
}



//function for touch screen
onlongtouch = function() {
    timer = null;
    const normalizePozitionTouch = (mouseX, mouseY) => {
        let {
            left: scopeOffsetX,
            top: scopeOffsetY,
        } = scope.getBoundingClientRect();
        scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
        scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;
        const scopeX = mouseX - scopeOffsetX;
        const scopeY = mouseY - scopeOffsetY;
        const outOfBoundsOnX =
            scopeX + contextMenu.clientWidth > view.clientWidth;
        const outOfBoundsOnY =
            scopeY + contextMenu.clientHeight > view.clientHeight;
        let normalizedX = mouseX;
        let normalizedY = mouseY;
        if (outOfBoundsOnX) {
            normalizedX =
                scopeOffsetX + scope.clientWidth - contextMenu.clientWidth;
        }
        if (outOfBoundsOnY) {
            normalizedY =
                scopeOffsetY + scope.clientHeight - contextMenu.clientHeight;
        }
        return {
            normalizedX,
            normalizedY
        };
    };
    scope.addEventListener("touchstart", (event) => {
        const {
            clientX: mouseX,
            clientY: mouseY
        } = event.touches[0];
        const {
            normalizedX,
            normalizedY
        } = normalizePozitionTouch(mouseX, mouseY);
        contextMenu.classList.remove("visible");
        contextMenu.style.top = `${normalizedY}px`;
        contextMenu.style.left = `${normalizedX}px`;

onlongtouch = function() {
            timer = null;
            contextMenu.classList.add("visible");
        };
    });
};



scope.addEventListener("touchstart", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
    }
});



scope.addEventListener("touchstart", (e) => {
    if (e.target.offsetParent != contextMenuManage) {
        contextMenuManage.classList.remove("visible");
    }
});



scope.addEventListener('touchstart', (e) => {
    menu = (e.target.getAttribute('id'));
});



function touchstart(e) {
    e.preventDefault();
    if (!timer) {
        timer = setTimeout(onlongtouch, touchduration);
    }
}



function touchend() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
}



document.addEventListener("DOMContentLoaded", function(event) {
    window.addEventListener("touchstart", touchstart, false);
    window.addEventListener("touchend", touchend, false);
});



//sortabble drag 
$(function() {
    $('#sortable').sortable({
        axis: 'y',
        opacity: 0.9,
        handle: 'span',
        update: function(event, ui) {
            var list_sortable = $(this).sortable('toArray').toString();
    		// change order in the database using Ajax
            $.ajax({
                url: 'set_order.php',
                type: 'POST',
                data: {Ordre:list_sortable},
                success: function(data) {
                }
            });
        }
    });
});



// Draggable object
function filter(e) {
  let target = e.target;

  if (!target.classList.contains("draggable")) {
    return;
  }

  target.moving = true;
  
  e.clientX ? // Check if Mouse events exist on user' device
  (target.oldX = e.clientX, // If they exist then use Mouse input
  target.oldY = e.clientY) :
  (target.oldX = e.touches[0].clientX, // otherwise use touch input
  target.oldY = e.touches[0].clientY)

  target.oldLeft = window.getComputedStyle(target).getPropertyValue('left').split('px')[0] * 1;
  target.oldTop = window.getComputedStyle(target).getPropertyValue('top').split('px')[0] * 1;

  document.onmousemove = dr;
  document.ontouchmove = dr;

  function dr(event) {
    event.preventDefault();

    if (!target.moving) {
      return;
    }
    event.clientX ?
    (target.distX = event.clientX - target.oldX,
    target.distY = event.clientY - target.oldY) :
    (target.distX = event.touches[0].clientX - target.oldX,
    target.distY = event.touches[0].clientY - target.oldY)

    target.style.left = target.oldLeft + target.distX + "px";
    target.style.top = target.oldTop + target.distY + "px";
  }

  function endDrag() {
    target.moving = false;
  }
  target.onmouseup = endDrag;
  target.ontouchend = endDrag;
}
document.onmousedown = filter;
document.ontouchstart = filter;



















