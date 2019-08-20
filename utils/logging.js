const chalk = require('chalk');
const dim = chalk.dim;

const defaultOptions = {
    bgColor: '#FADC00',
    color: '#000000',
    bold: true,
    newLine: false,
};

/**
 * Logging.
 *
 * @param String heading Heading text.
 * @param String subHeading Sub heading text.
 * @param String subsubHeading Sub heading text.
 * @param Object options Configurable options.
 */
module.exports = (heading = 'SPEAKER-CLI', subHeading = '', subsubHeading = '', options = {}) => {

	const opts = { ...defaultOptions, ...options };

	const bg = opts.bold ? chalk.hex(opts.bgColor).inverse.bold : chalk.hex(opts.bgColor).inverse;
	const clr = opts.bold ? chalk.hex(opts.color).bold : chalk.hex(opts.color);

	if(opts.newLine) console.log()
	console.log(`${clr(`${bg(` ${heading} `)}`)} ${subHeading} ${dim(subsubHeading)}`);
	if(opts.newLine) console.log()
};
