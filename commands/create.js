const fs = require('fs-extra');
const util = require('util');
const inquirer = require('inquirer');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;
const ncpPromise = util.promisify(ncp);

const logging = require('../utils/logging');
const writeFileTree = require('../utils/writeFileTree');

async function create(directoryName, projectOptions) {
	// TODO read options and use default or distant template like git repo ...

	// create directory or replace it
	if (directoryName === '.') {
		logging(undefined, 'Start create project in current directory: ', process.cwd());
		const { isCurrentOk } = await inquirer.prompt({
			name: 'isCurrentOk',
			type: 'confirm',
			message: `Generate project in current directory?`,
		});

		if (!isCurrentOk) {
			return;
		}
	} else {
		logging(undefined, 'Start create project with name: ', directoryName);

		if (fs.existsSync(directoryName)) {
			logging(undefined, 'Create project error: ', 'directory already exist');
			const { removeExisting } = await inquirer.prompt({
				name: 'removeExisting',
				type: 'confirm',
				message: `Remove this directory and create the project?`,
			});

			if (removeExisting === true) {
				rimraf.sync(directoryName);
			} else {
				console.log("Oh... It's ok... Choose another name 🤔");
				process.exit(1);
			}
		}
	}

	const options = await getProjectOptions({ directoryName });

	fs.mkdir(directoryName);

	console.log(JSON.stringify(options));
	// store config into .spearker
	await writeFileTree(`${directoryName}`, {
		'.speaker.json': JSON.stringify(options),
	});

	// generate project from template
	try {
		await ncpPromise(`${__dirname}/../template`, `${directoryName}`);
	} catch (error) {
		logging(undefined, 'Error during creating project: ', directoryName);
		console.log(error);
		process.exit(1);
	}

	process.chdir(directoryName);

	// replace all mustaches by prompt response
	// log commands to start
}

async function getProjectOptions(options) {
	return await inquirer.prompt([
		{
			name: 'projectName',
			type: 'input',
			default: options.directoryName,
			message: `Confirm project name:`,
		},
		{
			name: 'projectDescription',
			type: 'input',
			message: `Enter project description:`,
		},
		{
			name: 'types',
			type: 'checkbox',
			message: `Pick all content needed:`,
			choices: [
				{ name: 'Codelab', value: 'codelab' },
				{ name: 'Slides', value: 'slides' },
				{ name: 'Other', value: 'other' },
			],
		},
		{
			name: 'gitinit',
			type: 'confirm',
			message: `Init git repository ?`,
		},
	]);
}

module.exports = (...args) => {
	return create(...args).catch(err => {
		console.error(`🤫`, err);
		process.exit(1);
	});
};
