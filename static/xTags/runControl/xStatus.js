//status bar
(function(){  

    xtag.register('widget-status', {
        extends: 'div',
        lifecycle: {
            created: function() {
                var exptTitle = document.createElement('h2')
                ,   runDetail = document.createElement('ul')
                ,   runNumber = document.createElement('li')
                ,   startTime = document.createElement('li')
                ,   upTime = document.createElement('li')
                ,   stopTime = document.createElement('li')
                ,   runControl = document.createElement('div')
                ,   start = document.createElement('button')
                ,   stop = document.createElement('button')
                ,   pause = document.createElement('button')
                ,   resume = document.createElement('button')
                ,   redirectKludge = document.createElement('button')
                ,   messageList = document.createElement('ul')
                ,   messages = []
                ,   i
                ,   URL = 'http://'+this.MIDAS+'/?cmd=jcopy&odb0=Experiment/&odb1=Runinfo/&encoding=json-p-nokeys&callback=fetchODBrunControl';

                //make sure data store is available
                if(!window.currentData)
                    window.currentData = {};

                for(i=0; i<5; i++){
                    messages[i] = document.createElement('li');
                }

                //headline
                exptTitle.setAttribute('id', 'statusTitle');
                this.appendChild(exptTitle);

                //top level info
                runDetail.setAttribute('id', 'statusRunDetail');
                this.appendChild(runDetail);

                runNumber.setAttribute('id', 'statusRunNumber');
                document.getElementById('statusRunDetail').appendChild(runNumber);

                startTime.setAttribute('id', 'statusStartTime');
                document.getElementById('statusRunDetail').appendChild(startTime);

                upTime.setAttribute('id', 'statusUpTime');
                document.getElementById('statusRunDetail').appendChild(upTime);

                stopTime.setAttribute('id', 'statusStopTime');
                document.getElementById('statusRunDetail').appendChild(stopTime);

                //run control form
                runControl.setAttribute('id', 'runControl');
                this.appendChild(runControl);

                start.setAttribute('id', 'statusStart');
                start.setAttribute('onclick', 'runTransition("'+this.MIDAS+'", "Start")');
                document.getElementById('runControl').appendChild(start);
                document.getElementById('statusStart').innerHTML = 'Start';

                stop.setAttribute('id', 'statusStop');
                stop.setAttribute('onclick', 'runTransition("'+this.MIDAS+'", "Stop")');
                document.getElementById('runControl').appendChild(stop);
                document.getElementById('statusStop').innerHTML = 'Stop';

                pause.setAttribute('id', 'statusPause');
                pause.setAttribute('onclick', 'runTransition("'+this.MIDAS+'", "Pause")');
                document.getElementById('runControl').appendChild(pause);
                document.getElementById('statusPause').innerHTML = 'Pause';

                resume.setAttribute('id', 'statusResume');
                resume.setAttribute('onclick', 'runTransition("'+this.MIDAS+'", "Resume")');
                document.getElementById('runControl').appendChild(resume);
                document.getElementById('statusResume').innerHTML = 'Resume';

                //message list
                messageList.setAttribute('id', 'statusMessageList');
                this.appendChild(messageList);

                for(i=0; i<5; i++){
                    messages[i].setAttribute('id', 'statusMessage'+i);
                    document.getElementById('statusMessageList').appendChild(messages[i]);
                }

                //append data location information to list of URLs to fetch from:
                if(!window.fetchURL)
                    window.fetchURL = [];
                if(window.fetchURL.indexOf(URL) == -1){
                    window.fetchURL[window.fetchURL.length] = URL;
                }

                //let repopulate know that the status bar would like to be updated every loop:
                if(!window.refreshTargets)
                    window.refreshTargets = [];
                window.refreshTargets[window.refreshTargets.length] = this;
                
            },
            inserted: function() {},
            removed: function() {},
            attributeChanged: function() {}
        }, 
        events: { 

        },
        accessors: {
            'MIDAS':{
                attribute: {} //this just needs to be declared
            }
        }, 
        methods: {

            'update': function(){
                var i,
                    date = new Date(),
                    now, uptime, hours, minutes, seconds,
                    runNumber, stoptime,
                    messages;

                //check to make sure the requisite buffers exist:
                if(!window.currentData.ODB.Experiment || !window.currentData.ODB.Runinfo) return;

                runNumber = 'Run ' + window.currentData.ODB.Runinfo['Run number'];
                //show different stuff depending on run state:
                if(window.currentData.ODB.Runinfo.State == 1){
                    //run is stopped
                    runNumber += ' Stopped';
                    document.getElementById('statusStart').style.display = 'inline';
                    document.getElementById('statusStop').style.display = 'none';
                    document.getElementById('statusPause').style.display = 'none';
                    document.getElementById('statusResume').style.display = 'none';
                    stoptime = 'Stopped ' + window.currentData.ODB.Runinfo['Stop time'];
                } else if(window.currentData.ODB.Runinfo.State == 2){
                    //run is paused
                    runNumber += ' Paused';
                    document.getElementById('statusStart').style.display = 'none';
                    document.getElementById('statusStop').style.display = 'none';
                    document.getElementById('statusPause').style.display = 'none';
                    document.getElementById('statusResume').style.display = 'inline';
                } else if(window.currentData.ODB.Runinfo.State == 3){
                    //run is live
                    runNumber += ' Live';
                    document.getElementById('statusStart').style.display = 'none';
                    document.getElementById('statusStop').style.display = 'inline';
                    document.getElementById('statusPause').style.display = 'inline';
                    document.getElementById('statusResume').style.display = 'none';
                }

                //data is present if we get this far, stick it in the correct DOM elements:
                document.getElementById('statusTitle').innerHTML = window.currentData.ODB.Experiment.Name;
                document.getElementById('statusRunNumber').innerHTML = runNumber;
                document.getElementById('statusStartTime').innerHTML = 'Started ' + window.currentData.ODB.Runinfo['Start time'];
                if(stoptime)
                    document.getElementById('statusUpTime').innerHTML = stoptime;
                else{
                    //calculate uptime:
                    now = date.getTime() / 1000;
                    uptime = now - parseInt(window.currentData.ODB.Runinfo['Start time binary'], 16);
                    hours = Math.floor(uptime / 3600);
                    minutes = Math.floor( (uptime%3600)/60 );
                    seconds = Math.floor(uptime%60);
                    document.getElementById('statusUpTime').innerHTML = 'Uptime ' + hours + ' h, ' + minutes + ' m, ' + seconds +' s'
                }

                ODBGetMsg(this.MIDAS, 5);                
                
            }
        }
    });

})();

//JSONP wrapper function def:
function fetchODBrunControl(returnObj){
    if(!window.currentData.ODB)
        window.currentData.ODB = {};
    window.currentData.ODB.Experiment = returnObj[0];
    window.currentData.ODB.Runinfo = returnObj[1];
}

//run control
function runTransition(host,command){
    
    var xmlhttp = new XMLHttpRequest(),
        cmd;

    //Start is too dumb to know how to increment the run number by itself :/
    if(command == 'Start'){
        cmd = command + '&value=' + (window.currentData.ODB.Runinfo['Run number']+1)
    } else
        cmd = command;

    //once this is all dealt with, refresh the display immediately
    xmlhttp.onreadystatechange = function(){
        if(this.readyState == 4)
            rebootFetch();
    }

    //fire
    xmlhttp.open('GET', 'http://'+host+'/?cmd='+cmd, false);
    xmlhttp.send();
    
}

//message fetch
function ODBGetMsg(host, n){
    var xmlhttp = new XMLHttpRequest();

    //once this is all dealt with, refresh the display immediately
    xmlhttp.onreadystatechange = function(){
        var i, messages;

        if(this.readyState == 4){
            messages = this.responseText.split('\n');
            for(i=0; i<messages.length; i++){
                document.getElementById('statusMessage'+i).innerHTML = messages[messages.length-1-i];
            }
        }
            
    }

    //fire
    xmlhttp.open('GET', 'http://'+host+'/?cmd=jmsg&n='+n, false);
    xmlhttp.send();

}