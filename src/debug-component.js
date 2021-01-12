import {includeHTML} from "./common/html-loader.js";
import {stateService, processState, log} from "./tsuro.js";

export async function initDebug() {
  console.log("**** Initializing DEBUG Console ****");

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
    if(debugDiv.style.display != "block"){
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