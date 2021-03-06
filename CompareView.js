/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, Mustache */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {
  "use strict";
  var FileUtils = brackets.getModule("file/FileUtils"),
      DocumentManager = brackets.getModule("document/DocumentManager"),
      ThemeView       =   brackets.getModule("view/ThemeView"),
      ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils");
  
  var Utils = require("Utils").utils;
    
    var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
    var templateString = "<div id='{{ id }}-editor-{{ layout}}' class='compare-editor-{{ layout }}'>" +
                            "<textarea id='{{ id }}-area' class='compare-content'>{{ text }}</textarea>" +
                            "<!--<div id='' class='compare-status'> {{ title }} </div>-->" +
                         "</div>";

    var offset = -1;
    
    function View(options) {
      this.id = options.id;
      this.title = options.title || "";
      this.text = options.text || "";
      this.lineNumbers = options.lineNumbers || true;
      this.lineWrapping = options.lineWrapping || true;
      this.mode = options.mode || View.MODES.js;
      
      // markers
      this.lineMarker = options.lineMarker || null;
      this.characterMarker = options.charactermarker || null;
      
        
        // Brackets file object
        this.file = options.file || null;
        this.doc = null;
        // Codemirror  object
        this.cm = null;
        
        // 
        this.emitScrollEvents = true;
        this.markedLines = {};

        // Events
        this.onKeyPressed = options.onKeyPressed || function() {};
        this.onScroll = options.onScroll || function() { };
        this.onViewportChange = options.onViewportChange || function() {};
        this.onFocus = options.onFocus || function() {};
        this.onBlur = options.onBlur || function() {};
        this.onFileSave = options.onFileSave || function() {};

        this.onKeyPressed = this.onKeyPressed.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onViewportChange = this.onViewportChange.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onFileSave = this.onFileSave.bind(this);
        
        this.initialize = this.initialize.bind(this);
        this.load   = this.load.bind(this);
        this.refresh = this.refresh.bind(this);
        this.setText = this.setText.bind(this);
        this.getText = this.getText.bind(this);
        this.render = this.render.bind(this);
        this.markGutter = this.markGutter.bind(this);
        this.markLine = this.markLine.bind(this);
        this.markLines = this.markLines.bind(this);
        this.getLine = this.getLine.bind(this);
        this.removeAllLines = this.removeAllLines.bind(this);
        this.scrollIntoView = this.scrollIntoView.bind(this);
        
        this._emitScrollEvent = this._emitScrollEvent.bind(this);
      
        // Cache the lines highlighted lines
        this._lines = null;
        // Theme 
        this._theme = '';
      
        this.initialize();
    }

    View.MODES = {
        html : "text/html",
        css  : "css",
        js   : "javascript"
    };

    View.markers = {
        added: {
          className: "added",
          color: "#00784A",
          value: "+",
          bg_light: "#CEFCEA",
          bg_dark: "#2D3E2A"
        },
        removed: {
          className: "removed",
          color: "#f00", //"#8E0028",
          value: "-",
          bg_light: "#FCCEDB",
          bg_dark:"#3A1E19"
        }
    };

    View.prototype.initialize = function() {
        this.setText(this.text);
    };

    View.prototype.load = function() {
       this.cm = CodeMirror.fromTextArea(document.querySelector("#" + this.id + "-area"), {
            mode: this.mode,
            lineNumbers: this.lineNumbers,
            lineWrapping: this.lineWrapping,
            gutters: ["CodeMirror-linenumbers", "compare-gutter"]
        });
        this.loadEvents();
    };

    View.prototype.loadEvents = function() {
        this.cm.on("change", Utils.debounce(this.onKeyPressed, 200));
        this.cm.on("scroll", this._emitScrollEvent);
        this.cm.on("viewportChange", this.onViewportChange);
        this.cm.on("focus", this.onFocus);
        this.cm.on("blur", this.onBlur);
    };

    View.prototype.destroyEvents = function() {
        this.cm.off("change", Utils.debounce(this.onKeyPressed, 200));
        this.cm.off("scroll", this._emitScrollEvent);
        this.cm.off("viewportChange", this.onViewportChange);
        this.cm.off("focus", this.onFocus);
        this.cm.off("blur", this.onBlur);
    };
    
    View.prototype._emitScrollEvent = function() {
        if (this.emitScrollEvents && typeof this.onScroll == "function") {
            this.onScroll();
        }
    };

    View.prototype.markLine = function(line, className) {
        var mark = this.cm.addLineClass(line, 'background', className);
        if (!this.markedLines[line]) {
            this.markedLines[line] = mark;
        }
    };
  
  View.prototype.markLines = function(lines) {
    this.clearGutter();
    this.removeAllLines();
    var self = this;
    var lineClassName = self.lineMarker.className + '-' + this._theme;
    var bgColor = self.lineMarker['bg_' + this._theme];
    this._lines = lines;
    
    lines.forEach(function(line) {
      self.markGutter(line, self.lineMarker.color, self.lineMarker.value, bgColor);
      self.markLine(line, lineClassName);
    });
  };
    
    // Sets up a brackets document
    View.prototype.setDocument = function(file){
        var promise = DocumentManager.getDocumentForPath(file.fullPath)
            .done(function(doc) { 
                this.doc = doc;
                console.log(this.doc);
            });
    };
    /**
     * Scrolls  the view based of the data objects passed in
     * Based on Codemirrors "scrollIntoView" options
     */
    View.prototype.scrollIntoView = function(o) {
        this.cm.scrollIntoView(o);
    };
        
    View.prototype.getScrollInfo = function() {
        return this.cm.getScrollInfo();
    };
    
    View.prototype.removeAllLines = function() {
        for (var line in this.markedLines) {
          if (this.markedLines.hasOwnProperty(line)) {
            this.removeLine(this.markedLines[line]);
          }
        }
    };

    View.prototype.removeLine = function(mark) {
        this.cm.removeLineClass(mark, "background", mark.bgClass);
        delete this.markedLines[mark.lineNo()];
    };

    View.prototype.markGutter = function(line, color, value, bgColor) {
        var info = this.cm.lineInfo(line);
        this.cm.setGutterMarker(line, "compare-gutter", info.gutterMarkers ? null : Utils.createMarker(color, value, bgColor));
    };

    View.prototype.clearGutter = function() {
        this.cm.clearGutter("compare-gutter");
    };
  
    View.prototype.getLine = function(line) {
      return this.cm.getLine(line);
    };

    View.prototype.markText = function(from, to, className) {
      this.cm.markText({ 
        line: from.line, 
        ch: from.ch 
      }, {
        line: to.line, 
        ch: to.ch 
      }, { className: className });
    };
    
    View.prototype.unmarkAllText = function(marker) {
        $("." + marker).removeClass(marker); 
    };

    View.prototype.refresh = function() {
        if (this.cm) {
            this.cm.refresh();
        }
    };
    
    View.prototype.setTheme = function() {
      ThemeView.updateThemes(this.cm);
      this._theme = this.getThemeType() > 125 ? 'light' : 'dark';
      if (this._lines) {
        this.markLines(this._lines);
      }
    };
  
    // Returns if the the theme is a dark/light theme
    View.prototype.getThemeType = function() {
      var rgb = $('.CodeMirror-scroll').first().css('background-color');
      return Utils.colorBrightness(Utils.parseColor(rgb));
    };

    View.prototype.setText = function(text) {
        if (this.cm) {
            this.cm.setValue(this.text = text);
        }
    };

    View.prototype.getText = function() {
        return this.cm ? this.cm.getValue() : "";
    };
    
    View.prototype.saveFile = function() {
      Utils.saveFileToDisk(this.file, this.getText(), true)
        .done(this.onFileSave)
        .fail(function (err) {
          console.log(err);
        });
    };

    View.prototype.destroy = function() {
        this.destroyEvents();
        this.id = null;
        this.cm = null;
        this.text = "";
        this.lineNumbers = true;
        this.lineWrapping = true;
        this.mode = View.MODES.js;
    };

    View.prototype.render = function(layout) {
        return Mustache.render(templateString, { 
            id: this.id, 
            title: this.title, 
            text: this.text, 
            layout: layout 
        });
    };

    exports.CompareView = View;
});
