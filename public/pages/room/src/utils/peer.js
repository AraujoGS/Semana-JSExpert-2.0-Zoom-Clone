class PeerBuilder {
  constructor({ peerConfig }) {
    this.peerConfig = peerConfig;
    const defaultFunctionValue = () => {};
    this.onError = defaultFunctionValue;
    this.onCallReceived = defaultFunctionValue;
    this.onConnectionOpened = defaultFunctionValue;
    this.onPeerStreamReceived = defaultFunctionValue;
    this.onCallError = defaultFunctionValue;
    this.onCallClose = defaultFunctionValue;
  }
  //quando acontece erro na chamada
  setOnCallError(fn) {
    this.onCallError = fn;
    return this;
  }

  //quando ocorre erro
  setOnError(fn) {
    this.onError = fn;
    return this;
  }
  //chamada encerrada
  setOnCallClose(fn) {
    this.onCallClose = fn;
    return this;
  }
  //chamada recebida
  setOnCallReceived(fn) {
    this.onCallReceived = fn;
    return this;
  }
  //conexão aberta
  setOnConnectionOpened(fn) {
    this.onConnectionOpened = fn;

    return this;
  }
  //quando receber dados(video e audio) do outro cliente
  setOnPeerStreamReceived(fn) {
    this.onPeerStreamReceived = fn;
    return this;
  }

  //Método responsável por replicar os eventos da call para a pessoa que ligar, ou seja quem já esta na ligação tem sua tela atualizada com o que está acontecendo.
  _preparePeerInstanceFunction(peerModule) {
    //extendo a classe do peer, ou seja, tudo que a classe peer tem peerCustomModule passa a ter
    class PeerCustomModule extends peerModule {}

    //acessando a call atual.
    const peerCall = PeerCustomModule.prototype.call;
    //guardando o contexto de fora da função call da classe Peer
    const context = this;
    PeerCustomModule.prototype.call = function (id, stream) {
      //guardando todos os eventos da call atual numa variavel, mantendo seu contexto
      const call = peerCall.apply(this, [id, stream]);
      //chamando o prepareCallEvent para associar os eventos da call para quem está ligando
      context._prepareCallEvent(call);

      return call;
    };
    return PeerCustomModule;
  }

  //método para tratar o retorno do evento 'call', nele vou attachar outros eventos para as varias situações chamada recebida, encerrada,chamada iniciada, desconexão.
  _prepareCallEvent(call) {
    //evento para tratar recebimento de dados(video e audio) na call, chamo a função passada pela Business para quando recebo dados do outro cara da call
    call.on("stream", (stream) => this.onPeerStreamReceived(call, stream));
    //evento para tratar erros na call, passo a call e o erro que aconteceu para saber o que aconteceu e com quem
    call.on("error", (error) => this.onCallError(call, error));
    //evento para tratar o encerramento ou saida de alguem da call, passo a call como parametro para saber quem está saindo
    call.on("close", (_) => this.onCallClose(call));

    this.onCallReceived(call);
  }

  async build() {
    //const peer = new Peer(...this.peerConfig);
    const PeerCustomInstance = this._preparePeerInstanceFunction(Peer);
    const peer = new PeerCustomInstance(...this.peerConfig);

    //evento para quando acontece algum erro na comunicação
    peer.on("error", this.onError);
    //evento lançado quando alguem liga para você ou você liga para alguem
    peer.on("call", this._prepareCallEvent.bind(this));
    //retorna uma promise que é resolvida quando a conexão é aberta, retorna o peer gerado no servidor permitindo que eu saiba quem é essa pessoa dentro da aplicação
    return new Promise((resolve) =>
      peer.on("open", (id) => {
        //chama a função passada pela Business para quando a conexão foi aberta, enviando o peer para lá.
        this.onConnectionOpened(peer);
        return resolve(peer);
      })
    );
  }
}
