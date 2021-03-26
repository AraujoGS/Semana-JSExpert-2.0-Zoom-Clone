//Classe responsável por gerar a instância do Socket
class SocketBuilder {
  constructor({ socketUrl }) {
    this.socketUrl = socketUrl;
    this.onUserConnected = () => {};
    this.onUserDisconnected = () => {};
  }
  
  setOnUserConnected(fn) {
    this.onUserConnected = fn;
    return this;
  }
  
  setOnUserDisconnected(fn) {
    this.onUserDisconnected = fn;
    return this;
  }

  //Uma classe implementando o padrão builder, sempre possui o método build, que prepara e retorna a instância da classe
  build() {
    const socket = io.connect(this.socketUrl, {
      withCredentials: false,
    });
    //escutadores para os eventos emitidos pelo servidor indicando quando conecta ou desconecta um usuário.
    socket.on("user-connected", this.onUserConnected);
    socket.on("user-disconnected", this.onUserDisconnected);

    return socket;
  }
}
