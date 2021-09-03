const express = require("express");
const redis = require("redis");
const app = express();

app.use(express());

const REDIS_PORT = process.env.REDIS_URL || 6379;
const redisClient = redis.createClient(REDIS_PORT);
redisClient.on("error", (error) => console.log(error));

const PORT = process.env.PORT || 5000;

// Create consumer group
app.post("/create/consumer-group", (req, res) => {
  const { streamName, groupName } = req.body;
  if (!streamName || !groupName) {
    return res.status(400).json({
      error: "Both StreamName and GroupName are required",
    });
  } else {
    redisClient.xgroup("CREATE", streamName, groupName, "$", (err) => {
      if (err) {
        if (err.code == "BUSYGROUP") {
          return res.status(400).json({
            error: `Group ${groupName} already exists`,
          });
        }
      } else {
        return res.status(201).json({
          message: `Group ${groupName} has been created successfully`,
        });
      }
    });
  }
});

// Create consumer
app.post("/create/consumer", (req, res) => {
  const { streamName, groupName, consumerName } = req.body;
  if (!streamName || !groupName || !consumerName) {
    return res.status(400).json({
      error: "All StreamName, GroupName and consumerName are required",
    });
  } else {
    redisClient.xgroup(
      "CREATECONSUMER",
      streamName,
      groupName,
      consumerName,
      (err, data) => {
        if (err) {
          console.log("error while creating consumer", err);
        } else {
          return res.status(201).json({
            message: `Consumer ${consumerName} has been created successfully`,
          });
        }
      }
    );
  }
});

app.get("/consume", (req, res) => {
  // I hardcoded this for simplist but in real-world scenario it will come from the form
  const mystream = "my_test_stream";
  const mygroup = "my_test_consumer_group";
  const consumerName = "John";
  redisClient.xreadgroup(
    "GROUP",
    mygroup,
    "COUNT",
    2,
    consumerName,
    "STREAMS",
    mystream,
    ">",
    (err, stream) => {
      if (err) {
        console.error(err);
      }

      if (stream) {
        let messages = stream[0][1];
        const result = [];
        messages.forEach(function (message) {
          // convert the message into a JSON Object
          let id = message[0];
          let values = message[1];
          let msgObject = { id: id };
          for (let i = 0; i < values.length; i = i + 2) {
            msgObject[values[i]] = values[i + 1];
          }
          const json = JSON.stringify(msgObject);
          redisClient.xack(mystream, mygroup, json.id);
          result.push(json);
        });
        return res.status(200).json({
          messages: result,
        });
      } else {
        // No message in the consumer buffer
        return res.status(200).json({
          message: "No new message Yet",
        });
      }
    }
  );
});

app.listen(PORT, () => console.log(`processor app is running on port ${PORT}`));
