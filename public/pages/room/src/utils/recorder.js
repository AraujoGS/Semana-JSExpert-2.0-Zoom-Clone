//Classe responsável por realizar a gravação das calls
class Recorder {
  constructor(userName, stream) {
    this.userName = userName;
    this.stream = stream;
    this.filename = `id:${userName}-when:${Date.now()}`;
    this.videoType = "video/webm";
    this.mediaRecoder = {};
    this.recordedBlobs = [];
    this.completeRecordings = [];
    this.recordingActive = false;
  }
  //descobre e retorna os tipos de midia aceitos no navegador que está rodando a aplicação.
  _setup() {
    const commonCodecs = ["codecs=vp9,opus", "codecs=vp8,opus", ""];

    const options = commonCodecs
      //gera um array com mimetypes, baseados nos codecs colocados no array
      .map((codec) => ({ mimeType: `${this.videoType};${codec}` }))
      //tenta encontrar o primeiro mimetype aceito pelo browser em questão
      .find((options) => MediaRecorder.isTypeSupported(options.mimeType));

    if (!options) {
      throw new Error("Nenhum dos codecs informados é aceito nesse browser");
    }

    return options;
  }
  //metodo para iniciar a gravação
  startRecording() {
    const options = this._setup();

    //verifica se está recebendo dados da camera
    if (!this.stream.active) return;

    //criando a instância do media recoder, API do browser para gravar calls. **NÃO FUNCIONA EM MUITOS BROWSERS ATÉ O MOMENTO 06/02/2021
    this.mediaRecoder = new MediaRecorder(this.stream, options);

    //evento para detectar quando a gravação é parada
    this.mediaRecoder.onstop = (event) => {
      console.log("Gravações", this.recordedBlobs);
    };

    //evento para detectar quando está com dados para gravar
    this.mediaRecoder.ondataavailable = (event) => {
      //verifica se tem dados para gravar
      if (!event.data || !event.data.size) return;
      //adiciona na lista de gravações a atual
      this.recordedBlobs.push(event.data);
    };
    //inicia a gravação
    this.mediaRecoder.start();
    this.recordingActive = true;
  }

  //metodo para para a gravação
  async stopRecording() {
    //verifico se de fato está tendo gravação
    if (!this.recordingActive) return;
    if (this.mediaRecoder.state === "inactive") return;
    //para a gravação e  dou um timeout de 200ms para não travar o video
    this.mediaRecoder.stop();
    await Helpers.sleep(200);
    //guarda os videos gravados
    this.completeRecordings.push([...this.recordedBlobs]);
    //zera a variavel que guarda os arquivos durante a gravação
    this.recordedBlobs = [];
  }

  //metodo para gerar as URL dos video gravados
  getAllVideoURLs() {
    return this.completeRecordings.map((recording) => {
      //gerando um arquivo blbo de cada gravação
      const superBuffer = new Blob(recording, { type: this.videoType });
      //gerando a url de download
      return window.URL.createObjectURL(superBuffer);
    });
  }

  //metodo para realizar download das gravações
  download() {
    //verifica se tem gravações para baixar
    if (!this.completeRecordings.length) return;

    for (const recording of this.completeRecordings) {
      const blob = new Blob(recording, { type: this.videoType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${this.filename}.webm`;
      document.body.appendChild(a);
      a.click();
    }
  }
}
