import {transitionElement} from "./common/dom-animator.js";
import {sleep} from "./common/dom-animator";

export default class Prompt {
  static PromptType = {INFO: 1, SUCCESS: 2, WARNING: 3, ERROR: 4};

  divElem = null;
  txtElem = null;
  delayedPrompts = [];

  showFor = 2000;  // show for 2s by default
  infoBgColor = "#000000CC";    // greish
  infoTxtColor = "white";
  successBgColor = "#99ffccCC";    // greenish
  successTxtColor = "#3300cc";
  warnBgColor = "#ffcc66CC";    // orangeish
  warnTxtColor = "black";
  errBgColor = "#cc0000CC";    // redish
  errTxtColor = "#ffff66";

  get isReady() {
    return this.divElem;
  }

  initPrompt() {
    if (this.isReady) {
      return; // already initialized
    }

    this.divElem = document.createElement("div");
    this.divElem.style.position = "absolute"; // for css transitions to work
    this.divElem.style.marginTop = "-25px";
    this.divElem.style.marginLeft = "-200px";
    this.divElem.style.transition = "all .8s ease";
    this.divElem.style.left = "50%"; // for css transitions to work
    this.divElem.style.top = "-50%"; // for css transitions to work
    this.divElem.style.width = "400px";
    this.divElem.style.height = "50px";
    this.divElem.style.opacity = "0";
    this.divElem.style.zIndex = "99";
    this.divElem.style.textAlign = "center";
    this.divElem.style.lineHeight = "50px";
    this.divElem.onclick = () => {
      // hide prompt on click
      this.animatePromptHide();
    };

    this.txtElem = document.createElement("h");
    this.divElem.appendChild(this.txtElem);

    document.body.appendChild(this.divElem);
  }

  setPromptStyle(type, linesNum) {
    if (type === Prompt.PromptType.SUCCESS) {
      this.divElem.style.boxShadow = "0 0 20px 20px " + this.successBgColor;
      this.divElem.style.backgroundColor = this.successBgColor;
      this.txtElem.style.color = this.successTxtColor;
      this.txtElem.style.fontSize = "xx-large";
    } else if (type === Prompt.PromptType.WARNING) {
      this.divElem.style.boxShadow = "0 0 20px 20px " + this.warnBgColor;
      this.divElem.style.backgroundColor = this.warnBgColor;
      this.txtElem.style.color = this.warnTxtColor;
      this.txtElem.style.fontSize = "xx-large";
    } else if (type === Prompt.PromptType.ERROR) {
      this.divElem.style.boxShadow = "0 0 20px 20px " + this.errBgColor;
      this.divElem.style.backgroundColor = this.errBgColor;
      this.txtElem.style.color = this.errTxtColor;
      this.txtElem.style.fontSize = "xx-large";
    } else {    // PromptType.INFO
      //this.divElem.style.border = "5px solid #000000CC";
      this.divElem.style.boxShadow = "0 0 20px 20px " + this.infoBgColor;
      this.divElem.style.backgroundColor = this.infoBgColor;
      this.txtElem.style.color = this.infoTxtColor;
      this.txtElem.style.fontSize = "xx-large";
    }

    const height = Math.max(50, linesNum * 30);
    const lineHeight = Math.floor(height / linesNum);
    this.divElem.style.height = height + "px";
    this.divElem.style.lineHeight = lineHeight + "px";
  }

  getDelayedPrompt() {
    if (!this.delayedPrompts.length) {
      return null;
    }
    return this.delayedPrompts.splice(0, 1)[0];
  }

  async showPrompt(txt, showFor = this.showFor, type = Prompt.PromptType.INFO) { // show for 2s by default
    if (this.showing) {
      // show later
      this.delayedPrompts.push({txt: txt, showFor: showFor, type: type});
      return;
    }

    let txtLines = '';
    if (Array.isArray(txt)) {
      this.setPromptStyle(type, txt.length);
      for (let i = 0; i < txt.length; i++) {
        txtLines += i > 0 ? ("<br/>" + txt[i]) : txt[i];
      }
    } else {
      this.setPromptStyle(type, 1);
      txtLines = txt;
    }
    this.txtElem.innerHTML = txtLines;

    await this.animatePromptShow();

    if (showFor > 0) {
      await sleep(showFor);
      await this.animatePromptHide();
    }
  }

  async showSuccess(txt, showFor) {
    return this.showPrompt(txt, showFor, Prompt.PromptType.SUCCESS);
  }

  async showWarning(txt, showFor) {
    return this.showPrompt(txt, showFor, Prompt.PromptType.WARNING);
  }

  async showError(txt, showFor = -1) {
    return this.showPrompt(txt, showFor, Prompt.PromptType.ERROR);
  }

  async animatePromptShow() {
    this.showing = true;

    const animStyle = {
      //transition: "all 1s",
      top: "50%",
      opacity: "1"
    };

    await transitionElement(this.divElem, animStyle);
  }

  async animatePromptHide() {
    const animStyle = {
      //transition: "all 1s",
      top: "-50%",
      opacity: "0"
    };

    await transitionElement(this.divElem, animStyle);

    this.showing = false;

    let delayedPrompt = this.getDelayedPrompt();
    if (delayedPrompt) {
      this.showPrompt(delayedPrompt.txt, delayedPrompt.showFor, delayedPrompt.type);
    }
  }
}