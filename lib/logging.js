const chalk = require('chalk');
const dim = chalk.dim;

/**
 * Logging.
 *
 * @param String heading Heading text.
 * @param String subHeading Sub heading text.
 * @param String subsubHeading Sub heading text.
 * @param Object options Configurable options.
 */
module.exports = (heading = 'SPEAKER-CLI', subHeading = '', subsubHeading = '', options = {}) => {
	const defaultOptions = {
		bgColor: '#FADC00',
		color: '#000000',
		bold: true,
		newLine: false,
	};

	const opts = { ...defaultOptions, ...options };

	// Configure.
	const bg = opts.bold ? chalk.hex(opts.bgColor).inverse.bold : chalk.hex(opts.bgColor).inverse;
	const clr = opts.bold ? chalk.hex(opts.color).bold : chalk.hex(opts.color);
	const br = opts.newLine ? '\n\n' : '';

	// Do it.
	console.log();
	console.log(`${clr(`${bg(` ${heading} `)}`)} ${subHeading} ${br}${dim(subsubHeading)}`);
	console.log();
};
