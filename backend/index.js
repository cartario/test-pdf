const express = require("express");
const cors = require("cors");
const multer = require("multer");
const {
    mkdir,
    readJson,
    readFile,
    rmDir,
    getPathsForConvert,
    init,
    getSvgoDirLength,
    workDirCheck,
    deleteWorkDir,
} = require("./diskCache");
const { isDoc, sendLog, createDto, convertDoc, getFromS3, postToS3, getStorageBackendUrl } = require("./utils");
const { getValidPage, convertAll, convertOne } = require("./svgo");

const { MAX_FILE_SIZE } = require("./const");

require("dotenv").config(
    process.env.NODE_ENV !== "development" ? { path: ".env.production" } : { path: ".env.development" }
);

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE },
});

const app = express();
const port = process.env.PORT || 80;

app.use(
    cors({
        origin: "*",
    })
);

app.use(express.json());

app.use((err, req, res, next) => {
    res.status(500).send({ msg: err.stack });
});

app.get("/", (req, res) => {
    res.send(`Server pdf is working. Storage-backend: ${getStorageBackendUrl(req)}`);
});

app.get("/v3", (req, res) => {
    res.send(`v3`);
});

app.post("/upload/:fileHash", upload.single("pdfFile"), async (req, res, next) => {
    try {
        const fileHash = req.params?.fileHash;
        if (!fileHash) return res.status(400).json({ error: "no_file_hash_provided" });

        let fileBuffer = req.file?.buffer;

        if (!fileBuffer) {
            const backendUrl = getStorageBackendUrl(req);
            fileBuffer = await getFromS3(fileHash, backendUrl);
        }

        if (isDoc(req.file?.mimetype)) {
            fileBuffer = await convertDoc(fileBuffer);
        }

        if (!fileBuffer) {
            return res.status(400).json({ error: "file_not_found_try_again" });
        }

        await workDirCheck();

        const pageCount = await init(fileHash, fileBuffer);
        const validPage = getValidPage(req.query?.start, pageCount);

        const { pdfPath, svgPath, svgoPath } = getPathsForConvert(fileHash, validPage);
        await convertOne(pdfPath, svgPath, svgoPath, validPage);
        const buffer = await readFile(`/${fileHash}/svgo/${validPage}.svg`);
        const base64 = Buffer.from(buffer).toString("base64");
        const imgDto = createDto(base64, validPage);

        res.send(imgDto);
        const backendUrl = getStorageBackendUrl(req);
        const isSavedToS3 = Boolean(await getFromS3(fileHash, backendUrl));
        if (!isSavedToS3) {
            await postToS3(fileHash, fileBuffer, backendUrl); //сохраняем pdf на s3
        }
        await convertAll(fileHash, pageCount);
        await rmDir(`${fileHash}/svg`);
    } catch (e) {
        console.error(`ERR_UPLOAD:${e}`);
        sendLog(`ERR_UPLOAD-${e}. Mimetype - ${req.file.mimetype}`, req);
        next(e);
    }
});

app.get("/cached", async (req, res, next) => {
    try {
        const fileHash = req.query?.hash;

        if (!fileHash) throw new Error("no_file_hash_provided");

        const pdfBuffer = await readFile(`/${fileHash}/source.pdf`);

        if (!pdfBuffer) {
            return res.send({
                fromCache: false,
            });
        }

        await workDirCheck();

        const pageCount = await readJson(`/${fileHash}/pageCount.json`);
        const validPage = getValidPage(req.query?.start, pageCount);

        const svgoBuffer = await readFile(`/${fileHash}/svgo/${validPage}.svg`);
        let targetBase64;

        if (svgoBuffer) {
            targetBase64 = Buffer.from(svgoBuffer).toString("base64");
        } else {
            await mkdir(`${fileHash}/svg`);
            const { pdfPath, svgPath, svgoPath } = getPathsForConvert(fileHash, validPage);
            await convertOne(pdfPath, svgPath, svgoPath, validPage);
            const newSvgoBuffer = await readFile(`/${fileHash}/svgo/${validPage}.svg`);
            targetBase64 = Buffer.from(newSvgoBuffer).toString("base64");
        }
        const imgDto = createDto(targetBase64, validPage);
        res.send({ ...imgDto, fromCache: true });
    } catch (e) {
        console.error(`ERR_CACHED-${e}`);
        sendLog(`ERR_CACHED-${e}`, req);
        next(e);
    }
});

app.get("/lab/check", async (req, res, next) => {
    try {
        const fileHash = req.query?.hash;

        if (!fileHash) throw new Error("no_file_hash_provided");

        await workDirCheck();

        const pdfBuffer = await readFile(`/${fileHash}/source.pdf`);

        if (!pdfBuffer) {
            return res.send({
                fromCache: false,
            });
        }

        const length = await getSvgoDirLength(fileHash);
        res.send({ length });
    } catch (e) {
        console.error(`ERR_LAB_CHECK-${e}`);
        sendLog(`ERR_LAB_CHECK-${e}`, req);
        next(e);
    }
});

app.get("/lab/reset", async (req, res, next) => {
    try {
        await deleteWorkDir();
        res.sendStatus(200);
    } catch (e) {
        console.error(`ERR_RESET-${e}`);
        sendLog(`ERR_RESET-${e}`, req);
        next(e);
    }
});

const start = async () => {
    try {
        app.listen(port, () => {
            console.log(`server is working on port ${port}`);
        });
    } catch (e) {
        console.error(`ERR_START_APP:${e}`);
        sendLog(`ERR_PDF_START_APP_${e}`);
    }
};

start();
