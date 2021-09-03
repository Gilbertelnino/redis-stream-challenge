const app = require("express")();
const redis = require("redis");
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const REDIS_PORT = process.env.REDIS_URL || 6379;
const redisClient = redis.createClient(REDIS_PORT);
redisClient.on("error", (error) => console.log(error));

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

io.on("connection", (socket) => {
  socket.on("message", (data) => {
    redisClient.xadd("my_test_stream", "*", "name", data.name);
  });
  socket.emit("messageReceived");
});

const port = process.env.PORT || 5500;
server.listen(port, () => console.log(`App is listening on port ${port}`));
