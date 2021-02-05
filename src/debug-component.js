import {includeHTML} from "./common/html-loader.js";
import {log, stateService} from "./tsuro.js";

export let DEBUG_ENABLED = false;

function isProd() {
  try {
    return PRODUCTION === true;  // might not be defined!
  } catch (err) {
    return false;
  }
}

function getVersion() {
  try {
    return VERSION;  // might not be defined!
  } catch (err) {
    return '???';
  }
}

export async function initDebug() {

  if (isProd()) {
    console.log("* Production Build *; v." + getVersion());
    return;
  }

  console.log("**** Initializing DEBUG Console ****");

  DEBUG_ENABLED = true;

  //await includeHTML(document.body, 'debug.html');

  const footerDiv = document.getElementById('footer');

  try {
    await includeHTML(footerDiv, 'debug.html');
  } catch (err) {
    log("debug-component error: " + err, true);
  }

  const debugBtn = document.getElementById('debugBtn');
  const debugDiv = document.getElementById('debugDiv');
  const debugResetStateBtn = document.getElementById('debugResetStateBtn');
  const debugResetRoomBtn = document.getElementById('debugResetRoomBtn');
  const debugDeleteAllRoomsBtn = document.getElementById('debugDeleteAllRoomsBtn');

  debugBtn.onclick = ()=> {
    if(debugDiv.style.display !== "block"){
      debugDiv.style.display = "block";
    } else {
      debugDiv.style.display = "none";
    }
  };

  debugResetStateBtn.onclick = () => {
    stateService.registerGameState();
    stateService.updateRemoteState().then(()=>{
      window.location.reload();
    });
  };

  debugResetRoomBtn.onclick = () => {
    stateService.roomService.unregisterRoom().then(()=>{
      window.location.reload();
    });
  };

  debugDeleteAllRoomsBtn.onclick = () => {
    stateService.roomService.deleteAllRooms().then(() => {
      window.location.reload();
    });
  };
}

// add build version
export function initVersion() {
  // const parent = document.getElementById('body');
  const elem = document.createElement("span");
  elem.setAttribute("id", "version");
  elem.classList.add("small-text");
  elem.innerHTML = "v." + getVersion();
  document.body.appendChild(elem);
}