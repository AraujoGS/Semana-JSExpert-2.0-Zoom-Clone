const onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get("room");
  const socketUrl = "http://localhost:3000";
  const socketBuilder = new SocketBuilder({ socketUrl });
  //configurando o peerServer no front com os dados do nosso server dedicado.
  const peerConfig = Object.values({
    id: undefined,
    config: {
      port: 9000,
      host: "localhost",
      path: "/",
    },
  });
  const peerBuilder = new PeerBuilder({ peerConfig });
  const view = new View();
  const media = new Media();
  const deps = {
    view,
    media,
    room,
    socketBuilder,
    peerBuilder,
  };

  Business.initialize(deps);
};

window.onload = onload;
