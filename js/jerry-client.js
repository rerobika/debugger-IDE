/**
*   Packages sent by the server to the client.
*/
const ServerPackageType = {
  JERRY_DEBUGGER_CONFIGURATION : 1,
  JERRY_DEBUGGER_PARSE_ERROR : 2,
  JERRY_DEBUGGER_BYTE_CODE_CP : 3,
  JERRY_DEBUGGER_PARSE_FUNCTION : 4,
  JERRY_DEBUGGER_BREAKPOINT_LIST : 5,
  JERRY_DEBUGGER_BREAKPOINT_OFFSET_LIST : 6,
  JERRY_DEBUGGER_SOURCE_CODE : 7,
  JERRY_DEBUGGER_SOURCE_CODE_END : 8,
  JERRY_DEBUGGER_SOURCE_CODE_NAME : 9,
  JERRY_DEBUGGER_SOURCE_CODE_NAME_END : 10,
  JERRY_DEBUGGER_FUNCTION_NAME : 11,
  JERRY_DEBUGGER_FUNCTION_NAME_END : 12,
  JERRY_DEBUGGER_RELEASE_BYTE_CODE_CP : 13,
  JERRY_DEBUGGER_MEMSTATS_RECEIVE : 14,
  JERRY_DEBUGGER_BREAKPOINT_HIT : 15,
  JERRY_DEBUGGER_EXCEPTION_HIT : 16,
  JERRY_DEBUGGER_EXCEPTION_STR : 17,
  JERRY_DEBUGGER_EXCEPTION_STR_END : 18,
  JERRY_DEBUGGER_BACKTRACE : 19,
  JERRY_DEBUGGER_BACKTRACE_END : 20,
  JERRY_DEBUGGER_EVAL_RESULT : 21,
  JERRY_DEBUGGER_EVAL_RESULT_END : 22,
  JERRY_DEBUGGER_EVAL_ERROR : 23,
  JERRY_DEBUGGER_EVAL_ERROR_END : 24
};

/**
* Packages sent by the client to the server.
*/
const ClientPackageType = {
  JERRY_DEBUGGER_FREE_BYTE_CODE_CP : 1,
  JERRY_DEBUGGER_UPDATE_BREAKPOINT : 2,
  JERRY_DEBUGGER_EXCEPTION_CONFIG : 3,
  JERRY_DEBUGGER_MEMSTATS : 4,
  JERRY_DEBUGGER_STOP : 5,
  JERRY_DEBUGGER_CONTINUE : 6,
  JERRY_DEBUGGER_STEP : 7,
  JERRY_DEBUGGER_NEXT : 8,
  JERRY_DEBUGGER_GET_BACKTRACE : 9,
  JERRY_DEBUGGER_EVAL : 10,
  JERRY_DEBUGGER_EVAL_PART : 11
};

/**
* Client connection.
*/
var client = {
  socket : null,
  debuggerObj : null,
};

/**
* Core enviroment variables.
*/
var env = {
  editor : ace.edit("editor"),
  EditSession : null,
  evalResult : null,
  commandInput : $("#command-line-input")
};

/**
* Costum keybindings.
*/
var keybindings = {
  ace : null,
  vim : "ace/keyboard/vim",
  emacs : "ace/keyboard/emacs",
  custom : null, // Create own bindings here.
};
/**
* Keycodes
*/
const keys =
{
  upArrow : 38,
  downArrow : 40
};
/**
* Basic utilities.
*/
function Util() {
  return this;
}

/**
* Clears the given html element content.
*
* @param {object} element
*/
Util.prototype.clearElement = function(element) {
  element.empty();
};

/**
* Scrolls down to the bottom of the given element.
*
* @param {object} element
*/
Util.prototype.scrollDown = function(element) {
  element.scrollTop(element.prop("scrollHeight"));
};


/**
* Simple logger which is writes into the given DOM element.
*
* @param {object} panel
*/
function Logger (panel) {
  this.panel = panel;
  this.line = $("<span class='data'></span>");
  this.util = new Util();

  return this;
}

/**
* Appends the given message into the panel as a simple info.
*
* @param {string} message
*/
Logger.prototype.info = function (message) {
  this.panel.append(this.line.clone().addClass("log-info").text(message));
  this.util.scrollDown(this.panel);
};

/**
* Appends the given message into the panel as a warning.
*
* @param {string} message
*/
Logger.prototype.warning = function (message) {
  message = "WARNING: " + message;
  this.panel.append(this.line.clone().addClass("log-warning").text(message));
  this.util.scrollDown(this.panel);
};

/**
* Appends the given message into the panel as an error.
*
* @param {string} message
*/
Logger.prototype.error = function(message) {
  message = "ERROR: " + message;
  this.panel.append(this.line.clone().addClass("log-error").text(message));
  this.util.scrollDown(this.panel);
};

/**
* Appends the given data into the panel
* as a debug information in JSON format,
* or puts a new dom element into it if the dom parametere is true.
*
* @param {string} message
* @param {mixed} data
* @param {boolean} dom
*/
Logger.prototype.debug = function(message, data, dom = false) {
  if (dom) {
    this.panel.append(this.line.clone().addClass("log-debug-dom").text(message));
    this.panel.append($(data));
  } else {
    message = "DEBUG LOG: " + message + JSON.stringify(data);
    this.panel.append(this.line.clone().addClass("log-debug").text(message));
  }
  this.util.scrollDown(this.panel);
};


/**
* Session handler for the editor files.
*/
function Session(editor) {
  this.nextID = 0;
  this.activeID = 0;
  this.data = [];
  //Command line variables
  this.usedCommandList = ["commands: "];
  this.usedCommandCounter = -1;
  // Chart variables
  this.breakpointInformationToChart = null;

  this.breakpointIDs = [];
  this.lastBreakpoint = null;

  this.marker = {
    executed : null,
    lastMarked : null,
    breakpointLine : null,
    lastMarkedBreakpointLine : null,
  };

  this.isWelcomeTabActive = true;
  this.tabType = {
    welcome : 0,
    work : 1,
  };

  this.editor = editor;
  this.util = new Util();

  return this;
}

/**
* Returns the current nextID value.
*
* @return {integer}
*/
Session.prototype.getNextID = function() {
  return this.nextID;
};

/**
* Returns the current activeID value.
*
* @return {integer}
*/
Session.prototype.getActiveID = function() {
  return this.activeID;
};

/**
* Returns the inserted breakpoint IDs.
*
* @return {array}
*/
Session.prototype.getBreakpointIDs = function() {
  return this.breakpointIDs;
};

/**
* Returns the last catched breakpoint's ID.
*
* @return {integer}
*/
Session.prototype.getLastBreakpoint = function() {
  return this.lastBreakpoint;
};

/**
* Sets the lastBreakpoint to the given value.
*
* @param {integer} last
*/
Session.prototype.setLastBreakpoint = function(last) {
  this.lastBreakpoint = last;
};

/**
* Creates a new session based on the given parameters.
*
* @param {string} name The filename.
* @param {string} data The file content.
* @param {integer} tab The tab type.
* @param {boolean} saved The file saved status.
*/
Session.prototype.createNewSession = function(name, data, tab, saved) {
  var saved = saved || true;
  var tab = tab || filetab.work;
  // Create a new document for the editor from the trimmed data.
  var doc = new env.Document(data.trim());
  // Create a new javascript mode session from the document.
  var eSession = new env.EditSession(doc, "ace/mode/javascript");

  // Store the edit session.
  this.data.push({
    id : ++this.nextID,
    saved : saved,
    name : name,
    editSession : eSession
  });

  session.updateTabs(this.nextID, name, tab);
  this.switchSession(this.nextID);
};

Session.prototype.setWelcomeSession = function() {
  this.isWelcomeTabActive = true;

  // If this is a fresh start.
  if (this.getSessionById(0) == null)
  {
    var welcome = "/**\n" +
                  "* JerryScript Remote Debugger WebIDE.\n" +
                  "*/\n";

    var eSession = new env.EditSession(welcome, "ace/mode/javascript");
    this.data.push({
      id: 0,
      saved : true,
      name: "welcome.js",
      editSession: eSession
    });
  }

  session.updateTabs(0, "welcome.js", session.tabType.welcome);
  this.switchSession(0);

  // Enable the read only mode in the editor.
  this.editor.setReadOnly(true);
}

/**
* Switches the editor session.
*
* @param {integer} id The id of the desired session.
*/
Session.prototype.switchSession = function(id) {
  // Select the right tab on the tabs panel.
  this.selectTab(id);

  // Marked the selected session as an active session.
  this.activeID = id;
  // Change the currently session through the editor's API.
  env.editor.setSession(this.getSessionById(id));

  // Refresh the available breakpoint lines in the editor
  // based on the new sesison.
  if (client.debuggerObj &&
      env.lastBreakpoint != null &&
      env.lastBreakpoint.func.sourceName.endsWith(session.getSessionNameById(id)))
  {
    this.highlightCurrentLine(env.lastBreakpoint.line);
  }

  // Disable the read only in the editor.
  if (env.editor.getReadOnly())
  {
    env.editor.setReadOnly(false);
  }

  // If the there is no connecton then delete the inserted breakpoints.
  if (!client.debuggerObj)
  {
    this.deleteBreakpointsFromEditor();
  }
}

/**
* Returns a session name based on the given ID.
*
* @param {integer} id
* @return {mixed} Returns the session name as string if exists, null otherwise.
*/
Session.prototype.getSessionNameById = function(id) {
  for (var i in this.data)
  {
    if (this.data[i].id == id)
    {
      return this.data[i].name;
    }
  }

  return null;
}

/**
* Returns a id based on the given name.
*
* @param {string} name
* @return {mixed} Returns the session id if exists, null otherwise.
*/
Session.prototype.getSessionIdbyName = function(name) {
  for (var i in this.data)
  {
    if (name.endsWith(this.data[i].name))
    {
      return this.data[i].id;
    }
  }

  return null;
}

/**
* Returns an edit session based on the given id.
*
* @param {integer} id
* @return {mixed} Returns the session if exists, null otherwise.
*/
Session.prototype.getSessionById = function(id) {
  for (var i in this.data)
  {
    if (this.data[i].id == id)
    {
      return this.data[i].editSession;
    }
  }

  return null;
}

/**
* Removes a session from tha inner array,
* based on a given attribute identifier and a value pair.
*
* @param {string} attr The name of the attribute.
* @param {mixed} value The value of the attribute.
*/
Session.prototype.deleteSessionByAttr = function(attr, value) {
  var i = this.data.length;
  while(i--)
  {
    if(this.data[i]
       && this.data[i].hasOwnProperty(attr)
       && this.data[i][attr] === parseInt(value))
    {
      this.data.splice(i,1);
    }
  }
}

/**
* Returns the left or the right neighbour of a session.
* This is possible, because we store the sessions "in a straight line".
* The 0 session is the welcome session.
*
* @param {integer} id The base session id.
* @return {integer} Return the neighbour id if exists one, 0 otherwise.
*/
Session.prototype.getSessionNeighbourById = function(id) {
  for (var i = 1; i < this.data.length; i++)
  {
    if (this.data[i].id === parseInt(id))
    {
      if (this.data[i - 1] !== undefined && this.data[i - 1].id !== 0)
      {
        return this.data[i - 1].id;
      }
      if (this.data[i + 1] !== undefined)
      {
        return this.data[i + 1].id;
      }
    }
  }

  return 0;
}

/**
* Searches the given name in the stored sessions.
*
* @param {string} name The searched session name.
* @return {boolean} Returns true if the given name is exists, false otherwise.
*/
Session.prototype.sessionNameCheck = function(name) {
  var log = log || false;
  if (this.getSessionIdbyName(name) === null)
  {
    return false;
  }

  return true;
}

/**
* Marks every valid, available breakpoint line in the current session file.
*/
Session.prototype.markBreakpointLines = function() {
  if (client.debuggerObj)
  {
    var lines = this.getLinesFromRawData(client.debuggerObj.getBreakpointLines());

    if (lines.length != 0)
    {
      lines.sort(function(a, b){ return a - b} );

      for (var i = this.editor.session.getLength(); i > 0; i--) {
        if (lines.includes(i) === false)
        {
          this.editor.session.removeGutterDecoration(i - 1, "invalid-gutter-cell");
          this.editor.session.addGutterDecoration(i - 1, "invalid-gutter-cell");
        }
      }
    }
  }
}

/**
* Returns every valid, available line in the currently active session.
*
* @param {object} raw
* @return {array} The array of the file lines.
*/
Session.prototype.getLinesFromRawData = function(raw)
{
  var lines = [];
  var sessionName = this.getSessionNameById(this.activeID);

  for (var i in raw)
  {
    if (raw[i].sourceName.endsWith(sessionName))
    {
      lines.push(raw[i].line);
    }
  }

  return lines;
}

/**
* Highlights the current progress line in the editor session with a border.
*
* @param {integer} lineNumber The selected line.
*/
Session.prototype.highlightCurrentLine = function(lineNumber) {
  lineNumber--;
  this.unhighlightLine();
  var Range = ace.require("ace/range").Range;
  this.marker.executed = this.editor.session.addMarker(new Range(lineNumber, 0, lineNumber, 1), "execute-marker", "fullLine");

  this.editor.session.addGutterDecoration(lineNumber, "execute-gutter-cell-marker");
  this.editor.scrollToLine(lineNumber, true, true, function () {});
  this.marker.lastMarked = lineNumber;
}

/**
* Removes the highlight (border) from the last highlighted line.
*/
Session.prototype.unhighlightLine = function() {
  this.editor.getSession().removeMarker(this.marker.executed);
  this.editor.session.removeGutterDecoration(this.marker.lastMarked, "execute-gutter-cell-marker");
}

/**
* Highlights the current breakpoint line in the editor session with a border.
*
* @param {integer} lineNumber The selected line.
*/
Session.prototype.highlightBreakPointLine = function(lineNumber) {
  lineNumber--;
  this.unhighlightBreakpointLine();
  var Range = ace.require("ace/range").Range;
  this.marker.breakpointLine = this.editor.session.addMarker(new Range(lineNumber, 0, lineNumber, 1), "breakpoint-marker", "fullLine");

  this.editor.session.addGutterDecoration(lineNumber, "breakpoint-gutter-cell-marker");
  this.editor.scrollToLine(lineNumber, true, true, function () {});
  this.marker.lastMarkedBreakpointLine = lineNumber;
}

/**
* Removes the highlight (border) from the last highlighted breakpoint line.
*/
Session.prototype.unhighlightBreakpointLine = function() {
  this.editor.getSession().removeMarker(this.marker.breakpointLine);
  this.editor.session.removeGutterDecoration(this.marker.lastMarkedBreakpointLine, "breakpoint-gutter-cell-marker");
}

/**
* Deletes the breakpoints from the session and from the editor.
*/
Session.prototype.deleteBreakpointsFromEditor = function() {
  for (var i in this.breakpointIDs) {
    this.editor.session.clearBreakpoint(i);
  }

  this.util.clearElement($("#breakpoints-content"));
}

/**
* Appends the given tab into the session tabs panel.
*
* @param {integer} id
* @param {string} name
* @param {integer} type
*/
Session.prototype.updateTabs = function(id, name, type) {
  if (this.isWelcomeTabActive && type === this.tabType.work)
  {
    $(".session-tabs").empty();
    this.isWelcomeTabActive = false;
  }

  var tab = "";

  tab += "<a href='javascript:void(0)' class='tablinks' id='tab-" + id + "'> " + name;
  if (type == this.tabType.work)
  {
    tab += "<i class='fa fa-times' aria-hidden='true'></i>";
  }
  tab += "</a>";

  $(".session-tabs").append(tab);

  $("#tab-" + id).on("click", $.proxy(function()
  {
    this.switchSession(id);
  }, this));

  $("#tab-" + id + " i").on("click", $.proxy(function()
  {
    this.closeTab(id);
  }, this));
}

/**
* Sets the selected tab to active state in the tab panel.
*
* @param {integer} id
*/
Session.prototype.selectTab = function(id)
{
  // Get all elements with class="tablinks" and remove the class "active"
  var tablinks = $(".tablinks");
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Set the current tab active.
  $("#tab-" + id)[0].className += " active";
}

/**
* Closes the selected tab and deletes that from the sessions.
*
* @param {integer} id
*/
Session.prototype.closeTab = function(id)
{
  // Remove the sesison tab from the session bar.
  $("#tab-" + id).remove();

  // If the selected session is the current session
  // let's switch to an other existing session.
  if (id == this.getActiveID())
  {
    var nID = this.getSessionNeighbourById(id);
    if (nID != 0)
    {
      this.switchSession(nID);
    }
    else
    {
      this.setWelcomeSession();
    }
  }

  // Delete the selected sesison.
  this.deleteSessionByAttr("id", id);
}

/**
* Functions for improve the user experience :).
*/
function Surface() {
  this.CSState = {
    stop : 0,
    continue : 1
  };

  this.continueActive = false;

  this.numberOfHiddenPanel = 0;
  this.lastKnownTargetCol = 6;
  this.lastKnownNextCol = 6;

  this.isBacktracePanelActive = true;

  this.util = new Util();
}
/**
* Continue execution dependency
*/
Surface.prototype.continueCommand = function () {
  this.continueStopButtonState(surface.CSState.stop);
  $("#step-button").addClass("disabled");
  $("#next-button").addClass("disabled");
  if (activeChart && !this.continueActive)
  {
    this.continueActive = true;
    client.debuggerObj.sendResumeExec(ClientPackageType.JERRY_DEBUGGER_NEXT);
  }
  else
  {
    client.debuggerObj.sendResumeExec(ClientPackageType.JERRY_DEBUGGER_CONTINUE);
  }
};

/**
* Stop execution
*/
Surface.prototype.stopCommand = function () {
  this.continueStopButtonState(surface.CSState.continue);
  $("#step-button").removeClass("disabled");
  $("#next-button").removeClass("disabled");
  this.continueActive = false;
  if (timeoutLoop !== undefined)
  {
    clearTimeout(timeoutLoop);
  }
};

/**
* Returns the continueActive state.
*
* @return {boolean}
*/
Surface.prototype.isContinueActive = function() {
  return this.continueActive;
};

/**
* Disables or enables the available action buttons based on the given parameter.
*
* @param {boolean} disable
*/
Surface.prototype.disableActionButtons = function(disable) {
  if (disable) {
    // Enable the connection button.
    $("#connect-to-button").removeClass("disabled");
    $("#host-address").removeAttr("disabled");

    // Disable the debugger action buttons.
    $(".debugger-buttons .btn-default").addClass("disabled");
  }
  else
  {
    // Disable the connection button.
    $("#connect-to-button").addClass("disabled");
    $("#host-address").attr("disabled", true);

    // Enable the debugger action buttons.
    $(".debugger-buttons .btn-default").removeClass("disabled");
  }
};

/**
* Sets to the proper state the Continue/Stop action button.
*
* @param {integer} state
*/
Surface.prototype.continueStopButtonState = function(state) {
  switch (state)
  {
    case this.CSState.stop:
    {
      //this.continueActive = true;
      $("#continue-stop-button i").removeClass("fa-play");
      $("#continue-stop-button i").addClass("fa-stop");
    } break;
    case this.CSState.continue:
    {
      $("#continue-stop-button i").removeClass("fa-stop");
      $("#continue-stop-button i").addClass("fa-play");
      //this.continueActive = false;
    } break;
  }
};

/**
* Updates the backtrace panel with a new entry.
*
* @param {integer} frame
* @param {object} info
*/
Surface.prototype.updateBacktracePanel = function(frame, info)
{
  var sourceName = info.func.sourceName || info;
  var line = info.line || "-";
  var func = info.func.name || "-";

  var panel = $("#backtrace-content");
  panel.append(
    "<div class='list-row'>" +
      "<div class='list-col list-col-0'>" + frame + "</div>" +
      "<div class='list-col list-col-1'>" + sourceName + "</div>" +
      "<div class='list-col list-col-2'>" + line + "</div>" +
      "<div class='list-col list-col-3'>" + func + "</div>" +
    "</div>"
  );
  this.util.scrollDown(panel);
}

/**
* Updates the breakpoint panel based on the active breakpoints.
*/
Surface.prototype.updateBreakpointsPanel = function()
{
  var panel = $("#breakpoints-content");
  this.util.clearElement(panel);

  var activeBreakpoints = client.debuggerObj.getActiveBreakpoints();

  for (var i in activeBreakpoints)
  {
    var sourceName = activeBreakpoints[i].func.sourceName || "-";
    var line = activeBreakpoints[i].line || "-";
    var id = activeBreakpoints[i].activeIndex || "-";
    var func = activeBreakpoints[i].func.name || "-";

    panel.append(
      "<div class='list-row' id='br-" + line + "-" + id + "'>" +
        "<div class='list-col list-col-0'>" + sourceName + "</div>" +
        "<div class='list-col list-col-1'>" + line + "</div>" +
        "<div class='list-col list-col-2'>" + id + "</div>" +
        "<div class='list-col list-col-3'>" + func + "</div>" +
      "</div>"
    );
  }

  this.util.scrollDown(panel);
}

Surface.prototype.getbacktrace = function()
{
  var max_depth = 0;
  var user_depth = $("#backtrace-depth").val();

  if (user_depth != 0)
  {
    if (/[1-9][0-9]*/.exec(user_depth))
    {
      max_depth = parseInt(user_depth);
    }
    else
    {
      return true;
    }
  }

  client.debuggerObj.encodeMessage("BI", [ ClientPackageType.JERRY_DEBUGGER_GET_BACKTRACE, max_depth ]);
}

const logger = new Logger($("#console-panel"));
const util = new Util();
const session = new Session(env.editor);
const surface = new Surface();

$(document).ready(function()
{
  // Init the ACE editor.
  env.editor.resize();
  env.editor.setTheme("ace/theme/chrome");
  var JavaScriptMode = ace.require("ace/mode/javascript").Mode;
  env.EditSession = ace.require("ace/edit_session").EditSession;
  env.Document = require("ace/document").Document;
  env.editor.session.setMode(new JavaScriptMode());
  env.editor.setShowInvisibles(false);

  // Workaround for the auto scrolling when set the document value.
  // This is gonna be fixed in the next version of ace.
  env.editor.$blockScrolling = Infinity;

  session.setWelcomeSession();

  /*
  * Editor settings toggle button event.
  */
  $(".settings-toggle").on("click", function()
  {
    $("#settings-wrapper").toggleClass("displayed");
    $("#workspace-wrapper").toggleClass("hidden");
    $("#settings-button").toggleClass("active");
  });

  /*
  * File open button.
  */
  $("#open-file-button").on("click", function()
  {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob)
    {
      // Great success! All the File APIs are supported.
      // Open the file browser.
      $("#hidden-file-input").trigger("click");
    }
    else
    {
      logger.error("The File APIs are not fully supported in this browser.");
    }
  });

  /*
  * Manage the file input change
  */
  $("#hidden-file-input").change(function(evt)
  {
    // FileList object
    var files = evt.target.files;
    var valid = files.length, processed = 0;

    for (var i = 0; i < files.length; i++)
    {
      // Only process javascript files.
      if (!files[i].type.match("application/javascript"))
      {
        logger.error(files[i].name + " is not a Javascript file.");
        valid--;
        continue;
      }

      if (session.sessionNameCheck(files[i].name))
      {
        logger.error(files[i].name + " is already loaded.");
        valid--;
        continue;
      }

      (function(file)
      {
        var reader = new FileReader();

        reader.onload = function(evt)
        {
          session.createNewSession(file.name, evt.target.result, filetab.work, true);
        }

        reader.onerror = function(evt)
        {
          if (evt.target.name.error === "NotReadableError")
          {
            logger.error(file.name + " file could not be read.");
          }
        }

        reader.readAsText(file, "utf-8");
      })(files[i]);
    }
  });

  /**
  * Modal "new File name" events.
  */
  $("#cancel-file-name").on("click", function()
  {
    $("#new-file-name").val("");
    $("#modal-info").empty();
  });

  $("#ok-file-name").on("click", function()
  {
    var info = $("#modal-info");
    var fileName = $("#new-file-name").val().trim();
    var valid = true;

    info.empty();
    var regex = /^([a-zA-Z0-9_\-]{3,}\.js)$/;
    if (!regex.test(fileName))
    {
      info.append("<p>The filename must be at least 3 characters long and must ends with '.js'.</p>");
      valid = false;
    }
    if (session.getSessionIdbyName(fileName) != null)
    {
      info.append("<p>This filename is already taken.</p>");
      valid = false;
    }

    if (valid)
    {
      session.createNewSession(fileName, "", filetab.work, false);

      $("#new-file-name").val("");
      $("#new-file-modal").modal("hide");
    }
  });

  /**
  * Save button event.
  */
  $("#save-file-button").on("click", function()
  {
    if (session.getActiveID() == 0)
    {
      logger.error("You can not save the welcome.js file.");
    }
    else
    {
      var blob = new Blob([env.editor.session.getValue()], {type: "text/javascript;charset=utf-8"});
      saveAs(blob, session.getSessionNameById(session.getActiveID()));
      $("#tab-" + session.getActiveID()).removeClass("unsaved");
    }
  });

  /**
  * Editor setting events.
  */
  $("#theme").on("change", function()
  {
    env.editor.setTheme(this.value);
  });

  $("#fontsize").on("change", function()
  {
    env.editor.setFontSize(this.value);
  });

  $("#folding").on("change", function()
  {
    env.editor.session.setFoldStyle(this.value);
  });

  $("#keybinding").on("change", function()
  {
    env.editor.setKeyboardHandler(keybindings[this.value]);
  });

  $("#soft_wrap").on("change", function()
  {
    env.editor.setOption("wrap", this.value);
  });

  $("#select_style").on("change", function()
  {
    env.editor.setOption("selectionStyle", this.checked ? "line" : "text");
  });

  $("#highlight_active").on("change", function()
  {
    env.editor.setHighlightActiveLine(this.checked);
  });

  $("#display_indent_guides").on("change", function()
  {
    env.editor.setDisplayIndentGuides(this.checked);
  });

  $("#show_hidden").on("change", function()
  {
    env.editor.setShowInvisibles(this.checked);
  });

  $("#show_hscroll").on("change", function()
  {
    env.editor.setOption("hScrollBarAlwaysVisible", this.checked);
  });

  $("#show_vscroll").on("change", function()
  {
    env.editor.setOption("vScrollBarAlwaysVisible", this.checked);
  });

  $("#animate_scroll").on("change", function()
  {
    env.editor.setAnimatedScroll(this.checked);
  });

  $("#show_gutter").on("change", function()
  {
    env.editor.renderer.setShowGutter(this.checked);
  });

  $("#show_print_margin").on("change", function()
  {
    env.editor.renderer.setShowPrintMargin(this.checked);
  });

  $("#soft_tab").on("change", function()
  {
    env.editor.session.setUseSoftTabs(this.checked);
  });

  $("#highlight_selected_word").on("change", function()
  {
    env.editor.setHighlightSelectedWord(this.checked);
  });

  $("#enable_behaviours").on("change", function()
  {
    env.editor.setBehavioursEnabled(this.checked);
  });

  $("#fade_fold_widgets").on("change", function()
  {
    env.editor.setFadeFoldWidgets(this.checked);
  });

  $("#scrollPastEnd").on("change", function()
  {
    env.editor.setOption("scrollPastEnd", this.checked);
  });

  /**
  * Layout setting events.
  */
  $(".panel-switch").on("change", function(e)
  {
    var panel = e.target.id.split("-")[0];
    if ($(e.target).is(":checked"))
    {
      if (panel === "backtrace")
      {
        surface.isBacktracePanelActive = true;
      }
      if (panel === "memoryUsage")
      {
        resetChart();
      }
      $("#" + panel + "-wrapper").show();
      surface.numberOfHiddenPanel--;
    }
    else
    {
      if (panel === "backtrace")
      {
        surface.isBacktracePanelActive = false;
      }
      if (panel === "memoryUsage")
      {
        stopUpdateDataPoints();
      }
      $("#" + panel + "-wrapper").hide();
      surface.numberOfHiddenPanel++;
    }

    // If every information panels are hidden then expand the editor.
    // -1 from the length because of the resizable div element.
    if (surface.numberOfHiddenPanel == $("#info-panels").children().length - 1)
    {
      $("#editor-wrapper").removeClass();
      $("#editor-wrapper").addClass("col-md-12");
      $("#info-panels").hide();
      env.editor.resize()

    // If there is at least one information panel then reset the last known layout.
  } else if (surface.numberOfHiddenPanel > 0 && !$("#info-panels").is(":visible")) {
      $("#editor-wrapper").removeClass();
      $("#editor-wrapper").addClass("col-md-" + surface.lastKnownNextCol + " resizable");
      $("#info-panels").removeClass();
      $("#info-panels").addClass("col-md-" + surface.lastKnownTargetCol + " resizable");
      $("#info-panels").show();
      env.editor.resize()
    }
  });

  /**
  * Debugger action events.
  */
  $("#connect-to-button").on("click", function(e)
  {
    if ($(this).hasClass("disabled"))
    {
      return true;
    }

    if (client.debuggerObj)
    {
      logger.info("Debugger is connected.");
      return true;
    }

    if ($("#host-ip").val() == "")
    {
      logger.error("IP address expected.");
      return true;
    }

    if ($("#host-port").val() == "")
    {
      logger.error("Adress port expected.");
      return true;
    }

    var address = $("#host-ip").val() + ":" + $("#host-port").val();
    document.getElementsByClassName('chart-btn')[2].disabled = false;
    logger.info("Connect to: " + address);
    client.debuggerObj = new DebuggerClient(address);

    return true;
  });

  /*
  * Update the breakpoint lines after editor or session changes.
  */
  env.editor.on("change", function(e)
  {
    $("#tab-" + session.getActiveID()).addClass("unsaved");
    if (client.debuggerObj)
    {
      session.markBreakpointLines();
    }
  });

  env.editor.on("changeSession", function(e)
  {
    if (client.debuggerObj)
    {
      session.markBreakpointLines();
    }
  });

  /*
  * Debugger action button events.
  */
  $("#delete-all-button").on("click", function()
  {
    if (client.debuggerObj) {
      var found = false;

      for (var i in client.debuggerObj.activeBreakpoints)
      {
        delete client.debuggerObj.activeBreakpoints[i];
        found = true;
      }

      if (!found)
      {
        logger.info("No active breakpoints.")
      }
      session.deleteBreakpointsFromEditor();
    }
  });

  $("#continue-stop-button").on("click", function()
  {
    if ($(this).hasClass("disabled"))
    {
      return true;
    }

    if (!surface.isContinueActive())
    {
      surface.continueCommand();
    }
    else
    {
      surface.stopCommand();
      client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_STOP ]);
    }
  });

  $("#step-button").on("click", function()
  {
    if ($(this).hasClass("disabled"))
    {
      return true;
    }
    if(!surface.isContinueActive())
    {
      client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_STEP ]);
    }
  });

  $("#next-button").on("click", function()
  {
    if ($(this).hasClass("disabled"))
    {
      return true;
    }
    if(!surface.isContinueActive())
    {
      client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_NEXT ]);
    }
  });

  /*
  * Editor mouse click, breakpoint add/delete.
  */
  env.editor.on("guttermousedown", function(e)
  {
    if (client.debuggerObj)
    {
      var target = e.domEvent.target;
      if (target.className.indexOf("ace_gutter-cell") == -1)
      {
        return;
      }

      if (!env.editor.isFocused())
      {
        return;
      }

      if (e.clientX > 25 + target.getBoundingClientRect().left)
      {
        return;
      }

      var breakpoints = e.editor.session.getBreakpoints(row, 0);
      var row = e.getDocumentPosition().row;
      var lines = session.getLinesFromRawData(client.debuggerObj.getBreakpointLines());

      if (lines.includes(row + 1))
      {
        if(typeof breakpoints[row] === typeof undefined) {
          env.editor.session.setBreakpoint(row);
          session.getBreakpointIDs[row] = client.debuggerObj.getNextBreakpointIndex();
          client.debuggerObj.setBreakpoint(session.getSessionNameById(session.getActiveID()) + ":" + parseInt(row + 1));
        }
        else
        {
          client.debuggerObj.deleteBreakpoint(session.getBreakpointIDs[row]);
          env.editor.session.clearBreakpoint(row);

          surface.updateBreakpointsPanel();
        }
      }

      e.stop();
    }
  });
});

/*
* Command line log
*/
$('#command-line-input').keydown(function(e) {
    if (e.keyCode == keys.upArrow)
    {
      if(session.usedCommandCounter == -1)
      {
        session.usedCommandCounter= session.usedCommandList.length;
      }
      if(session.usedCommandCounter > 1)
      {
        session.usedCommandCounter--;
        document.getElementById('command-line-input').value = session.usedCommandList[session.usedCommandCounter];
      }
    }
    else if(e.keyCode == keys.downArrow){
       if (session.usedCommandList.length != 1 && session.usedCommandCounter != session.usedCommandList.length-1)
       {
         session.usedCommandCounter++;
         document.getElementById('command-line-input').value = session.usedCommandList[session.usedCommandCounter];
       }
    }
});

/**
* Bootstrap column resizer.
*/
$(function() {
  var resizableEl = $('.resizable').not(':last-child');
  // This is filled by start event handler.
  var totalCol;
  var updateClass = function(el, col) {
    // Remove width, our class already has it.
    el.css('width', '');
    el.removeClass(function(index, className) {
      return (className.match(/(^|\s)col-\S+/g) || []).join(' ');
    }).addClass('col-md-' + col);
  };

  function getColumnWidth() {
    return $(document).width() / 12;
  }

  // jQuery UI Resizable
  resizableEl.resizable({
    handles: 'e',
    start: function(event, ui) {
      var target = ui.element;
      var next = target.next();
      var targetCol = Math.round(target.width() / getColumnWidth());
      var nextCol = Math.round(next.width() / getColumnWidth());
      // Set totalColumns globally
      totalCol = targetCol + nextCol;
      target.resizable('option', 'minWidth', getColumnWidth());
      target.resizable('option', 'maxWidth', ((totalCol - 1) * getColumnWidth()));
    },
    resize: function(event, ui) {
      var target = ui.element;
      var next = target.next();
      var targetColumnCount = Math.round(target.width() / getColumnWidth());
      var nextColumnCount = Math.round(next.width() / getColumnWidth());
      var targetSet = totalCol - nextColumnCount;
      var nextSet = totalCol - targetColumnCount;

      // Conditions for min and max column number.
      if (targetSet < 4) targetSet = 4;
      if (targetSet > 8) targetSet = 8;
      if (nextSet < 4) nextSet = 4;
      if (nextSet > 8) nextSet = 8;
      // Store the calculated column numbers.
      surface.lastKnownTargetCol = targetSet;
      surface.lastKnownNextCol = nextSet;
      // Refresh the columns.
      updateClass(target, targetSet);
      updateClass(next, nextSet);
      //Resize chart
      initChart("redraw");
      maxDatapointNumber = Math.floor(document.getElementById("chart").clientWidth / 30);
    },
  });
});

/**
* JerryScript debugger client.
*/
function DebuggerClient(address)
{
  logger.info("ws://" + address + "/jerry-debugger");

  var parseObj = null;
  var maxMessageSize = 0;
  var cpointerSize = 0;
  var littleEndian = true;
  var functions = { };
  var lineList = new Multimap();
  var lastBreakpointHit = null;
  var activeBreakpoints = { };
  var nextBreakpointIndex = 1;
  var pendingBreakpoints = [ ];
  var backtraceFrame = 0;
  var evalResult = null;
  var exceptionData = null;

  function assert(expr)
  {
    if (!expr)
    {
      throw new Error("Assertion failed.");
    }
  }

  function setUint32(array, offset, value)
  {
    if (littleEndian)
    {
      array[offset] = value & 0xff;
      array[offset + 1] = (value >> 8) & 0xff;
      array[offset + 2] = (value >> 16) & 0xff;
      array[offset + 3] = (value >> 24) & 0xff;
    }
    else
    {
      array[offset] = (value >> 24) & 0xff;
      array[offset + 1] = (value >> 16) & 0xff;
      array[offset + 2] = (value >> 8) & 0xff;
      array[offset + 3] = value & 0xff;
    }
  }

  /* Concat the two arrays. The first byte (opcode) of nextArray is ignored. */
  function concatUint8Arrays(baseArray, nextArray)
  {
    if (nextArray.byteLength <= 1)
    {
      /* Nothing to append. */
      return baseArray;
    }

    if (!baseArray)
    {
      /* Cut the first byte (opcode). */
      return nextArray.slice(1);
    }

    var baseLength = baseArray.byteLength;
    var nextLength = nextArray.byteLength - 1;

    var result = new Uint8Array(baseLength + nextLength);
    result.set(nextArray, baseLength - 1);

    /* This set operation overwrites the opcode. */
    result.set(baseArray);

    return result;
  }

  function cesu8ToString(array)
  {
    if (!array)
    {
      return "";
    }

    var length = array.byteLength;

    var i = 0;
    var result = "";

    while (i < length)
    {
      var chr = array[i];

      ++i;

      if (chr >= 0x7f)
      {
        if (chr & 0x20)
        {
          /* Three byte long character. */
          chr = ((chr & 0xf) << 12) | ((array[i] & 0x3f) << 6) | (array[i + 1] & 0x3f);
          i += 2;
        }
        else
        {
          /* Two byte long character. */
          chr = ((chr & 0x1f) << 6) | (array[i] & 0x3f);
          ++i;
        }
      }

      result += String.fromCharCode(chr);
    }

    return result;
  }

  function stringToCesu8(string)
  {
    assert(string != "");

    var length = string.length;
    var byteLength = length;

    for (var i = 0; i < length; i++)
    {
      var chr = string.charCodeAt(i);

      if (chr >= 0x7ff)
      {
        byteLength ++;
      }

      if (chr >= 0x7f)
      {
        byteLength++;
      }
    }

    var result = new Uint8Array(byteLength + 1 + 4);

    result[0] = ClientPackageType.JERRY_DEBUGGER_EVAL;

    setUint32(result, 1, byteLength);

    var offset = 5;

    for (var i = 0; i < length; i++)
    {
      var chr = string.charCodeAt(i);

      if (chr >= 0x7ff)
      {
        result[offset] = 0xe0 | (chr >> 12);
        result[offset + 1] = 0x80 | ((chr >> 6) & 0x3f);
        result[offset + 2] = 0x80 | (chr & 0x3f);
        offset += 3;
      }
      else if (chr >= 0x7f)
      {
        result[offset] = 0xc0 | (chr >> 6);
        result[offset + 1] = 0x80 | (chr & 0x3f);
      }
      else
      {
        result[offset] = chr;
        offset++;
      }
    }

    return result;
  }

  function breakpointToString(breakpoint)
  {
    var name = breakpoint.func.name;

    var result = breakpoint.func.sourceName;

    if (!result)
    {
      result = "[unknown]";
    }

    result += ":" + breakpoint.line;

    if (breakpoint.func.is_func)
    {
      result += " (in "
                + (breakpoint.func.name ? breakpoint.func.name : "function")
                + "() at line:"
                + breakpoint.func.line
                + ", col:"
                + breakpoint.func.column
                + ")";
    }

    return result;
  }

  function Multimap()
  {
    /* Each item is an array of items. */

    var map = { };

    this.get = function(key)
    {
      var item = map[key];
      return item ? item : [ ];
    }

    this.insert = function(key, value)
    {
      var item = map[key];

      if (item)
      {
        item.push(value);
        return;
      }

      map[key] = [ value ];
    }

    this.delete = function(key, value)
    {
      var array = map[key];

      assert(array);

      var newLength = array.length - 1;
      var i = array.indexOf(value);

      assert(i != -1);

      array.splice(i, 1);

      array.length = newLength;
    }
  }

  client.socket = new WebSocket("ws://" + address + "/jerry-debugger");
  client.socket.binaryType = 'arraybuffer';

  function abortConnection(message)
  {
    assert(client.socket && client.debuggerObj);

    client.socket.close();
    client.socket = null;
    client.debuggerObj = null;

    logger.error("Abort connection: " + message);
    throw new Error(message);
  }

  client.socket.onerror = function(event)
  {
    if (client.socket)
    {
      client.socket = null;
      client.debuggerObj = null;
      logger.info("Connection closed.");
      disableChartButtons();
      // "Reset the editor".
      util.clearElement($("#backtrace-content"));
      session.deleteBreakpointsFromEditor();
      session.unhighlightLine();
      session.unhighlightBreakpointLine();
      surface.disableActionButtons(true);
    }
  }
  client.socket.onclose = client.socket.onerror;

  client.socket.onopen = function(event)
  {
    logger.info("Connection created.");
    resetChart();
    surface.disableActionButtons(false);
  }

  function getFormatSize(format)
  {
    var length = 0;

    for (var i = 0; i < format.length; i++)
    {
      if (format[i] == "B")
      {
        length++;
        continue;
      }

      if (format[i] == "C")
      {
        length += cpointerSize;
        continue;
      }

      assert(format[i] == "I")

      length += 4;
    }

    return length;
  }

  function decodeMessage(format, message, offset)
  {
    /* Format: B=byte I=int32 C=cpointer.
     * Returns an array of decoded numbers. */

    var result = []
    var value;

    if (!offset)
    {
      offset = 0;
    }

    if (offset + getFormatSize(format) > message.byteLength)
    {
      abortConnection("received message too short.");
    }

    for (var i = 0; i < format.length; i++)
    {
      if (format[i] == "B")
      {
        result.push(message[offset])
        offset++;
        continue;
      }

      if (format[i] == "C" && cpointerSize == 2)
      {
        if (littleEndian)
        {
          value = message[offset] | (message[offset + 1] << 8);
        }
        else
        {
          value = (message[offset] << 8) | message[offset + 1];
        }

        result.push(value);
        offset += 2;
        continue;
      }

      assert(format[i] == "I" || (format[i] == "C" && cpointerSize == 4));

      if (littleEndian)
      {
        value = (message[offset] | (message[offset + 1] << 8)
                 | (message[offset + 2] << 16) | (message[offset + 3] << 24));
      }
      else
      {
        value = ((message[offset] << 24) | (message[offset + 1] << 16)
                 | (message[offset + 2] << 8) | message[offset + 3] << 24);
      }

      result.push(value);
      offset += 4;
    }

    return result;
  }

  function encodeMessage(format, values)
  {
    /* Format: B=byte I=int32 C=cpointer.
     * Sends a message after the encoding is completed. */

    var length = getFormatSize(format);

    var message = new Uint8Array(length);

    var offset = 0;

    for (var i = 0; i < format.length; i++)
    {
      var value = values[i];

      if (format[i] == "B")
      {
        message[offset] = value;
        offset++;
        continue;
      }

      if (format[i] == "C" && cpointerSize == 2)
      {
        if (littleEndian)
        {
          message[offset] = value & 0xff;
          message[offset + 1] = (value >> 8) & 0xff;
        }
        else
        {
          message[offset] = (value >> 8) & 0xff;
          message[offset + 1] = value & 0xff;
        }

        offset += 2;
        continue;
      }

      setUint32(message, offset, value);

      offset += 4;
    }

    client.socket.send(message);
  }

  function releaseFunction(message)
  {
    var byte_code_cp = decodeMessage("C", message, 1)[0];
    var func = functions[byte_code_cp];

    for (var i in func.lines)
    {
      lineList.delete(i, func);

      var breakpoint = func.lines[i];

      assert(i == breakpoint.line);

      if (breakpoint.activeIndex >= 0)
      {
        delete activeBreakpoints[breakpoint.activeIndex];
      }
    }

    delete functions[byte_code_cp];

    message[0] = ClientPackageType.JERRY_DEBUGGER_FREE_BYTE_CODE_CP;
    client.socket.send(message);
  }

  function getBreakpoint(breakpointData)
  {
    var returnValue = {};
    var func = functions[breakpointData[0]];
    var offset = breakpointData[1];

    if (offset in func.offsets)
    {
      returnValue.breakpoint = func.offsets[offset];
      returnValue.at = true;
      return returnValue;
    }

    if (offset < func.firstBreakpointOffset)
    {
      returnValue.breakpoint = func.offsets[func.firstBreakpointOffset];
      returnValue.at = true;
      return returnValue;
    }

    nearest_offset = -1;

    for (var current_offset in func.offsets)
    {
      if ((current_offset <= offset) && (current_offset > nearest_offset))
      {
        nearest_offset = current_offset;
      }
    }

    returnValue.breakpoint = func.offsets[nearest_offset];
    returnValue.at = false;
    return returnValue;
  }

  this.encodeMessage = encodeMessage;

  function ParseSource()
  {
    var source = "";
    var sourceData = null;
    var sourceName = "";
    var sourceNameData = null;
    var functionName = null;
    var stack = [{ is_func: false,
                   line: 1,
                   column: 1,
                   name: "",
                   source: "",
                   lines: [],
                   offsets: [] }];
    var newFunctions = { };

    this.receive = function(message)
    {
      switch (message[0])
      {
        case ServerPackageType.JERRY_DEBUGGER_PARSE_ERROR:
        {
          /* Parse error occured in JerryScript. */
          parseObj = null;
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE:
        case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_END:
        {
          sourceData = concatUint8Arrays(sourceData, message);

          if (message[0] == ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_END)
          {
            source = cesu8ToString(sourceData);
          }
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_NAME:
        case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_NAME_END:
        {
          sourceNameData = concatUint8Arrays(sourceNameData, message);

          if (message[0] == ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_NAME_END)
          {
            sourceName = cesu8ToString(sourceNameData);
          }
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_FUNCTION_NAME:
        case ServerPackageType.JERRY_DEBUGGER_FUNCTION_NAME_END:
        {
          functionName = concatUint8Arrays(functionName, message);
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_PARSE_FUNCTION:
        {
          position = decodeMessage("II", message, 1);

          stack.push({ is_func: true,
                       line: position[0],
                       column: position[1],
                       name: cesu8ToString(functionName),
                       source: source,
                       sourceName: sourceName,
                       lines: [],
                       offsets: [] });
          functionName = null;
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_BREAKPOINT_LIST:
        case ServerPackageType.JERRY_DEBUGGER_BREAKPOINT_OFFSET_LIST:
        {
          var array;

          if (message.byteLength < 1 + 4)
          {
            abortConnection("message too short.");
          }

          if (message[0] == ServerPackageType.JERRY_DEBUGGER_BREAKPOINT_LIST)
          {
            array = stack[stack.length - 1].lines;
          }
          else
          {
            array = stack[stack.length - 1].offsets;
          }

          for (var i = 1; i < message.byteLength; i += 4)
          {
            array.push(decodeMessage("I", message, i)[0]);
          }
          return;
        }

        case ServerPackageType.JERRY_DEBUGGER_BYTE_CODE_CP:
        {
          var func = stack.pop();
          func.byte_code_cp = decodeMessage("C", message, 1)[0];

          lines = {}
          offsets = {}

          func.firstBreakpointLine = func.lines[0];
          func.firstBreakpointOffset = func.offsets[0];

          for (var i = 0; i < func.lines.length; i++)
          {
            var breakpoint = { line: func.lines[i], offset: func.offsets[i], func: func, activeIndex: -1 };

            lines[breakpoint.line] = breakpoint;
            offsets[breakpoint.offset] = breakpoint;
          }

          func.lines = lines;
          func.offsets = offsets;

          newFunctions[func.byte_code_cp] = func;

          if (stack.length > 0)
          {
            return;
          }

          func.source = source;
          func.sourceName = sourceName;
          break;
        }

        case ServerPackageType.JERRY_DEBUGGER_RELEASE_BYTE_CODE_CP:
        {
          var byte_code_cp = decodeMessage("C", message, 1)[0];

          if (byte_code_cp in newFunctions)
          {
            delete newFunctions[byte_code_cp];
          }
          else
          {
            releaseFunction(message);
          }
          return;
        }

        default:
        {
          abortConnection("unexpected message.");
          return;
        }
      }

      for (var i in newFunctions)
      {
        var func = newFunctions[i];

        functions[i] = func;

        for (var j in func.lines)
        {
          lineList.insert(j, func);
        }
      }

      if (pendingBreakpoints.length != 0)
      {
        logger.info("Available pending breakpoints");

        for (var i in pendingBreakpoints)
        {
          if (Number.isInteger(pendingBreakpoints[i]))
          {
            pendingBreakpoints[i] = sourceName + ":" + pendingBreakpoints[i];
          }
          logger.info("Try to add: " + pendingBreakpoints[i]);
          client.debuggerObj.setBreakpoint(pendingBreakpoints[i], false);
        }
      }
      else
      {
        logger.info("No pending breakpoints");
      }

      parseObj = null;
    }
  }

  client.socket.onmessage = function(event)
  {
    var message = new Uint8Array(event.data);

    if (message.byteLength < 1)
    {
      abortConnection("message too short.");
    }

    if (cpointerSize == 0)
    {
      if (message[0] != ServerPackageType.JERRY_DEBUGGER_CONFIGURATION
          || message.byteLength != 4)
      {
        abortConnection("the first message must be configuration.");
      }

      maxMessageSize = message[1]
      cpointerSize = message[2]
      littleEndian = (message[3] != 0);

      if (cpointerSize != 2 && cpointerSize != 4)
      {
        abortConnection("compressed pointer must be 2 or 4 byte long.");
      }

      config = false;
      return;
    }

    if (parseObj)
    {
      parseObj.receive(message)
      return;
    }

    switch (message[0])
    {
      case ServerPackageType.JERRY_DEBUGGER_PARSE_ERROR:
      case ServerPackageType.JERRY_DEBUGGER_BYTE_CODE_CP:
      case ServerPackageType.JERRY_DEBUGGER_PARSE_FUNCTION:
      case ServerPackageType.JERRY_DEBUGGER_BREAKPOINT_LIST:
      case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE:
      case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_END:
      case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_NAME:
      case ServerPackageType.JERRY_DEBUGGER_SOURCE_CODE_NAME_END:
      case ServerPackageType.JERRY_DEBUGGER_FUNCTION_NAME:
      case ServerPackageType.JERRY_DEBUGGER_FUNCTION_NAME_END:
      {
        parseObj = new ParseSource()
        parseObj.receive(message)
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_RELEASE_BYTE_CODE_CP:
      {
        releaseFunction(message);
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_MEMSTATS_RECEIVE:
      {
        var messagedata = decodeMessage("IIIII", message, 1);

        if (startRecord)
        {
          startRecord = false;
          activeChart = true;
          document.getElementsByClassName('chart-btn')[0].disabled = true;
          document.getElementsByClassName('chart-btn')[1].disabled = false;
          document.getElementsByClassName('chart-btn')[2].disabled = true;
          document.getElementById('record-btn').style.backgroundColor = "#16e016";
        }
        if(session.breakpointInformationToChart && activeChart)
        {
          var breakpointLineToChart = "ln: " + session.breakpointInformationToChart.split(":")[1].split(" ")[0];
          if (surface.isContinueActive())
          {
            addNewDataPoints(messagedata, "#" + session.breakpointInformationToChart.split(":")[1].split(" ")[0] + ": " + new Date().toISOString().slice(14, 21));
            var loop = function(){
              client.debuggerObj.sendResumeExec(ClientPackageType.JERRY_DEBUGGER_NEXT);
            }
            timeoutLoop = setTimeout(loop, dataUpdateInterval);
          }
          else
           {
             addNewDataPoints(messagedata, breakpointLineToChart);
           }
        }
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_BREAKPOINT_HIT:
      case ServerPackageType.JERRY_DEBUGGER_EXCEPTION_HIT:
      {
        var breakpointData = decodeMessage("CI", message, 1);
        var breakpointRef = getBreakpoint(breakpointData);
        var breakpoint = breakpointRef.breakpoint;

        if (message[0] == ServerPackageType.JERRY_DEBUGGER_EXCEPTION_HIT)
        {
          logger.info("Exception throw detected (to disable automatic stop type exception 0)");
          if (exceptionData)
          {
            logger.info("Exception hint: " + cesu8ToString(exceptionData));
            exceptionData = null;
          }
        }

        lastBreakpointHit = breakpoint;

        var breakpointInfo = "";
        if (breakpoint.offset.activeIndex >= 0)
        {
          breakpointInfo = " breakpoint:" + breakpoint.offset.activeIndex + " ";
        }

        logger.info("Stopped "
                   + (breakpoint.at ? "at " : "around ")
                   + breakpointInfo
                   + breakpointToString(breakpoint));

        /* EXTENDED CODE */
        session.setLastBreakpoint(breakpoint);
        if(!surface.isContinueActive())
        {
          surface.continueStopButtonState(surface.CSState.continue);
        }

        if (breakpoint.func.sourceName != '')
        {
          if (!session.sessionNameCheck(breakpoint.func.sourceName, true))
          {
            var name = breakpoint.func.sourceName.split("/");
            name = name[name.length - 1];
            var groupID = name.split(".")[0] + name.length;
            logger.debug(
              "The " + breakpoint.func.sourceName + " file is missing: ",
              '<div class="btn btn-xs btn-default load-from-jerry ' + groupID + '">Load from Jerry</div>',
              true
            );
            $(".load-from-jerry").on("click", function(e)
            {
              session.unhighlightLine();
              session.unhighlightBreakpointLine();
              var code = breakpoint.func.source;
              session.createNewSession(name, code, session.tabType.work, true);
              $("." + groupID).addClass("disabled");
              $("." + groupID).unbind("click");
              e.stopImmediatePropagation();
            });
          }
        }

        // Go the the right session.
        var sID = session.getSessionIdbyName(breakpoint.func.sourceName);
        if (sID != null && sID != session.getActiveID())
        {
          // Remove the highlite from the current session.
          session.unhighlightLine();
          session.unhighlightBreakpointLine();

          // Change the session.
          session.switchSession(sID);

        }

        if (sID == session.getActiveID())
        {
          session.highlightCurrentLine(breakpoint.line);
          session.markBreakpointLines();
        }

        // Show the backtrace on the panel.
        if (surface.isBacktracePanelActive)
        {
          surface.getbacktrace();
        }

        /*Add breakpoint information to chart*/
        for (var i in activeBreakpoints) {
          if(activeBreakpoints[i].line == breakpointToString(breakpoint).split(":")[1].split(" ")[0] && surface.isContinueActive())
          {
            surface.stopCommand();
            return;
          }
        }

        client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_MEMSTATS ]);
        session.breakpointInformationToChart = breakpointToString(breakpoint);
        /* EXTENDED CODE */
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_EXCEPTION_STR:
      case ServerPackageType.JERRY_DEBUGGER_EXCEPTION_STR_END:
      {
        exceptionData = concatUint8Arrays(exceptionData, message);
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_BACKTRACE:
      case ServerPackageType.JERRY_DEBUGGER_BACKTRACE_END:
      {
        util.clearElement($("#backtrace-content"));
        for (var i = 1; i < message.byteLength; i += cpointerSize + 4)
        {
          var breakpointData = decodeMessage("CI", message, i);

          breakpoint = getBreakpoint(breakpointData).breakpoint;

          surface.updateBacktracePanel(backtraceFrame, breakpoint);

          ++backtraceFrame;
        }

        if (message[0] == ServerPackageType.JERRY_DEBUGGER_BACKTRACE_END)
        {
          backtraceFrame = 0;
        }
        return;
      }

      case ServerPackageType.JERRY_DEBUGGER_EVAL_RESULT:
      case ServerPackageType.JERRY_DEBUGGER_EVAL_RESULT_END:
      case ServerPackageType.JERRY_DEBUGGER_EVAL_ERROR:
      case ServerPackageType.JERRY_DEBUGGER_EVAL_ERROR_END:
      {
        env.evalResult = concatUint8Arrays(env.evalResult, message);

        if (message[0] == ServerPackageType.JERRY_DEBUGGER_EVAL_RESULT_END)
        {
          evalLogger.info(cesu8ToString(env.evalResult));
          env.evalResult = null;
          return;
        }

        if (message[0] == ServerPackageType.JERRY_DEBUGGER_EVAL_ERROR_END)
        {
          evalLogger.error("Uncaught exception: " + cesu8ToString(env.evalResult));
          env.evalResult = null;
          return;
        }

        return;
      }

      default:
      {
        abortConnection("unexpected message.");
        return;
      }
    }
  }

  function insertBreakpoint(breakpoint)
  {
    if (breakpoint.activeIndex < 0)
    {
      breakpoint.activeIndex = nextBreakpointIndex;
      activeBreakpoints[nextBreakpointIndex] = breakpoint;
      nextBreakpointIndex++;

      var values = [ ClientPackageType.JERRY_DEBUGGER_UPDATE_BREAKPOINT,
                     1,
                     breakpoint.func.byte_code_cp,
                     breakpoint.offset ];

      encodeMessage("BBCI", values);
    }

    logger.info("Breakpoint " + breakpoint.activeIndex + " at " + breakpointToString(breakpoint));
    surface.updateBreakpointsPanel();
  }

  this.setBreakpoint = function(str, pending)
  {
    line = /^(.+):([1-9][0-9]*)$/.exec(str);
    var found = false;

    if (line)
    {
      var functionList = lineList.get(line[2]);

      for (var i = 0; i < functionList.length; ++i)
      {
        var func = functionList[i];
        var sourceName = func.sourceName;

        if (sourceName == line[1]
            || sourceName.endsWith("/" + line[1])
            || sourceName.endsWith("\\" + line[1]))
        {
          insertBreakpoint(func.lines[line[2]]);
          found = true;
        }
      }
    }
    else
    {
      for (var i in functions)
      {
        var func = functions[i];

        if (func.name == str)
        {
          insertBreakpoint(func.lines[func.firstBreakpointLine]);
          found = true;
        }
      }
    }
    if (!found)
    {
      logger.info("Breakpoint not found");
      if (pending)
      {
        if (line)
        {
          pendingBreakpoints.push(Number(line[2]));
          logger.info("Pending breakpoint index: " + line[0] + " added");
        }
        else
        {
          pendingBreakpoints.push(str);
          logger.info("Pending breakpoint function name: " + str + " added");
        }
      }
    }
  }

  this.sendExceptionConfig = function(enable)
  {
    if (enable == "")
    {
      logger.error("Argument required");
      return;
    }

    if (enable == 1)
    {
      logger.info("Stop at exception enabled");
    }
    else if (enable == 0)
    {
      logger.info("Stop at exception disabled");
    }
    else
    {
      logger.info("Invalid input. Usage 1: [Enable] or 0: [Disable].");
      return;
    }

    encodeMessage("BB", [ ClientPackageType.JERRY_DEBUGGER_EXCEPTION_CONFIG, enable ]);
  }

  this.deleteBreakpoint = function(index)
  {
    breakpoint = activeBreakpoints[index];

    if (index == "all")
    {
      var found = false;

      for (var i in activeBreakpoints)
      {
        delete activeBreakpoints[i];
        found = true;
      }

      if (!found)
      {
        logger.info("No active breakpoints.")
      }
    }

    else if (!breakpoint)
    {
      logger.error("No breakpoint found with index " + index);
      return;
    }

    assert(breakpoint.activeIndex == index);

    delete activeBreakpoints[index];
    breakpoint.activeIndex = -1;

    var values = [ ClientPackageType.JERRY_DEBUGGER_UPDATE_BREAKPOINT,
                   0,
                   breakpoint.func.byte_code_cp,
                   breakpoint.offset ];

    encodeMessage("BBCI", values);

    logger.info("Breakpoint " + index + " is deleted.");
  }

  this.deletePendingBreakpoint = function(index)
  {
    if (index >= pendingBreakpoints.length)
    {
      logger.info("Pending breakpoint not found");
    }
    else
    {
      pendingBreakpoints.splice(index, 1);
      logger.info("Pending breakpoint " + index + " is deleted.");
    }
  }

  this.listBreakpoints = function()
  {
    logger.info("List of active breakpoints:");
    var found = false;

    for (var i in activeBreakpoints)
    {
      logger.info("  breakpoint " + i + " at " + breakpointToString(activeBreakpoints[i]));
      found = true;
    }

    if (!found)
    {
      logger.info("  no active breakpoints");
    }

    if (pendingBreakpoints.length != 0)
    {
      logger.info("List of pending breakpoints:");
      for (var i in pendingBreakpoints)
      {
        logger.info("  pending breakpoint " + i + " at " + pendingBreakpoints[i]);
      }
    }
    else {
      logger.info("No pending breakpoints");
    }
  }

  this.sendResumeExec = function(command)
  {
    if (!lastBreakpointHit)
    {
      logger.info("This command is allowed only if JavaScript execution is stopped at a breakpoint.");
      return;
    }

    encodeMessage("B", [ command ]);

    lastBreakpointHit = null;
  }

  this.sendGetBacktrace = function(depth)
  {
    if (!lastBreakpointHit)
    {
      logger.error("This command is allowed only if JavaScript execution is stopped at a breakpoint.");
      return;
    }

    encodeMessage("BI", [ ClientPackageType.JERRY_DEBUGGER_GET_BACKTRACE, max_depth ]);

    logger.info("Backtrace:");
  }

  this.sendEval = function(str)
  {
    if (!lastBreakpointHit)
    {
      logger.error("This command is allowed only if JavaScript execution is stopped at a breakpoint.");
      return;
    }

    if (str == "")
    {
      logger.error("Argument required");
      return;
    }

    var array = stringToCesu8(str);
    var byteLength = array.byteLength;

    if (byteLength <= maxMessageSize)
    {
      client.socket.send(array);
      return;
    }

    client.socket.send(array.slice(0, maxMessageSize));

    var offset = maxMessageSize - 1;

    while (offset < byteLength)
    {
      array[offset] = ClientPackageType.JERRY_DEBUGGER_EVAL_PART;
      client.socket.send(array.slice(offset, offset + maxMessageSize));
      offset += maxMessageSize - 1;
    }
  }

  this.printSource = function()
  {
    if (lastBreakpointHit)
    {
      logger.info(lastBreakpointHit.func.source);
    }
  }

  this.dump = function()
  {
    for (var i in functions)
    {
      var func = functions[i];
      var sourceName = func.sourceName;

      if (!sourceName)
      {
        sourceName = "<unknown>";
      }

      logger.info("Function 0x"
                 + Number(i).toString(16)
                 + " '"
                 + func.name
                 + "' at "
                 + sourceName
                 + ":"
                 + func.line
                 + ","
                 + func.column);

      for (var j in func.lines)
      {
        var active = "";

        if (func.lines[j].active >= 0)
        {
          active = " (active: " + func.lines[j].active + ")";
        }

        logger.info("  Breakpoint line: " + j + " at memory offset: " + func.lines[j].offset + active);
      }
    }
  }

  this.getActiveBreakpoints = function ()
  {
    return activeBreakpoints;
  }

  this.getNextBreakpointIndex = function ()
  {
    return nextBreakpointIndex;
  }

  this.getBreakpointLines = function()
  {
    var result = [];
    for (var i in functions)
    {
      var func = functions[i];
      for (var j in func.lines)
      {
        result.push(
          {
            line: parseInt(j),
            sourceName: func.sourceName
          });
      }
    }
    return result;
  }
}

/**
* Command line functionality.
*
* @param {keyboardEvent} event
*/
function debuggerCommand(event)
{
  if (event.keyCode != 13)
  {
    return true;
  }
  var command = env.commandInput.val().trim();
  session.usedCommandList.push(command);
  session.usedCommandCounter = -1;
  args = /^([a-zA-Z]+)(?:\s+([^\s].*)|)$/.exec(command);
  if (!args)
  {
    logger.error("Invalid command");
    env.commandInput.val("");
    return true;
  }
  if (!args[2])
  {
    args[2] = "";
  }
  if (args[1] == "help")
  {
    logger.info("Debugger commands:\n" +
                "  connect <IP address:PORT> - connect to server (default is localhost:5001)\n" +
                "  break|b <file_name:line>|<function_name> - set breakpoint\n" +
                "  fbreak <file_name:line>|<function_name> - set breakpoint if not found, add to pending list\n" +
                "  delete|d <id> - delete breakpoint\n" +
                "  pendingdel <id> - delete pending breakpoint\n" +
                "  list - list breakpoints\n" +
                "  continue|c - continue execution\n" +
                "  step|s - step-in execution\n" +
                "  next|n - execution until the next breakpoint\n" +
                "  eval|e - evaluate expression\n" +
                "  backtrace|bt <max-depth> - get backtrace\n" +
                "  src - print current source code\n" +
                "  dump - dump all breakpoint data");
    env.commandInput.val("");
    return true;
  }
  if (args[1] == "connect")
  {
    if (client.debuggerObj)
    {
      logger.info("Debugger is connected");
      return true;
    }
    var ipAddr = args[2];
    var PORT = "5001";
    if (ipAddr == "")
    {
      ipAddr = "localhost";
    }
    if (ipAddr.match(/.*:\d/))
    {
      var fields = ipAddr.split(":");
      ipAddr = fields[0];
      PORT = fields[1];
    }
    var address = ipAddr + ":" + PORT;
    logger.info("Connect to: " + address);
    client.debuggerObj = new DebuggerClient(address);
    env.commandInput.val("");
    return true;
  }
  if (!client.debuggerObj)
  {
    logger.error("Debugger is NOT connected");
    env.commandInput.val("");
    return true;
  }
  switch(args[1])
  {
    case "b":
    case "break":
      client.debuggerObj.setBreakpoint(args[2], false);
      break;
    case "fbreak":
      client.debuggerObj.setBreakpoint(args[2], true);
      break;
    case "d":
    case "delete":
      client.debuggerObj.deleteBreakpoint(args[2]);
      break;
    case "pendingdel":
      client.debuggerObj.deletePendingBreakpoint(args[2]);
    case "st":
    case "stop":
      surface.stopCommand();
      client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_STOP ]);
      break;
    case "c":
    case "continue":
      surface.continueCommand();
      break;
    case "s":
    case "step":
      if(!surface.isContinueActive())
      {
        client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_STEP ]);
      }
      break;
    case "n":
    case "next":
      if(!surface.isContinueActive())
      {
        client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_NEXT ]);
      }
      break;
    case "e":
    case "eval":
      client.debuggerObj.sendEval(args[2]);
      break;
    case "bt":
    case "backtrace":
      max_depth = 0;
      if (args[2])
      {
        if (/[1-9][0-9]*/.exec(args[2]))
        {
          max_depth = parseInt(args[2]);
        }
        else
        {
          logger.error("Invalid maximum depth argument.");
          break;
        }
      }
      client.debuggerObj.sendGetBacktrace(max_depth);
      break;
    case "exception":
      client.debuggerObj.sendExceptionConfig(args[2]);
      break;
    case "src":
      client.debuggerObj.printSource();
      break;
    case "list":
      client.debuggerObj.listBreakpoints();
      break;
    case "dump":
      client.debuggerObj.dump();
      break;
    default:
      logger.error("Unknown command: " + args[1]);
      break;
  }
  env.commandInput.val("");
  return true;
}
