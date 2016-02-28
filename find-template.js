const path = require("path");
const fs = require("fs");
const debug = require("debug")("gloo:find-template");
const config = require("./config");

// Finds the template file that fits the request. We should at least always deliver the toplevel default file.
exports.find = function(req, subdomain) {
    var requestPath = req.path;

    var pathToLookIn = path.resolve("./templates/" + subdomain + requestPath);
    var explicitTemplatePath = templatePath(pathToLookIn);
    if (explicitTemplatePath) {
        return explicitTemplatePath;
    } else {
        return defualtTemplateOf(pathToLookIn);
    }
}

// First looks for a default file (name specified in config.defualtTemplate) in
// the same directory as given file, then in the directory above, then above
// that, etc.
// The last one it will check is ./config.topTemplateDirectory/config.defaultFile.
// That one should always exist, and if some idiot deletes it, bad things might
// happen.
function defualtTemplateOf(pathToLookIn) {
    const topDir = path.resolve("./" + config.topTemplateDirectory + "/");
    // We shall only look in templateDir, else we'll go into a loop.
    if (!isPathInsideDir(pathToLookIn, topDir)) {
        return undefined;
    }
    pathToLookIn = path.dirname(pathToLookIn);
    pathToLookIn = path.resolve(pathToLookIn, config.defaultTemplate);
    var pathFound;
    while (!(pathFound = templatePath(pathToLookIn))) {
        var directory = path.dirname(pathToLookIn);
        if (directory == topDir) {
            debug("BAD!", "Toplevel default template", pathToLookIn, "not found.",
                "This should never happen. Who deleted it?");
            return undefined;
        }
        pathToLookIn = path.resolve(directory, "../" + config.defautTemplate);
    }
    return pathFound;
}

// Takes a full path to a file too look for, without the extension.
// Returns undefined if not found with any supported extension.
function templatePath(fullPath) {
    for (var i in config.supportedEngines) {
        var engineDesc = config.supportedEngines[i];
        try {
            var fullPathWithExt = fullPath + "." + engineDesc.extension;
            fs.accessSync(fullPathWithExt);
            debug("Found template file " + fullPathWithExt);
            return fullPathWithExt;
        } catch (e) { }
    }
    return undefined;
}

function isPathInsideDir(fullPath, containingDir) {
    const relPath = path.relative(containingDir, fullPath)
    // If we have to go up from containingDir, fullPath is not in containingDir.
    if (relPath.substr(0,2) == "..") {
        return false;
    } else {
        return true;
    }
}

// Unit tests

exports.test = function(assert) {
    assert(templatePath(path.resolve("./" + config.topTemplateDir + "/", config.defaultTemplate)),
        "There must be a toplevel default template file.");
    assert(!(defualtTemplateOf(path.resolve("/"))),
        "Nothing should be returned if we're not in template dir.");
}
