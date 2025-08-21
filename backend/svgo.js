// https://github.com/dawbarton/pdf2svg
// https://github.com/silvathebest/pdf2svg - фикс битых страниц
// https://github.com/svg/svgo

const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const { readFile, getPathsForConvert } = require("./diskCache");

const getValidPage = (start, pageCount) => {
    if (!Number(start) || Number(start) <= 0) return 0; //первая страница
    if (Number(start) >= pageCount) {
        return pageCount - 1; //последняя страница
    }

    return Number(start) - 1;
};

const convertOne = async (pdfPath, svgPath, svgoPath, validPage) => {
    try {
        await execPromise(`pdf2svg ${pdfPath} ${svgPath} ${validPage}`);
        await execPromise(`svgo ${svgPath} -o ${svgoPath}`);
        return true;
    } catch (e) {
        throw new Error(e);
    }
};

const convertAll = async (fileHash, pageCount) => {
    try {
        for (let page = 1; page < pageCount; page++) {
            const converted = await readFile(`/${fileHash}/svgo/${page}.svg`);

            if (converted) {
                continue;
            }

            const { pdfPath, svgPath, svgoPath } = getPathsForConvert(fileHash, page);
            await convertOne(pdfPath, svgPath, svgoPath, page);
        }
    } catch (e) {
        throw new Error(e);
    }
};

module.exports = {
    getValidPage,
    convertAll,
    convertOne,
};
