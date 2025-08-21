const axios = require("axios");
const { IMG_TYPES, CHANNEL_ID } = require("./const");
const crypto = require("crypto");
const fetch = require("node-fetch");
const libre = require("libreoffice-convert");
libre.convertAsync = require("util").promisify(libre.convert);

const mmInstanceApi = axios.create({
    baseURL: "https://mm.tetrika.school/hooks",
});

const getStorageBackendUrl = (req) => {
    const backendHost = req.headers.host.replace(/pdf-excalidraw/, "backend-excalidraw");
    const postFix = "/api/v2/documents";

    //review
    // const STORAGE_BACKEND_URL =
    //     "https://backend-excalidraw-review-mr-12167-d-o43zuv.review.tetrika-school.ru/api/v2/documents";

    //prod
    // const STORAGE_BACKEND_URL = "https://backend-excalidraw.tetrika-school.ru/api/v2/documents";

    //develop
    // const STORAGE_BACKEND_URL = "https://backend-excalidraw.develop.k8s.tetrika-school.ru/api/v2/documents"

    return `https://${backendHost}${postFix}`;
};

const isDoc = (type) => {
    const docTypes = [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    return docTypes.includes(type);
};

const generateFileHash = (input) => {
    return crypto.createHash("sha256").update(input).digest("hex");
};

const prepareMessage = (text, req) => {
    const lessonId = req?.query?.lessonId;
    const role = req?.query?.role;

    return {
        text: `msg: ${text}\nhost: ${req?.get(
            "host"
        )}\ndate: ${new Date().toUTCString()}\nlessonId: ${lessonId}\nrole: ${role}`,
    };
};

const sendLog = (text, req) => {
    if (process.env.DISABLE_LOG_MATTERMOST === "true") {
        return;
    }

    // mmInstanceApi.post(`/${CHANNEL_ID}`, prepareMessage(text, req));
};

const getFromS3 = async (id, url) => {
    try {
        const response = await fetch(`${url}/${id}`);

        if (response.status === 204) {
            return null;
        }

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        return Buffer.from(buffer); //.pdf only
    } catch (e) {
        throw new Error(e);
    }
};

const postToS3 = async (id, blob, url) => {
    try {
        return await fetch(`${url}/${id}`, {
            method: "post",
            body: blob,
            headers: { "Content-Type": "application/octet-stream" },
        });
    } catch (e) {
        throw new Error(e);
    }
};

const createDto = (base64, validPage) => ({
    imgs: [
        {
            base64,
            contentType: IMG_TYPES.svg,
            validPage,
        },
    ],
});

const convertDoc = async (buffer) => {
    try {
        return await libre.convertAsync(buffer, ".pdf", undefined);
    } catch (e) {
        throw new Error(e);
    }
};

// const unlink = async (links) => {
//     try {
//         if (!links.length) return;
//         for (const link of links) {
//             await fsPromise.unlink(link);
//         }
//     } catch (e) {
//         throw new Error(e);
//     }
// };

// const renameFile = async (oldPath, newPath) => {
//     try {
//         await fsPromise.rename(oldPath, newPath);
//         console.log(`Файл переименован: ${oldPath} → ${newPath}`);
//     } catch (e) {
//         throw new Error(e);
//     }
// };

module.exports = {
    isDoc,
    sendLog,
    createDto,
    generateFileHash,
    getFromS3,
    postToS3,
    convertDoc,
    getStorageBackendUrl,
};
