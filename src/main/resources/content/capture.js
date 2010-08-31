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

function dndiGetHTTPRequest() {
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
}

function dndiHome(event) {
    var url = "http://www.wizards.com/dndinsider/compendium/database.aspx";
    window._content.document.location = url;
}

function dndiGetID(url) {
    var re = new RegExp("id=([0-9]+)");
    var match = re.exec(url);
    if (match && match.length == 2)
        return  match[1];
    else
        return null;
}

/*
 * This function will try to find the DIV with ID="detail", if it fails it 
 * will look for Iframes with that div.
 */
function dndiFindSection() {
    var doc = window.content.document;

    while (doc != null) {
        var data = doc.getElementById("detail");
        var id = dndiGetID(doc.location);

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
    return null
}


function dndiDoCapture(url, callback) {
    var data = dndiFindSection();

    if (data == null) {
        alert("The page does not seem to contain and capturable data, must be a D&D Insider result page.");
        return 0;
    }

    var xmlHttp = dndiGetHTTPRequest();
    var serializer = new XMLSerializer();
    data = serializer.serializeToString(data);

    xmlHttp.onreadystatechange = function() {
        callback(xmlHttp);
    };


    // Open a connection to the server
    xmlHttp.open("POST", url, true);

    // Tell the server you're sending it XML
    xmlHttp.setRequestHeader("Content-Type", "text/xml");
    xmlHttp.setRequestHeader("Connection", "close");

    // Send the request
    xmlHttp.send(data);
}

function dndiCapture(event) {
    var url = document.getElementById("dndiVccUrl").value;
    if (url == null || url == "") {
        alert("You must specify the Remote URL parameter.");
    } else {
        dndiDoCapture(url, function(xmlHttp) {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status == 200)
                    alert("Virtual Combat Cards replied: " + xmlHttp.responseText);
                else
                    alert("Sending to " + url + " failed with error code: " + xmlHttp.status);
            }
        });
    }
}

function dndiEvalStringOnTarget(tgtWin, evalString) {
    var contentWin = null;
    var win = tgtWin.content.wrappedJSObject;
    var sb = new Components.utils.Sandbox(win);
    sb.window = win;
    return Components.utils.evalInSandbox("with(window){" + evalString + "}", sb);
}

function dndiCanAdvance() {
    var button = window.content.document.getElementById("GB_middle");
    if (button && button.children[2].getAttribute("class").indexOf("disabled") == -1) return true;
    else return false;
}

function dndiResultSetNextEntry(lsnr) {
    if (!dndiCanAdvance) {
        alert("Last entry reached.");
        if (lsnr) {
            lsnr.stop = true;
            lsnr.unregister();
        }
    } else {
        try {
            dndiEvalStringOnTarget(window, "GB_CURRENT.switchNext();");
        } catch(e) {
            if (e.name == "ReferenceError") alert("You must be view multiple compendium entries to use this feature.");
            else if (e.name == "TypeError") alert("Select on of the entries to start the mass capture.");
            else alert("Unexpected error looking for GreyBar: " + e);
            if (lsnr) lsnr.stop = true;
        }
    }
}

var dndiListener = {
    QueryInterface: function (iid) {
        if (iid.equals(Components.interfaces.nsIWebProgressListener) || iid.equals(Components.interfaces.nsISupportsWeakReference))
            return this;
        throw Components.results.NS_NOINTERFACE;
    },
    onStateChange: function (webProgress, request, stateFlags, status) {
        if (stateFlags == 0x80010) {
            this.unregister();
            if (!this.stop || this.nextMove != null) {
                this.register();
                this.nextMove(this);
            }
        }

    } ,
    stop: false ,
    unregister: function() {
        //alert("Unregistered self");
        var myBrowser = window.document.getElementById("content");
        var wp = myBrowser.webNavigation.QueryInterface(Components.interfaces.nsIWebProgress);
        wp.removeProgressListener(this);
    },
    register: function() {
        //alert("Registered self");
        var myBrowser = window.document.getElementById("content");
        var wp = myBrowser.webNavigation.QueryInterface(Components.interfaces.nsIWebProgress);
        wp.addProgressListener(dndiListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_WINDOW);
    }
};

function dndiStepAndAdvance(move) {

    //const nsIWebNavigation          = Components.interfaces.nsIWebNavigation;
    //const nsIWebProgress            = Components.interfaces.nsIWebProgress;
    //const nsIWebProgressListener    = Components.interfaces.nsIWebProgressListener;
    //const nsISupportsWeakReference  = Components.interfaces.nsISupportsWeakReference;
    dndiListener.nextMove = move;
    dndiListener.register();
    dndiListener.nextMove(dndiListener);
}

function dndiCaptureAndAdvance(lsnr) {
    var url = document.getElementById("dndiVccUrl").value;
    if (url == null || url == "") {
        alert("You must specify the Remote URL parameter.");
        lsnr.stop = true;
    } else {
        dndiDoCapture(url, function(xmlHttp) {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status != 200) {
                    alert("Sending to " + url + " failed with error code: " + xmlHttp.status);
                    lnsr.stop = true;
                    lnsr.unregister();
                } else {
                    dndiResultSetNextEntry(lsnr);
                }
            }
        });
    }
}

/*
 var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
 .getService(Components.interfaces.nsIPromptService);
 var rv = ps.confirmEx(window, "Experimental Feature", "This is a experimental feature which will assume control of the browser. You should use this only if you are not doing anything important. You may have to close the browser if things don't work correctly.\n\nProceed?",
 ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_0 +
 ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_1,
 "Yes", "No", null, null, {});
 if(rv == 0) { // Go ahead
 }
 */
//dndiStepAndAdvance(dndiCaptureAndAdvance)