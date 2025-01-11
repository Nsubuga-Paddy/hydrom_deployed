let menu = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');
let sidebar = document.querySelector('.side-bar')


menu.onclick = () => {
    menu.classList.toggle('bx-x');
    navbar.classList.toggle('open');
    sidebar.classList.toggle('open');
}

const categoryLinks = document.querySelectorAll('.categories ul li a');

categoryLinks.forEach(link => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		categoryLinks.forEach(link => parentElement.classList.remove('active'));

		link.parentElement.classList.add('active');
	})
});

function updateClock(){
    var now = new Date();
    var dname = now.getDay(),
    mo = now.getMonth(),
    dnum = now.getDate(),
    yr = now.getFullYear(),
    hou = now.getHours(),
    min = now.getMinutes(),
    sec = now.getSeconds(),
    pe = "AM";

    if(hou == 0){
        hou = 12;
    }
    if(hou > 12){
        hou = hor - 12;
        pe = "PM";
    }

    Number.prototype.pad = function(digits){
        for(var n = this.toString(); n.length < digits; n=0+n);
        return n;
    }

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "November", "December"];
    var week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var ids = ["dayname", "month","daynum","year", "hour", "minutes","seconds","period" ];
    var values = [week[dname], months[mo], dnum.pad(2), yr, hou.pad(2), min, sec, pe];
    for (var i=0; i < ids.length; i++)
    document.getElementById(ids[i]).firstChild.nodeValue = values[i];
}

function initClock(){
    updateClock();
    window.setInterval("updateClock()",1);
}
 
/*Making slider effects for real time monitoring*/
const slider4 = document.querySelector('.slider4');
const leftArrow4 = document.querySelector('.left4');
const rightArrow4 = document.querySelector('.right4');
const indicatorParents4 = document.querySelector('.controls4 ul');

let sectionIndex4 = 0;

function setIndex4(){
    document.querySelector('.controls4 .selected4').classList.remove('selected4'); 
    slider4.style.transform = `translate(${sectionIndex4 * -120}%)`;    
}

const damCount = parseInt(document.querySelector('.controls4').getAttribute('data-dam-count'));

for (let i = 0; i < damCount; i++){
	const indicator = document.createElement('li');
	indicatorParents4.apppendChild(indicator);
}

document.querySelectorAll('.controls4 li').forEach(function(indicator4, ind4) {
	indicator4.addEventListener('click', function() {
		sectionIndex4 = ind4; 
		setIndex4();
		indicator4.classList.add('selected4');
		
	});
  });

  leftArrow4.addEventListener('click', function(){
	sectionIndex4 = (sectionIndex4 > 0) ? sectionIndex4 - 1 : 0;
	indicatorParents4.children[sectionIndex4].classList.add('selected4');
	setIndex4();
  });

  rightArrow4.addEventListener('click', function(){
	sectionIndex4 = (sectionIndex4 < 4) ? sectionIndex4 + 1 : 3; 
	indicatorParents4.children[sectionIndex4].classList.add('selected4');
	setIndex4();
  }); 

//JQuery charts
window.onload = function () {

var options = {
	animationEnabled: true,
	theme: "light2",
	axisX:{
		valueFormatString: "DD MMM"
	},
	axisY: {
		title: "Water Level",
		minimum: 30
	},
	toolTip:{
		shared:true
	},  
	legend:{
		cursor:"pointer",
		verticalAlign: "bottom",
		horizontalAlign: "left",
		dockInsidePlotArea: true,
		itemclick: toogleDataSeries
	},
	data: [{
		type: "line",
		showInLegend: true,
		name: "Redicted Values",
		markerType: "square",
		xValueFormatString: "DD MMM, YYYY",
		color: "#F08080",
		yValueFormatString: "#,##0K",
		dataPoints: [
			{ x: new Date(2017, 10, 1), y: 63 },
			{ x: new Date(2017, 10, 2), y: 69 },
			{ x: new Date(2017, 10, 3), y: 65 },
			{ x: new Date(2017, 10, 4), y: 70 },
			{ x: new Date(2017, 10, 5), y: 71 },
			{ x: new Date(2017, 10, 6), y: 65 },
			{ x: new Date(2017, 10, 7), y: 73 },
			{ x: new Date(2017, 10, 8), y: 96 },
			{ x: new Date(2017, 10, 9), y: 84 },
			{ x: new Date(2017, 10, 10), y: 85 },
			{ x: new Date(2017, 10, 11), y: 86 },
			{ x: new Date(2017, 10, 12), y: 94 },
			{ x: new Date(2017, 10, 13), y: 97 },
			{ x: new Date(2017, 10, 14), y: 86 },
			{ x: new Date(2017, 10, 15), y: 89 }
		]
	},
	{
		type: "line",
		showInLegend: true,
		name: "Actual Values",
		lineDashType: "dash",
		yValueFormatString: "#,##0K",
		dataPoints: [
			{ x: new Date(2017, 10, 1), y: 60 },
			{ x: new Date(2017, 10, 2), y: 57 },
			{ x: new Date(2017, 10, 3), y: 51 },
			{ x: new Date(2017, 10, 4), y: 56 },
			{ x: new Date(2017, 10, 5), y: 54 },
			{ x: new Date(2017, 10, 6), y: 55 },
			{ x: new Date(2017, 10, 7), y: 54 },
			{ x: new Date(2017, 10, 8), y: 69 },
			{ x: new Date(2017, 10, 9), y: 65 },
			{ x: new Date(2017, 10, 10), y: 66 },
			{ x: new Date(2017, 10, 11), y: 63 },
			{ x: new Date(2017, 10, 12), y: 67 },
			{ x: new Date(2017, 10, 13), y: 66 },
			{ x: new Date(2017, 10, 14), y: 56 },
			{ x: new Date(2017, 10, 15), y: 64 }
		]
	}]
};
$("#chartContainer1").CanvasJSChart(options);
$("#chartContainer2").CanvasJSChart(options);
$("#chartContainer3").CanvasJSChart(options);
$("#chartContainer4").CanvasJSChart(options);
$("#chartContainer5").CanvasJSChart(options);

function toogleDataSeries(e){
	if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
		e.dataSeries.visible = false;
	} else{
		e.dataSeries.visible = true;
	}
	e.chart.render();
}

}

//Making Slider effects for prediction section

const slider2 = document.querySelector('.slider2');
const leftArrow2 = document.querySelector('.left2');
const rightArrow2 = document.querySelector('.right2');
const indicatorParents2 = document.querySelector('.controls2 ul');

let sectionIndex2 = 0;

function setIndex2(){
    document.querySelector('.controls2 .selected2').classList.remove('selected2'); 
    slider2.style.transform = `translate(${sectionIndex2 * -120}%)`;    
}

document.querySelectorAll('.controls2 li').forEach(function(indicator2, ind2) {
  indicator2.addEventListener('click', function() {
      sectionIndex2 = ind2; 
      setIndex2();
      indicator2.classList.add('selected2');
      
  });
});

leftArrow2.addEventListener('click', function(){
  sectionIndex2 = (sectionIndex2 > 0) ? sectionIndex2 - 1 : 0;
  indicatorParents2.children[sectionIndex2].classList.add('selected2');
  setIndex2();
});

rightArrow2.addEventListener('click', function(){
  sectionIndex2 = (sectionIndex2 < 4) ? sectionIndex2 + 1 : 3; 
  indicatorParents2.children[sectionIndex2].classList.add('selected2');
  setIndex2();
}); 

//Making Slider effects for remote sensing section

const slider3 = document.querySelector('.slider3');
const leftArrow3 = document.querySelector('.left3');
const rightArrow3 = document.querySelector('.right3');
const indicatorParents3 = document.querySelector('.controls3 ul');

let sectionIndex3 = 0;

function setIndex3(){
    document.querySelector('.controls3 .selected3').classList.remove('selected3'); 
    slider3.style.transform = `translate(${sectionIndex3 * -120}%)`;    
}

document.querySelectorAll('.controls3 li').forEach(function(indicator3, ind3) {
  indicator3.addEventListener('click', function() {
      sectionIndex3 = ind3; 
      setIndex3();
      indicator3.classList.add('selected3');
      
  });
});

leftArrow3.addEventListener('click', function(){
  sectionIndex3 = (sectionIndex3 > 0) ? sectionIndex3 - 1 : 0;
  indicatorParents3.children[sectionIndex3].classList.add('selected3');
  setIndex3();
});

rightArrow3.addEventListener('click', function(){
  sectionIndex3 = (sectionIndex3 < 4) ? sectionIndex3 + 1 : 3; 
  indicatorParents3.children[sectionIndex3].classList.add('selected3');
  setIndex3();
}); 

//Selecting individual dams
const selectElement = document.getElementById("dam-select");

selectElement.addEventListener("change", function () {
  const selectedOption = selectElement.value;
  if (selectedOption) {
    window.location.href = selectedOption;
  }
});


 