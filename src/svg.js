import attributes from "./attributes";
import * as hooklib from "hooks";
import hooks from "./hooks";

import { version } from "../package.json";

function svg(pattern) {
  this.openGroups = [];
  this.freeId = 0;
  this.body = "";
  this.style = "";
  this.script = "";
  this.header = "";
  this.footer = "";
  this.defs = "";
  this.pattern = pattern; // Needed to expose pattern to hooks
  this.prefix = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
  this.attributes = new attributes();
  this.attributes.add("xmlns", "http://www.w3.org/2000/svg");
  this.attributes.add("xmlns:svg", "http://www.w3.org/2000/svg");
  this.attributes.add("xmlns:xlink", "http://www.w3.org/1999/xlink");
  this.attributes.add(
    "xmlns:freesewing",
    "http://freesewing.org/namespaces/freesewing"
  );
  this.attributes.add("freesewing", version);
  this.hooks = hooks.all;
  for (let k in hooklib) this[k] = hooklib[k];
  for (let k in this.hooks) this.hook(k, this[k]);
}

/** Method to attach preRenderSvg hooks on */
svg.prototype.preRenderSvg = function() {};

/** Method to attach postRenderSvg hooks on */
svg.prototype.postRenderSvg = function() {};

/** Method to attach insertText hooks on */
svg.prototype.insertText = function() {};

/** Renders a draft object as SVG */
svg.prototype.render = function(pattern) {
  this.preRenderSvg();
  this.svg = this.prefix;
  this.svg += this.renderComments(this.header);
  this.svg += this.renderSvgTag(pattern);
  this.svg += this.renderStyle();
  this.svg += this.renderScript();
  this.svg += this.renderDefs();
  this.svg += this.openGroup("draftContainer");
  for (let partId in pattern.parts) {
    let part = pattern.parts[partId];
    if (part.render) {
      this.svg += this.openGroup(part.id, part.attributes);
      this.svg += this.renderPart(part);
      this.svg += this.closeGroup();
    }
  }
  this.svg += this.closeGroup();
  this.svg += this.nl() + "</svg>";
  this.svg += this.renderComments(this.footer);
  this.postRenderSvg();
  return this.svg;
};

/** Returns SVG code for the opening SVG tag */
svg.prototype.renderSvgTag = function(pattern) {
  let svg = "<svg";
  this.indent();
  svg += this.nl() + this.attributes.render();
  this.outdent();
  svg += this.nl() + ">" + this.nl();

  return svg;
};

/** Returns SVG code for the style block */
svg.prototype.renderStyle = function() {
  let svg = '<style type="text/css"> <![CDATA[ ';
  this.indent();
  svg += this.nl() + this.style;
  this.outdent();
  svg += this.nl() + "]]>" + this.nl() + "</style>" + this.nl();
  return svg;
};

/** Returns SVG code for the script block */
svg.prototype.renderScript = function() {
  let svg = '<script type="text/javascript"> <![CDATA[';
  this.indent();
  svg += this.nl() + this.script;
  this.outdent();
  svg += this.nl() + "]]>" + this.nl() + "</script>" + this.nl();

  return svg;
};

/** Returns SVG code for the defs block */
svg.prototype.renderDefs = function() {
  let svg = '<defs id="defs">';
  this.indent();
  svg += this.nl() + this.defs;
  this.outdent();
  svg += this.nl() + "</defs>" + this.nl();

  return svg;
};

/** Returns SVG code for a comment block */
svg.prototype.renderComments = function(comments) {
  return (
    this.nl() + this.nl() + "<!--" + this.nl() + comments + this.nl() + "-->"
  );
};

/** Returns SVG code for a Part object */
svg.prototype.renderPart = function(part) {
  let svg = "";
  for (let key in part.paths) {
    let path = part.paths[key];
    if (path.render) svg += this.renderPath(path);
  }
  for (let key in part.points) {
    if (part.points[key].attributes.get("data-text")) {
      svg += this.renderPoint(part.points[key]);
    }
  }
  for (let key in part.snippets) {
    let snippet = part.snippets[key];
    svg += this.renderSnippet(snippet);
  }

  return svg;
};

/** Returns SVG code for a Point object */
svg.prototype.renderPoint = function(point) {
  let svg = "";
  if (point.attributes.get("data-text")) svg += this.renderText(point);

  return svg;
};

/** Returns SVG code for a Path object */
svg.prototype.renderPath = function(path) {
  if (!path.attributes.get("id")) path.attributes.add("id", this.getUid());
  path.attributes.add("d", path.asPathstring());

  return `${this.nl()}<path ${path.attributes.render()} />${this.renderPathText(
    path
  )}`;
};

svg.prototype.renderPathText = function(path) {
  let text = path.attributes.get("data-text");
  if (!text) return false;
  let attributes = path.attributes.renderIfPrefixIs("data-text-");
  // Sadly aligning text along a patch can't be done in CSS only
  let offset = "";
  let align = path.attributes.get("data-text-class");
  if (align && align.indexOf("center") > -1) offset = ' startOffset="50%" ';
  else if (align && align.indexOf("right") > -1)
    offset = ' startOffset="100%" ';
  let svg = this.nl() + "<text>";
  this.indent();
  svg += `<textPath xlink:href="#${path.attributes.get(
    "id"
  )}" ${offset}><tspan ${attributes}>${text}</tspan></textPath>`;
  this.outdent();
  svg += this.nl() + "</text>";

  return svg;
};

svg.prototype.renderText = function(point) {
  let text = point.attributes.get("data-text");
  if (!text) return false;

  point.attributes.add("data-text-x", point.x);
  point.attributes.add("data-text-y", point.y);
  let attributes = point.attributes.renderIfPrefixIs("data-text-");
  let svg = `${this.nl()}<text ${point.attributes.renderIfPrefixIs(
    "data-text-"
  )}>`;
  this.indent();
  svg += `<tspan>${text}</tspan>`;
  this.outdent();
  svg += this.nl() + "</text>";

  return svg;
};

/** Returns SVG code for a snippet */
svg.prototype.renderSnippet = function(snippet) {
  let svg = this.nl();
  svg += `<use x="${snippet.anchor.x}" y="${snippet.anchor.y}" `;
  svg += `xlink:href="#${snippet.def}" ${snippet.attributes.render()}>`;
  if (snippet.description) {
    svg += `<title>${snippet.description}</title>`;
  }
  svg += "</use>";

  return svg;
};

/** Returns SVG code to open a group */
svg.prototype.openGroup = function(id) {
  let svg = this.nl() + this.nl();
  svg += `<!-- Start of group #${id} -->`;
  svg += this.nl();
  svg += `<g id="${id}">`;
  this.indent();
  this.openGroups.push(id);

  return svg;
};

/** Returns SVG code to close a group */
svg.prototype.closeGroup = function() {
  this.outdent();

  return `${this.nl()}</g>${this.nl()}<!-- end of group #${this.openGroups.pop()} -->`;
};

/** Returns a linebreak + identation */
svg.prototype.nl = function() {
  return "\n" + this.tab();
};

/** Returns indentation */
svg.prototype.tab = function() {
  let space = "";
  for (let i = 0; i < this.tabs; i++) {
    space += "  ";
  }

  return space;
};

/** Increases indentation by 1 */
svg.prototype.indent = function() {
  this.tabs += 1;
};

/** Decreases indentation by 1 */
svg.prototype.outdent = function() {
  this.tabs -= 1;
};

/** Returns an unused ID */
svg.prototype.getUid = function() {
  this.freeId += 1;

  return "" + this.freeId;
};

export default svg;