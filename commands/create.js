const fs = require('fs-extra');
const util = require('util');
const logging = require('../utils/logging');
const readlineSync = require('readline-sync');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;
const ncpPromise = util.promisify(ncp);

async function create(projectName, options) {
	// TODO read options and use default or distant template like git repo ...

	// create directory or replace it
	if (projectName === '.') {
		logging(undefined, 'Start create project in current directory: ', process.cwd());
	} else {
		logging(undefined, 'Start create project with name: ', projectName);

		if (fs.existsSync(projectName)) {
			logging(undefined, 'Create project error: ', 'directory already exist');
			const removeExisting = readlineSync.keyInYN('Remove this directory and create the project?');

			if (removeExisting === true) {
				rimraf.sync(projectName);
			} else if (removeExisting === false) {
				console.log("Oh... It's ok... Choose another name 🤔");
				process.exit(1);
			}
		}
	}
	fs.mkdir(projectName);

	// generate project from template
	ncpPromise(`${__dirname}/../template`, `${projectName}`).then(() => {
		// replace all mustaches by prompt response
		
		// log commands to start

	}).catch(e => {
		logging(undefined, 'Error during creating project: ', projectName);
		console.log(e);
		process.exit(1);
	});


}

module.exports = (...args) => {
	return create(...args).catch(err => {
		console.error(`🤫`, err);
		process.exit(1);
	});
};
