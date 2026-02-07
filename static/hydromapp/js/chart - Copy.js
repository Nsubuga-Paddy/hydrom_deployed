google.charts.load('current', {'packages':['corechart', 'line']});
google.charts.setOnLoadCallback(waterLevelChart);
google.charts.setOnLoadCallback(mvWaterLevelChart);
google.charts.setOnLoadCallback(dispatchChart);
google.charts.setOnLoadCallback(mvDispatchChart);
google.charts.setOnLoadCallback(temperatureChart);
google.charts.setOnLoadCallback(mvTemperatureChart);
google.charts.setOnLoadCallback(precipitationChart);
google.charts.setOnLoadCallback(mvPrecipitationChart);
google.charts.setOnLoadCallback(dischargeChart);
google.charts.setOnLoadCallback(mvDischargeChart);
google.charts.setOnLoadCallback(humidityChart);
google.charts.setOnLoadCallback(mvHumidityChart);
google.charts.setOnLoadCallback(predChart);
google.charts.setOnLoadCallback(mvPredChart);

function waterLevelChart() {
  var data = google.visualization.arrayToDataTable([
    ['Time', 'Sales'],
    ['1',  1000],
    ['2',  1170],
    ['3',  660],
    ['4',  1030]
  ]);

  var options = {
    title: '',
    hAxis: {title: 'Time'},
    vAxis: {minValue: 0},
    legend: 'none',
    chartArea: { 
          left: 50, 
          top: 20, 
          right: 0, 
          bottom: 50 
      },
    colors: ['#0896FC']
  };

  var chart = new google.visualization.AreaChart(document.getElementById('chart_div1'));
  chart.draw(data, options);
}

function mvWaterLevelChart() {
  var data = google.visualization.arrayToDataTable([
    ['Time', 'Sales'],
    ['1',  1000],
    ['2',  1170],
    ['3',  660],
    ['4',  1030]
  ]);

  var options = {
    title: '',
    hAxis: {title: 'Time'},
    vAxis: {minValue: 0},
    legend: 'none',
    chartArea: { 
          left: 50, 
          top: 20, 
          right: 0, 
          bottom: 50 
      },
    colors: ['#0896FC']
  };

  var chart = new google.visualization.AreaChart(document.getElementById('mv_chart_div1'));
  chart.draw(data, options);
}

function dispatchChart() {

      var data = new google.visualization.DataTable();
      data.addColumn('number', 'Time');
      data.addColumn('number', 'Power');

      data.addRows([
        [0, 0],   [1, 10],  [2, 23],  [3, 17],  [4, 18],  [5, 9],
        [6, 11],  [7, 27],  [8, 33],  [9, 40],  [10, 32], [11, 35],
        [12, 30], [13, 40], [14, 42], [15, 47], [16, 44], [17, 48],
        [18, 52], [19, 54], [20, 42], [21, 55], [22, 56], [23, 57],
        [24, 60], [25, 50], [26, 52], [27, 51], [28, 49], [29, 53],
        [30, 55], [31, 60], [32, 61], [33, 59], [34, 62], [35, 65],
        [36, 62], [37, 58], [38, 55], [39, 61], [40, 64], [41, 65],
        [42, 63], [43, 66], [44, 67], [45, 69], [46, 69], [47, 70],
        [48, 72], [49, 68], [50, 66], [51, 65], [52, 67], [53, 70],
        [54, 71], [55, 72], [56, 73], [57, 75], [58, 70], [59, 68],
        [60, 64], [61, 60], [62, 65], [63, 67], [64, 68], [65, 69],
        [66, 70], [67, 72], [68, 75], [69, 80]
      ]);

      var options = {
        hAxis: {
          title: 'Time'
        },
        vAxis: {
          title: 'MW'
        },
        Legend: 'none',
        chartArea: { 
            left: 50, 
            top: 20, 
            right: 0, 
            bottom: 50 
        },
        colors: ['#0896FC'],
      };

      var chart = new google.visualization.LineChart(document.getElementById('chart_div2'));

      chart.draw(data, options);
}

function mvDispatchChart() {

  var data = new google.visualization.DataTable();
  data.addColumn('number', 'Time');
  data.addColumn('number', 'Power');

  data.addRows([
    [0, 0],   [1, 10],  [2, 23],  [3, 17],  [4, 18],  [5, 9],
    [6, 11],  [7, 27],  [8, 33],  [9, 40],  [10, 32], [11, 35],
    [12, 30], [13, 40], [14, 42], [15, 47], [16, 44], [17, 48],
    [18, 52], [19, 54], [20, 42], [21, 55], [22, 56], [23, 57],
    [24, 60], [25, 50], [26, 52], [27, 51], [28, 49], [29, 53],
    [30, 55], [31, 60], [32, 61], [33, 59], [34, 62], [35, 65],
    [36, 62], [37, 58], [38, 55], [39, 61], [40, 64], [41, 65],
    [42, 63], [43, 66], [44, 67], [45, 69], [46, 69], [47, 70],
    [48, 72], [49, 68], [50, 66], [51, 65], [52, 67], [53, 70],
    [54, 71], [55, 72], [56, 73], [57, 75], [58, 70], [59, 68],
    [60, 64], [61, 60], [62, 65], [63, 67], [64, 68], [65, 69],
    [66, 70], [67, 72], [68, 75], [69, 80]
  ]);

  var options = {
    hAxis: {
      title: 'Time'
    },
    vAxis: {
      title: 'MW'
    },
    Legend: 'none',
    chartArea: { 
        left: 50, 
        top: 20, 
        right: 0, 
        bottom: 50 
    },
    colors: ['#0896FC'],
  };

  var chart = new google.visualization.LineChart(document.getElementById('mv_chart_div2'));

  chart.draw(data, options);
}

function temperatureChart() {
    var data = google.visualization.arrayToDataTable([
    ['Time', 'Temp'],
    ['1',  400],
    ['2',  460],
    ['3',  1120],
    ['4',  540],
    ['5',  400],
    ['6',  460],
    ['7',  1120],
    ['8',  540],
    ]);

    var options = {
    title: '',
    curveType: 'function',
    legend: 'none',
    chartArea: { 
        left: 50, 
        top: 20, 
        right: 0, 
        bottom: 50 
    },
    colors: ['#0896FC'],
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_div3'));

    chart.draw(data, options);
}

function mvTemperatureChart() {
  var data = google.visualization.arrayToDataTable([
  ['Time', 'Temp'],
  ['1',  400],
  ['2',  460],
  ['3',  1120],
  ['4',  540],
  ['5',  400],
  ['6',  460],
  ['7',  1120],
  ['8',  540],
  ]);

  var options = {
  title: '',
  curveType: 'function',
  legend: 'none',
  chartArea: { 
      left: 50, 
      top: 20, 
      right: 0, 
      bottom: 50 
  },
  colors: ['#0896FC'],
  };

  var chart = new google.visualization.LineChart(document.getElementById('mv_chart_div3'));

  chart.draw(data, options);
}

function precipitationChart() {
var data = google.visualization.arrayToDataTable([
    ['Date', 'Precipitation'],
    ['2013',  1000],
    ['2014',  1170],
    ['2015',  660],
    ['2016',  1030]
]);

var options = {
    title: '',
    hAxis: {title: 'Date'},
    vAxis: {title: 'mm'},
    legend: 'none',
    chartArea: { 
        left: 50, 
        top: 20, 
        right: 0, 
        bottom: 50 
    },
    colors: ['#0896FC'],
};

var chart = new google.visualization.ColumnChart(document.getElementById('chart_div4'));
chart.draw(data, options);
}

function mvPrecipitationChart() {
  var data = google.visualization.arrayToDataTable([
      ['Date', 'Precipitation'],
      ['2013',  1000],
      ['2014',  1170],
      ['2015',  660],
      ['2016',  1030]
  ]);
  
  var options = {
      title: '',
      hAxis: {title: 'Date'},
      vAxis: {title: 'mm'},
      legend: 'none',
      chartArea: { 
          left: 50, 
          top: 20, 
          right: 0, 
          bottom: 50 
      },
      colors: ['#0896FC'],
  };
  
  var chart = new google.visualization.ColumnChart(document.getElementById('mv_chart_div4'));
  chart.draw(data, options);
  }

function dischargeChart() {
    var data = google.visualization.arrayToDataTable([
        ['Time', 'Discharge'],
        ['1',  1000],
        ['2',  1170],
        ['3',  660],
        ['4',  1030],
        ['5',  1000],
        ['6',  1170],
        ['7',  660],
        ['8',  1030],
    ]);
    
    var options = {
        title: '',
        hAxis: {title: 'Time'},
        legend: 'none',
        chartArea: { 
            left: 50, 
            top: 20, 
            right: 0, 
            bottom: 50 
        },
        colors: ['#0896FC'],
    };
    
    var chart = new google.visualization.ColumnChart(document.getElementById('chart_div5'));
    chart.draw(data, options);
}

function mvDischargeChart() {
  var data = google.visualization.arrayToDataTable([
      ['Time', 'Discharge'],
      ['1',  1000],
      ['2',  1170],
      ['3',  660],
      ['4',  1030],
      ['5',  1000],
      ['6',  1170],
      ['7',  660],
      ['8',  1030],
  ]);
  
  var options = {
      title: '',
      hAxis: {title: 'Time'},
      legend: 'none',
      chartArea: { 
          left: 50, 
          top: 20, 
          right: 0, 
          bottom: 50 
      },
      colors: ['#0896FC'],
  };
  
  var chart = new google.visualization.ColumnChart(document.getElementById('mv_chart_div5'));
  chart.draw(data, options);
}

function humidityChart() {
  var data = google.visualization.arrayToDataTable([
    ['Time', 'Humidity'],
    ['8:00 AM',  70],
    ['10:00 AM',  75],
    ['12:00 PM',  68],
    ['2:00 PM',  72],
    ['4:00 PM',  78]
  ]);

  var options = {
    title: '',
    hAxis: {title: 'Time'},
    vAxis: {title: '%'},
    legend: 'none',
    curveType: 'function', // Smooth line curve
    colors: ['#0896FC'],
  };

  var chart = new google.visualization.LineChart(document.getElementById('chart_div6'));
  chart.draw(data, options);
}

function mvHumidityChart() {
  var data = google.visualization.arrayToDataTable([
    ['Time', 'Humidity'],
    ['8:00 AM',  70],
    ['10:00 AM',  75],
    ['12:00 PM',  68],
    ['2:00 PM',  72],
    ['4:00 PM',  78]
  ]);

  var options = {
    title: '',
    hAxis: {title: 'Time'},
    vAxis: {title: '%'},
    legend: 'none',
    curveType: 'function', // Smooth line curve
    colors: ['#0896FC'],
  };

  var chart = new google.visualization.LineChart(document.getElementById('mv_chart_div6'));
  chart.draw(data, options);
}

//Predicted data section
const dummyData = {
  actual_values: [10, 20, 30, 40, 50],
  predicted_values: [12, 18, 28, 35, 47],
  labels: ['8am', '9am', '10am', '11am', '12noon']
};

function predChart() {
  const actualValues = dummyData.actual_values;
  const predictedValues = dummyData.predicted_values;
  const labels = dummyData.labels;

  const chartData = new google.visualization.DataTable();
  chartData.addColumn('string', 'X-axis Labels');
  chartData.addColumn('number', 'Actual Values');
  chartData.addColumn('number', 'Predicted Values');

  for (let i = 0; i < labels.length; i++) {
      chartData.addRow([labels[i], actualValues[i], predictedValues[i]]);
  }

  const options = {
      title: '',
      vAxis: {
          title: 'm'
      },
      colors: ['#0896FC','#FF69B4'],
      chartArea: {
        left: '10%',   // Adjust left margin
        top: '7%',    // Adjust top margin
        width: '75%',  // Adjust width

    }
  };

  const chart = new google.visualization.LineChart(document.getElementById('chart-container'));
  chart.draw(chartData, options);
}

function mvPredChart() {
  const actualValues = dummyData.actual_values;
  const predictedValues = dummyData.predicted_values;
  const labels = dummyData.labels;

  const chartData = new google.visualization.DataTable();
  chartData.addColumn('string', 'X-axis Labels');
  chartData.addColumn('number', 'Actual Values');
  chartData.addColumn('number', 'Predicted Values');

  for (let i = 0; i < labels.length; i++) {
      chartData.addRow([labels[i], actualValues[i], predictedValues[i]]);
  }

  const options = {
      title: '',
      vAxis: {
          title: 'm'
      },
      legend: {
        position: 'bottom'
      },
      colors: ['#0896FC','#FF69B4'],
      chartArea: {
        left: '10%',   // Adjust left margin
        top: '7%',    // Adjust top margin
        width: '100%',  // Adjust width

    }
  };

  const chart = new google.visualization.LineChart(document.getElementById('mv-chart-container'));
  chart.draw(chartData, options);
}