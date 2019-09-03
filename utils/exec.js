/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
exports.execShellCommand = function(cmd, options = {}) {
	const { exec } = require('child_process');
	return new Promise((resolve, reject) => {
		exec(cmd, options, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else if (stdout) {
				resolve(stdout);
			} else {
				reject(stderr);
			}
		});
	});
};
