const fs = require('fs-extra');
const util = require('util');
const inquirer = require('inquirer');
const rimraf = require('rimraf');
const glob = require('glob');
const ncp = require('ncp').ncp;
const homedir = require('os').homedir();
const ncpPromise = util.promisify(ncp);
const ora = require('ora');

const logging = require('../utils/logging');
const writeFileTree = require('../utils/writeFileTree');
const { isValidateName } = require('../utils/validators');
const { mustacheFiles } = require('../utils/mustache');
const { execShellCommand } = require('../utils/exec');

async function create(directoryName, projectOptions) {
	// TODO read options and use default or distant template like git repo ...

	// create directory or replace it
	if (directoryName === '.') {
		logging(undefined, 'Start creating project in current directory: ', process.cwd());
		const { isCurrentDirectoryOk } = await inquirer.prompt({
			name: 'isCurrentDirectoryOk',
			default: false,
			type: 'confirm',
			message: `Generate project in current directory?`,
		});

		if (!isCurrentDirectoryOk) {
			return;
		}
	} else {
		if (!isValidateName(directoryName)) {
			throw new Error('Invalid directory name');
		}
		logging(undefined, 'Start creating project with name: ', directoryName);

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
		delete defautConfig.directoryName;
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

	fs.mkdirSync(directoryName);

	const spinner = ora();
	spinner.color = 'yellow';

	const authors = config.projectAuthorsTwitter.split(' ');
	const authorsObject = [];

	if (authors.length > 0) {
		const puppeteer = require('puppeteer');
		const browser = await puppeteer.launch();

		spinner.start('Fetching data from Twitter 🐦');

		try {
			const page = await browser.newPage();
			for (let i = 0; i < authors.length; i++) {
				const twitter = authors[i];
				await page.goto('https://twitter.com/' + twitter, { waitUntil: 'networkidle0' });
				let data = await page.evaluate(() => {
					const title = document
						.querySelector('title')
						.innerText.split('(')[0]
						.trim();
					const avatar = document.querySelector('img[src*=profile_image').src;
					return {
						title,
						avatar,
					};
				});
				authorsObject.push({
					twitter,
					...data,
				});
			}
			spinner.succeed('Fetch data from Twitter 🐦');
		} catch (error) {
			spinner.fail(`Fetch data from Twitter 🐦 (${error.message})`);
		}

		await browser.close();
	}

	const parserData = {
		...config,
		authors: authorsObject,
		haveSlides: config.types.includes('slides'),
		haveLabs: config.types.includes('labs'),
	};

	spinner.start('Creating speaker config file 🎤');

	writeFileTree(`${directoryName}`, {
		'.speaker.json': JSON.stringify(config, null, 4),
	})
		.catch(error => {
			spinner.fail(`Error: ${error}`);
		})
		.then(() => {
			spinner.succeed('Create speaker config file 🎤');
			spinner.start('Copying all template files to project 👯‍♂️');
			return ncpPromise(`${__dirname}/../template`, `${directoryName}`);
		})
		.catch(error => {
			logging(undefined, 'Error during creating project: ', directoryName);
			spinner.fail(`Error: ${error}`);
			process.exit(1);
		})
		.then(() => {
			spinner.succeed('Copy all template files to project 👯‍♂️');
			// search all files with template to replace
			process.chdir(directoryName);
			const filesPath = glob.sync('./**/*.mustache', {});
			process.chdir('./../');
			spinner.start('Replacing config in all 👨🏻 files');
			return mustacheFiles(directoryName, filesPath, parserData);
		})
		.catch(err => {
			spinner.fail(`Replacing config in all 👨🏻 files`);
			console.log(err);
		})
		.then(() => {
			spinner.succeed('Replace config in all 👨🏻 files');
			if (config.labsConfig && config.labsConfig.format) {
				const extToDelete = config.labsConfig.format === 'md' ? 'adoc' : 'md';
				spinner.start('Cleaning labs file 🧹');
				var files = [
					`${directoryName}/labs/01-step.${extToDelete}`,
					`${directoryName}/labs/02-step.${extToDelete}`,
				];
				return Promise.all(
					files.map(async file => {
						if (await fs.existsSync(file)) {
							await fs.unlinkSync(file);
						}
					})
				);
			}
			return new Promise.resolve();
		})
		.then(() => {
			if (config.labsConfig && config.labsConfig.format) {
				spinner.succeed('Cleaning labs file 🧹');
			}
			spinner.start(`Installing NPM packages 🧸`);
			return execShellCommand('npm i', { cwd: directoryName });
		})
		.catch(err => {
			spinner.fail(`Install NPM packages 🧸`);
			console.error(err);
		})
		.then(() => {
			spinner.succeed(`Install NPM packages 🧸`);
			if (config.gitinit) {
				spinner.start('Initialiting GIT repo 🐙');
				return execShellCommand('git init', { cwd: directoryName });
			}
			return new Promise.resolve();
		})
		.then(() => {
			if (config.gitinit) {
				spinner.succeed('Initialiting GIT repo 🐙');
			}
			return new Promise.resolve();
		})
		.finally(() => {
			const end = new Date() - start;
			console.log('');
			logging(undefined, '🎉 Successfully created', `Execution time: ${end}ms`);
			console.log('');
			console.info(`Next commands: `);
			console.info(`cd ${directoryName}`);
			console.info(`npm run watch:slides`);

			process.exit(0);
		});
}

async function getProjectOptions(options) {
	let config = await inquirer.prompt([
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
				{ name: 'Codelab', value: 'labs' },
				{ name: 'Slides', value: 'slides' },
				{ name: 'Other', value: 'other' },
			],
		},
	]);

	let labsConfig = {};
	if (config.types.includes('labs')) {
		labsConfig = await inquirer.prompt([
			{
				name: 'labsConfig.format',
				type: 'list',
				message: `Choose the codelab files format:`,
				choices: [{ name: 'Markdown', value: 'md' }, { name: 'AsciiDoc', value: 'adoc' }],
			},
		]);
	}

	let gitConfig = await inquirer.prompt([
		{
			name: 'gitinit',
			type: 'confirm',
			message: `Init git repository ?`,
		},
	]);

	config = {
		...options,
		...config,
		...labsConfig,
		...gitConfig,
	};

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
		console.error(`⚠️  `, err);
		process.exit(1);
	});
};
