var fs = require('fs'),
  Compiler = require('./es6-module-transpiler').Compiler;

var output = '';
var moduleMap = {
  'ember-metal/watching': 'Ember',
  'ember-metal/array': 'Ember',
  'ember-metal/events': 'Ember',
  'ember-metal/observer': 'Ember'
};

function getModuleNameFromPath(path) {
  path = path.replace(/^\.\/(.*)\.js$/, '$1');
  return moduleMap[path];
}

function compileDirectory(basePath, workingPath) {
  var paths = fs.readdirSync(basePath + workingPath);

  paths.forEach(function (filePath) {
    var fullPath = basePath + workingPath + filePath,
      modulePath = workingPath + filePath;

    var stats = fs.lstatSync(fullPath);

    if (stats.isDirectory()) {
      compileDirectory(basePath, modulePath + '/');
    } else if (stats.isFile() && filePath.indexOf('.js') === filePath.length - 3) {
      var input = fs.readFileSync(fullPath, 'utf-8');

      var compiler = new Compiler(input, getModuleNameFromPath(modulePath), {
        imports: moduleMap
      });
      output += compiler.toGlobals() + '\n\n';
    }
  });
}

compileDirectory('./src/', './');

fs.writeFileSync('ember.prod.js', output);