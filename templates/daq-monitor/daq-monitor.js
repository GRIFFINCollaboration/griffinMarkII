////////////////////////////////
// Filter Display setup
////////////////////////////////

// Text for a JSON Object containing Filter Element information
var text = '{ "FilterElementInfo": [' +
    '{"ID":"FilterLinkInputContainer",  "Type":"Div",    "Rate":[], "HistoBufferUsage":[], "Class":"FilterIOLinkContainer",   "Clickable":"False", "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null },' +
    '{"ID":"FilterBufferInput",         "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterBufferObject",      "Clickable":"True",  "DisplayStats":"True",  "Parent":"FilterDisplay",     "HTML":"<p>Input Buffer</p>" },' +
    '{"ID":"FilterLink1",               "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterLink",              "Clickable":"True",  "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null },' +
    '{"ID":"FilterObjectTimeOrdering",  "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterObject",            "Clickable":"True",  "DisplayStats":"True",  "Parent":"FilterDisplay",     "HTML":"<p>Time ordering of all fragments</p>" },' +
    '{"ID":"FilterLink2",               "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterLink",              "Clickable":"True",  "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null },' +
    '{"ID":"FilterMultiLinkHouse",      "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterMultiLinkContainer","Clickable":"False", "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null },' +
    '{"ID":"FilterObjectHouse",         "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterObjectContainer",   "Clickable":"False", "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null },' +
    '{"ID":"FilterObjectBGOSupp",       "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterObjectShort",       "Clickable":"True",  "DisplayStats":"False",  "Parent":"FilterObjectHouse", "HTML":"<p>BGO suppression</p>" },' +
    '{"ID":"FilterLink3",               "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterLink",              "Clickable":"True",  "DisplayStats":"False", "Parent":"FilterObjectHouse", "HTML":null },' +
    '{"ID":"FilterObjectDetTypes",      "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterObjectShort",       "Clickable":"True",  "DisplayStats":"False",  "Parent":"FilterObjectHouse", "HTML":"<p>Filter by Detector Types</p>" },' +
    '{"ID":"FilterLink4",               "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterLink",              "Clickable":"True",  "DisplayStats":"False", "Parent":"FilterObjectHouse", "HTML":null },' +
    '{"ID":"FilterObjectCoincDS",       "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterObjectShort",       "Clickable":"True",  "DisplayStats":"False",  "Parent":"FilterObjectHouse", "HTML":"<p>Coinc. and Downscaling</p>" },' +
    '{"ID":"FilterLink5",               "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterLink",              "Clickable":"True",  "DisplayStats":"False", "Parent":"FilterObjectHouse", "HTML":null },' +
    '{"ID":"FilterBufferOutput",        "Type":"button", "Rate":[], "HistoBufferUsage":[], "Class":"FilterBufferObject",      "Clickable":"True",  "DisplayStats":"True",  "Parent":"FilterDisplay",     "HTML":"<p>Output Buffer</p>" },' +
    '{"ID":"FilterLinkOutputContainer", "Type":"Div",    "Rate":[], "HistoBufferUsage":[], "Class":"FilterIOLinkContainer",   "Clickable":"False", "DisplayStats":"False", "Parent":"FilterDisplay",     "HTML":null }' +
']}';

// Convert the text to JSON Object
var FilterObjectdataStore = JSON.parse(text);

// Declare global variables
var FilterSelectedElementID = 'FilterBufferInput';
var FilterSelectedInputLinkHistoType = 'LinkUsage';
var FilterSelectedDisplayType = 'Rate';
var FilterObjectID = [];
//var FilterObjectIDRates = ['FilterBufferInput', 'FilterLink',  'FilterObjectTimeOrdering',  'FilterLink2',  'FilterObjectBGOSupp',  'FilterLink3',  'FilterObjectDetTypes',  'FilterLink4',  'FilterObjectCoincDS',  'FilterLink5',  'FilterBufferOutput'];
var FilterObjectIDRates = ['FilterBufferInput', 'FilterLink',  'FilterObjectTimeOrdering',  'FilterLink2',  'FilterBufferOutput'];
var FilterInputLinkRate = [];
var FilterInputLinkUsage = [];
var FilterInputLinkUsageMean = [];
var FilterInputLinkBufferUsage = [];
var FilterNumInputLinks=0;
var HistoLinkUsageTitles = ["0-25%", "25-50%", "50-75%", "75-100%"];
var HistoBufferUsageTitles = ["0-25%", "25-50%", "50-75%", "75-100%"];
var MaxValue = 500000000000; // Equal to maximum number of events per second for the link
var MaxInputLinkValue = 500000000000; // Equal to maximum number of events per second for the input link. However, is this dependent on the size of events being transmitted?

var subpageWrappers = ['daq-collectors-wrapper', 'daq-digitizers-wrapper'];
var subpageMessageText = ['Information on this page is generated in the GRIF-C modules and updated once every 10 seconds.',
                          'Information on this page is generated in the GRIF-16 modules and updated once per second.'];
var buttonIDs = ['daqButtonCol', 'daqButtonDig'];
var buttonNames = ['Collectors', 'Digitizers'];

////////////////////////////////
// data unpacking & routing
////////////////////////////////

function unpackDAQdv(dv){
    //parse DAQ dataviews into dataStore.data variables - DAQ monitor style
    //information for an individual channel is packed in a 14 byte word:
    //[PSC 2 bytes][trig request 4 bytes][trig accept 4 bytes][threshold 4 bytes] <--lowest bit
    var channelIndex, channelName, DAQblock,
        i;

    // @TODO: make grif16 send appropriate pscs and lookup grifadc info based on sent PSC
    for(i=0; i<dv.byteLength/14; i++){
        DAQblock = unpackDAQ(i, dv);

        channelIndex = dataStore.ODB.DAQ.PSC.PSC.indexOf(DAQblock.PSC);
        channelName = dataStore.ODB.DAQ.PSC.chan[channelIndex];

        if(channelName) // ie channel *must* be in the ODB PSC table
            sortDAQitem(channelName, DAQblock);
    }
}

function regenerateDatastructure(suppressDOMconfig){
    // rebuild an empty data structure to hold sorted DAQ data, based on the PSC table:
    // dataStore.ODB.DAQ.summary = {
    //      primary: {
    //          requests: int; total requests
    //          accepts:  int; total accepts
    //      },

    //      collectors: {
    //          requests[i] == requests for ith collector
    //          accepts[i] ==  accepts ''
    //          titles[i] == title ''
    //      }

    //      digitizers: {
    //          requests[i][j] == requests for ith collector, jth digitizer
    //          accepts[i][j]  == accepts ''
    //          titles[i][j] == titles ''
    //      }

    //      channels:{
    //          requests[i][j][k] == requests for ith collector, jth digitizer, kth channel
    //          accepts[i][j][k]  == accepts ''
    //          titles[i][j][k] == titles ''
    //      }

    //      detectors:{
    //          <detector code>: { ie 'GR', 'DS'....
    //              requests: total requests for this detector
    //              accepts: total accepts for this detector
    //          }
    //          ...
    //      }

    // }
    // also does some on-load dom config

    var i, address, P,S,C, detPrefix, collectorOption, digiCollectorOption, detectorOption, first;

    if(dataStore.ODB.DAQ.summaryJSON){
        dataStore.ODB.DAQ.summary = JSON.parse(dataStore.ODB.DAQ.summaryJSON);
        return;
    }

    dataStore.ODB.DAQ.summary = {
        primary: {requests: 0, accepts: 0},
        collectors: {requests: [], accepts: [], titles: []},
        digitizers: {requests:[], accepts:[], titles: []},
        channels: {requests:[], accepts:[], titles:[]},
        detectors: {requests:[], accepts:[], titles:[], prettyName:[]}
    }

    // initialize 0s in appropriate places
    // psc addresses

    for(i=0; i<dataStore.ODB.DAQ.PSC.PSC.length; i++){
        address = parsePSCindex(dataStore.ODB.DAQ.PSC.PSC[i]);

        P = address[0];
        S = address[1];
        C = address[2];

        dataStore.ODB.DAQ.summary.collectors.requests[P] = 0;
        dataStore.ODB.DAQ.summary.collectors.accepts[P] = 0;
        dataStore.ODB.DAQ.summary.collectors.titles[P] = '0x' + P.toString(16) + '---';

        dataStore.ODB.DAQ.summary.digitizers.requests[P] = dataStore.ODB.DAQ.summary.digitizers.requests[P] || [];
        dataStore.ODB.DAQ.summary.digitizers.accepts[P] = dataStore.ODB.DAQ.summary.digitizers.accepts[P] || [];
        dataStore.ODB.DAQ.summary.digitizers.titles[P] = dataStore.ODB.DAQ.summary.digitizers.titles[P] || [];
        dataStore.ODB.DAQ.summary.digitizers.requests[P][S] = 0;
        dataStore.ODB.DAQ.summary.digitizers.accepts[P][S] = 0;
        dataStore.ODB.DAQ.summary.digitizers.titles[P][S] = '0x' + P.toString(16) + S.toString(16) + '--';

        dataStore.ODB.DAQ.summary.channels.requests[P] = dataStore.ODB.DAQ.summary.channels.requests[P] || [];
        dataStore.ODB.DAQ.summary.channels.requests[P][S] = dataStore.ODB.DAQ.summary.channels.requests[P][S] || [];
        dataStore.ODB.DAQ.summary.channels.accepts[P] = dataStore.ODB.DAQ.summary.channels.accepts[P] || [];
        dataStore.ODB.DAQ.summary.channels.accepts[P][S] = dataStore.ODB.DAQ.summary.channels.accepts[P][S] || [];
        dataStore.ODB.DAQ.summary.channels.titles[P] = dataStore.ODB.DAQ.summary.channels.titles[P] || [];
        dataStore.ODB.DAQ.summary.channels.titles[P][S] = dataStore.ODB.DAQ.summary.channels.titles[P][S] || [];
        dataStore.ODB.DAQ.summary.channels.requests[P][S][C] = 0;
        dataStore.ODB.DAQ.summary.channels.accepts[P][S][C] = 0;
        dataStore.ODB.DAQ.summary.channels.titles[P][S][C] = '.0x' + P.toString(16) + S.toString(16) + (C<16 ? '0' : '') + C.toString(16); // terrible, shameful hack to prevent plotly from turning the hex labels into decimal numbers :/ BM
    }

    //detectors
    for(i=0; i<dataStore.ODB.DAQ.PSC.chan.length; i++){
        detPrefix = dataStore.ODB.DAQ.PSC.chan[i].slice(0,2);

        if(dataStore.ODB.DAQ.summary.detectors.titles.indexOf(detPrefix) == -1){
            dataStore.ODB.DAQ.summary.detectors.titles.push(detPrefix);
            dataStore.ODB.DAQ.summary.detectors.requests.push(0);
            dataStore.ODB.DAQ.summary.detectors.accepts.push(0);
            dataStore.ODB.DAQ.summary.detectors.prettyName.push(dataStore.ODB.DAQ.detectorNames[detPrefix]);
        }
        dataStore.ODB.DAQ.summary.detectors[detPrefix] = {requests: 0, accepts: 0};
    }

    // Populate this before setting up the dom
    dataStore.ODB.DAQ.summaryJSON = JSON.stringify(dataStore.ODB.DAQ.summary);

    // dom setup
    if(!suppressDOMconfig){

	// Create the Primary collector channel mask buttons
	for(j=0; j<16; j++){
            ChanMaskButton = document.createElement('button');
	    string = 'ChanMaskButton0-'+j;
            ChanMaskButton.setAttribute('id', string);
            ChanMaskButton.setAttribute('type', 'button');
            ChanMaskButton.setAttribute('class', 'btn btn-default');
            ChanMaskButton.style = 'font-size:10px';
            ChanMaskButton.style.padding = '4px';
            ChanMaskButton.onclick = function(){
                WriteChanMask(this.id);
            }.bind(ChanMaskButton);
            document.getElementById('PrimaryChanMaskPicker').appendChild(ChanMaskButton);
	}
	SetAllChanMaskButtons(0,dataStore.ODB.DAQ.params.ChanMask[0]);
	
	
        first = true;
        for(i=0; i<dataStore.ODB.DAQ.summary.collectors.titles.length; i++){
            if(dataStore.ODB.DAQ.summary.collectors.titles[i]){
                collectorOption = document.createElement('button');
                collectorOption.setAttribute('type', 'button');
                collectorOption.setAttribute('class', 'btn btn-default');
                collectorOption.setAttribute('value', dataStore.ODB.DAQ.summary.collectors.titles[i].slice(2,3));
                collectorOption.onclick = function(){
                    activeButton('collectorPicker', this);
                    dataStore.collectorValue = this.value
                    repaint();
                }.bind(collectorOption);
                collectorOption.innerHTML = dataStore.ODB.DAQ.summary.collectors.titles[i];
                document.getElementById('collectorPicker').appendChild(collectorOption);

                digiCollectorOption = collectorOption.cloneNode(true);
                digiCollectorOption.onclick = function(){
                    activeButton('digiCollectorPicker', this);
                    dataStore.digiCollectorValue = this.value;
                    updateDigitizerList("digiCollectorPicker"); 
                    repaint();
                }.bind(digiCollectorOption);
                document.getElementById('digiCollectorPicker').appendChild(digiCollectorOption);

                //start with the first collector selected on both collector and digitizer plots
                if(first){
                    dataStore.collectorValue = collectorOption.value;
                    dataStore.digiCollectorValue = collectorOption.value;
                    updateDigitizerList("digiCollectorPicker"); 
                    activeButton('collectorPicker', collectorOption);
                    activeButton('digiCollectorPicker', digiCollectorOption);
                    first = false;
                }

		
		// Create the Collector channel mask buttons
		if(i<8){
                CollectorChanMaskRow = document.createElement('div');
		name = 'CollectorChanMaskRow'+i;
                CollectorChanMaskRow.setAttribute('id', name);
		CollectorChanMaskRow.innerHTML = 'Collector'+(i)+': ';
                document.getElementById('CollectorChanMaskPicker').appendChild(CollectorChanMaskRow);
		for(j=0; j<16; j++){
                ChanMaskButton = document.createElement('button');
		string = 'ChanMaskButton'+(i+1)+'-'+j;
                ChanMaskButton.setAttribute('id', string);
                ChanMaskButton.setAttribute('type', 'button');
                ChanMaskButton.setAttribute('class', 'btn btn-default');
                ChanMaskButton.style = 'font-size:10px';
		ChanMaskButton.style.padding = '4px';
                ChanMaskButton.onclick = function(){
                    WriteChanMask(this.id);
                }.bind(ChanMaskButton);
                document.getElementById(name).appendChild(ChanMaskButton);
		}
		SetAllChanMaskButtons(i+1,dataStore.ODB.DAQ.params.ChanMask[i+1]);
		}
            }
        }
        updateDigitizerList("digiCollectorPicker");

	/////////////////////////////////////
	// Create all Filter Display objects
	/////////////////////////////////////

	/*
	// Here add in the extra Det Types to the datastore
	// These top 3 Det Types are hard coded in the GRIFC firmware and cannot be modified in the ODB by the user
	if(dataStore.ODB.DAQ.params.DetTypes.length == 13)
	{
	    dataStore.ODB.DAQ.params.DetTypes[13] = 'CLOV';
	    dataStore.ODB.DAQ.params.DetTypes[14] = 'SUPN';
	    dataStore.ODB.DAQ.params.DetTypes[15] = 'SCLR';
	}
*/
	
	// Create a Div for display controls at the top
        FilterControl = document.createElement('div'); 
        string = 'FilterDisplayControl';
        FilterControl.setAttribute('id', string);
        FilterControl.setAttribute('height', '40px');
        FilterControl.setAttribute('width', '400px');
        FilterControl.setAttribute('position', 'relative');
        FilterControl.setAttribute('top', '0px');
        FilterControl.setAttribute('left', '0px');
        FilterControl.innerHTML = "<strong>Display: </strong><input type='radio' name='FilterDisplayType' value='Rate' checked='checked' onclick='FilterSelectedDisplayType=this.value'> Evts/s     <input type='radio' name='FilterDisplayType' value='PercentIn' onclick='FilterSelectedDisplayType=this.value'>Percentage of incoming     <input type='radio' name='FilterDisplayType' value='PercentCap' onclick='FilterSelectedDisplayType=this.value'>Percentage of capacity";
        document.getElementById('FilterDisplay').appendChild(FilterControl);
	
	// Create the Filter objects
	for(i=0; i<FilterObjectdataStore.FilterElementInfo.length; i++){
	    
	    if(FilterObjectdataStore.FilterElementInfo[i].DisplayStats == "True"){
		// This array lists the Elements with reports directly in them and is used in the report construction
		FilterObjectID[FilterObjectID.length] = FilterObjectdataStore.FilterElementInfo[i].ID;
	    }
	    
	    FilterElement = document.createElement(FilterObjectdataStore.FilterElementInfo[i].Type);
	    FilterElement.setAttribute('id', FilterObjectdataStore.FilterElementInfo[i].ID);
	    FilterElement.setAttribute('type', FilterObjectdataStore.FilterElementInfo[i].Type);
	    FilterElement.setAttribute('value', i);
	    FilterElement.setAttribute('class', FilterObjectdataStore.FilterElementInfo[i].Class); 
	    FilterElement.innerHTML = FilterObjectdataStore.FilterElementInfo[i].HTML;
	    if(FilterObjectdataStore.FilterElementInfo[i].Clickable == "True"){
		FilterElement.onclick = function(){
		    FilterElementSelection(this.id);
		}.bind(FilterElement);
	    }
	    document.getElementById(FilterObjectdataStore.FilterElementInfo[i].Parent).appendChild(FilterElement);
	}
	
	// Create the Links from the Collector modules into the Primary
	// These are inserted into the container on the left of the Filter
	FilterNumInputLinks=0;
	for(i=0; i<dataStore.ODB.DAQ.summary.collectors.titles.length; i++){
	    if(dataStore.ODB.DAQ.summary.collectors.titles[i]==null || i>8){ continue; }
	    string = 'FilterInputLink'+(i);
	    FilterInputLink = document.createElement('button'); 
	    FilterInputLink.setAttribute('id', string);
	    FilterInputLink.setAttribute('type', 'button'); 
	    FilterInputLink.setAttribute('value', (100+i)); 
	    FilterInputLink.setAttribute('class', 'FilterInputLinkGrey');
	    FilterInputLink.innerHTML = 'Col'+i; 
	    FilterInputLink.onclick = function(){
                FilterElementSelection(this.id);
	    }.bind(FilterInputLink);
	    document.getElementById('FilterLinkInputContainer').appendChild(FilterInputLink);
	    FilterNumInputLinks++;
        }
	
	// Create the Divs for reporting values in the Filter Elements themselves
	for(i=0; i<FilterObjectID.length; i++){
            FilterReport = document.createElement('div'); 
            string = 'FilterObjectIDReportTitles['+i+']';
            FilterReport.setAttribute('id', string); 
            FilterReport.setAttribute('class', 'FilterReportDivTitles');
	    FilterReport.innerHTML = ''; 
            document.getElementById(FilterObjectID[i]).appendChild(FilterReport);
	    
            FilterReport = document.createElement('div');  
            string = 'FilterObjectIDReportValues['+i+']';
            FilterReport.setAttribute('id', string); 
            FilterReport.setAttribute('class', 'FilterReportDivValues'); 
            FilterReport.innerHTML = '';
            document.getElementById(FilterObjectID[i]).appendChild(FilterReport);
	}

	/*
        // Create extra Divs in the short Filter Elements
	// This is because not all 16 fit in a single column.
        FilterReport = document.createElement('div'); 
        string = 'FilterObjectIDReportTitlesB[3]';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterReportDivTitlesB');
	FilterReport.innerHTML = ''; 
        document.getElementById(FilterObjectID[3]).appendChild(FilterReport);
	
        FilterReport = document.createElement('div');  
        string = 'FilterObjectIDReportValuesB[3]';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterReportDivValuesB'); 
        FilterReport.innerHTML = ''; 
        document.getElementById(FilterObjectID[3]).appendChild(FilterReport);
	
        FilterReport = document.createElement('div'); 
        string = 'FilterObjectIDReportTitlesB[4]';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterReportDivTitlesB');
	FilterReport.innerHTML = ''; 
        document.getElementById(FilterObjectID[4]).appendChild(FilterReport);
	
        FilterReport = document.createElement('div');  
        string = 'FilterObjectIDReportValuesB[4]';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterReportDivValuesB'); 
        FilterReport.innerHTML = '';
        document.getElementById(FilterObjectID[4]).appendChild(FilterReport);
	*/
	
	// Create the final output link object
        string = 'FilterOutputLink0';
        FilterOutputLink = document.createElement('button'); 
        FilterOutputLink.setAttribute('id', string);
        FilterOutputLink.setAttribute('type', 'button'); 
        FilterOutputLink.setAttribute('value', '999'); 
        FilterOutputLink.setAttribute('class', 'FilterInputLinkGrey'); 
        FilterOutputLink.innerHTML = 'UDP'; 
        FilterOutputLink.onclick = function(){
            FilterElementSelection(this.id);
        }.bind(FilterOutputLink);
        document.getElementById('FilterLinkOutputContainer').appendChild(FilterOutputLink);
	
	// Create the Divs inside the Multi Link container
        string = 'FilterMultiLinkSplitter';
        FilterMultiLink = document.createElement('button'); 
        FilterMultiLink.setAttribute('id', string);
        FilterMultiLink.setAttribute('type', 'button'); 
        FilterMultiLink.setAttribute('value', '100'); 
        FilterMultiLink.setAttribute('class', 'FilterMultiLink'); 
        FilterMultiLink.style.width = '15px'; 
        FilterMultiLink.style.height = '290px'; 
        FilterMultiLink.style.top ='30px';
        FilterMultiLink.innerHTML = ''; 
        FilterMultiLink.onclick = function(){
            FilterElementSelection(this.id);
        }.bind(FilterMultiLink);
        document.getElementById('FilterMultiLinkHouse').appendChild(FilterMultiLink);
	
        string = 'FilterMultiLinkBGOSupp';
        FilterMultiLink = document.createElement('button'); 
        FilterMultiLink.setAttribute('id', string);
        FilterMultiLink.setAttribute('type', 'button'); 
        FilterMultiLink.setAttribute('value', '101'); 
        FilterMultiLink.setAttribute('class', 'FilterMultiLink'); 
        FilterMultiLink.style.width = '40px'; 
        FilterMultiLink.style.height = '30px'; 
        FilterMultiLink.style.top ='30px';
        FilterMultiLink.innerHTML = ''; 
        FilterMultiLink.onclick = function(){
            FilterElementSelection(this.id);
        }.bind(FilterMultiLink);
        document.getElementById('FilterMultiLinkHouse').appendChild(FilterMultiLink);
	
        string = 'FilterMultiLinkDetTypes';
        FilterMultiLink = document.createElement('button'); 
        FilterMultiLink.setAttribute('id', string);
        FilterMultiLink.setAttribute('type', 'button'); 
        FilterMultiLink.setAttribute('value', '102'); 
        FilterMultiLink.setAttribute('class', 'FilterMultiLink'); 
        FilterMultiLink.style.width = '40px'; 
        FilterMultiLink.style.height = '30px'; 
        FilterMultiLink.style.top ='150px';
        FilterMultiLink.innerHTML = ''; 
        FilterMultiLink.onclick = function(){
            FilterElementSelection(this.id);
        }.bind(FilterMultiLink);
        document.getElementById('FilterMultiLinkHouse').appendChild(FilterMultiLink);
	
        string = 'FilterMultiLinkCoincDS';
        FilterMultiLink = document.createElement('button'); 
        FilterMultiLink.setAttribute('id', string);
        FilterMultiLink.setAttribute('type', 'button'); 
        FilterMultiLink.setAttribute('value', '103'); 
        FilterMultiLink.setAttribute('class', 'FilterMultiLink'); 
        FilterMultiLink.style.width = '40px'; 
        FilterMultiLink.style.height = '30px'; 
        FilterMultiLink.style.top ='300px';
        FilterMultiLink.innerHTML = ''; 
        FilterMultiLink.onclick = function(){
            FilterElementSelection(this.id);
        }.bind(FilterMultiLink);
        document.getElementById('FilterMultiLinkHouse').appendChild(FilterMultiLink);
	
	
	// Create the Divs for reporting detailed values in the Filter Table below
        FilterReport = document.createElement('div'); 
        string = 'FilterTableTitleDiv';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterTableTitleDiv');
        FilterReport.innerHTML = "Click on a Filter element to display details here."; // initial text
        document.getElementById('FilterTable').appendChild(FilterReport);
	
        FilterReport = document.createElement('div'); 
        string = 'FilterTableReportDiv';
        FilterReport.setAttribute('id', string); 
        FilterReport.setAttribute('class', 'FilterTableReportDiv');
        FilterReport.innerHTML = '<table id="FilterReportTable" class="FilterReportTable"></table>';
        document.getElementById('FilterTable').appendChild(FilterReport);
	
	// Repaint everything for the first time after creation
        repaint();
    }
    
    dataStore.ODB.DAQ.summaryJSON = JSON.stringify(dataStore.ODB.DAQ.summary);
}

function WriteChanMask(id){
    //This function is called when a button representing a specific bit is toggled. The behaviour is as follows:
    //Get the chanmask from the ODB because it may be different to the status of the buttons (page may not have been refreshed recently etc)
    //Change the bit in the chanmask which has been toggled
    //Set the new chanmask value in the ODB
    //Set all the buttons to match the current chanmask
    
    // Determine which button was toggled
    thisCollector = id.match(/\d+/)[0]; 
    thisIdNumber = id.substring(id.indexOf('-'),id.length).match(/\d+/)[0]; 
    
    //Get the chanmask from the ODB
    currentChanmask = dataStore.ODB.DAQ.params.ChanMask[thisCollector];
    
    //Change the bit in the chanmask which has been toggled
    currentChanmask ^= (1 << thisIdNumber);
    
    //Set the new chanmask in the ODB and dataStore
    pokeURL('http://'+dataStore.host+'/?cmd=jset&odb=DAQ/params/ChanMask['+thisCollector+']&value='+currentChanmask);
    dataStore.ODB.DAQ.params.ChanMask[thisCollector] = currentChanmask;
    
    //Change the displayed chanmask to the new value
    //Note that the div for this display has not been created (ie code not added for that)
   // document.getElementById('chanmaskDisplay').innerHTML = '0x'+currentChanmask.toString(16);
    
    //Set all the buttons to match the current chanmask
    SetAllChanMaskButtons(thisCollector,currentChanmask);
    
    return;    
}

function SetAllChanMaskButtons(thisCollector,currentNumber){
    //This function sets the initial values of the buttons used for the channel mask
    // Set all 16 buttons appropriately based on the current value of the chanmask
    thisColl = 'collector0x'+(thisCollector-1);
    for(i=0; i<16; i++){
	name='ChanMaskButton'+thisCollector+'-'+(i);
	
	// Determine if this bit is set in the chanmask
	if((currentNumber & (1 << i))!=0){ thisBit=1; }else{ thisBit=0;}

	// Deterime which ADC this corresponds to
	if(thisCollector>0){ // Skip the Primary and just look at the digitizers for the Secondaries
	var thisADC = 'empty';
	    if(dataStore.ODB.DAQ.hosts[thisColl].digitizers[i] && dataStore.ODB.DAQ.hosts[thisColl].digitizers[i].length>0){ thisADC = 'adc'+dataStore.ODB.DAQ.hosts[thisColl].digitizers[i].match(/\d+/)[0]; }
	}
	
	// Set the button attributes appropriately
	if(thisBit){
	    if(thisCollector>0){  string='0x'+i.toString(16)+'<br>'+thisADC+'<br>Enabled';
			       }else{ string='0x'+i.toString(16)+'<br>Enabled'; }
	    document.getElementById(name).innerHTML = string;
	    document.getElementById(name).status = 'true'; 
	    document.getElementById(name).style.background='#5cb85c';
	}else{
	    if(thisCollector>0){  string='0x'+i.toString(16)+'<br>'+thisADC+'<br>Disabled';
			       }else{ string='0x'+i.toString(16)+'<br>Disabled'; }
	    document.getElementById(name).innerHTML = string;
	    document.getElementById(name).status = 'false';
	    document.getElementById(name).style.background='#e74c3c';
	}
    }
    return;
}

function activeButton(groupID, targetButton){
    // make the target button be the only .active button in its group

    var buttons = document.getElementById(groupID).getElementsByTagName('button'),
        i;

    for(i=0; i<buttons.length; i++){
        buttons[i].classList.remove('active');
    }
    targetButton.classList.add('active');
}

function sortDAQitem(detector, block){
    // sort the <block> unpacked by unpackDAQ for <channel> into the dataStore summary of the DAQ:

    var address = parsePSCindex(block.PSC),
        P = address[0],
        S = address[1],
        C = address[2],
        detectorCode = detector.slice(0,2),
        detectorIndex = dataStore.ODB.DAQ.summary.detectors.titles.indexOf(detectorCode);

    // sort data into summary:
    // primary
    dataStore.ODB.DAQ.summary.primary.requests += block.trigReq;
    dataStore.ODB.DAQ.summary.primary.accepts += block.trigAcpt;
    // collectors
    dataStore.ODB.DAQ.summary.collectors.requests[P] += block.trigReq;
    dataStore.ODB.DAQ.summary.collectors.accepts[P] += block.trigAcpt;
    // digitizers
    dataStore.ODB.DAQ.summary.digitizers.requests[P][S] += block.trigReq;
    dataStore.ODB.DAQ.summary.digitizers.accepts[P][S] += block.trigAcpt;
    // digi channels
    dataStore.ODB.DAQ.summary.channels.requests[P][S][C] += block.trigReq;
    dataStore.ODB.DAQ.summary.channels.accepts[P][S][C] += block.trigAcpt;
    // detector
    dataStore.ODB.DAQ.summary.detectors.requests[detectorIndex] += block.trigReq;
    dataStore.ODB.DAQ.summary.detectors.accepts[detectorIndex]  += block.trigAcpt;     

}

function dataUpdate(){
    //run status
    updateRunStatus();

    //repaint histograms
    repaint();
}

function preFetch(){
    //dump old data:

    if(dataStore.ODB.hasOwnProperty('DAQ'))
        regenerateDatastructure();
}

// Rishita ----------------------------------------------------------------------------

function findChannelName(address) {
	// address is 0xPSCC
	var PSC, length, channelIndex, P, S, C, current_address;

	length = dataStore.ODB.DAQ.PSC.PSC.length;
	for(i=0; i < length; i++) {
		PSC = dataStore.ODB.DAQ.PSC.PSC[i];
    		
		P = (PSC & 0xF000) >>> 12;
    		S = (PSC & 0x0F00) >>> 8;
    		C = (PSC & 0x00FF) >>> 0;

		current_address = '0x' + P.toString(16) + S.toString(16) + '--' ;

		if(current_address == address) {
			channelIndex = i;
			break;
		}
	}
	return dataStore.ODB.DAQ.PSC.chan[channelIndex];
}

function findADC(channel){
    //given a channel name, use the ODB's DAQ table to identify which ADC it belongs to.

    var PSC, channelIndex, P, S, C,
        collectorKey;

    channelIndex = dataStore.ODB.DAQ.PSC.chan.indexOf(channel);
    if(channelIndex == -1)
        return null;

    PSC = dataStore.ODB.DAQ.PSC.PSC[channelIndex];

    P = (PSC & 0xF000) >>> 12;
    S = (PSC & 0x0F00) >>> 8;
    C = (PSC & 0x00FF) >>> 0;

    collectorKey = 'collector0x' + P.toString(16);

    return dataStore.ODB.DAQ.hosts[collectorKey].digitizers[S];
}

// ------------------------------------------------------------------------------------

////////////////////////////////////////
// histogram painting and updating
////////////////////////////////////////

function repaint(){
    var collectorFigureIndex = parseInt(dataStore.collectorValue, 16),
        digiCollectorIndex = parseInt(dataStore.digiCollectorValue, 16),
        digitizerFigureIndex = parseInt(dataStore.digitizerValue, 16),
	address, channelName, ADC, url;

    // Variables used for Filter Display    
    var ID = FilterSelectedElementID;
    var string = "Click on a Filter element to display details here.";

    //primary summary
    createBarchart(
        'collectorsHisto', 
        dataStore.ODB.DAQ.summary.collectors.titles, 
        dataStore.ODB.DAQ.summary.collectors.requests, 
        dataStore.ODB.DAQ.summary.collectors.accepts, 
        'Primary Channel', 'Collector', 'Hz'
    );

    //Collectors plot
    createBarchart(
        'digitizersHisto', 
        dataStore.ODB.DAQ.summary.digitizers.titles[collectorFigureIndex], 
        dataStore.ODB.DAQ.summary.digitizers.requests[collectorFigureIndex], 
        dataStore.ODB.DAQ.summary.digitizers.accepts[collectorFigureIndex], 
        'Collector ' + dataStore.ODB.DAQ.summary.collectors.titles[collectorFigureIndex] + ' Channels', 'Digitizer', 'Hz'
    );

	// Rishita -------------------------------------------------------------------
		address = dataStore.ODB.DAQ.summary.digitizers.titles[digiCollectorIndex][digitizerFigureIndex];
		channelName = findChannelName(address);
		ADC = findADC(channelName);	
    // ---------------------------------------------------------------------------
    LinkString = "<a href=\"http://" + ADC + "\" target=\"_blank\">" + ADC + "</a>";
    document.getElementById("digitizerLink").innerHTML = LinkString;

if(dataStore.ODB.DAQ){
    //Digitizers plot
    createBarchart(
        'channelsHisto', 
        dataStore.ODB.DAQ.summary.channels.titles[digiCollectorIndex][digitizerFigureIndex], 
        dataStore.ODB.DAQ.summary.channels.requests[digiCollectorIndex][digitizerFigureIndex], 
        dataStore.ODB.DAQ.summary.channels.accepts[digiCollectorIndex][digitizerFigureIndex], 
        'Digitizer ' + dataStore.ODB.DAQ.summary.digitizers.titles[digiCollectorIndex][digitizerFigureIndex] + ' Channels<br>' + ADC, 'Channel', 'Hz'
    );  

    //Detectors plot   
    createBarchart(
        'detectorsHisto', 
        dataStore.ODB.DAQ.summary.detectors.prettyName, 
        dataStore.ODB.DAQ.summary.detectors.requests, 
        dataStore.ODB.DAQ.summary.detectors.accepts, 
        'Detector Channels', 'Channel', 'Hz'
    );
}
    
    // Filter Display
    // Here add in the extra Det Types to the datastore
    // These top 3 Det Types are hard coded in the GRIFC firmware and cannot be modified in the ODB by the user
    if(dataStore.ODB.DAQ.params.DetTypes.length == 14)
    {
	dataStore.ODB.DAQ.params.DetTypes[14] = 'CLOV';
	dataStore.ODB.DAQ.params.DetTypes[15] = 'SCLR';
    }
    
    // Grab and unpack the current rates through the Filter from the ODB
    // Format of ODB: /DAQ/GRIFC/Filter-status is
//    currently for the filter status - there are 52 words in 4 blocks of data
//   3 blocks of 16 * 32bits for filter-input, after-time-order, filter-output - these are event counts for each detector type (as before).
//   1 block of 4 * 32bits for two 4bin*16bit histograms for the time-order buffer usage, followed by filter input buffer usage. i.e. each word is two 16bit histogram bins, and each pair of words is:
//   bin3bin1 bin4bin2
//   the 4 bins are bin1:0-25% full, bin2:25-50%, bin3:50-75%, bin4:75-100% 
    // Memory buffers are expected to be mostly empty, otherwise they would be dropping and losing data.
    // The 16 32bits for each Buffer are the rates for each Det Type (including CLOV, SUPN, SCLR)
    //
    // Put the rates numbers into the Filter DataStore
    // The way the elements are accessed here is a bit convoluted (a relic from initial development) and should be tidied up (just need to search FilterObjectdataStore for the ID to get the index).
    for(var i=0; i<FilterObjectIDRates.length; i+=2){
	for (var k = 0; k < FilterObjectdataStore.FilterElementInfo.length; k++){
	    if (FilterObjectdataStore.FilterElementInfo[k].ID == FilterObjectIDRates[i]){
		if(FilterObjectdataStore.FilterElementInfo[k].ID == 'FilterBufferOutput'){
		    // The last 16 entries, before the 4 histogram words, are for the Output buffer
		    var jj=0;
		    for(var j=(dataStore.GRIFC.filter_status.length - 16 - 4); j<(dataStore.GRIFC.filter_status.length - 4); j++){
			FilterObjectdataStore.FilterElementInfo[k].Rate[jj] = dataStore.GRIFC.filter_status[j];
			FilterObjectdataStore.FilterElementInfo[k+1].Rate[jj] = dataStore.GRIFC.filter_status[j];
			jj++;
		    }
		}else if(FilterObjectdataStore.FilterElementInfo[k].ID == 'FilterObjectTimeOrdering'){
		    var jj=0;
		    for(var j=16; j<32; j++){
			FilterObjectdataStore.FilterElementInfo[k].Rate[jj] = dataStore.GRIFC.filter_status[j];
			FilterObjectdataStore.FilterElementInfo[k+1].Rate[jj] = dataStore.GRIFC.filter_status[j];
			jj++;
		    }
		    // The next to last two words are the Histrogram of Buffer Usage for the Time-Ordering buffer
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[0] =  (dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-4] & 0x0000FFFF);
            FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[1] =  (dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-3] & 0x0000FFFF);
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[2] = ((dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-4] & 0xFFFF0000) >> 16);
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[3] = ((dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-3] & 0xFFFF0000) >> 16);
		}else if(FilterObjectdataStore.FilterElementInfo[k].ID == 'FilterBufferInput'){
		    // The first 16 entries are for the rates for the Input buffer
		    for(var j=0; j<dataStore.ODB.DAQ.params.DetTypes.length; j++){
			FilterObjectdataStore.FilterElementInfo[k].Rate[j] = dataStore.GRIFC.filter_status[j];
			FilterObjectdataStore.FilterElementInfo[k+1].Rate[j] = dataStore.GRIFC.filter_status[j];
		    }
		    // The last two words are the Histrogram of Buffer Usage for the Input buffer
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[0] =  (dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-2] & 0x0000FFFF);
            FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[1] =  (dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-1] & 0x0000FFFF);
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[2] = ((dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-2] & 0xFFFF0000) >> 16);
		    FilterObjectdataStore.FilterElementInfo[k].HistoBufferUsage[3] = ((dataStore.GRIFC.filter_status[dataStore.GRIFC.filter_status.length-1] & 0xFFFF0000) >> 16);
		}
		else{
		    // Rates for other Filter components are not yet reported in the ODB
		    // FilterObjectBGOSupp
		    // FilterObjectDetTypes
		    // FilterObjectCoincDS
		  
		}
		break;
	    }
	}
    }

    // Grab and unpack to current Link status information
//    The link status odb entries each contain a block of 12 words per link[16 of] for 192 words total, the 12 words are ...
//
//0:event_count  - events sent out of the link receive buffer
//1:link_usage[hi] 2:link_usage[lo] - link idle histogram
//3:buf_usage[hi]  4:buf_usage[lo]  - link buffer use histogram
//5:good fragment count - received on the link
//6:frag_late           -
//7:frag:err            - format error in event-fragment
//8:ev_pkts 9:ptr_pkts 10:par_pkts     [packets are 64bits]
//11:link_errors                      [per clock]
//
//NOTE each of words 1-4 contain a pair of 16bit values
//
//late => event received on grifc more than 160us after being produced
    FilterInputLinkRate = [];
    FilterInputLinkUsage = [];
    FilterInputBufferUsage = [];
    for(i=0; i<FilterNumInputLinks; i++){
	FilterInputLinkRate[i] = dataStore.GRIFC.link_statusM[i*5];
	var bin1 = ((dataStore.GRIFC.link_statusM[i*5+1] & 0xFFFF0000) >> 16); 
	var bin2 = (dataStore.GRIFC.link_statusM[i*5+1] & 0x0000FFFF); 
	var bin3  = ((dataStore.GRIFC.link_statusM[i*5+2] & 0xFFFF0000) >> 16);
	var bin4  = (dataStore.GRIFC.link_statusM[i*5+2] & 0x0000FFFF);  
	FilterInputLinkUsage.push([bin1, bin2, bin3, bin4]);
	FilterInputLinkUsageMean[i] = ((bin1*0.25) + (bin2*0.50) + (bin3*0.75) + (bin4*1.0)) / (bin1+bin2+bin3+bin4);
	
	var bin1 = ((dataStore.GRIFC.link_statusM[i*5+3] & 0xFFFF0000) >> 16);
	var bin2 = (dataStore.GRIFC.link_statusM[i*5+3] & 0x0000FFFF); 
	var bin3 = ((dataStore.GRIFC.link_statusM[i*5+4] & 0xFFFF0000) >> 16); 
	var bin4 = (dataStore.GRIFC.link_statusM[i*5+4] & 0x0000FFFF); 
	FilterInputLinkBufferUsage.push([bin1, bin2, bin3, bin4]);
    }
	
    // Display the numbers in the Filter Objects
    for(i=0; i<FilterObjectID.length; i++){
	
	// First populate the Det Type Titles
        FilterObjectName = 'FilterObjectIDReportTitles['+i+']';
        if(FilterObjectID[i] == 'FilterObjectBGOSupp'){
	    document.getElementById('FilterTableReportTitles').innerHTML = 'GRGa:<br>GRGb:<br>GRS:<br>'; 
        }else if(FilterObjectID[i] == 'FilterObjectDetTypes' || FilterObjectID[i] == 'FilterObjectCoincDS'){
	    var Namesstring = '';
	    for(j=0; j<9; j++){
		Namesstring = Namesstring + dataStore.ODB.DAQ.params.DetTypes[j] + ':<br>';
	    }
	    document.getElementById(FilterObjectName).innerHTML = Namesstring; 
	    FilterObjectName = 'FilterObjectIDReportTitlesB['+i+']';
	    Namesstring = '';
	    for(j=8; j<dataStore.ODB.DAQ.params.DetTypes.length; j++){
		Namesstring = Namesstring + dataStore.ODB.DAQ.params.DetTypes[j] + ':<br>';
	    }
	    document.getElementById(FilterObjectName).innerHTML = Namesstring; 
        }else{
	    var Namesstring = '';
	    for(j=0; j<dataStore.ODB.DAQ.params.DetTypes.length; j++){
		Namesstring = Namesstring + dataStore.ODB.DAQ.params.DetTypes[j] + ':<br>';
	    }
	    document.getElementById(FilterObjectName).innerHTML = Namesstring; 
        }
	
	// Now populate the rates values
        FilterObjectName = 'FilterObjectIDReportValues['+i+']';
	if(FilterObjectID[i] == 'FilterBufferInput'){
	    document.getElementById(FilterObjectName).innerHTML = BuildFilterRatesValuesString(FilterObjectID[i],'Rate',0,dataStore.ODB.DAQ.params.DetTypes.length);
	}else if(FilterObjectID[i] == 'FilterObjectBGOSupp'){
	    document.getElementById(FilterObjectName).innerHTML = BuildFilterRatesValuesString(FilterObjectID[i],FilterSelectedDisplayType,0,3);
	}else if(FilterObjectID[i] == 'FilterObjectDetTypes' || FilterObjectID[i] == 'FilterObjectCoincDS'){
	    document.getElementById(FilterObjectName).innerHTML = BuildFilterRatesValuesString(FilterObjectID[i],FilterSelectedDisplayType,0,9);
            FilterObjectName = 'FilterObjectIDReportValuesB['+i+']';
	    document.getElementById(FilterObjectName).innerHTML = BuildFilterRatesValuesString(FilterObjectID[i],FilterSelectedDisplayType,8,dataStore.ODB.DAQ.params.DetTypes.length);
	}else{
            document.getElementById(FilterObjectName).innerHTML = BuildFilterRatesValuesString(FilterObjectID[i],FilterSelectedDisplayType,0,dataStore.ODB.DAQ.params.DetTypes.length);
	}
    }
    
    // Color the Input Links from the Secondary level based on the volume of data
	for(i=0; i<dataStore.ODB.DAQ.summary.collectors.titles.length; i++){
	    if(dataStore.ODB.DAQ.summary.collectors.titles[i]==null || i>8){ continue; }
	    LinkID = 'FilterInputLink'+(i);
	    var TotalRate = FilterInputLinkUsageMean[i];
	    LinkColor = PickLinkColor(TotalRate);
            // document.getElementById(LinkID).style.backgroundColor = LinkColor;
	    // Need to also change the color of the psuedo-elements 'before' which cannot be manipulated directly
	    // So the solution is to change the class of the Input links to a class with a pre-defined color.
            document.getElementById(LinkID).classList = 'FilterInputLink' + LinkColor;
        }
    
    
    // Color the Filter Links based on the volume of data
    // Use the mean of the latest Usage histogram
    for (var i = 0; i < FilterObjectdataStore.FilterElementInfo.length; i++){
	if (FilterObjectdataStore.FilterElementInfo[i].Class == 'FilterLink'){
	    var ThisRate = FilterObjectdataStore.FilterElementInfo[i-1].HistoBufferUsage;
	    if(ThisRate.length ==0){
		// Hack because nothing provided from electronics for BGO Supp, Det Types or Coinc/Downscaling yet.
		// Use Time-Ordering usage for these links as well.
		ThisRate = FilterObjectdataStore.FilterElementInfo[3].HistoBufferUsage;
	    }
	    var TotalRate = 0; var Entries = 0;
	    for(j=0; j<ThisRate.length; j++){
		TotalRate += (ThisRate[j]*((1.0/ThisRate.length)*(j+1)));
		Entries += ThisRate[j];
	    }
	    TotalRate = TotalRate / Entries;
	    LinkColor = PickLinkColor(TotalRate);
	    document.getElementById(FilterObjectdataStore.FilterElementInfo[i].ID).style.backgroundColor = LinkColor;
	    if(FilterObjectdataStore.FilterElementInfo[i].ID == 'FilterLink2'){ MultiLinkColor = LinkColor; }
	}
    }
    var elements = document.getElementsByClassName('FilterMultiLink');
    for (var i = 0; i < elements.length; i++){
	elements[i].style.backgroundColor = MultiLinkColor;
    }
    
    // Color the Output Links to MIDAS based on the volume of data
    // dataStore.ODB.Equipment_Trigger_Statistics['Events per sec.'].toFixed()
    // dataStore.ODB.Equipment_Trigger_Statistics['kBytes per sec.'].toFixed()
    LinkID = 'FilterOutputLink0';
    var TotalRate = (dataStore.ODB.Equipment_Trigger_Statistics['kBytes per sec.'].toFixed()) / (95000); // Max value set to 95MB
    LinkColor = PickLinkColor(TotalRate);
    //document.getElementById(LinkID).style.backgroundColor = LinkColor;
    document.getElementById(LinkID).classList = 'FilterInputLink' + LinkColor;
    
    // Display the detailed numbers, and any histogram, for the selected Filter Element in the Report Table after
    // generating the appropriate statistics report based on which Filter element has been selected.
    if (FilterSelectedElementID.indexOf("FilterOutput") >= 0){ ReportOutputLink(); }
    if (FilterSelectedElementID.indexOf("FilterLink") >= 0)  { ReportLink();       }
    if (FilterSelectedElementID.indexOf("FilterBuffer") >= 0){ ReportBuffer();     }
    if (FilterSelectedElementID.indexOf("FilterObject") >= 0){ ReportObject();     }
    if (FilterSelectedElementID.indexOf("FilterInput") >= 0) { ReportInputLink();  }
}

function createBarchart(targetDiv, PSClabels, requests, accepts, plotTitle, xTitle, yTitle){
    // re-create the specified histogram

    var layout = {
            barmode: 'group',
            title: plotTitle,
            xaxis: {
                title: xTitle,
                ticktext: PSClabels
            },
            yaxis: {
                title: yTitle
            }
        },
        req = {
          x: PSClabels,
          y: requests,
          name: 'Requests',
          type: 'bar',

        },
        acpt = {
          x: PSClabels,
          y: accepts,
          name: 'Accepts',
          type: 'bar'
        };

    //collectors
    Plotly.newPlot(targetDiv, [req, acpt], layout);
}

function createFilterBarchart(targetDiv, labels, usage, plotTitle, xTitle, yTitle){
    // re-create the specified histogram

    var layout = {
            barmode: 'group',
            title: plotTitle,
            xaxis: {
                title: xTitle,
                ticktext: labels
            },
            yaxis: {
                title: yTitle
            }
        },
        use = {
          x: labels,
          y: usage,
          name: 'Usage',
          type: 'bar',

        };

    //collectors
    Plotly.newPlot(targetDiv, [use], layout);
}

// Function to return a color to represent a scale between 0.0 and 1.0
// Input number must be between 0.0 and 1.0
function PickLinkColor(Rate){
    if(Rate>1.0){ return null; }
    var LinkColor;
    if(Rate >= 0.8 ){ LinkColor = 'Red'; }
    else if(Rate >= 0.6 ){ LinkColor = 'DarkOrange';  }
    else if(Rate >= 0.4 ){ LinkColor = 'Gold';  }
    else if(Rate >= 0.2 ){ LinkColor = 'YellowGreen';  }
    else if(Rate == 0.0 ){ LinkColor = 'DimGrey';  }
    else { LinkColor = 'Green';  }
    return LinkColor;
}

/////////////////////////////
// Filter Display functions
/////////////////////////////

function FilterElementSelection(ElementID){
    //This function saves the selected Filter element ID which is used to determine what values are displayed in the detailed view
    FilterSelectedElementID = ElementID;
    repaint();
}

function ReportOutputLink(){
// Unique report for the UDP output link to MIDAS
    document.getElementById("FilterReportTable").innerHTML = '';
    document.getElementById('FilterTableTitleDiv').innerHTML = "UDP link to MIDAS from Primary GRIF-C.";
}

function ReportInputLink(){
    // Reports for whichever Secondary-Primary input link is selected
    document.getElementById("FilterReportTable").innerHTML = '';
    var ColNum = FilterSelectedElementID.replace( /^\D+/g, '');
    document.getElementById('FilterTableTitleDiv').innerHTML = 'Input link from GRIF-C Collector'+ColNum+' to Primary GRIF-C.<BR><div id="FilterLinkHistoSelect">Input-Link Histrogram Type: <select id="FilterSelectedInputLinkHisto"></select></div>';

    // Set up the select
    var select = document.getElementById('FilterSelectedInputLinkHisto');   
    var opt = document.createElement('option');
    opt.value = 'LinkUsage';
    opt.innerHTML = 'Link usage';
    select.add(opt);
    opt = document.createElement('option');
    opt.value = 'BufferUsage';
    opt.innerHTML = 'Link event buffer usage';
    select.add(opt);
    
    if(FilterSelectedInputLinkHistoType == 'BufferUsage'){
	select.options.selectedIndex = 1;
    }else{
	// Link Usage
	select.options.selectedIndex = 0;
    }

    select.onchange = function(){
	// Function executed when the select is changed.
	// Save the setting and repaint the histogram
	FilterSelectedInputLinkHistoType = document.getElementById('FilterSelectedInputLinkHisto').value;
	DrawFilterLinkHisto(ColNum);
    }

    // Write content into the Report
    document.getElementById("FilterReportTable").innerHTML = '<tr><td width="270px">Mean link usage in past 10 seconds: ' + (FilterInputLinkUsageMean[ColNum]*100.0) + '%</td></tr>';
    
    // Draw the histogram
    DrawFilterLinkHisto(ColNum);
    
}


function DrawFilterLinkHisto(ColNum){
    if(FilterSelectedInputLinkHistoType == 'BufferUsage'){
	var titleString = 'Collector'+ColNum+' Link event buffer usage over past 10s';
	//Filter Input Link Buffer Usage plot   
	createFilterBarchart(
            'FilterHisto', 
            HistoLinkUsageTitles, 
            FilterInputLinkBufferUsage[ColNum],
	    titleString, 'Percentage of full capacity', 'Usage per ms'
	);
    }else{
	// Other option is (FilterSelectedInputLinkHistoType == 'LinkUsage')
	//Filter Input Link Usage plot   
	var titleString = 'Collector'+ColNum+' Link usage over past 10s';
	//Filter Input Link Usage plot   
	createFilterBarchart(
            'FilterHisto', 
            HistoLinkUsageTitles, 
            FilterInputLinkUsage[ColNum],
	    titleString, 'Percentage of full capacity', 'Usage per ms'
	);
    }
}

function ReportLink(){
    // Reports for whichever Link between Filter objects is selected
    document.getElementById("FilterReportTable").innerHTML = '';
    var LinkNum = FilterSelectedElementID.replace( /^\D+/g, '');
    document.getElementById('FilterTableTitleDiv').innerHTML = "Statistics for Link"+LinkNum+" between Filter elements.";    
}

function ReportBuffer(){
    // Reports for the buffer object that is selected
    document.getElementById('FilterTableTitleDiv').innerHTML = getFilterObjectHTMLByID(FilterSelectedElementID);
    
    document.getElementById("FilterReportTable").innerHTML = '';
    var cell = [];
    var row = document.getElementById("FilterReportTable").insertRow(document.getElementById("FilterReportTable").rows.length);
    for(j=0; j<4; j++){ cell[j] = row.insertCell(j); }
    cell[0].innerHTML = 'Det Type';
    cell[1].innerHTML = 'Num Evts';
    cell[2].innerHTML = '% of all';
    cell[3].innerHTML = '% of Input';
    for(num=0; num<dataStore.ODB.DAQ.params.DetTypes.length; num++){
	var row = document.getElementById("FilterReportTable").insertRow(document.getElementById("FilterReportTable").rows.length);
	for(j=0; j<4; j++){ cell[j] = row.insertCell(j); }
	cell[0].innerHTML = dataStore.ODB.DAQ.params.DetTypes[num]+':';
	cell[1].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'Rate',num);
	cell[2].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'PercentTot',num);
	cell[3].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'PercentIn',num);
    }

    // Create Usage Histograms if available
    if(FilterSelectedElementID == "FilterBufferInput"){
	//Filter Input Buffer Usage plot   
	createFilterBarchart(
            'FilterHisto', 
            HistoBufferUsageTitles, 
            FilterObjectdataStore.FilterElementInfo[1].HistoBufferUsage,
        'Input buffer memory usage over past 10s', 'Percentage of full capacity', 'Usage per ms'
	);
    }
}

function ReportObject(){
// Reports for whichever Filter Object is selected
    document.getElementById("FilterReportTable").innerHTML = '';
    document.getElementById('FilterTableTitleDiv').innerHTML = getFilterObjectHTMLByID(FilterSelectedElementID);
    
    var cell = [];
    var row = document.getElementById("FilterReportTable").insertRow(document.getElementById("FilterReportTable").rows.length);
    for(j=0; j<4; j++){ cell[j] = row.insertCell(j); }
    cell[0].innerHTML = 'Det Type';
    cell[1].innerHTML = 'Num Evts';
    cell[2].innerHTML = '% of all';
    cell[3].innerHTML = '% of Input';
    for(num=0; num<dataStore.ODB.DAQ.params.DetTypes.length; num++){
	var row = document.getElementById("FilterReportTable").insertRow(document.getElementById("FilterReportTable").rows.length);
	for(j=0; j<4; j++){ cell[j] = row.insertCell(j); }
	cell[0].innerHTML = dataStore.ODB.DAQ.params.DetTypes[num]+':';
	cell[1].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'Rate',num);
	cell[2].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'PercentTot',num);
	cell[3].innerHTML = BuildSingleFilterRateValue(FilterSelectedElementID,'PercentIn',num);
    }

    // Create Usage Histograms if available
    if(FilterSelectedElementID == "FilterObjectTimeOrdering"){
	//Filter Time-Ordering Buffer Usage plot   
	createFilterBarchart(
            'FilterHisto', 
            HistoBufferUsageTitles, 
            FilterObjectdataStore.FilterElementInfo[3].HistoBufferUsage,
        'Time-ordering buffer memory usage over past 10s', 'Percentage of full capacity', 'Usage per ms'
	);
    }
}

function getFilterObjectHTMLByID(ElementID) {
    var HTMLString = '';
    
    for (var i = 0; i < FilterObjectdataStore.FilterElementInfo.length; i++){
	if (FilterObjectdataStore.FilterElementInfo[i].ID == ElementID){
	    HTMLString = FilterObjectdataStore.FilterElementInfo[i].HTML;
	    break;
	}
    }
    return HTMLString;

}

function BuildFilterRatesValuesString(ElementID,DisplayType,FirstReportValue,LastReportValue){
    // ElementID is the Div that the rates will be displayed in.
    // DisplayType is the choice of reporting; Evts/s, Percentage of incoming or Percentage of capacity.
    var OutgoingReportValues = [];
    
    for (var i = 0; i < FilterObjectdataStore.FilterElementInfo.length; i++){
	if (FilterObjectdataStore.FilterElementInfo[i].ID == ElementID){
	    OutgoingReportValues = FilterObjectdataStore.FilterElementInfo[i].Rate;
	    break;
	}
    }
    if(DisplayType == 'PercentIn'){
	InitialReportValues = FilterObjectdataStore.FilterElementInfo[1].Rate;
    }

    // Check the requested values are within the bounds
    if(FirstReportValue>OutgoingReportValues.length){
	console.log('Error in BuildFilterRatesValuesString(): First ('+FirstReportValue+') and Last ('+LastReportValue+') requested values are out of bounds for '+ElementID+'!');
	return 'Err';
    }
    if(LastReportValue>OutgoingReportValues.length){
	console.log('Error in BuildFilterRatesValuesString(): Last ('+LastReportValue+') requested value is out of bounds for '+ElementID+'!');
	return 'Err';
    }
    
    string = '';
    for(i=FirstReportValue; i<LastReportValue; i++){
	if(DisplayType == 'PercentCap'){
	    percent = (OutgoingReportValues[i]/MaxValue) * 100.0;
	    string = string+percent.toFixed(2)+'%<br>';
	}
	else if(DisplayType == 'Rate'){
	    /*
	    if(OutgoingReportValues[i]>10000000000){ string = string+(OutgoingReportValues[i]/1000000000.0).toFixed(1)+'B<br>'; }
	    else if(OutgoingReportValues[i]>500000000){ string = string+(OutgoingReportValues[i]/1000000000.0).toFixed(2)+'B<br>'; }
	    else if(OutgoingReportValues[i]>10000000){ string = string+(OutgoingReportValues[i]/1000000.0).toFixed(1)+'M<br>'; }
	    else if(OutgoingReportValues[i]>500000){ string = string+(OutgoingReportValues[i]/1000000.0).toFixed(2)+'M<br>'; }
	    else if(OutgoingReportValues[i]>1000){ string = string+(OutgoingReportValues[i]/1000.0).toFixed(1)+'k<br>'; }
	    else{ string = string+OutgoingReportValues[i].toFixed(0)+'<br>'; }
	    */
	    string = string+OutgoingReportValues[i].toFixed(0)+'<br>';
	}
	else{
	    // Here need to calculate the percentage relative to the number of events at the Input Buffer
	    percent = (OutgoingReportValues[i]/InitialReportValues[i]) * 100.0;
	    string = string+percent.toFixed(1)+'%<br>';
	}
    }
    return string;
}

function BuildSingleFilterRateValue(ElementID,DisplayType,ValueIndex){
    // ElementID is the Div that the rates will be displayed in.
    // DisplayType is the choice of reporting; Evts/s, Percentage of incoming or Percentage of capacity.
    
    var OutgoingReportValues = [];
    
    for (var i = 0; i < FilterObjectdataStore.FilterElementInfo.length; i++){
	if (FilterObjectdataStore.FilterElementInfo[i].ID == ElementID){
	    OutgoingReportValues = FilterObjectdataStore.FilterElementInfo[i].Rate;
	    break;
	}
    }
    if(DisplayType == 'PercentIn'){
	InitialReportValues = FilterObjectdataStore.FilterElementInfo[1].Rate;
    }
    
    string = '';
    i=ValueIndex;
    if(DisplayType == 'PercentTot'){
	percent = (OutgoingReportValues[i]/OutgoingReportValues.reduce((a, b) => a + b)) * 100.0;
	string = percent.toFixed(3)+'%';
    }
    else if(DisplayType == 'PercentCap'){
	percent = (OutgoingReportValues[i]/MaxValue) * 100.0;
	string = percent.toFixed(3)+'%';
    }
    else if(DisplayType == 'Rate'){
	string = OutgoingReportValues[i].toFixed(0);
    }
    else{
	// Here need to calculate the percentage relative to the number of events at the Input Buffer
	percent = (OutgoingReportValues[i]/InitialReportValues[i]) * 100.0;
	string = percent.toFixed(3)+'%';
    }
    return string;
}


/////////////////////
// dom wrangling
/////////////////////

function updateDigitizerList(digiSelectID){
    //update the options in the select element digiSelectID with the digitizer addresses in the collector on primaryChannel

    var digiSelect = document.getElementById('digitizerPicker'),
        primaryChannel = dataStore.digiCollectorValue,
        i, option, first;

    digiSelect.innerHTML = '';
    first = true;
    for(i=0; i<dataStore.ODB.DAQ.summary.digitizers.titles[primaryChannel].length; i++){
        if(dataStore.ODB.DAQ.summary.digitizers.titles[primaryChannel][i]){
            option = document.createElement('button');
            option.setAttribute('type', 'button');
            option.setAttribute('class', 'btn btn-default');
            option.setAttribute('value', dataStore.ODB.DAQ.summary.digitizers.titles[primaryChannel][i].slice(3,4));
            option.onclick = function(){
                activeButton('digitizerPicker', this);
                dataStore.digitizerValue = this.value;
                repaint();
            }.bind(option);
            option.innerHTML = dataStore.ODB.DAQ.summary.digitizers.titles[primaryChannel][i];
            digiSelect.appendChild(option);   

            // default to the first digitizer:
            if(first){
                activeButton('digitizerPicker', option);
                dataStore.digitizerValue = option.value;
                first = false;
            }        
        }
    }
}

////////////////////////////////
// Subpage controls
////////////////////////////////


function menuButtonClick(thisID){

    // set default state to all buttons
    for(i=0; i<buttonIDs.length; i++){
       document.getElementById(buttonIDs[i]).setAttribute('class', 'btn btn-default btn-lg');
    }

    //set selected button active state
    document.getElementById(thisID).classList.add('btn-warning');

    // Hide all pages
    for(i=0; i<buttonIDs.length; i++){
    document.getElementById(subpageWrappers[i]).classList.add('hidden');
     if(buttonIDs[i] == thisID){
        // unhide the one we want and display the message text
       document.getElementById(subpageWrappers[i]).classList.remove('hidden');
       document.getElementById('daqMessageDiv').innerHTML = subpageMessageText[i];
     }
    }

}








