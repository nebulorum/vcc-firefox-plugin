/**
 * Copyright (C) 2008-2010 - Thomas Santana <tms@exnebula.org>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 */
//$Id: capture.js 474 2009-12-13 15:12:41Z mailleux@gmail.com $

var dndiCapture = {
    getHTTPRequest: function() {
        try {
            return new XMLHttpRequest();
        } catch(e) {
        }
        try {
            return new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
        }
        try {
            return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {
        }
        alert("XMLHttpRequest not supported");
        return null;
    },

    gotoCompendium: function(event) {
        var url = "http://www.wizards.com/dndinsider/compendium/database.aspx";
        window._content.document.location = url;
    },

    getMainWindow: function () {
        return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                .getInterface(Components.interfaces.nsIWebNavigation)
                .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                .rootTreeItem
                .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                .getInterface(Components.interfaces.nsIDOMWindow);
    },

    gotoHelp: function(event) {
        var mainWindow = this.getMainWindow();
        with (mainWindow) {
            gBrowser.addTab('http://www.exnebula.org/vcc/plugin');
        }
    },

    getEntryID: function (url) {
        var re = new RegExp("id=([0-9]+)");
        var match = re.exec(url);
        if (match && match.length == 2)
            return  match[1];
        else
            return null;
    },

    /*
     * This function will try to find the DIV with ID="detail", if it fails it
     * will look for Iframes with that div.
     */
    findSection: function() {
        var doc = window.content.document;

        while (doc != null) {
            var data = doc.getElementById("detail");
            var id = this.getEntryID(doc.location);

            if (id != null && data != null) {
                var ndata = data.cloneNode(true);
                ndata.setAttribute("id", id);
                return ndata;
            }

            // Go down IFrame
            var res = doc.evaluate("//iframe", doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

            if (res != null && res.singleNodeValue != null)
                doc = res.singleNodeValue.contentWindow.document;
            else
                doc = null;
        }
        return null;
    },


    // Callback is only used if we have success, otherwise we stop everything
    sendCapture: function(callback) {
        var url = this.getVCCURL() + "/capture?reply=plugin-text";
        var data = this.findSection();

        if (data == null) {
            this.warnUser("Wrong page", "The page does not seem to contain and capturable data, must be a D&D Insider result page.");
            return 0;
        }
        var xmlHttp = this.getHTTPRequest();
        var serializer = new XMLSerializer();
        data = serializer.serializeToString(data);

        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status == 200) {
                    var fields = xmlHttp.responseText.split(":");
                    if (fields.length == 2)
                        dndiCapture.addResult(fields[1], fields[0]);
                    else
                        dndiCapture.addResult(fields[0], "-");
                    if (callback != null) callback(xmlHttp);
                } else {
                    dndiCapture.addResult("Failed to contact VCC", "Failed");
                    dndiCapture.AutoCapture.stopAutomation();
                }
            }
        };
        // Open a connection to the server
        xmlHttp.open("POST", url, true);

        // Tell the server you're sending it XML
        xmlHttp.setRequestHeader("Content-Type", "text/xml");
        xmlHttp.setRequestHeader("Connection", "close");

        // Send the request
        xmlHttp.send(data);
    },


    withGetReply: function(path, okCallback, errorCallback) {
        var url = this.getVCCURL();
        var xmlHttp = this.getHTTPRequest();

        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status == 200) {
                    if (okCallback != null) okCallback(xmlHttp.responseText)
                } else {
                    if (errorCallback != null) errorCallback(xmlHttp.status, xmlHttp.responseText)
                }
            }
        };
        xmlHttp.open("GET", url + path, true);
        xmlHttp.send(null);
    },


    addResult: function(name, status) {
        var theList = document.getElementById('dndiCaptureResult');
        var row = document.createElement('listitem');
        var cell = document.createElement('listcell');
        cell.setAttribute('label', name);
        row.appendChild(cell);

        cell = document.createElement('listcell');
        cell.setAttribute('label', status);
        row.appendChild(cell);

        theList.appendChild(row);
    },
    getVCCURL: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var branch = prefService.getBranch("dndicapture.");
        if (!branch.prefHasUserValue("vcc.url"))
            branch.setCharPref("vcc.url", "http://127.0.0.1:4143");
        return branch.getCharPref("vcc.url");
    },

    getExperimentalAware: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var branch = prefService.getBranch("dndicapture.");
        if (!branch.prefHasUserValue("auto.experimental"))
            branch.setBoolPref("auto.experimental", false);
        return branch.getBoolPref("auto.experimental");
    },

    getEnableFullAuto: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var branch = prefService.getBranch("dndicapture.");
        if (!branch.prefHasUserValue("auto.full"))
            branch.setBoolPref("auto.full", false);
        return branch.getBoolPref("auto.full");
    },

    setExperimentalAware: function(newValue) {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        prefService.getBranch("dndicapture.").setBoolPref("auto.experimental", newValue);
    },

    doCapture: function (event) {
        this.sendCapture(null);
    },

    AutoCapture: {
        //Callback information for registering
        QueryInterface: function (iid) {
            if (iid.equals(Components.interfaces.nsIWebProgressListener) || iid.equals(Components.interfaces.nsISupportsWeakReference))
                return this;
            throw Components.results.NS_NOINTERFACE;
        },
        onStateChange: function (webProgress, request, stateFlags, status) {
            if (stateFlags == 0x80010) {
                if (this.running) {
                    dndiCapture.sendCapture(function(xhr) {
                        var myself = dndiCapture.AutoCapture;
                        if (xhr.responseText.match("^FATAL:") == "FATAL:") {
                            myself.stopAutomation();
                        } else if (myself.autoAdvance) myself.advanceToNextEntry();
                    });
                }
            }
        },
        running: false,
        autoAdvance: false,
        contentWindow: null,
        unregister: function() {
            if (this.contentWindow != null) {
                var wp = this.contentWindow.webNavigation.QueryInterface(Components.interfaces.nsIWebProgress);
                wp.removeProgressListener(this);
            }
        },
        register: function() {
            var wp = this.contentWindow.webNavigation.QueryInterface(Components.interfaces.nsIWebProgress);
            wp.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_STATE_WINDOW);
        },
        startAutomation: function(autoNext) {
            var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation)
                    .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                    .rootTreeItem
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIDOMWindow);
            this.contentWindow = mainWindow.document.getElementById("content");
            this.running = true;
            this.autoAdvance = autoNext;
            this.register();
        },
        stopAutomation: function() {
            this.running = false;
            this.unregister();
        },
        advanceToNextEntry: function() {
            var button = this.contentWindow.contentDocument.getElementById("GB_middle");
            if (button && button.children[2].getAttribute("class").indexOf("disabled") == -1) {
                try {
                    dndiCapture.executeJSOnTarget(this.contentWindow.contentWindow, "GB_CURRENT.switchNext();");
                } catch(e) {
                    if (e.name == "ReferenceError") alert("You must be view multiple compendium entries to use this feature.");
                    else if (e.name == "TypeError") alert("Select on of the entries to start the mass capture.");
                    else alert("Unexpected error looking for GreyBar: " + e);
                    if (lsnr) lsnr.stop = true;
                }
            }
        }
    },

    warnUser: function(title, text) {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        promptService.alert(this.getMainWindow, title, text);
    },

    executeJSOnTarget: function(tgtWin, evalString) {
        var win = tgtWin.content.wrappedJSObject;
        var sb = new Components.utils.Sandbox(win);
        sb.window = win;
        return Components.utils.evalInSandbox("with(window){" + evalString + "}", sb);
    },

    confirmAutomation: function() {
        var aware = this.getExperimentalAware();
        if (aware) return true; // Skip if user said he knows

        var warned = {value: aware};
        var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        var rv = ps.confirmCheck(this.getMainWindow, "Experimental Feature",
                "This is a experimental feature which will add automation to your browser. " +
                        "You should use this only if you are not doing anything important.\n" +
                        "You may have to close the browser if things don't work correctly.\n\nDo you want to activate?",
                "I've been warned, don't ask again",
                warned);

        if (rv) {
            this.setExperimentalAware(warned.value);
        }
        return rv;
    },

    startAutoCapture: function(event, autoNext) {
        if (this.confirmAutomation()) {
            // Go ahead
            this.withGetReply("/capture?has=auto", function(response) {
                if (response == "true") {
                    dndiCapture.AutoCapture.startAutomation(autoNext);
                } else {
                    dndiCapture.warnUser("Wrong Virtual Combat Cards Version", "The version of Virtual Combat Cards you are running does not support this automation. Please upgrade to version 1.4.0 or higher");
                }
            },
                    function(code, response) {
                        dndiCapture.warnUser("Virtual Combat Cards Server not found", "Failed to contact Virtual Combat Cards, please start it.");
                    })
        }
    },
    stopAutoCapture: function(event) {
        this.AutoCapture.stopAutomation();
    },

    disableAutoNext: function() {
        var button = document.getElementById("dndiAutoNextOn");
        if (button) button.setAttribute("hidden", true);
    },
    init: function() {
        if (!this.getEnableFullAuto()) this.disableAutoNext();
    }
}