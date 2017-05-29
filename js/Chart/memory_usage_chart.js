var chart;
var scrollB;
var scrollF;
var updateDataPoints;
var maxDatapointNumber;
var minimumXIndex;
var dataUpdateInterval = 500;
var scrollable;

var checkTime;
var byte_code_bytes;
var string_bytes;
var property_bytes;
var object_bytes;
var allocated_bytes;

function initChart(redraw = undefined)
{
	if(redraw === undefined)
	{
		initVariables();
		chart = c3.generate({
			data: {
				x: 'x',
				bindto: '#chart',
				transition: {
					duration: 0
				},
				columns: [
						checkTime,
						byte_code_bytes,
						string_bytes,
						property_bytes,
						object_bytes,
						allocated_bytes
				],
				types: {
						byte_code_bytes: 'area-spline',
						string_bytes: 'area-spline',
						property_bytes: 'area-spline',
						object_bytes: 'area-spline',
						allocated_bytes: 'area-spline'
				},
	      order: null,
				groups: [['byte_code_bytes', 'string_bytes', 'property_bytes', 'object_bytes', 'allocated_bytes']]

			},
			axis:{
				x: {
					type: 'category',
					tick: {
						culling: false,
						rotate: 10,
					}
				},
				y: {
					tick: {
						format: function (d) { return Math.round(d) + " B"; },
						count: 6
					}
				}
			}
		});
		document.getElementById("chart").addEventListener("mousewheel", MouseWheelHandler);
		document.getElementById("chart").addEventListener("DOMMouseScroll", MouseWheelHandler);
		/*
		TODO: FIX scroll when mouse of of memoryUsage-wrapper
		document.getElementById("memoryUsage-wrapper").addEventListener("mouseenter", function() {document.getElementsByTagName('body')[0].style.overflow = "hidden";});
		document.getElementById("memoryUsage-wrapper").addEventListener("mouseout", function() {document.getElementsByTagName('body')[0].style.overflow = "scroll";});
		*/
	}
	else
	{
		updateScrolledChart();
	}
}

function updateminimumXIndex()
{
	minimumXIndex = checkTime.length - (maxDatapointNumber + 1);
	return minimumXIndex;
}

function addNewDataPoints(data, breakpointInformation = undefined) {
	if(breakpointInformation === undefined)
	{
		checkTime.push(new Date().toISOString().slice(14, 21));
	}
	else if(checkTime.indexOf(breakpointInformation) === -1)
	{
			checkTime.push(breakpointInformation);
	}
	else
	{
		return;
	}

	byte_code_bytes.push(data[1]);
	string_bytes.push(data[2]);
	property_bytes.push(data[4]);
	object_bytes.push(data[3]);
	allocated_bytes.push(data[0]);

	if(checkTime.length <= maxDatapointNumber + 1)
	{
		chart.load({
			columns: [
					checkTime,
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

function stopUpdateDataPoints()
{
	clearInterval(updateDataPoints);
	scrollable = true;
}

function startUpdateDataPoints(data)
{
	stopUpdateDataPoints();
	scrollable = false;

	function loopUpdate()
	{
		addNewDataPoints(data);
	}

	updateDataPoints = setInterval(loopUpdate, dataUpdateInterval);
	scrollable = false;
}

function MouseWheelHandler(e)
{
	e.wheelDelta > 0 ? scrollForward() : scrollBack();
}

function scrollBack()
{
	if(checkTime.length >= maxDatapointNumber + 1 && minimumXIndex > 1 && scrollable === true)
	{
		minimumXIndex --;
		updateScrolledChart();
	}
}

function scrollForward()
{
	if(checkTime.length > maxDatapointNumber + minimumXIndex && scrollable === true)
	{
		minimumXIndex ++;
		updateScrolledChart();
	}
}

function updateScrolledChart()
{
	chart.load({
		columns: [
				[checkTime[0]].concat(checkTime.slice(minimumXIndex, maxDatapointNumber + minimumXIndex)),
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
		delete checkTime;
		delete byte_code_bytes;
		delete string_bytes;
		delete property_bytes;
		delete object_bytes;
		delete allocated_bytes;
		initChart();
}

function initVariables()
{
	scrollable = true;
	minimumXIndex = 1;
	maxDatapointNumber = 8;
	checkTime = ['x',];
	byte_code_bytes = ['byte_code_bytes',];
	string_bytes = ['string_bytes',];
	property_bytes = ['property_bytes',];
	object_bytes = ['object_bytes',];
	allocated_bytes = ['allocated_bytes',];
}
