const liveServer = require('live-server');
const util = require('util');
const fs = require('fs');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;
const chokidar = require('chokidar');
const ncpPromise = util.promisify(ncp);
const args = process.argv.slice(2);

// Configuration
const isWatching = args.includes('watch');
const directoryToWatch = 'slides';
const mainSlideLocation = './slides/asciidoc/index.adoc';
const outputDir = './docs/slides/';
const directoryToCopy = ['theme', 'fonts', 'images', 'screencasts'];
const serverParams = {
	root: './docs',
	open: true,
	logLevel: 0,
};

if (isWatching) {
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
			ncpPromise(`./${directoryToWatch}/${path}`, `${outputDir}${path}`);
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
