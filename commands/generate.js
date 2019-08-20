const util = require('util');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const liveServer = require('live-server');
const ncp = require('ncp').ncp;
const ncpPromise = util.promisify(ncp);
// Configuration
const appDir = process.cwd();
const directoryToWatch = `${appDir}/slides`;
const mainSlideLocation = `${appDir}/slides/asciidoc/index.adoc`;
const directoryToCopy = ['theme', 'fonts', 'images', 'screencasts'];
const outputDir = `${appDir}/docs/slides`;
const package = require(`${appDir}/package.json`);
const serverParams = {
	root: `${appDir}/docs`,
	open: true,
	logLevel: 0,
};

async function generate(options) {
	if (!fs.existsSync(`${appDir}/.speaker.json`)) {
		throw new Error('File `.speaker.json` is missing 😢');
	}

	if (options.pdf) {
		console.log('🏗  👷‍  start build pdf ... 📺');

		const puppeteer = require('puppeteer');

		const browser = await puppeteer.launch({ headless: true });
		const page = await browser.newPage();
		await page.goto(`file://${outputDir}/index.html?print-pdf`, { waitUntil: 'networkidle0' });
		await page.pdf({
			format: 'A4',
			path: `${package.name}.pdf`,
		});

		await browser.close();
		return;
	}

	if (options.watch) {
		chokidar
			.watch(directoryToWatch, {
				ignored: /(^|[\/\\])\../,
				persistent: true,
			})
			.on('all', (event, path) => {
				runWorkFlow();
			});

		liveServer.start(serverParams);
	} else {
		workflow();
	}
}

const runWorkFlow = debounce(function() {
	console.log('📏 👀  change detected !');
	workflow();
}, 2000);

function workflow() {
	const start = new Date();

	console.log('🏗  👷‍  start build slides ... 📺');

	// Clean
	if (fs.existsSync(outputDir)) {
		rimraf.sync(outputDir);
	}

	// Create slides directory
	fs.mkdirSync(outputDir);

	// Copy all directoryToCopy
	Promise.all(
		directoryToCopy.map(path => {
			ncpPromise(`${directoryToWatch}/${path}`, `${outputDir}/${path}`);
		})
	).then(() => {
		// Load asciidoctor.js and asciidoctor-reveal.js
		const asciidoctor = require('asciidoctor.js')();
		const asciidoctorRevealjs = require('asciidoctor-reveal.js');
		asciidoctorRevealjs.register();

		// Convert the document 'index.adoc' using the reveal.js converter
		const options = { safe: 'safe', backend: 'revealjs', to_dir: outputDir };
		asciidoctor.convertFile(mainSlideLocation, options);

		const end = new Date() - start;
		console.log('🎉 👌  slides successfully generated');
		console.info('Execution time: %dms', end);
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
