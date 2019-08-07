const fs = require('fs-extra');
const logging = require('./logging');

async function create(projectName, options) {
    logging(undefined, 'Start create project with name: ', projectName);
}

module.exports = (...args) => {
	return create(...args).catch(err => {
		error(err);
		process.exit(1);
	});
};
