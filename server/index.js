const server = require("http").createServer((req, res) => {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  });

  res.end("Finish");
});

const socketIo = require("socket.io");

//criando o servidor socket.io,  configurando cors e autenticação
const io = socketIo(server, {
  cors: {
    origin: "*",
    credentials: false,
  },
});

//adicionando escutadores de evento, para capturar as interações do usuário.
io.on("connection", (socket) => {
  console.log("connection", socket.id);
  socket.on("join-room", (roomId, userId) => {    
    //adiciona usuários na mesma sala e comunica eles sobre conexões e desconexões
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("disconnect", () => {
      console.log("disconnected", roomId, userId);
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

const start = () => {
  const { address, port } = server.address();
  console.info(`app running at ${address}:${port}`);
};

server.listen(process.env.PORT || 3000, start);
