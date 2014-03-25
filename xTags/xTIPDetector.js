//status bar
(function(){  

    xtag.register('detector-TIPWall', {
        //prototype: Object.create(HTMLElement.prototype),
        extends: 'detector-template',
        lifecycle: {
            created: function() {
                //channels start at top left hand corner and walk across in rows
                var channels = ['TPW011P00X', 'TPW012P00X', 'TPW013P00X', 'TPW014P00X', 'TPW015P00X',
                                'TPW010P00X', 'TPW002P00X', 'TPW003P00X', 'TPW004P00X', 'TPW016P00X',
                                'TPW009P00X', 'TPW001P00X', 'TPW005P00X', 'TPW017P00X',
                                'TPW024P00X', 'TPW008P00X', 'TPW007P00X', 'TPW006P00X', 'TPW018P00X',
                                'TPW023P00X', 'TPW022P00X', 'TPW021P00X', 'TPW020P00X', 'TPW019P00X'
                                ]
                    
                    URLs = ["http://midtig06.triumf.ca:8091/mother/parameters?jsonp=parseThreshold",    //threshold server
                            "http://midtig06.triumf.ca:8091/mother/scalar?jsonp=parseRate",             //rate server
                            'http://annikal.triumf.ca:8082/?cmd=jcopy&odb0=Equipment/&encoding=json-p-nokeys&callback=fetchODBEquipment'];  //ODB Equipment tree

                //deploy the standard stuff
                initializeSingleViewDetector.bind(this, 'TIP', channels, 'TIP Wall', URLs)();

                //////////////////////////////////////
                //TIP Wall specific drawing parameters
                //////////////////////////////////////
                this.cellSide = this.height*0.8/5;              //length of cell side
                this.x0 = this.width/2 - 2.5*this.cellSide;     //x coordinate of upper left corner of TIP image
                this.y0 = 0;                                    //y ''

                /////////////////////////////
                //Initialize visualization
                /////////////////////////////
                //initialize all the cells:
                this.instantiateCells();
                //generate the color scale
                this.generateColorScale();
            },
            inserted: function() {},
            removed: function() {},
            attributeChanged: function() {}
        }, 
        events: { 

        },
        accessors: {

        }, 
        methods: {
            'instantiateCells': function(){
                var i, iOffset, X, Y;

                //each channel listed in this.channelNames gets an entry in this.cells as a Kinetic object:
                for(i=0; i<this.channelNames.length; i++){
                    iOffset = i;
                    if(i>11) iOffset++; //skip the middle square in the grid

                    //coords of top left corner of this cell
                    X = this.x0 + this.cellSide*(iOffset%5);    
                    Y = this.y0 + this.cellSide*Math.floor(iOffset/5);

                    this.cells[this.channelNames[i]] = new Kinetic.Line({
                        points: [X,Y, X+this.cellSide,Y, X+this.cellSide,Y+this.cellSide, X,Y+this.cellSide],
                        fill: '#000000',
                        fillPatternImage: this.errorPattern,
                        stroke: this.frameColor,
                        strokeWidth: this.frameLineWidth,
                        closed: true,
                        listening: true
                    });

                    //set up the tooltip listeners:
                    this.cells[this.channelNames[i]].on('mouseover', this.writeTooltip.bind(this, i) );
                    this.cells[this.channelNames[i]].on('mousemove', this.moveTooltip.bind(this) );
                    this.cells[this.channelNames[i]].on('mouseout', this.writeTooltip.bind(this, -1));

                    //add the cell to the main layer
                    this.mainLayer.add(this.cells[this.channelNames[i]]);
                }

                //add the layers to the stage
                this.stage.add(this.mainLayer);
                this.stage.add(this.tooltipLayer);
            },

            'updateCells': function(){
                var i, color, rawValue, colorIndex, 
                    currentMin = this.min[this.currentView], 
                    currentMax = this.max[this.currentView],
                    isLog = this.scaleType[this.currentView] == 'log';

                //get the scale limits right
                if(isLog){
                    currentMin = Math.log10(currentMin);
                    currentMax = Math.log10(currentMax);
                }

                //change the color of each cell to whatever it should be now:
                for(i=0; i<this.channelNames.length; i++){
                    //fetch the most recent raw value from the currentData store:
                    if(this.currentView == 'HV'){
                        rawValue = Math.random();
                    } else if (this.currentView == 'Threshold'){
                        rawValue = window.currentData.threshold[this.channelNames[i]];
                    } else if (this.currentView == 'Rate'){
                        rawValue = window.currentData.rate[this.channelNames[i]];
                    }

                    //if no data was found, raise exception code:
                    if(!rawValue && rawValue!=0)
                        rawValue = 0xDEADBEEF;

                    //value found and parsable, recolor cell:
                    if(rawValue != 0xDEADBEEF){
                        if(isLog)
                            rawValue = Math.log10(rawValue);

                        colorIndex = (rawValue - currentMin) / (currentMax - currentMin);
                        color = scalepickr(colorIndex, this.scale);

                        this.cells[this.channelNames[i]].fill(color);
                        this.cells[this.channelNames[i]].setFillPriority('color');

                    //no value reporting, show error pattern
                    } else{
                        this.cells[this.channelNames[i]].setFillPriority('pattern')
                    }
                }
            }
        }
    });

})();
