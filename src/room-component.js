import {arrFindMostSimilarIndex} from "./common/statistics.js";
import {colorArrayToStyle, getColorStylesDiff} from "./common/drawing.js";
import {includeHTML} from "./common/html-loader.js";
import Meeple from "./meeple-component";
import {getRandomRange} from "./game-state-service.js";
import {log, stateService, registerPlayer, unregisterPlayer, makePlayerElm, startGame} from "./tsuro.js"

export default class Room {

  playerElems = [];

  constructor() {
    this.roomDiv = document.getElementById('room');

    includeHTML(this.roomDiv, 'room.html')
      .then(() => {
        this.roomBackHome = document.getElementById('roomBackHome');
        this.playersList = document.getElementById('roomPlayersList');
        this.roomId = document.getElementById('roomId');
        this.playerInfo = document.getElementById('roomPlayerInfo');
        this.roomPlayerName = document.getElementById('roomPlayerName');
        this.roomPlayerColor = document.getElementById('roomPlayerColor');
        this.roomPlayerInfoReady = document.getElementById('roomPlayerInfoReady');
        this.startGame = document.getElementById('roomStartGame');
        this.presetColors = document.getElementById('roomPlayerPresetColors');

        this.roomPlayerColor.onchange = (event) => {
          this.roomPlayerColor.value = this.validateColorSelection(event.target.value);
        };

        this.roomBackHome.onclick = () => {
          this.onBackHome();
        };

        this.roomPlayerInfoReady.onclick = () => {
          this.onJoinGame();
        };

        this.startGame.onclick = () => {
          startGame();
        };

        this.readPlayerInfo();

        // log("Registering players for TEST only!...");
        //
        // //#TEST init some dummy players for test only
        // registerPlayer("Mike", colorArrayToStyle(Meeple.Colors[0]));
        // registerPlayer("Stephan", colorArrayToStyle(Meeple.Colors[1]));
        // registerPlayer("Ian", colorArrayToStyle(Meeple.Colors[2]));
        // registerPlayer("Carlo", colorArrayToStyle(Meeple.Colors[3]));
        // registerPlayer("ppl", colorArrayToStyle(Meeple.Colors[4]));
        // registerPlayer("Kevin", colorArrayToStyle(Meeple.Colors[5]));
        // registerPlayer("Pascal", colorArrayToStyle(Meeple.Colors[6]));

      })
      .catch((err) => {
        log("room-component error: " + err, true);
      });
  }

  async onJoinGame() {
    // this.savePlayerInfo();
    const alreadyRegistered = stateService.myPlayerId >= 0;
    await registerPlayer(this.roomPlayerName.value, this.roomPlayerColor.value, !alreadyRegistered);
  }

  async onLeaveGame() {
    const alreadyRegistered = stateService.myPlayerId >= 0;
    if (alreadyRegistered && stateService.selfPlayerName) {
      await unregisterPlayer(stateService.selfPlayerName);
    }
  }

  async onKickPlayer(idx) {
    const playerState = stateService.getPlayerState(idx);
    await unregisterPlayer(playerState.playerName);
  }

  async onBackHome() {
    await this.onLeaveGame();

    window.location.hash = '';
    window.location.reload();
  }

  readPlayerInfo() {
    const {playerName, playerColor} = stateService.readPlayerInfo();
    this.roomPlayerName.value = playerName ? playerName : 'Player #' + getRandomRange(10, 99);
    this.roomPlayerColor.value = playerColor ? playerColor : '#000000';
  }

  savePlayerInfo() {
    stateService.savePlayerInfo(this.roomPlayerName.value, this.roomPlayerColor.value);
  }

  updatePlayer(idx) {
    const playerState = stateService.getPlayerState(idx);
    const elem = this.playerElems[idx];

    // if (stateService.state.playerTurn == idx) {
    //   elem.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(idx);
    // } else {
    //   elem.style.boxShadow = "";
    // }
    //
    // if(!stateService.getIsPlayerReady(idx) || stateService.getIsPlayerPlaying(idx)){
    //   elem.style.textDecoration = "";
    // } else {
    //   elem.style.textDecoration = "line-through";
    // }
  }

  // show/hide room
  show(show) {
    this.roomDiv.style.display = show ? "block" : "none";
  }

  findAvailableColorsStyles() {
    const state = stateService.state;
    const usedColorsIdxs = state.players.map(p => Meeple.findMeepleIdForColorStyle(p.playerColor));
    const availColors = Meeple.Colors.filter((color, i) => !usedColorsIdxs.includes(i));
    const availColorsStyles = availColors.map(clr => colorArrayToStyle(clr, false));
    return availColorsStyles;
  }

  validateColorSelection(clrStyle) {
    const availColorStyles = this.findAvailableColorsStyles();
    const availColorIdx = arrFindMostSimilarIndex(availColorStyles, (clr, mostSimilarItem) => getColorStylesDiff(clr, clrStyle));
    return availColorIdx >= 0 ? availColorStyles[availColorIdx] : null;
  }

  init() {
    const makePlayer = (idx) => {
      const elem = document.createElement("div");
      elem.innerHTML = `<span class="large-text">${makePlayerElm(idx)}</span>`;

      if (idx === stateService.myPlayerId) {
        // add "Leave" button
        const btn = document.createElement("button");
        btn.innerHTML = "Leave";
        btn.style.marginLeft = "1em";
        btn.onclick = () => {
          this.onLeaveGame();
        };

        elem.appendChild(btn);
      }

      //this.playersList.childNodes[idx] = elem;
      // this.playersList.insertBefore(elem, this.playersList.childNodes[idx]);
      this.playersList.appendChild(elem);
      //this.playerElems.splice(idx, 0, elem);
      this.playerElems.push(elem);
    };

    const makePlaceHolder = (idx) => {
      const elem = document.createElement("div");
      elem.innerHTML = "-available-";

      this.playersList.appendChild(elem);
      //this.playerElems.push(elem);
    };

    this.playersList.innerText = '';
    this.playerElems = [];
    for (let i = 0; i < stateService.playersMax; i++) {
      if (stateService.getPlayerState(i)) {
        makePlayer(i);
        this.updatePlayer(i);
      } else {
        makePlaceHolder(i);
      }
    }

    this.roomId.innerHTML = stateService.gameId;
    this.syncFromState();
  }

  syncFromState() {
    const hidePlayerInfo = stateService.playersTotal >= stateService.playersMax || stateService.myPlayerId >= 0;
    this.playerInfo.style.display = hidePlayerInfo ? "none" : "block";

    this.startGame.style.display = stateService.myPlayerId === 0 ? "inline-block" : "none";

    const idx = stateService.getStateDiffKeys('players');
    idx.forEach(i => {
      this.updatePlayer(i);
    });

    // populate available colors picker
    const availColorStyles = this.findAvailableColorsStyles();
    let html = "";
    for (let i = 0; i < availColorStyles.length; i++) {
      //html += "<option value=\"" + availColorStyles[i] + "\">"
      html += "<option>" + availColorStyles[i] + "</option>"
    }
    this.presetColors.innerHTML = html;
    this.roomPlayerColor.value = this.validateColorSelection(this.roomPlayerColor.value);
  }
}