let menu = null;
let modifyId = null;
let modifyNom = null;
let modifyLien = null;
const contextMenu = document.getElementById("context-menu");
const contextMenuModifyRefresh = document.getElementById("Refresh");
const contextMenuModifyOpen = document.getElementById("Modify");
const contextMenuModifyModify = document.getElementById("Fullscreen");
const contextMenuModifyAdd = document.getElementById("Add");
const contextMenuModify = document.getElementById("context-menu-modify");
const contextMenuModifyId = document.getElementById("idMenuAdd");
const contextMenuModifyNom = document.getElementById("NomMenuAdd");
const contextMenuModifyFrame = document.getElementById("FrameMenuAdd");
const contextMenuModifySelectLien = document.getElementById("selecthttp");
const contextMenuModifyLien = document.getElementById("LienMenuAdd");
const contextMenuModifySubmitAdd = document.getElementById("submitadd");
const contextMenuModifySubmitModify = document.getElementById("submitmodify");
const contextMenuModifyDelete = document.getElementById("delete");
const contextMenuClose = document.getElementById("CloseMenuAdd");
const scope = document.querySelector("div#t0 ul");
const scopeli = document.querySelectorAll("div#t0 li");
const view = document.querySelector("body");
const Vframe = document.getElementById("virtual");
const popup = document.getElementById("popup");
const d = document.getElementsByClassName("draggable");
var onlongtouch;
var timer;
var touchduration = 500;



// Close all menu after left click to menu bar
scope.addEventListener("click", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
        contextMenuModify.classList.remove("visible");
        Vframe.classList.remove("visible");
    }
});



// Close all menu after left click to virtual frame
Vframe.addEventListener("click", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
        contextMenuModify.classList.remove("visible");
        Vframe.classList.remove("visible");
    }
});



//After left click to context menu close all menu
contextMenu.addEventListener('click', (e) => {
    e.preventDefault();
    contextMenu.classList.remove("visible");
    contextMenuModify.classList.remove("visible");
    Vframe.classList.remove("visible");
});



//After left click to close button close contextMenuModify
contextMenuClose.addEventListener('click', (e) => {
    e.preventDefault();
    contextMenuModify.classList.remove("visible");
    Vframe.classList.remove("visible");
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
scope.addEventListener('contextmenu', (e) => {
    if (scope !== e.target) return;
    e.preventDefault();
    const {
        clientX: mouseX,
        clientY: mouseY
    } = e;
    const {
        normalizedX,
        normalizedY
    } = normalizePozition(mouseX, mouseY);
    contextMenu.classList.remove("visible");
    contextMenu.style.top = `${normalizedY}px`;
    contextMenu.style.left = `${normalizedX}px`;
    setTimeout(() => {
        contextMenuModifyOpen.style.display = "none";
        contextMenuModifyRefresh.style.display = "none";
        contextMenuModifyModify.style.display = "none";
        contextMenu.classList.add("visible");
        contextMenuModify.classList.remove("visible");
        Vframe.classList.add("visible");
    });

}, false);


// Open context menu with position of const normalizePozition after right click and with modify fullscreen and refresh
scopeli.forEach(item => {
    item.addEventListener('contextmenu', event => {
        if (event.target.id !== 'disconnect') {
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
                contextMenuModifyOpen.style.display = "block";
                contextMenuModifyRefresh.style.display = "block";
                contextMenuModifyModify.style.display = "block";
                contextMenu.classList.add("visible");
                contextMenuModify.classList.remove("visible");
                Vframe.classList.add("visible");

                modifyId = (event.target.parentElement.getAttribute('data-id'));
                modifyNom = (event.target.parentElement.getAttribute('data-nom'));
                modifyLien = (event.target.parentElement.getAttribute('data-lien'));
                modifyFrame = (event.target.parentElement.getAttribute('data-frame'));
                modifyImage = (event.target.parentElement.getAttribute('data-Img'));
            });
        }
        else {
            event.preventDefault();
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
                contextMenuModifyOpen.style.display = "none";
                contextMenuModifyRefresh.style.display = "none";
                contextMenuModifyModify.style.display = "none";
                contextMenu.classList.add("visible");
                contextMenuModify.classList.remove("visible");
                Vframe.classList.add("visible");
            });
        }
    })
})



// Open context menu add after left click Add button
contextMenuModifyAdd.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => {
        contextMenuModifySubmitAdd.type = "submit";
        contextMenuModifySubmitAdd.style.width = `100%`;
        contextMenuModifySubmitAdd.style.margin = `8px 0 0 0`;


        contextMenuModifySubmitModify.type = "hidden";

        contextMenuModifyId.value = "0";
        contextMenuModifyNom.value = "";
        contextMenuModifyLien.value = "";
        contextMenuModifyFrame.checked = true;
        contextMenuModifyFrame.value = 1;
        contextMenuModify.style.left = `25%`;
        contextMenuModifyDelete.style.transform = `scale(0)`;
        contextMenuModifyDelete.style.padding = `0`;
        contextMenuModifyDelete.style.margin = `0`;
        contextMenuModify.classList.add("visible");
        Vframe.classList.add("visible");
    });
});



// Open context menu modify after left click Modify button
contextMenuModifyOpen.addEventListener('click', (e) => {
    setTimeout(() => {

        contextMenuModifySubmitModify.type = "submit";

        contextMenuModifySubmitAdd.type = "hidden";

        contextMenuModify.style.left = `25%`;
        contextMenuModifyId.value = modifyId;
        contextMenuModifyNom.value = modifyNom;
        contextMenuModifyFrame.value = modifyFrame;
        contextMenuModifyDelete.style.transform = ``;
        contextMenuModifyDelete.style.padding = ``;
        contextMenuModifyDelete.style.margin = ``;

        contextMenuModify.classList.add("visible");
        Vframe.classList.add("visible");

        if (modifyLien === null) {
            contextMenuModify.classList.remove("visible");
            Vframe.classList.remove("visible");
            modifyLien = "";
        }

        if (modifyLien.substring(0, 5) == "https") {
            contextMenuModifySelectLien.value = "https://";
            contextMenuModifyLien.value = modifyLien.substring(8);
        }
        else {
            contextMenuModifySelectLien.value = "http://";
            contextMenuModifyLien.value = modifyLien.substring(7);
        }

        if (modifyFrame == "0") {
            contextMenuModifyFrame.checked = false;
            contextMenuModifyFrame.value = 0;
        }
        else {
            contextMenuModifyFrame.checked = true;
            contextMenuModifyFrame.value = 1;
        }
    });
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
onlongtouch = function () {
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

        onlongtouch = function () {
            timer = null;
            contextMenu.classList.add("visible");

            modifyId = (event.target.parentElement.getAttribute('data-id'));
            modifyNom = (event.target.parentElement.getAttribute('data-nom'));
            modifyLien = (event.target.parentElement.getAttribute('data-lien'));
            modifyFrame = (event.target.parentElement.getAttribute('data-frame'));
            modifyImage = (event.target.parentElement.getAttribute('data-Img'));
        };
    });
};



scope.addEventListener("touchstart", (e) => {
    if (e.target.offsetParent != contextMenu) {
        contextMenu.classList.remove("visible");
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



document.addEventListener("DOMContentLoaded", function (event) {
    window.addEventListener("touchstart", touchstart, false);
    window.addEventListener("touchend", touchend, false);
});



//sortabble drag 
$(function () {
    $('#menu').sortable({
        axis: 'y',
        opacity: 0.9,
        handle: 'a',
        update: function (event, ui) {
            var list_sortable = $(this).sortable('toArray').toString();
            // change order in the database using Ajax
            $.ajax({
                url: 'set_order.php',
                type: 'POST',
                data: { Ordre: list_sortable },
                success: function (data) {
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



function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}



function hidepopup() {
    document.cookie = "popup_update" + "=" + "HIDE" + "; path=/" + ";secure";
    popup.style.transitionDelay = "0s";
    popup.style.transform = "translateX(100%)";
}



function update() {
    $.ajax({ url: "update.php", success: function (result) { } })
    popup.style.transitionDelay = "0s";
    popup.style.transform = "translateX(100%)";
}
