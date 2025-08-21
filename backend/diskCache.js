const path = require("path");
const fsPromise = require("fs/promises");
const pdfCounter = require("pdf-page-counter");

const DIR = "uploads";

const getSvgoDirLength = async (fileHash) => {
    try {
        return (await fsPromise.readdir(path.join(DIR, `/${fileHash}/svgo`)))?.length;
    } catch (e) {
        throw new Error(e);
    }
};

const workDirCheck = async () => {
    try {
        await fsPromise.readdir(path.join(DIR));
    } catch (e) {
        await fsPromise.mkdir(path.join(DIR));
    }
};

const mkdir = async (filepath) => {
    try {
        await fsPromise.mkdir(path.join(DIR, filepath));
    } catch (e) {
        if (e.code === "EEXIST") return; //не бросит ошибку, если уже есть директория
        throw new Error(e);
    }
};

const rmDir = async (filepath) => {
    try {
        await fsPromise.rm(path.join(DIR, filepath), { recursive: true });
    } catch (e) {
        if (e.code === "ENOENT") return; //не бросит ошибку, если нет директории
        throw new Error();
    }
};

const readFile = async (filepath) => {
    try {
        const buffer = await fsPromise.readFile(path.join(DIR, filepath));
        return buffer;
    } catch (e) {
        if (e.code === "ENOENT") {
            return null;
        }
        throw new Error();
    }
};

const writeFile = async (filepath, fileBuffer) => {
    try {
        await fsPromise.writeFile(path.join(DIR, filepath), fileBuffer);
    } catch (e) {
        throw new Error();
    }
};

const writeJson = async (filepath, data) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fsPromise.writeFile(path.join(DIR, filepath), jsonString, "utf-8");
    } catch (e) {
        throw new Error();
    }
};

const readJson = async (filepath) => {
    try {
        const data = await fsPromise.readFile(path.join(DIR, filepath), "utf-8");
        return JSON.parse(data);
    } catch (e) {
        if (e.code === "ENOENT") {
            return null;
        }
        throw new Error();
    }
};

const getPathsForConvert = (fileHash, pageNumber) => {
    const pdfPath = path.join(DIR, `/${fileHash}/source.pdf`);
    const svgPath = path.join(DIR, `/${fileHash}/svg/${pageNumber}.svg`);
    const svgoPath = path.join(DIR, `/${fileHash}/svgo/${pageNumber}.svg`);

    return {
        pdfPath,
        svgPath,
        svgoPath,
    };
};

const init = async (fileHash, fileBuffer) => {
    try {
        await mkdir(fileHash);
        await mkdir(`${fileHash}/svg`);
        await mkdir(`${fileHash}/svgo`);
        await writeFile(`/${fileHash}/source.pdf`, fileBuffer);

        const pageCount = (await pdfCounter(fileBuffer))?.numpages;
        await writeJson(`/${fileHash}/pageCount.json`, pageCount);
        return pageCount;
    } catch (e) {
        throw new Error(e);
    }
};

const deleteWorkDir = async () => {
    try {
        await rmDir("/");
    } catch (e) {
        throw new Error(e);
    }
};

module.exports = {
    mkdir,
    rmDir,
    readFile,
    readJson,
    init,
    getPathsForConvert,
    getSvgoDirLength,
    workDirCheck,
    deleteWorkDir,
};
