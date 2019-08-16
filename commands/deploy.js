async function deploy(...args) {
	console.log(args);
}

module.exports = (...args) => {
	return deploy(...args).catch(err => {
		console.error(`⚠️ : `, err);
		process.exit(1);
	});
};
