var chart;
var scrollB;
var scrollF;
var updateDataPoints;
var maxDatapointNumber;
var minimumXIndex;
var dataUpdateInterval = 500;
var startRecord = false;
var activeChart = false;
var timeoutLoop;
var tooltipRelativeYPosition;
var tooltipRelativeXPosition;

var xAxisData;
var checkTime;
var byte_code_bytes;
var string_bytes;
var property_bytes;
var object_bytes;
var allocated_bytes;

function EstimatedTime(){
  this.hour = 0;
  this.minute = 0;
  this.second = 0;
  this.millisecond = 0;

  this.increment = function (){
    this.millisecond += dataUpdateInterval / 100;
    if(this.millisecond >= 10){
      this.second += 1;
      this.millisecond -=10;
    }
    if(this.second == 60){
      this.minute += 1;
      this.second = 0;
    }
    if(this.minute == 60){
      this.hour += 1;
      this.minute = 0;
    }
    if(this.hour == 24){
      this.reset();
    }
  };

  this.toString = function(){
    var sign = "-";
    if(this.hour == 0 && this.minute == 0 && this.second == 0 && this.millisecond == 0) sign = "";
    return sign + this.minute + ":" + this.second + "." + this.millisecond;
  };

  this.reset = function(){
    this.hour = 0;
    this.minute = 0;
    this.second = 0;
    this.minute = 0;
  };
}

function initChart(redraw = undefined)
{
  if(redraw === undefined)
  {
    initVariables();
    chart = c3.generate({
      data: {
        x: 'x',
        bindto: '#chart',
        columns: [
            xAxisData,
            byte_code_bytes,
            string_bytes,
            property_bytes,
            object_bytes,
            allocated_bytes
        ],
        types: {
            byte_code_bytes: 'area',
            string_bytes: 'area',
            property_bytes: 'area',
            object_bytes: 'area',
            allocated_bytes: 'area'
        },
        order: null,
        groups: [['byte_code_bytes', 'string_bytes', 'property_bytes', 'object_bytes', 'allocated_bytes']],
        onclick: function (d, element) { markSelectedLine(d, element); }

      },
      axis:{
        x: {
          type: 'category',
          tick: {
            rotate: -75,
            multiline: false,
            culling: {
              max: 10
            }
          },
          height: 55
        },
        y: {
          tick: {
            format: function (d) { return Math.round(d) + " B"; },
            count: 6
          }
        }
      },
      point: {
        r: 2,
        focus: {
          expand: {
            enabled: false
          }
        }
      },
      tooltip: {
        position: function(data, width, height, thisElement)
        {
          /*var element = document.getElementById("chart");
          var tooltipWidth = element.querySelector('.c3-tooltip-container').clientWidth;
          var x = parseInt($(thisElement).attr("x")) + 3 * (tooltipWidth) / 8;*/  /*Another alternative, if choose this return left value must be x*/
          return { top: tooltipRelativeYPosition, left: tooltipRelativeXPosition };
        }
      },
      transition: {
        duration: 0
      }
    });
    document.getElementById("chart").addEventListener("mousewheel", MouseWheelHandler);
    document.getElementById("chart").addEventListener("DOMMouseScroll", MouseWheelHandler);
    document.getElementById("chart").addEventListener("mousemove", function(e){
      tooltipRelativeYPosition = e.clientY - document.getElementById("chart").getBoundingClientRect().top;
      tooltipRelativeXPosition = e.clientX - document.getElementById("chart").getBoundingClientRect().left;
    });
  }
  else
  {
    updateScrolledChart();
  }
}

function updateminimumXIndex()
{
  minimumXIndex = xAxisData.length - (maxDatapointNumber + 1);
  return minimumXIndex;
}

function addNewDataPoints(data, breakpointInformation) {
  checkTime.push(breakpointInformation);
  var counter = 1;
  if(breakpointInformation.includes("ln"))
  {
    for (var i = maxDatapointNumber; i < xAxisData.length; i++)
    {
      if (xAxisData[i].includes(breakpointInformation))
      {
        counter ++;
      }
    }

    if (counter == 1)
    {
      xAxisData.push(breakpointInformation);
    }
    else
    {
      xAxisData.push("#" + counter + " " + breakpointInformation);
    }

  }
  else
  {
    var timeToChart = new EstimatedTime();
    var i = xAxisData.length - 1;
    xAxisData.push(timeToChart.toString());
    while(i > maxDatapointNumber)
    {
      if (!xAxisData[i].includes("ln")) {
        timeToChart.increment();
        xAxisData[i] = timeToChart.toString();
      }
      i--;
    }
  }

  byte_code_bytes.push(data[1]);
  string_bytes.push(data[2]);
  property_bytes.push(data[4]);
  object_bytes.push(data[3]);
  allocated_bytes.push(data[0]);


  if(xAxisData.length <= maxDatapointNumber + 1)
  {
    chart.load({
      columns: [
          xAxisData,
          byte_code_bytes,
          string_bytes,
          property_bytes,
          object_bytes,
          allocated_bytes
      ]
    });
  }
  else
  {
      minimumXIndex++;
    updateScrolledChart();
  }
}

function MouseWheelHandler(e)
{
  e.wheelDelta > 0 ? scrollForward() : scrollBack();
}

function scrollBack()
{
  if(xAxisData.length >=maxDatapointNumber + 1 && minimumXIndex > maxDatapointNumber + 1)
  {
    minimumXIndex --;
    updateScrolledChart();
  }
}

function scrollForward()
{
  if(xAxisData.length > maxDatapointNumber + minimumXIndex)
  {
    minimumXIndex ++;
    updateScrolledChart();
  }
}

function updateScrolledChart()
{
  chart.load({
    columns: [
        [xAxisData[0]].concat(xAxisData.slice(minimumXIndex, maxDatapointNumber + minimumXIndex)),
        [byte_code_bytes[0]].concat(byte_code_bytes.slice( minimumXIndex, maxDatapointNumber + minimumXIndex)),
        [string_bytes[0]].concat(string_bytes.slice( minimumXIndex, maxDatapointNumber + minimumXIndex)),
        [property_bytes[0]].concat(property_bytes.slice( minimumXIndex, maxDatapointNumber + minimumXIndex)),
        [object_bytes[0]].concat(object_bytes.slice( minimumXIndex, maxDatapointNumber + minimumXIndex)),
        [allocated_bytes[0]].concat(allocated_bytes.slice(minimumXIndex, maxDatapointNumber + minimumXIndex))
    ]
  });
}

function resetChart()
{
    delete xAxisData;
    delete estimatedTime;
    delete byte_code_bytes;
    delete string_bytes;
    delete property_bytes;
    delete object_bytes;
    delete allocated_bytes;

    document.getElementsByClassName('chart-btn')[0].disabled = true;
    document.getElementsByClassName('chart-btn')[1].disabled = true;
    document.getElementById('record-btn').style.removeProperty('background-color');
    session.unhighlightBreakpointLine();
    initChart();
}

function initVariables()
{
  minimumXIndex = 1;
  maxDatapointNumber = 40;
  xAxisData = ['x',];
  checkTime = ['x',];
  byte_code_bytes = ['byte_code_bytes',];
  string_bytes = ['string_bytes',];
  property_bytes = ['property_bytes',];
  object_bytes = ['object_bytes',];
  allocated_bytes = ['allocated_bytes',];
  var empty_space = " ";
  for (var i = 0; i < maxDatapointNumber; i++)
  {
    xAxisData.push(empty_space);
    checkTime.push(null);
    byte_code_bytes.push(null);
    string_bytes.push(null);
    property_bytes.push(null);
    object_bytes.push(null);
    allocated_bytes.push(null);
    empty_space =  empty_space.concat(" ");
  }
}

function disableChartButtons()
{
  activeChart = false;
  var list = document.getElementsByClassName('chart-btn');
  for (var i = 0; i < list.length; i++) {
    list[i].disabled = true;
  }
  document.getElementById('record-btn').style.removeProperty('background-color');
}

function startChartWithButton()
{
  startRecord = true;
  activeChart = true;
  client.debuggerObj.encodeMessage("B", [ ClientPackageType.JERRY_DEBUGGER_MEMSTATS ]);
}

function stopChartWithButton()
{
  activeChart = false;
  document.getElementsByClassName('chart-btn')[0].disabled = false;
  document.getElementsByClassName('chart-btn')[1].disabled = true;
  document.getElementsByClassName('chart-btn')[2].disabled = false;
  document.getElementById('record-btn').style.backgroundColor = "#e22b1b";
}

function exportMemoryUsageData()
{
  if(xAxisData.length == 1)
  {
    alert("There is nothing to be exported!");
    return;
  }
  var data = [[xAxisData[0]].concat(xAxisData.slice(maxDatapointNumber + 1)),
            [byte_code_bytes[0]].concat(byte_code_bytes.slice(maxDatapointNumber + 1)),
            [string_bytes[0]].concat(string_bytes.slice(maxDatapointNumber + 1)),
            [property_bytes[0]].concat(property_bytes.slice(maxDatapointNumber + 1)),
            [object_bytes[0]].concat(object_bytes.slice(maxDatapointNumber + 1)),
            [allocated_bytes[0]].concat(allocated_bytes.slice(maxDatapointNumber + 1))];
  data[0][0] = "Checked at:";
  var csv = '';
    data.forEach(function(row) {
            csv += row.join(',');
            csv += "\n";
    });

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'memoryUsage.csv';
    hiddenElement.click();
}

function markSelectedLine(d) {
  var lineNumber;
  if (checkTime[d.x + minimumXIndex].startsWith("ln"))
  {
    lineNumber = checkTime[d.x + minimumXIndex].split("ln: ")[1];
  }
  else
  {
    lineNumber = checkTime[d.x + minimumXIndex].split("#")[1].split(":")[0];
  }
  logger.info("----- Line: " + lineNumber + "-----");
  logger.info("Allocated bytes: " + allocated_bytes[d.x + minimumXIndex] + " B");
  logger.info("Byte code bytes: " + byte_code_bytes[d.x + minimumXIndex] + " B");
  logger.info("String bytes: " + string_bytes[d.x + minimumXIndex] + " B");
  logger.info("Object bytes: " + object_bytes[d.x + minimumXIndex] + " B");
  logger.info("Property bytes: " + property_bytes[d.x + minimumXIndex] + " B");
  session.highlightBreakPointLine(lineNumber);
}
