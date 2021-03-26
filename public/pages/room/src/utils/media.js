//classe para encapsular todo controle de media do usuário
class Media {
  //método para acessar a camera do usuário
  async getCamera(audio = true, video = true) {
    //utilizando apis dos navegadores para acessar os devices do usuário
    return navigator.mediaDevices.getUserMedia({
      video,
      audio,
    });
  }
}
