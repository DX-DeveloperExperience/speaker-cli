const fs = require('fs-extra');
const util = require('util');
const inquirer = require('inquirer');
const rimraf = require('rimraf');
const glob = require('glob');
const Mustache = require('mustache');
const ncp = require('ncp').ncp;
const ncpPromise = util.promisify(ncp);
const homedir = require('os').homedir();
const execSync = require('child_process').execSync;

const logging = require('../utils/logging');
const writeFileTree = require('../utils/writeFileTree');

async function create(directoryName, projectOptions) {
	// TODO read options and use default or distant template like git repo ...

	// create directory or replace it
	if (directoryName === '.') {
		logging(undefined, 'Start create project in current directory: ', process.cwd());
		const { isCurrentOk } = await inquirer.prompt({
			name: 'isCurrentOk',
			default: false,
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
				default: false,
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

	let config = {};

	if (fs.existsSync(`${homedir}/.speaker.json`)) {
		const defautConfig = fs.readFileSync(`${homedir}/.speaker.json`, 'utf8');
		console.log('Default config:');
		console.log(defautConfig);
		let { useDefaultConfig } = await inquirer.prompt({
			name: 'useDefaultConfig',
			default: false,
			type: 'confirm',
			message: `Use default config?`,
		});

		if (!useDefaultConfig) {
			config = await getProjectOptions({ directoryName });
		} else {
			config = JSON.parse(defautConfig);
		}
	} else {
		config = await getProjectOptions({ directoryName });
	}

	const start = new Date();

	fs.mkdir(directoryName);

	// store config into .spearker
	await writeFileTree(`${directoryName}`, {
		'.speaker.json': JSON.stringify(config, null, 4),
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

	const specialConfig = {
		...config,
		authors: config.projectAuthorsTwitter.split(' '),
	};

	// search all files with template to replace
	const filesPath = glob.sync('./**/*.mustache', {});

	// loop files and replace template
	filesPath.forEach(filePath => {
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const newFileContent = Mustache.render(fileContent, specialConfig);
		fs.writeFileSync(filePath, newFileContent);
		const filePathWithoutMustache = filePath.replace('.mustache', '');
		fs.renameSync(filePath, filePathWithoutMustache);
	});

	const end = new Date() - start;
	logging(undefined, '🎉 Successfully generated', `Execution time: ${end}ms`);
	console.info(`Next commands: `)
	console.info(`cd ${directoryName}`);
	console.info(`npm install`);
}

async function getProjectOptions(options) {
	const config = await inquirer.prompt([
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
			name: 'projectAuthorsTwitter',
			type: 'input',
			message: `Enter project authors twitter with space (ex: @AurelienLoyer @EmmanuelDemey):`,
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

	// save config in home directory ?
	const { saveConfig } = await inquirer.prompt({
		name: 'saveConfig',
		default: false,
		type: 'confirm',
		message: `Save config for next project?`,
	});
	if (saveConfig === true) {
		await writeFileTree(`${homedir}`, {
			'.speaker.json': JSON.stringify(config, null, 4),
		});
	}

	return config;
}

module.exports = (...args) => {
	return create(...args).catch(err => {
		console.error(`🤫 : `, err);
		process.exit(1);
	});
};
