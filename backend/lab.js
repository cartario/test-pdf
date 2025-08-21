const path = require("path");
const libre = require("libreoffice-convert");
const fsPromise = require("fs/promises");

libre.convertAsync = require("util").promisify(libre.convert);
const { generateFileHash } = require("./utils");

const uploadApi = async () => {
    try {
        const dir = "lab/1"; //добавляем сюда тестовый файл
        const readableFilename = "u6u6.pdf"; //указываем нужное имя
        const tempPdfFilePath = path.join(dir, readableFilename);
        const fileBuffer = await fsPromise.readFile(tempPdfFilePath);
        const fileHash = generateFileHash(fileBuffer);
        //получили с клиента буфер и хеш

        if (!fileHash) throw new Error("No file hash uploaded");
        console.log("...next...");
    } catch (e) {
        console.log(e);
    }
};

const cachedApi = async () => {
    try {
        const fileHash = "3e59604345d499d9c8fbd3bc37361f634e35647961fb52ecab4db15fe3e98eec"; //from query
        const start = 3; //from query
        if (!fileHash) throw new Error("no_file_hash_provided");
        console.log("...next...");
    } catch (e) {
        console.log(e);
    }
};

// uploadApi()
// cachedApi();
