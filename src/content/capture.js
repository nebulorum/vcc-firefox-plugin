function dndiGetHTTPRequest() {
   try { return new XMLHttpRequest(); } catch(e) {}
   try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) {}
   try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) {}
   alert("XMLHttpRequest not supported");
   return null;
}

function dndiHome(event) {
   var url="http://ww2.wizards.com/dnd/insider/database.aspx"
   window._content.document.location  = url
}

function dndiDoCapture(url) { 
  var data=window.content.document.getElementById("detail")
  if(data==null) {
    alert("The page does not seem to contain and capturable data, must be a D&D Insider result page.")
	return 0;
  }
  var xmlHttp=dndiGetHTTPRequest();

  var serializer = new XMLSerializer();
  data=serializer.serializeToString(window.content.document.getElementById("detail"));

  xmlHttp.onreadystatechange  = function()
    { 
         if(xmlHttp.readyState  == 4)
         {
              if(xmlHttp.status  == 200) 
                  alert("Data sent to remote server sucessfully.") 
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
  //xmlHttp.channel.cancel(true);
}


function dndiCapture(event) {
	var url = document.getElementById("dndiVccUrl").value;
	if(url==null || url =="") {
		alert("You must specify the Remote URL parameter.");
	} else { 
		dndiDoCapture(url);
    }
}