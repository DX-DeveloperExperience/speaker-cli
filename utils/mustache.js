const fs = require('fs-extra');
const Mustache = require('mustache');

/**
 * Executes a shell command and return it as a Promise.
 * @param directory {string}
 * @param filesPath {[]}
 * @param parserData {any}
 * @return {Promise<string>}
 */
exports.mustacheFiles = function(directory, filesPath, parserData) {
	return new Promise((resolve, reject) => {
		// TODO implement rejest part, we are not in Care Bears world 💋🧸🌏
		filesPath.forEach(filePath => {
			filePath = `${directory}/${filePath}`;
			const fileContent = fs.readFileSync(filePath, 'utf8');
			const newFileContent = Mustache.render(fileContent, parserData);
			fs.writeFileSync(filePath, newFileContent);
			const filePathWithoutMustache = filePath.replace('.mustache', '');
			fs.renameSync(filePath, filePathWithoutMustache);
		});
		resolve();
	});
};
