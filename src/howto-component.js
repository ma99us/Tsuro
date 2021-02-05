import {includeHTML} from "./common/html-loader.js";
import {log, stateService} from "./tsuro.js";

export async function initHowto() {

  const footerDiv = document.getElementById('footer');

  try {
    await includeHTML(footerDiv, 'howto.html');
  } catch (err) {
    log("howto-component error: " + err, true);
  }

  const howtoBtn = document.getElementById('howtoBtn');
  const howtoDiv = document.getElementById('howtoDiv');

  howtoBtn.onclick = ()=> {
    if(howtoDiv.style.display !== "block"){
      howtoDiv.style.display = "block";
    } else {
      howtoDiv.style.display = "none";
    }
  };

  howtoDiv.onclick = () => {
    howtoDiv.style.display = "none";
  }

}

