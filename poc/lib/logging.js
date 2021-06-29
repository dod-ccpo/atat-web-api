// This is here purely to demonstrate a way to share code between Function Apps (in a monorepo)
// TODO: modify package process to include these files
module.exports.info = function (text) {
    console.info(text);
}