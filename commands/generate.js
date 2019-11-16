const util = require('util');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const liveServer = require('live-server');
const ncp = require('ncp').ncp;
const ncpPromise = util.promisify(ncp);
const ora = require('ora');
const logging = require('../utils/logging');

// Configuration
const info = false;
const spinner = ora();
spinner.color = 'yellow';
spinner.indent = 5;
const start = new Date();
const appDir = process.cwd();
const package = require(`${appDir}/package.json`);
const serverParams = {
	root: `${appDir}/docs`,
	open: true,
	logLevel: 0,
};

// slides
const slidesDirectoryToWatch = `${appDir}/slides`;
const slidesOutputDir = `${appDir}/docs/slides`;
const mainSlideLocation = `${appDir}/slides/asciidoc/index.adoc`;
const slidesDirectoriesToCopy = ['theme', 'fonts', 'images', 'screencasts', 'reveal'];

// labs

async function generate(options) {
	if (!fs.existsSync(`${appDir}/.speaker.json`)) {
		throw new Error('File `.speaker.json` is missing 😢');
	}

	if (options.pdf) {
		console.log('🏗  👷‍  start building pdf ... 📺');

		const puppeteer = require('puppeteer');

		const browser = await puppeteer.launch({ headless: true });
		const page = await browser.newPage();
		await page.goto(`file://${slidesOutputDir}/index.html?print-pdf`, {
			waitUntil: 'networkidle0',
		});
		await page.pdf({
			format: 'A4',
			path: `${package.name}.pdf`,
		});

		await browser.close();
		const end = new Date() - start;
		console.log('🎉 👌  pdf successfully generated');
		console.info('Execution time: %dms', end);
		return;
	}

	if (options.watch) {
		// TODO: test if only you are only watching labs or slides
		// ...
		chokidar
			.watch(slidesDirectoryToWatch, {
				ignored: /(^|[\/\\])\../,
				persistent: true,
			})
			.on('all', (event, path) => {
				runWorkFlow(options);
			});

		liveServer.start(serverParams);
	} else {
		workflow(options);
	}
}

function runWorkFlow(options) {
	debounce(function() {
		console.log('📏 👀  change detected !');
		workflow(options);
	}, 2000);
}

async function workflow(options) {
	if (options.labs) {
		await labsWorkflow(options);
	} else if (options.slides) {
		await slidesWorkflow(options);
	} else {
		await distWorkflow(options);
		await labsWorkflow(options);
		await slidesWorkflow(options);
	}

	const end = new Date() - start;
	console.log('');
	logging(undefined, ' 🎉  Successfully generated', `Execution time: ${end}ms`);
	console.log('');
}

async function distWorkflow(options) {
	spinner.start(` Build main page 👨🏻‍💻`);
	// part to generate all the final directory with the main project page

	const end = new Date() - start;
	spinner.succeed();
	if (info) console.info('Execution time: %dms', end);
	return;
}

async function labsWorkflow(options) {
	spinner.start(` Build labs 🧪`);

	// part to generate all the final directory with the main project page

	const end = new Date() - start;
	spinner.succeed();
	if (info) console.info('Execution time: %dms', end);
	return;
}

async function slidesWorkflow(options) {
	spinner.start(` Build slides 📺`);

	// Clean
	if (fs.existsSync(slidesOutputDir)) {
		rimraf.sync(slidesOutputDir);
	}

	// Create slides directory
	fs.mkdirSync(slidesOutputDir);

	// Copy all directories
	return Promise.all(
		slidesDirectoriesToCopy.map(path => {
			ncpPromise(`${slidesDirectoryToWatch}/${path}`, `${slidesOutputDir}/${path}`);
		})
	).then(() => {
		// Load asciidoctor.js and asciidoctor-reveal.js
		const asciidoctor = require('asciidoctor.js')();
		const asciidoctorRevealjs = require('asciidoctor-reveal.js');
		asciidoctorRevealjs.register();

		// Convert the document 'index.adoc' using the reveal.js converter
		const options = { safe: 'safe', backend: 'revealjs', to_dir: slidesOutputDir };
		asciidoctor.convertFile(mainSlideLocation, options);

		const end = new Date() - start;
		spinner.succeed();
		if (info) console.info('Execution time: %dms', end);
	});
}

function debounce(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this,
			args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

module.exports = (...args) => {
	return generate(...args).catch(err => {
		console.error(`⚠️  `, err);
		process.exit(1);
	});
};
