//classe responsavel pela regra de negocio
class Business {
  /**
   * Construtor que prepara as dependencias nessa classe de négocio
   * Aqui fica encapsulada toda a lógica da aplicação
   */
  constructor({ room, media, view, socketBuilder, peerBuilder }) {
    this.room = room;
    this.media = media;
    this.view = view;
    this.socketBuilder = socketBuilder;
    this.peerBuilder = peerBuilder;
    //instância do socket.io que vai controlar os eventos
    this.socket = {};
    //são os dados do stream, enquanto a camera envia dados essa propriedade tem valor
    this.currentStream = {};
    //é o meu peer, que o evento 'open' do peerServer vai me enviar quando eu conectar
    this.currentPeer = {};

    //Map é uma estrutura de dados similar ao object, porem ele tras embutido uma serie de métodos mais sematicos para manipular esse objeto como .has, .size...
    this.peers = new Map();
    this.usersRecordings = new Map();
  }

  //Método estático para retornar a instância da classe business
  static initialize(deps) {
    const instance = new Business(deps);
    return instance._init();
  }

  //método responsável por iniciar a call
  async _init() {
    //configurando o botão de record, passando uma função que precisa manter o contexto da classe Business
    this.view.configureRecordButton(this.onRecordPressed.bind(this));
    //configurando o botão de end
    this.view.configureLeaveButton(this.onLeavePressed.bind(this));
    this.currentStream = await this.media.getCamera();
    //inicializando as configurações do front para o socket.io, seto os métodos que vão tratar os eventos emitidos pelo servidor e chamo o build para gerar a instância.
    this.socket = this.socketBuilder
      .setOnUserConnected(this.onUserConnected())
      .setOnUserDisconnected(this.onUserDisconnected())
      .build();

    this.currentPeer = await this.peerBuilder
      .setOnError(this.onPeerError())
      .setOnConnectionOpened(this.onPeerConnectionOpened())
      .setOnCallReceived(this.onPeerCallReceived())
      .setOnPeerStreamReceived(this.onPeerStreamReceived())
      .setOnCallError(this.onPeerCallError())
      .setOnCallClose(this.onPeerCallClose())
      .build();

    this.addVideoStream(this.currentPeer.id);
  }
  //método responsável por adicionar o vídeo, renderizar os dados capturados
  addVideoStream(userId, stream = this.currentStream) {
    //sempre que renderiza o video cria uma instância para gravar
    const recordInstance = new Recorder(userId, stream);
    //adiciona no Map com os users sendo gravados
    this.usersRecordings.set(recordInstance.filename, recordInstance);
    //caso o botão de record esteja habilitado inicia a gravação
    if (this.recordingEnabled) {
      recordInstance.startRecording();
    }
    const isCurrentId = userId === this.currentPeer.id;
    this.view.renderVideo({
      userId,
      stream,
      isCurrentId,
    });
  }

  //Método que vai tratar os dados recebidos do evento emitido pelo servidor socket.io
  onUserConnected() {
    return (userId) => {
      console.log("user connected", userId);
      //quando um novo usuário é conectado na sala, quero ligar para ele. Acionando o callReceived
      this.currentPeer.call(userId, this.currentStream);
    };
  }

  //Método que vai tratar os dados recebidos do evento emitido pelo servidor socket.io
  onUserDisconnected() {
    return (userId) => {
      console.log("user disconnected", userId);

      if (this.peers.has(userId)) {
        //quando um usuário é disconectado verifico se está no peers dessa call, ou seja, se é uma pessoa saindo dela.
        //caso seja encerro a call e remove ele.
        this.peers.get(userId).call.close();
        this.peers.delete(userId);
      }

      //modifico a quantidade de participantes, paro as gravações e removo o video dele
      this.view.setParticipants(this.peers.size);
      this.stopRecording(userId);
      this.view.removeVideoElement(userId);
    };
  }

  //Método que vai tratar os erros do evento emitido pelo servidor peer server
  onPeerError() {
    return (error) => {
      console.error("deu ruim", error);
    };
  }

  //Método que vai tratar os dados recebidos ao abrir conexão do peer
  onPeerConnectionOpened() {
    //recebendo o peer enviado pelo evento 'open' e emitindo o evento do socket.io para incluir esse peer na call
    return (peer) => {
      const id = peer.id;
      //emitindo o evento que o servidor está escutando para adicionar um usuário numa call
      this.socket.emit("join-room", this.room, id);
    };
  }

  //Método que vai tratar quando uma chamada for recebida e emitida pelo peer server
  onPeerCallReceived() {
    return (call) => {
      //quando alguem me ligar eu respondo passando minha stream, ou seja, meu video e audio.
      call.answer(this.currentStream);
    };
  }

  //Método que vai tratar quando eu receber os dados(video e audio) da outra pessoa na chamada
  onPeerStreamReceived() {
    return (call, stream) => {
      //quem está ligando
      const callerId = call.peer;

      //quando tenho uma pessoa ligando, eu ouço video e audio dela, quando isso acontece o peer server(0.6.1) se perde entendendo como duas entradas na call
      //para resolver validamos se o callerId já está no map que guarda os peers
      if (this.peers.has(callerId)) {
        return;
      }

      this.addVideoStream(callerId, stream);
      //cada pessoa que entra na call vai para dentro do peers, criando uma chave 'callerId' e setando a call como valor.
      //quando o callerId é igual a um já existente no Map ele é sobrescrito, caso contrario um novo é gerado.
      this.peers.set(callerId, { call });
      this.view.setParticipants(this.peers.size);
    };
  }

  //Método que vai tratar os erro na chamada
  onPeerCallError() {
    return (call, error) => {
      console.log("deu ruim na call", error);
      //ao ocorrer um erro com alguem na call, o elemento de video dele é removido
      this.view.removeVideoElement(call.peer);
    };
  }

  //Método que vai tratar o encerramento da call, ou saida de alguem.
  onPeerCallClose() {
    return (call) => {
      console.log("saiu da call", call.peer);
    };
  }

  //Método responsável pela lógica de gravar as calls
  onRecordPressed(recordingEnabled) {
    this.recordingEnabled = recordingEnabled;
    console.log("pressionou", this.recordingEnabled);
    for (const [key, value] of this.usersRecordings) {
      //caso a gravação esteja habilitada começo a gravar cada um dos videos das pessoas na call, isso para o meu usuário na para todos.
      if (this.recordingEnabled) {
        value.startRecording();
        continue;
      }
      this.stopRecording(key);
    }
  }

  //Método responsável por para as gravações de um usuário que entra e sai da call durante uma gravação.
  async stopRecording(userId) {
    const usersRecordings = this.usersRecordings;
    for (const [key, value] of usersRecordings) {
      //verifica se esse é o usuário que preciso para as gravações
      const isContextUser = key.includes(userId);
      //caso não seja, continua  o loop
      if (!isContextUser) continue;

      const rec = value;
      //caso a gravação desse usuário não esteja rolando, continua o loop
      const isRecordingActive = rec.recordingActive;
      if (!isRecordingActive) continue;
      //se estiver gravando, para o processo.
      await rec.stopRecording();
      this.playRecordings(key);
    }
  }

  //Método responsável por colocar na interface o preview das gravações
  playRecordings(userId) {
    const user = this.usersRecordings.get(userId);
    const videosURLs = user.getAllVideoURLs();
    videosURLs.map((url) => {
      this.view.renderVideo({ url, userId });
    });
  }

  //Método responsável pela lógica de baixar as gravações ao finalizar a call
  onLeavePressed() {
    this.usersRecordings.forEach((value, key) => value.download());
  }
}
