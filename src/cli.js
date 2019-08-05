'use strict';

const program = require('commander');
const minimist = require('minimist')
const path = require('path');
const chalk = require('chalk');
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;
const didYouMean = require('didyoumean');

// setting edit distance to 60% of the input string's length
didYouMean.threshold = 0.6

module.exports = class Cli {
	constructor() {
		this.program = program;
	}

	run() {
		this.checkNodeVersion(requiredVersion, 'speaker-cli');
		this.version();
		this.root();
		this.parse();
	}

	checkNodeVersion(wanted, id) {
		if (!semver.satisfies(process.version, wanted)) {
			console.log(
				chalk.red(
					'You are using Node ' +
						process.version +
						', but this version of ' +
						id +
						' requires Node ' +
						wanted +
						'.\nPlease upgrade your Node version.'
				)
			);
			process.exit(1);
		}
	}

	version() {
		this.program.version(require('../package').version).usage('<command> [options]');
	}

	parse() {
		this.program.parse(process.argv);
	}

	root() {
		// output help information on unknown commands
		this.program.arguments('<command>').action(cmd => {
			program.outputHelp();
			console.log(`  ${chalk.red(`Unknown command ${chalk.yellow(cmd)}.`)}`);
			console.log();
			suggestCommands(cmd);
		});

		// add some useful info on help
		this.program.on('-h, --help', () => {
			console.log();
			console.log(
				`  Run ${chalk.cyan(`vue <command> --help`)} for detailed usage of given command.`
			);
			console.log();
		});

		// create app-name command
		program
			.command('create <app-name>')
			.description('create a new project from speaker-cli')
			.action((name, cmd) => {
				const options = cleanArgs(cmd);

				if (minimist(process.argv.slice(3))._.length > 1) {
					console.log(
						chalk.yellow(
							"\n Info: You provided more than one argument. The first one will be used as the app's name, the rest are ignored."
						)
					);
				}
				
				require('../lib/create')(name, options);
			});

		this.program.commands.forEach(c => c.on('--help', () => console.log()));

		// if is missing cli command
		if (!process.argv.slice(2).length) {
			program.outputHelp();
		}
	}
};

function suggestCommands(unknownCommand) {
	const availableCommands = program.commands.map(cmd => {
		return cmd._name;
	});

	const suggestion = didYouMean(unknownCommand, availableCommands);
	if (suggestion) {
		console.log(`  ` + chalk.red(`Did you mean ${chalk.yellow(suggestion)}?`));
	}
}

function camelize(str) {
	return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''));
}

function cleanArgs(cmd) {
	const args = {};
	cmd.options.forEach(o => {
		const key = camelize(o.long.replace(/^--/, ''));
		
		if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
			args[key] = cmd[key];
		}
	});
	return args;
}
