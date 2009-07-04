//$Id$
/**
 * Copyright (C) 2008-2009 tms - Thomas Santana <tms@exnebula.org>
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
 
function dndiGetHTTPRequest() {
   try { return new XMLHttpRequest(); } catch(e) {}
   try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) {}
   try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) {}
   alert("XMLHttpRequest not supported");
   return null;
}

function dndiHome(event) {
  var url="http://www.wizards.com/dndinsider/compendium/database.aspx"
  window._content.document.location  = url
}

function dndiGetID(url) {
  var re= new RegExp("id=([0-9]+)")
  var match=re.exec(url)
  if(match && match.length == 2)
    return  match[1]
  else  
    return null
}

/*
 * This function will try to find the DIV with ID="detail", if it fails it 
 * will look for Iframes with that div.
 */
function dndiFindSection() {
	var doc=window.content.document
	
	while(doc != null) {
		var data = doc.getElementById("detail")
		var id = dndiGetID(doc.location)
		
		if(id != null && data != null) {
			var ndata= data.cloneNode(true);
			ndata.setAttribute("id",id)
			return ndata;
		}
		
		// Go down IFrame 
		var res = doc.evaluate("//iframe",doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null );

		if(res != null && res.singleNodeValue != null)
			doc = res.singleNodeValue.contentWindow.document
		else 
			doc = null
	}
	return null
}


function dndiDoCapture(url) { 
  var data=dndiFindSection()
  
  if(data==null) {
    alert("The page does not seem to contain and capturable data, must be a D&D Insider result page.")
	  return 0;
  }

  var xmlHttp=dndiGetHTTPRequest();
  var serializer = new XMLSerializer();
  data=serializer.serializeToString(data);

  xmlHttp.onreadystatechange  = function() { 
    if(xmlHttp.readyState  == 4) {
  	  if(xmlHttp.status  == 200) 
      	alert("Virtual Combat Cards replied: "+xmlHttp.responseText) 
      else 
        alert("Sending to "+url+" failed with error code: " + xmlHttp.status);
		}
  }; 


  // Open a connection to the server
  xmlHttp.open("POST", url,true);

  // Tell the server you're sending it XML
  xmlHttp.setRequestHeader("Content-Type", "text/xml");
  xmlHttp.setRequestHeader("Connection", "close");

  // Send the request
  xmlHttp.send(data);
}

function dndiCapture(event) {
	var url = document.getElementById("dndiVccUrl").value;
	if(url==null || url =="") {
		alert("You must specify the Remote URL parameter.");
	} else { 
		dndiDoCapture(url);
  }
}
