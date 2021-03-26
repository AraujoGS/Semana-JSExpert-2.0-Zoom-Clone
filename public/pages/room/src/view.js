//classe responsável por controlar as modificações na interface
class View {
  constructor() {
    this.recorderBtn = document.getElementById("record");
    this.leaveBtn = document.getElementById("leave");
  }

  /**
   * Método que cria o elemento de video que será inserido na tela toda vez que um
   * usuário entra na sala
   * src -> url de um vídeo pronto pra ser colocada na call
   * srcObject -> dados de stream ao vivo, como os dados enviados pela camera do usuário
   */
  createVideoElement({ muted = true, src, srcObject }) {
    const video = document.createElement("video");
    video.muted = muted;
    video.src = src;
    video.srcObject = srcObject;

    if (src) {
      //caso seja passado uma url de vídeo pronta, disponibiliza
      //os controles e um preview em loop do video.
      video.controls = true;
      video.loop = true;
      //espera 200 ms pra evitar um erro no browser pelo video não ter sido totalmente carregado
      //ou seja aguarda alguns segundos para que o video carregue.
      Helpers.sleep(200);
    }

    if (srcObject) {
      //caso seja passado dados de stream, da play no video quando o evento 'loadedmetadata' for emitido
      video.addEventListener("loadedmetadata", (_) => video.play());
    }

    return video;
  }

  //adiciona na interface o novo membro da call
  renderVideo({ userId, stream = null, url = null, isCurrentId = false }) {
    const video = this.createVideoElement({
      muted: isCurrentId,
      src: url,
      srcObject: stream,
    });
    this.appendToHTMLTree(userId, video, isCurrentId);
  }

  //método para realizar as modificações do html quando tenho uma nova pessoa na call
  appendToHTMLTree(userId, video, isCurrentId) {
    //div que comporta a tag video
    const div = document.createElement("div");
    div.id = userId;
    div.classList.add("wrapper");
    div.append(video);
    //div para o nome da pessoa na call, quando só tem a propria pessoa na call omite o nome
    const div2 = document.createElement("div");
    div2.innerHTML = isCurrentId ? "" : userId;
    div.append(div2);
    //div que comporta todos os videos recebendo o novo.
    const videoGrid = document.getElementById("video-grid");
    videoGrid.append(div);
  }
  //Método responsável por atualizar a quantidade de participantes na call
  setParticipants(count) {
    //inicia em um porque eu já estou na call.
    const mySelf = 1;
    const participants = document.getElementById("participants");
    participants.innerHTML = count + mySelf;
  }
  //Método responsável por remover da interface um membro da call
  removeVideoElement(id) {
    const element = document.getElementById(id);
    element.remove();
  }
  //Método responsável por alterar a cor do botão de record
  toggleRecordingButtonColor(isActive = true) {
    this.recorderBtn.style.color = isActive ? "red" : "white";
  }
  //lógica do evento click do botão de record
  onRecordClick(command) {
    this.recordingEnabled = false;
    return () => {
      const isActive = (this.recordingEnabled = !this.recordingEnabled);
      command(this.recordingEnabled);
      this.toggleRecordingButtonColor(isActive);
    };
  }
  //lógica do evento click do botão end
  onLeaveClick(command) {
    return async () => {
      command();
      await Helpers.sleep(2000);
      window.location = "/pages/home";
    };
  }
  //attach do evento click no botão de record
  configureRecordButton(command) {
    this.recorderBtn.addEventListener("click", this.onRecordClick(command));
  }
  //attach do evento click no botão de end
  configureLeaveButton(command) {
    this.leaveBtn.addEventListener("click", this.onLeaveClick(command));
  }
}
