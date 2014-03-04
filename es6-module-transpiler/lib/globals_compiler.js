import AbstractCompiler from './abstract_compiler';
import SourceModifier from './source_modifier';

function dependencyMap(arr, map, callback, context) {
  var out = [], item, indexOfItem;

  for (var i = 0, l = arr.length; i < l; i++) {
    item = map[arr[i]];
    indexOfItem = out.indexOf(item);

    if (indexOfItem === -1) {
      out.push(item);
      indexOfItem = out.length - 1;
    }

    callback.call(context, arr[i], item, indexOfItem);
  }

  return out;
}

class GlobalsCompiler extends AbstractCompiler {
  stringify() {
    var string = this.string.toString();  // string is actually a node buffer
    this.source = new SourceModifier(string);

    this.map = [];

    this.dependencyNames = dependencyMap(this.dependencyNames, this.options.imports, function(original, mapped, idx) {
      this.map[original] = idx+1;
    }, this);

    var out = this.buildPreamble(this.exports.length > 0);

    this.buildImports();
    this.buildExports();

    if (!this.options.imports) this.options.imports = {};
    if (!this.options.global) this.options.global = "window";

    out += this.indentLines();
    out += "\n})";
    out += this.buildSuffix();
    out += ";";

    return out;
  }

  buildPreamble() {
    var out = "",
        dependencyNames = this.dependencyNames;

    out += "(function(";

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      out += `__dependency${idx+1}__`;
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ") {\n";

    out += '  "use strict";\n';

    return out;
  }

  buildSuffix() {
    var dependencyNames = this.dependencyNames;
    var out = "(";

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      var name = dependencyNames[idx];
      out += this.options.imports[name] || name;
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ")";
    return out;
  }

  doModuleImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;\n`;
  }

  doBareImport(name) {
    return "";
  }

  doDefaultImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;\n`;
  }

  doNamedImport(name, dependencyName, alias) {
    return `var ${alias} = __dependency${this.map[dependencyName]}__.${name};\n`;
  }

  doExportSpecifier(name, reexport) {
    if (reexport) {
      return `${this.moduleName}.${name} = __dependency${this.map[reexport]}__.${name};\n`;
    }
    return `${this.moduleName}.${name} = ${name};\n`;
  }

  doExportDeclaration(name) {
    return `\n${this.moduleName}.${name} = ${name};`;
  }

  doDefaultExport(identifier) {
    if (identifier === null) {
      throw new Error("The globals compiler does not support anonymous default exports.");
    }
    return `${this.moduleName}.${identifier} = `;
  }

  doImportSpecifiers(import_, idx) {
    var dependencyName = import_.source.value;
    var replacement = "";
    for (var specifier of import_.specifiers) {
      var alias = specifier.name ? specifier.name.name : specifier.id.name;
      replacement += this.doNamedImport(specifier.id.name, dependencyName, alias);
    }
    return replacement;
  }

}

export default GlobalsCompiler;
