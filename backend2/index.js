const express = require("express");
const app = express();

const PORT = 3004;

app.use(express.json());

app.use((err, req, res, next) => {
    res.status(500).send({ msg: err.stack });
});

app.get("/", (req, res) => {
    res.send(`Server pdf is working on ${PORT}`);
});

const start = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`server is working on PORT ${PORT}`);
        });
    } catch (e) {
        console.error(`ERR_START_APP:${e}`);        
    }
};

start();
