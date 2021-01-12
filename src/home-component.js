import {includeHTML} from "./common/html-loader.js";
import {log, stateService, makePlayerColorStyle, makePlayerElm} from "./tsuro.js"
import GameStateService from "./game-state-service";

export default class Home {

  roomsElems = [];

  constructor() {
    this.homeDiv = document.getElementById('home');

    includeHTML(this.homeDiv, 'home.html')
      .then(() => {
        this.roomsList = document.getElementById('roomsList');
        this.homeNewGame = document.getElementById('homeNewGame');

        this.homeNewGame.onclick = () => {
          this.onStartNewGame()
        };
      })
      .catch((err) => {
        log("home-component error: " + err, true);
      });
  }

  onStartNewGame() {
    stateService.newGame();
  }

  onJoinExistingGame(gameId) {
    stateService.newGame(gameId);
  }

  update(room){
    // const playerState = stateService.getPlayerState(idx);
    // const elem = this.playerElems[idx];
  }

  // show/hide room
  show(show) {
    this.homeDiv.style.display=show ? "block" : "none";
  }

  init() {
    const makeRoom = (room) => {
      const elem = document.createElement("div");
      elem.innerHTML = `<span class="large-text">${room.gameName}</span> created by "${room.createdBy}"; players: ${room.playersNum} out of ${room.playersMax}; (ID: ${room.gameId})`;

      // add "Join" button
      const btn = document.createElement("button");
      btn.innerHTML = "Join Game";
      btn.style.marginLeft = "1em";
      btn.onclick = () => {
        this.onJoinExistingGame(room.gameId);
      };
      elem.appendChild(btn);

      //elem.innerHTML = `<span class="large-text">${room.gameName}</span> created by "${room.createdBy}"; players: ${room.playersNum} out of ${room.playersMax}; join game ID: ${room.gameId}`;

      this.roomsList.appendChild(elem);
      this.roomsElems.push(elem);
    };

    this.roomsList.innerText = '';
    this.roomsElems = [];
    const joinableRooms = stateService.roomService.rooms.filter(r => r.gameStatus === GameStateService.GameStates.STARTING);
    if (joinableRooms.length) {
      for (let i = 0; i < joinableRooms.length; i++) {
        makeRoom(joinableRooms[i]);
        this.update(joinableRooms[i]);
      }
    } else{
      const elem = document.createElement("div");
      elem.innerHTML = '-no games yet-';
      this.roomsList.appendChild(elem);
    }

    this.syncFromState();
  }

  syncFromState() {
    // const idx = stateService.getStateDiffKeys('players');
    // idx.forEach(i => {
    //   this.update(i);
    // })
  }
}