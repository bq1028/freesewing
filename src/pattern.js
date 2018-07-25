import { macroName } from "./utils";
import part from "./part";
import point from "./point";
import path from "./path";
import snippet from "./snippet";
import svg from "./svg";
import hooks from "./hooks";

export default function pattern(config = false) {
  // Allow no-config patterns
  if (!config) {
    this.config = {
      parts: ["part"],
      measurements: {},
      options: {}
    };
  } else {
    this.config = config;
  }
  if (
    typeof config.parts === "undefined" ||
    !config.parts ||
    config.parts.length < 1
  ) {
    throw "Could not create pattern: You should define at least one part in your pattern config";
  }

  // Constructors
  this.point = point;
  this.path = path;
  this.snippet = snippet;

  // Svg and hooks instance
  this.svg = new svg(this);
  this.hooks = new hooks();

  // Data containers
  this.settings = {};
  this.values = {};
  this.parts = {};

  // Context object to pass around
  this.context = new Object();

  for (let id of config.parts) {
    this.parts[id] = new part(id);
  }
  this.context.parts = this.parts;
  this.options = {};
  if (typeof config.options !== "undefined" && config.options.length > 0) {
    for (let conf of config.options) {
      if (conf.type === "percentage") this.options[conf.id] = conf.val / 100;
      else this.options[conf.id] = conf.val;
    }
  }
  this.context = {
    parts: this.parts,
    config: this.config,
    settings: this.settings,
    options: this.options,
    values: this.values
  };
  for (let id of config.parts) {
    this.parts[id].context = this.context;
  }
}

/**
 * @throws Will throw an error when called
 */
pattern.prototype.draft = function() {
  throw Error(
    "You have to implement the draft() method in your Pattern instance."
  );
};

pattern.prototype.render = function() {
  this.hooks.attach("preRenderSvg", this.svg);
  this.hooks.attach("postRenderSvg", this.svg);
  //this.hooks.attach('insertText', this.svg);

  return this.svg.render(this);
};

pattern.prototype.on = function(hook, method) {
  if (typeof this.hooks._hooks[hook] === "undefined") {
    this.hooks._hooks[hook] = [];
  }
  this.hooks._hooks[hook].push(method);
};

pattern.prototype.with = function(plugin) {
  if (plugin.hooks) this.loadPluginHooks(plugin);
  if (plugin.macros) this.loadPluginMacros(plugin);

  return this;
};

pattern.prototype.loadPluginHooks = function(plugin) {
  for (let hook of this.hooks.all) {
    if (typeof plugin.hooks[hook] === "function") {
      this.on(hook, plugin.hooks[hook]);
    }
  }
};

pattern.prototype.loadPluginMacros = function(plugin) {
  for (let macro in plugin.macros) {
    console.log("loading ", macro);
    if (typeof plugin.macros[macro] === "function") {
      console.log(macro, "is a function");
      this.macro(macro, plugin.macros[macro]);
    }
  }
};

pattern.prototype.macro = function(key, method) {
  let name = macroName(key);
  this.on(name, method);
  for (let partId in this.parts) {
    console.log(`Attaching macro ${name} to part ${partId}`);
    let part = this.parts[partId];
    part[name] = () => null;
    this.hooks.attach(name, part);
  }
};