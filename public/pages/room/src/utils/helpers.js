//classe com métodos auxiliares
class Helpers {
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
